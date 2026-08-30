/**
 * ConnectExecutorLogic @transaction methods against REAL SQL.
 *
 * Real IoC graph (testDinner over the production executors.yaml source),
 * real repos, real production migration DDL on an isolated testPostgres
 * database. Covers the transactional createClaim/decide/rename/revoke
 * paths, including the pending re-claim refresh branch and the decide()
 * serialization queue.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { Database } from "sqlstack";
import ConnectExecutorController from "../../src/server/controller/connect_executor.controller";
import ConnectChannelController from "../../src/server/controller/connect_channel.controller";
import ConnectExecutorLogic from "../../src/server/logic/connect_executor.logic";
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

const USER_ID = "usr_dbexecutor1";
const TOKEN_A = "E".repeat(43);
const TOKEN_B = "F".repeat(43);
const TOKEN_C = "G".repeat(43);
const actor: ConnectExecutorActor = {
  role: "browser_session",
  userId: USER_ID,
  sessionId: "ses_dbexecutor1",
};

const createInput = (n: string): ClaimCreateInput => ({
  kind: "executor.claim.create.request",
  protocolVersion: "1.0",
  claimId: `clm_dbexec${n}`,
  executorId: `exe_dbexec${n}`,
  deviceId: `dev_dbexec${n}`,
  actorRole: "executor_device",
  displayName: `Executor ${n}`,
  platform: "linux",
  architecture: "x64",
  executorVersion: "2.0.1",
  keyFingerprint: "b".repeat(64),
  idempotencyKey: `idem_dbexec_${n}_0123456789`,
  correlationId: `cor_dbexec${n}`,
});

const decisionInput = (
  n: string,
  decision: "accept" | "deny",
  key = "aaaa",
): ClaimDecisionInput => ({
  kind: "executor.claim.decision.request",
  protocolVersion: "1.0",
  claimId: `clm_dbexec${n}`,
  sessionId: "ses_dbexecutor1",
  actorRole: "browser_session",
  decision,
  idempotencyKey: `idem_dbexecdec_${n}_${key}`,
  correlationId: `cor_dbexecdec${n}`,
});

let built: TestPostgresDatabase;
let database: Database;
let env: Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;
let logic: ConnectExecutorLogic;

const rows = (sql: string, params: unknown[] = []) =>
  built.query(sql, params) as Promise<Record<string, unknown>[]>;

beforeAll(async () => {
  built = await buildProductionDatabase();
  await seedAccount(built, USER_ID);
  database = await registerProductionSql(built, "db-executor");
  env = await testDinner(executorsSource)
    .select({ module: "connectExecutors" })
    .controllers({
      "connect_executor.controller": ConnectExecutorController,
      "connect_channel.controller": ConnectChannelController,
    })
    .hooks({})
    .build();
  logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
});

afterAll(async () => {
  await env?.dispose();
  await database?.close();
  await built?.dispose();
});

describe("ConnectExecutorLogic transactional paths against real SQL", () => {
  it("createClaim persists the executor + claim rows and returns the challenge envelope", async () => {
    const input = createInput("001");
    const result = await logic.createClaim(actor, input, TOKEN_A);
    expect(result.outcome).toBe("created");
    if (result.outcome !== "created" && result.outcome !== "retry") throw new Error("unreachable");
    expect(result.challenge).toMatchObject({
      claimId: input.claimId,
      executorId: input.executorId,
      deviceId: input.deviceId,
      displayName: input.displayName,
      platform: "linux",
      architecture: "x64",
      executorVersion: "2.0.1",
    });
    expect(result.challenge.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);

    const claim = (await rows(
      "SELECT * FROM connect_executor_claims WHERE claim_id = $1",
      [input.claimId],
    ))[0];
    expect(claim).toMatchObject({
      executor_id: input.executorId,
      status: "pending",
      idempotency_key: input.idempotencyKey,
    });
    const executor = (await rows(
      "SELECT * FROM connect_executors WHERE executor_id = $1",
      [input.executorId],
    ))[0];
    expect(executor).toMatchObject({
      state: "pending",
      owner_user_id: null,
      credential_generation: 0,
      device_id: input.deviceId,
    });
    const audit = await rows(
      "SELECT event_kind FROM connect_executor_audit_events WHERE executor_id = $1",
      [input.executorId],
    );
    expect(audit).toEqual([{ event_kind: "claim.created" }]);
  });

  it("createClaim retries the same envelope, conflicts on drift, and refreshes a pending re-claim", async () => {
    const input = createInput("001");
    const retry = await logic.createClaim(actor, input, TOKEN_A);
    expect(retry.outcome).toBe("retry");

    const drift = await logic.createClaim(actor, { ...input, displayName: "Drifted" }, TOKEN_A);
    expect(drift).toEqual({ outcome: "conflict" });

    // A machine that restarts before acceptance re-claims with new ids:
    // the pending executor row is refreshed and the stale claim replaced.
    const reclaim: ClaimCreateInput = {
      ...input,
      claimId: "clm_dbexec001b",
      displayName: "Executor 001 Restarted",
      idempotencyKey: "idem_dbexec_001b_0123456789",
      correlationId: "cor_dbexec001b",
    };
    const result = await logic.createClaim(actor, reclaim, TOKEN_B);
    expect(result.outcome).toBe("created");

    const claims = await rows(
      "SELECT claim_id, status FROM connect_executor_claims WHERE executor_id = $1",
      [input.executorId],
    );
    expect(claims).toEqual([{ claim_id: "clm_dbexec001b", status: "pending" }]);
    const executor = (await rows(
      "SELECT display_name, state FROM connect_executors WHERE executor_id = $1",
      [input.executorId],
    ))[0];
    expect(executor).toEqual({ display_name: "Executor 001 Restarted", state: "pending" });
  });

  it("decide(accept) transitions claim + executor rows, mints a generation-1 credential, and audits", async () => {
    const input = createInput("002");
    await logic.createClaim(actor, input, TOKEN_B);
    const decision = decisionInput("002", "accept");
    const result = await logic.decide(actor, decision);
    expect(result.outcome).toBe("accepted");
    if (result.outcome !== "accepted") throw new Error("unreachable");
    expect(result.websiteDeploymentId).toMatch(/^wdp_[A-Za-z0-9]{32}$/);

    const claim = (await rows(
      "SELECT status, decided_by_user_id, decision_idempotency_key FROM connect_executor_claims WHERE claim_id = $1",
      [input.claimId],
    ))[0];
    expect(claim).toEqual({
      status: "accepted",
      decided_by_user_id: USER_ID,
      decision_idempotency_key: decision.idempotencyKey,
    });
    const executor = (await rows(
      "SELECT state, owner_user_id, credential_generation FROM connect_executors WHERE executor_id = $1",
      [input.executorId],
    ))[0];
    expect(executor).toEqual({
      state: "active",
      owner_user_id: USER_ID,
      credential_generation: 1,
    });
    const credentials = await rows(
      "SELECT generation, status FROM connect_executor_credentials WHERE executor_id = $1",
      [input.executorId],
    );
    expect(credentials).toEqual([{ generation: 1, status: "active" }]);
    const audit = await rows(
      "SELECT event_kind FROM connect_executor_audit_events WHERE executor_id = $1 ORDER BY occurred_at",
      [input.executorId],
    );
    expect(audit.map((row) => row.event_kind)).toEqual(["claim.created", "claim.accepted"]);
  });

  it("decide(accept) replay is idempotent for the same key and replayed for a different key", async () => {
    const same = await logic.decide(actor, decisionInput("002", "accept"));
    expect(same.outcome).toBe("accepted");
    const different = await logic.decide(actor, decisionInput("002", "accept", "bbbb"));
    expect(different).toEqual({ outcome: "replayed" });
  });

  it("decide(deny) marks the claim denied and appends the audit row", async () => {
    const input = createInput("003");
    await logic.createClaim(actor, input, TOKEN_C);
    const result = await logic.decide(actor, decisionInput("003", "deny"));
    expect(result).toEqual({ outcome: "denied" });
    const claim = (await rows(
      "SELECT status FROM connect_executor_claims WHERE claim_id = $1",
      [input.claimId],
    ))[0];
    expect(claim).toEqual({ status: "denied" });
    const audit = await rows(
      "SELECT event_kind FROM connect_executor_audit_events WHERE executor_id = $1 ORDER BY occurred_at",
      [input.executorId],
    );
    expect(audit.map((row) => row.event_kind)).toEqual(["claim.created", "claim.denied"]);
  });

  it("concurrent decides on one claim are serialized by the decision queue: one wins, one replays", async () => {
    const input = createInput("004");
    await logic.createClaim(actor, input, "H".repeat(43));
    const [first, second] = await Promise.all([
      logic.decide(actor, decisionInput("004", "accept", "one1")),
      logic.decide(actor, decisionInput("004", "accept", "two2")),
    ]);
    expect([first.outcome, second.outcome].sort()).toEqual(["accepted", "replayed"]);
    const credentials = await rows(
      "SELECT count(*)::int AS n FROM connect_executor_credentials WHERE executor_id = $1",
      [input.executorId],
    );
    expect(credentials[0].n).toBe(1);
  });

  it("rename updates the owned active executor row and audits executor.renamed", async () => {
    const result = await logic.rename(actor, {
      kind: "executor.rename.request",
      protocolVersion: "1.0",
      executorId: "exe_dbexec002",
      displayName: "Renamed Executor",
      idempotencyKey: "idem_dbexecren_0123456789",
      correlationId: "cor_dbexecren01",
    });
    expect(result.outcome).toBe("renamed");
    if (result.outcome !== "renamed") throw new Error("unreachable");
    expect(result.executor.display_name).toBe("Renamed Executor");
    const executor = (await rows(
      "SELECT display_name FROM connect_executors WHERE executor_id = $1",
      ["exe_dbexec002"],
    ))[0];
    expect(executor).toEqual({ display_name: "Renamed Executor" });
    const audit = await rows(
      "SELECT count(*)::int AS n FROM connect_executor_audit_events WHERE executor_id = $1 AND event_kind = 'executor.renamed'",
      ["exe_dbexec002"],
    );
    expect(audit[0].n).toBe(1);
  });

  it("revoke fences the credential generation, revokes credentials, audits, and is idempotent", async () => {
    const input = {
      kind: "executor.action.request" as const,
      protocolVersion: "1.0" as const,
      executorId: "exe_dbexec002",
      action: "revoke" as const,
      idempotencyKey: "idem_dbexecrev_0123456789",
      correlationId: "cor_dbexecrev01",
    };
    const result = await logic.revoke(actor, input);
    expect(result.outcome).toBe("revoked");
    if (result.outcome !== "revoked") throw new Error("unreachable");
    expect(result.executor).toMatchObject({ state: "revoked", credential_generation: 2 });

    const executor = (await rows(
      "SELECT state, credential_generation FROM connect_executors WHERE executor_id = $1",
      ["exe_dbexec002"],
    ))[0];
    expect(executor).toEqual({ state: "revoked", credential_generation: 2 });
    const credentials = await rows(
      "SELECT status, revoked_at IS NOT NULL AS stamped FROM connect_executor_credentials WHERE executor_id = $1",
      ["exe_dbexec002"],
    );
    expect(credentials).toEqual([{ status: "revoked", stamped: true }]);
    const audit = await rows(
      "SELECT count(*)::int AS n FROM connect_executor_audit_events WHERE executor_id = $1 AND event_kind = 'executor.revoked'",
      ["exe_dbexec002"],
    );
    expect(audit[0].n).toBe(1);

    const again = await logic.revoke(actor, { ...input, correlationId: "cor_dbexecrev02" });
    expect(again.outcome).toBe("revoked");
    const after = (await rows(
      "SELECT credential_generation FROM connect_executors WHERE executor_id = $1",
      ["exe_dbexec002"],
    ))[0];
    expect(after).toEqual({ credential_generation: 2 });
  });

  it("atomically selects exactly one owner when two authenticated accounts race", async () => {
    // Ported from test/integration/api/connect-executors.test.ts.
    const token = "J".repeat(43);
    const input = createInput("005");
    await seedAccount(built, "usr_dbexecrace2");
    const rival: ConnectExecutorActor = {
      role: "browser_session",
      userId: "usr_dbexecrace2",
      sessionId: "ses_dbexecrace2",
    };
    await logic.createClaim(actor, input, token);
    const [first, second] = await Promise.all([
      logic.decide(actor, decisionInput("005", "accept", "raa1")),
      logic.decide(rival, { ...decisionInput("005", "accept", "rbb2"), sessionId: rival.sessionId }),
    ]);
    expect([first.outcome, second.outcome].sort()).toEqual(["accepted", "replayed"]);
    const winner = first.outcome === "accepted" ? actor : rival;

    expect(await rows(
      "SELECT owner_user_id, state, credential_generation FROM connect_executors WHERE executor_id = $1",
      [input.executorId],
    )).toEqual([{
      owner_user_id: winner.userId,
      state: "active",
      credential_generation: 1,
    }]);
    expect(await rows(
      "SELECT executor_id, generation, token_hash, status FROM connect_executor_credentials WHERE executor_id = $1",
      [input.executorId],
    )).toEqual([{
      executor_id: input.executorId,
      generation: 1,
      token_hash: createHash("sha256").update(token).digest("hex"),
      status: "active",
    }]);
    expect(await rows(
      "SELECT actor_user_id, credential_generation FROM connect_executor_audit_events WHERE executor_id = $1 AND event_kind = 'claim.accepted'",
      [input.executorId],
    )).toEqual([{ actor_user_id: winner.userId, credential_generation: 1 }]);
  });
});
