/**
 * ConnectExecutorService rollback-only paths against REAL SQL through the
 * original application. Each case owns a fresh SQLStack PostgreSQL fixture
 * from the independently authored executor registry schema plus plain
 * starting-state rows; no migrated template, shared reset, app factory or
 * inter-case dependence. Real repos on the fixture with only one seam
 * (audit append or claim lookup) stubbed to fail, so each mutation runs inside
 * its production @transaction wrapper, hits the service catch block while a
 * transaction is genuinely open, and marks it rollback-only — proving the
 * partial writes never persist. Both the Error and the non-Error throw shapes
 * are driven through every site. Historical case names and assertions retained.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, testStub, test as control } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import ConnectExecutorLogic from "../../src/server/logic/connect_executor.logic";
import ConnectExecutorAuditRepo from "../../src/server/repo/connect_executor_audit_repo";
import ConnectExecutorClaimRepo from "../../src/server/repo/connect_executor_claim_repo";
import type { ConnectExecutorActor } from "../../src/server/services/connect_executor_actor_resolver";
import type {
  ClaimCreateInput,
  ClaimDecisionInput,
} from "../../src/server/services/connect_executor_request_parser";
import Env from "../../src/server/services/env";
import { executorRegistrySchema } from "../schemas/executor-registry";
import { insertAccount, insertAcceptedExecutor } from "../schemas/executor-transaction-data";

const CONFIG = path.resolve(__dirname, "../../noego.config.yml");

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

const rowsOf = (built: TestPostgresDatabase) =>
  (sql: string, params: unknown[] = []) =>
    built.query(sql, params) as Promise<Record<string, unknown>[]>;

/** Audit append fails with an Error, then with a non-Error, so both
 * rollbackOnly shapes are exercised; exactly two calls are verified. */
const failingAudit = () => testStub()
  .method(ConnectExecutorAuditRepo, "appendEvent", control.calls([
    control.throws(new Error("audit append lost", { cause: new Error("disk detached") })),
    control.throws("audit append torn"),
  ]));

/** decide() only reaches its own catch for failures it awaits — the claim
 * lookup — so that seam is the one stubbed to fail inside the transaction. */
const failingClaimLookup = () => testStub()
  .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
    control.throws(new Error("claim lookup lost")),
    control.throws("claim lookup torn"),
  ]));

/** The service maps the failure to rollback-only; the transaction wrapper may
 * surface it as a rejection — either shape proves the write never commits. */
async function settle<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
  try {
    return { value: await promise };
  } catch (error) {
    return { error };
  }
}

describe("rollback-only failure paths against real transactions", () => {
  it("createClaim rolls back the executor and claim rows when the audit append fails", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).use(failingAudit()).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const rows = rowsOf(built);
    await insertAccount(built, USER_ID);

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
    await env.verify();
  }));

  it("decide(deny) rolls back and leaves the claim pending when the audit append fails", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const clean = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).use(failingAudit()).build();
    const cleanLogic = await clean.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const rows = rowsOf(built);
    await insertAccount(built, USER_ID);

    const input = createInput("201");
    expect((await cleanLogic.createClaim(actor, input, TOKEN)).outcome).toBe("created");
    for (const key of ["one1", "two2"]) {
      const outcome = await settle(logic.decide(actor, decisionInput("201", "deny", key)));
      if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
      expect(await rows(
        "SELECT status, decided_by_user_id FROM connect_executor_claims WHERE claim_id = $1",
        [input.claimId],
      )).toEqual([{ status: "pending", decided_by_user_id: null }]);
    }
    await env.verify();
  }));

  it("decide degrades a claim lookup failure inside the open transaction to failed", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).use(failingClaimLookup()).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    await insertAccount(built, USER_ID);

    for (const key of ["thr3", "fou4"]) {
      const outcome = await settle(logic.decide(actor, decisionInput("201", "deny", key)));
      if (outcome.value) expect(outcome.value).toEqual({ outcome: "failed" });
    }
    await env.verify();
  }));

  it("rename rolls back the display name when the audit append fails", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const clean = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).use(failingAudit()).build();
    const cleanLogic = await clean.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const rows = rowsOf(built);
    await insertAccount(built, USER_ID);

    const input = createInput("301");
    expect((await cleanLogic.createClaim(actor, input, TOKEN)).outcome).toBe("created");
    expect((await cleanLogic.decide(actor, decisionInput("301", "accept"))).outcome).toBe("accepted");
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
    await env.verify();
  }));

  it("revoke rolls back the credential fence when the audit append fails", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).use(failingAudit()).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const rows = rowsOf(built);
    await insertAccount(built, USER_ID);

    // Starting state: executor 301 active, owned by USER_ID at generation 1
    // (plain rows — previously left behind by the rename case's accept).
    const input = createInput("301");
    await insertAcceptedExecutor(
      built, input, TOKEN, USER_ID, decisionInput("301", "accept").idempotencyKey,
    );

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
    await env.verify();
  }));
});
