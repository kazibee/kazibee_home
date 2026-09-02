/**
 * ConnectExecutorService rollback-only paths against REAL SQL.
 *
 * Real IoC graph and real repos on an isolated testPostgres database, with
 * only the audit repo stubbed to fail. Each mutation therefore runs inside
 * its production @transaction wrapper, hits the service catch block while a
 * transaction is genuinely open, and marks it rollback-only — proving the
 * partial writes never persist. Both the Error and the non-Error throw
 * shapes are driven through every site.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import { test as control } from "@noego/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { Database } from "sqlstack";
import ConnectExecutorController from "../../src/server/controller/connect_executor.controller";
import ConnectChannelController from "../../src/server/controller/connect_channel.controller";
import ConnectExecutorLogic from "../../src/server/logic/connect_executor.logic";
import ConnectExecutorAuditRepo from "../../src/server/repo/connect_executor_audit_repo";
import ConnectExecutorClaimRepo from "../../src/server/repo/connect_executor_claim_repo";
import type { ConnectExecutorActor } from "../../src/server/services/connect_executor_actor_resolver";
import type {
  ClaimCreateInput,
  ClaimDecisionInput,
} from "../../src/server/services/connect_executor_request_parser";
import {
  buildProductionDatabase,
  registerProductionSql,
  seedAccount,
} from "../helpers/production-schema";

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, "../../src/server/openapi/connect/executors.yaml"), "utf8"),
) as Record<string, unknown>;

const USER_ID = "usr_dbrollback1";
const TOKEN = "R".repeat(43);
const actor: ConnectExecutorActor = {
  role: "browser_session",
  userId: USER_ID,
  sessionId: "ses_dbrollback1",
};

const createInput = (n: string): ClaimCreateInput => ({
  kind: "executor.claim.create.request",
  protocolVersion: "1.0",
  claimId: `clm_dbroll${n}`,
  executorId: `exe_dbroll${n}`,
  deviceId: `dev_dbroll${n}`,
  actorRole: "executor_device",
  displayName: `Rollback ${n}`,
  platform: "linux",
  architecture: "x64",
  executorVersion: "2.0.1",
  keyFingerprint: "c".repeat(64),
  idempotencyKey: `idem_dbroll_${n}_0123456789`,
  correlationId: `cor_dbroll${n}`,
});

const decisionInput = (n: string, decision: "accept" | "deny", key = "aaaa"): ClaimDecisionInput => ({
  kind: "executor.claim.decision.request",
  protocolVersion: "1.0",
  claimId: `clm_dbroll${n}`,
  sessionId: "ses_dbrollback1",
  actorRole: "browser_session",
  decision,
  idempotencyKey: `idem_dbrolldec_${n}_${key}`,
  correlationId: `cor_dbrolldec${n}`,
});

let built: TestPostgresDatabase;
let database: Database;
let cleanEnv: Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;
let cleanLogic: ConnectExecutorLogic;

const rows = (sql: string, params: unknown[] = []) =>
  built.query(sql, params) as Promise<Record<string, unknown>[]>;

const base = () =>
  testDinner(executorsSource)
    .select({ module: "connectExecutors" })
    .controllers({
      "connect_executor.controller": ConnectExecutorController,
      "connect_channel.controller": ConnectChannelController,
    })
    .hooks({});

/** The service maps the failure to rollback-only; the transaction wrapper may
 * surface it as a rejection — either shape proves the write never commits. */
async function settle<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
  try {
    return { value: await promise };
  } catch (error) {
    return { error };
  }
}

/** Run one mutation twice against a graph whose audit append fails with an
 * Error, then with a non-Error, so both rollbackOnly shapes are exercised. */
async function withFailingAudit(
  run: (logic: ConnectExecutorLogic) => Promise<void>,
) {
  const env = await base()
    .methods([
      [ConnectExecutorAuditRepo, {
        appendEvent: control.calls([
          control.throws(new Error("audit append lost", { cause: new Error("disk detached") })),
          control.throws("audit append torn"),
        ]),
      }],
    ] as never)
    .build();
  try {
    await run(await env.get<ConnectExecutorLogic>(ConnectExecutorLogic));
    await env.verify();
  } finally {
    await env.dispose();
  }
}

/** decide() only reaches its own catch for failures it awaits — the claim
 * lookup — so that seam is the one stubbed to fail inside the transaction. */
async function withFailingClaimLookup(
  run: (logic: ConnectExecutorLogic) => Promise<void>,
) {
  const env = await base()
    .methods([
      [ConnectExecutorClaimRepo, {
        findByClaimId: control.calls([
          control.throws(new Error("claim lookup lost")),
          control.throws("claim lookup torn"),
        ]),
      }],
    ] as never)
    .build();
  try {
    await run(await env.get<ConnectExecutorLogic>(ConnectExecutorLogic));
    await env.verify();
  } finally {
    await env.dispose();
  }
}

beforeAll(async () => {
  built = await buildProductionDatabase();
  await seedAccount(built, USER_ID);
  database = await registerProductionSql(built, "db-executor-rollback");
  cleanEnv = await base().build();
  cleanLogic = await cleanEnv.get<ConnectExecutorLogic>(ConnectExecutorLogic);
});

afterAll(async () => {
  await cleanEnv?.dispose();
  await database?.close();
  await built?.dispose();
});

describe("rollback-only failure paths against real transactions", () => {
  it("createClaim rolls back the executor and claim rows when the audit append fails", async () => {
    await withFailingAudit(async (logic) => {
      for (const n of ["101", "102"]) {
        const input = createInput(n);
        const outcome = await settle(logic.createClaim(actor, input, TOKEN));
        if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
        expect(await rows(
          "SELECT 1 FROM connect_executors WHERE executor_id = $1", [input.executorId],
        )).toEqual([]);
        expect(await rows(
          "SELECT 1 FROM connect_executor_claims WHERE claim_id = $1", [input.claimId],
        )).toEqual([]);
      }
    });
  });

  it("decide(deny) rolls back and leaves the claim pending when the audit append fails", async () => {
    const input = createInput("201");
    expect((await cleanLogic.createClaim(actor, input, TOKEN)).outcome).toBe("created");
    await withFailingAudit(async (logic) => {
      for (const key of ["one1", "two2"]) {
        const outcome = await settle(logic.decide(actor, decisionInput("201", "deny", key)));
        if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
        expect(await rows(
          "SELECT status, decided_by_user_id FROM connect_executor_claims WHERE claim_id = $1",
          [input.claimId],
        )).toEqual([{ status: "pending", decided_by_user_id: null }]);
      }
    });
  });

  it("decide degrades a claim lookup failure inside the open transaction to failed", async () => {
    await withFailingClaimLookup(async (logic) => {
      for (const key of ["thr3", "fou4"]) {
        const outcome = await settle(logic.decide(actor, decisionInput("201", "deny", key)));
        if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
      }
    });
  });

  it("rename rolls back the display name when the audit append fails", async () => {
    const input = createInput("301");
    expect((await cleanLogic.createClaim(actor, input, TOKEN)).outcome).toBe("created");
    expect((await cleanLogic.decide(actor, decisionInput("301", "accept"))).outcome).toBe("accepted");
    await withFailingAudit(async (logic) => {
      for (const attempt of ["First", "Second"]) {
        const outcome = await settle(logic.rename(actor, {
          kind: "executor.rename.request",
          protocolVersion: "1.0",
          executorId: input.executorId,
          displayName: `${attempt} Attempt`,
          idempotencyKey: `idem_dbrollren_${attempt.toLowerCase()}_01`,
          correlationId: "cor_dbrollren1",
        }));
        if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
        expect(await rows(
          "SELECT display_name FROM connect_executors WHERE executor_id = $1",
          [input.executorId],
        )).toEqual([{ display_name: "Rollback 301" }]);
      }
    });
  });

  it("revoke rolls back the credential fence when the audit append fails", async () => {
    const input = createInput("301");
    await withFailingAudit(async (logic) => {
      for (const key of ["one1", "two2"]) {
        const outcome = await settle(logic.revoke(actor, {
          kind: "executor.action.request",
          protocolVersion: "1.0",
          executorId: input.executorId,
          action: "revoke",
          idempotencyKey: `idem_dbrollrev_${key}_01`,
          correlationId: "cor_dbrollrev1",
        }));
        if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
        expect(await rows(
          "SELECT state, credential_generation FROM connect_executors WHERE executor_id = $1",
          [input.executorId],
        )).toEqual([{ state: "active", credential_generation: 1 }]);
      }
    });
  });
});
