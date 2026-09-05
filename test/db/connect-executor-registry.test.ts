/**
 * Connect executor registry claims against REAL SQL.
 *
 * Formerly test/unit/connect-executor-registry.test.ts, which
 * hand-constructed the ConnectExecutorService graph (the manual `new`
 * wiring rotted as constructors grew) and queried the real database from
 * the unit tier. Rewritten in the db tier on the real IoC graph
 * (testDinner over the production executors.yaml source) with the
 * production migration DDL on an isolated testPostgres database — no
 * manual construction anywhere; every service and repo is resolved
 * through the container.
 *
 * Preserved claims: challenge recovery / idempotent retry, short-code
 * hash non-derivability from database contents, accept-once decisions,
 * credential fencing on revoke, deny/replay fail-closed behavior, expiry
 * fail-closed behavior, and browser-session + CSRF gating of mutations.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { Database } from "sqlstack";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectExecutorController from "../../src/server/controller/connect_executor.controller";
import ConnectChannelController from "../../src/server/controller/connect_channel.controller";
import ConnectExecutorLogic from "../../src/server/logic/connect_executor.logic";
import ConnectExecutorRepo from "../../src/server/repo/connect_executor_repo";
import ConnectExecutorCredentialRepo from "../../src/server/repo/connect_executor_credential_repo";
import ConnectBrowserSessionRepo from "../../src/server/repo/connect_browser_session_repo";
import ConnectExecutorActorResolver, {
  ConnectExecutorDeviceAuthVerifier,
} from "../../src/server/services/connect_executor_actor_resolver";
import ConnectAuthPolicy from "../../src/server/services/connect_auth_policy";
import ConnectSessionAuthService from "../../src/server/services/connect_session_auth_service";
import { ConnectCredentials } from "../../src/server/services/connect_auth_primitives";
import {
  buildProductionDatabase,
  composeProductionSql,
} from "../helpers/production-schema";

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, "../../src/server/openapi/connect/executors.yaml"), "utf8"),
) as Record<string, unknown>;

const token = Buffer.alloc(32, 7).toString("base64url");
const createInput = {
  kind: "executor.claim.create.request" as const,
  protocolVersion: "1.0" as const,
  claimId: "clm_registry01",
  executorId: "exe_registry01",
  deviceId: "dev_registry01",
  actorRole: "executor_device" as const,
  displayName: "Registry executor",
  platform: "linux" as const,
  architecture: "x64" as const,
  executorVersion: "1.0.0",
  keyFingerprint: "a".repeat(64),
  idempotencyKey: "idem_registry_create_0001",
  correlationId: "cor_registry01",
};

const PASSWORD_HASH = "$2a$12$mNZq4pezRTG8xgASJtIRPuauRl3fxLPmzHx7Abc3DOgQsGtGj17jy";

let built: TestPostgresDatabase;
let database: Database;
let env: Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;
let logic: ConnectExecutorLogic;
let credentials: ConnectCredentials;

const rows = (sql: string, params: unknown[] = []) =>
  built.query(sql, params) as Promise<Record<string, unknown>[]>;

const insertAccount = (userId: string, username: string) =>
  rows(
    `INSERT INTO connect_accounts (user_id, username, email, password_hash, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', now(), now())`,
    [userId, username, `${username.replace(/[^a-z0-9]/g, "")}@example.com`, PASSWORD_HASH],
  );

beforeAll(async () => {
  built = await buildProductionDatabase();
  const sql = await composeProductionSql(built, "db-executor-registry");
  database = sql.database;
  env = await testDinner(executorsSource)
    .use(sql.module)
    .select({ module: "connectExecutors" })
    .controllers({
      "connect_executor.controller": ConnectExecutorController,
      "connect_channel.controller": ConnectChannelController,
    })
    .hooks({})
    .build();
  logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
  credentials = await env.get<ConnectCredentials>(ConnectCredentials);
});

beforeEach(async () => {
  // Same isolation the retired unit test got from resetTestDatabase():
  // every test starts from an empty schema.
  await rows(
    `TRUNCATE connect_executor_audit_events, connect_executor_credentials,
       connect_executor_claims, connect_executors, connect_browser_sessions,
       connect_website_deployment_identity, connect_accounts CASCADE`,
  );
});

afterAll(async () => {
  await env?.dispose();
  await database?.close();
  await built?.dispose();
});

describe("Connect executor registry", () => {
  it("creates a recoverable challenge, accepts once, and fences credentials on revoke", async () => {
    const actor = {
      role: "executor_device" as const, executorId: createInput.executorId,
      deviceId: createInput.deviceId, generation: 0,
    };
    const created = await logic.createClaim(actor, createInput, token);
    expect(created.outcome).toBe("created");
    if (created.outcome !== "created") throw new Error("Expected challenge");
    expect(created.challenge.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
    expect(created.challenge.claimUrl).toBe(
      `https://connect.kazibee.example/claim/${createInput.claimId}`,
    );
    expect(new Date(created.challenge.expiresAt).getTime() - Date.now()).toBeGreaterThan(590_000);

    const retried = await logic.createClaim(actor, createInput, token);
    expect(retried).toEqual({ outcome: "retry", challenge: created.challenge });
    expect(await logic.createClaim(actor, {
      ...createInput,
      correlationId: "cor_registryretry",
    }, token)).toEqual({ outcome: "retry", challenge: created.challenge });

    const claimRows = await rows(
      "SELECT bootstrap_token_hash, short_code_hash FROM connect_executor_claims WHERE claim_id = $1",
      [createInput.claimId],
    ) as Array<Record<string, string>>;
    expect(claimRows[0].bootstrap_token_hash).toBe(credentials.hashToken(token));
    expect(JSON.stringify(claimRows)).not.toContain(token);
    expect(JSON.stringify(claimRows)).not.toContain(created.challenge.shortCode);
    const codeFromDatabaseHash = Array.from(
      createHash("sha256")
        .update(`kazi-claim-code-v1:${claimRows[0].bootstrap_token_hash}:${createInput.claimId}`)
        .digest().subarray(0, 8),
      (byte) => String.fromCharCode(65 + (byte % 26)),
    ).join("");
    expect(`${codeFromDatabaseHash.slice(0, 4)}-${codeFromDatabaseHash.slice(4)}`)
      .not.toBe(created.challenge.shortCode);

    await insertAccount("usr_registry01", "registry.owner");
    const owner = { role: "browser_session" as const, userId: "usr_registry01", sessionId: "ses_registry01" };
    const decision = {
      kind: "executor.claim.decision.request" as const, protocolVersion: "1.0" as const,
      claimId: createInput.claimId, sessionId: owner.sessionId, actorRole: "browser_session" as const,
      decision: "accept" as const, idempotencyKey: "idem_registry_accept_0001",
      correlationId: "cor_registry02",
    };
    expect(await logic.decide(owner, decision)).toMatchObject({
      outcome: "accepted",
      websiteDeploymentId: expect.stringMatching(/^wdp_[A-Za-z0-9]{32}$/),
    });
    expect(await logic.decide(owner, decision)).toMatchObject({
      outcome: "accepted",
      websiteDeploymentId: expect.stringMatching(/^wdp_[A-Za-z0-9]{32}$/),
    });

    const credentialRepo = await env.get<ConnectExecutorCredentialRepo>(ConnectExecutorCredentialRepo);
    const active = await credentialRepo.findByTokenHash({
      token_hash: credentials.hashToken(token),
    });
    expect(active).toMatchObject({ status: "active", generation: 1 });
    const verifier = await env.get<ConnectExecutorDeviceAuthVerifier>(ConnectExecutorDeviceAuthVerifier);
    expect(await verifier.verify(token)).toMatchObject({
      ok: true,
      actor: { role: "executor_device", executorId: createInput.executorId, generation: 1 },
    });

    const revoked = await logic.revoke(owner, {
      kind: "executor.action.request", protocolVersion: "1.0",
      executorId: createInput.executorId, action: "revoke",
      idempotencyKey: "idem_registry_revoke_0001", correlationId: "cor_registry03",
    });
    expect(revoked.outcome).toBe("revoked");
    if (revoked.outcome !== "revoked") throw new Error("Expected revoked executor");
    expect(revoked.executor.credential_generation).toBe(2);
    expect(await credentialRepo.findByTokenHash({
      token_hash: credentials.hashToken(token),
    })).toMatchObject({ status: "revoked", generation: 1 });
    expect(await verifier.verify(token)).toEqual({ ok: false });

    const audit = await rows(
      "SELECT event_kind FROM connect_executor_audit_events ORDER BY occurred_at, audit_event_id",
    ) as Array<{ event_kind: string }>;
    expect(audit.map((row) => row.event_kind)).toEqual([
      "claim.created", "claim.accepted", "executor.revoked",
    ]);
  });

  it("fails closed when an idempotent retry changes fingerprint or token", async () => {
    const actor = {
      role: "executor_device" as const, executorId: createInput.executorId,
      deviceId: createInput.deviceId, generation: 0,
    };
    expect((await logic.createClaim(actor, createInput, token)).outcome).toBe("created");
    expect((await logic.createClaim(
      actor, { ...createInput, keyFingerprint: "b".repeat(64) }, token,
    )).outcome).toBe("conflict");
    expect((await logic.createClaim(
      actor, createInput, Buffer.alloc(32, 8).toString("base64url"),
    )).outcome).toBe("conflict");
  });

  it("fails closed on a fresh claim after denial and rejects replay by another account", async () => {
    const actor = {
      role: "executor_device" as const, executorId: createInput.executorId,
      deviceId: createInput.deviceId, generation: 0,
    };
    expect((await logic.createClaim(actor, createInput, token)).outcome).toBe("created");
    await insertAccount("usr_registry01", "registry.one");
    await insertAccount("usr_registry02", "registry.two");
    const decision = {
      kind: "executor.claim.decision.request" as const, protocolVersion: "1.0" as const,
      claimId: createInput.claimId, sessionId: "ses_registry01",
      actorRole: "browser_session" as const, decision: "deny" as const,
      idempotencyKey: "idem_registry_deny_000001", correlationId: "cor_registrydeny",
    };
    expect(await logic.decide({
      role: "browser_session", userId: "usr_registry01", sessionId: "ses_registry01",
    }, decision)).toEqual({ outcome: "denied" });
    expect(await logic.decide({
      role: "browser_session", userId: "usr_registry02", sessionId: "ses_registry02",
    }, decision)).toEqual({ outcome: "replayed" });
    await expect(logic.createClaim(actor, {
      ...createInput,
      claimId: "clm_registry02",
      idempotencyKey: "idem_registry_create_0002",
      correlationId: "cor_registryfresh",
    }, Buffer.alloc(32, 9).toString("base64url"))).rejects.toThrow(/unique constraint/i);
    const executorRepo = await env.get<ConnectExecutorRepo>(ConnectExecutorRepo);
    expect(await executorRepo.findByExecutorId({
      executor_id: createInput.executorId,
    })).toMatchObject({ state: "pending", owner_user_id: null });
  });

  it("reports expiry and never lets an expired challenge create ownership or credentials", async () => {
    const actor = {
      role: "executor_device" as const, executorId: createInput.executorId,
      deviceId: createInput.deviceId, generation: 0,
    };
    expect((await logic.createClaim(actor, createInput, token)).outcome).toBe("created");
    await rows(
      "UPDATE connect_executor_claims SET created_at = $1, expires_at = $2 WHERE claim_id = $3",
      ["1999-01-01T00:00:00.000Z", "2000-01-01T00:00:00.000Z", createInput.claimId],
    );
    expect(await logic.claimStatus(actor, createInput.claimId, token)).toEqual({
      outcome: "status", status: "expired",
    });
    await insertAccount("usr_registry01", "registry.owner");
    expect(await logic.decide({
      role: "browser_session", userId: "usr_registry01", sessionId: "ses_registry01",
    }, {
      kind: "executor.claim.decision.request", protocolVersion: "1.0",
      claimId: createInput.claimId, sessionId: "ses_registry01",
      actorRole: "browser_session", decision: "accept",
      idempotencyKey: "idem_registry_expired_001", correlationId: "cor_registryexpired",
    })).toEqual({ outcome: "expired" });
    const executorRepo = await env.get<ConnectExecutorRepo>(ConnectExecutorRepo);
    expect(await executorRepo.findByExecutorId({
      executor_id: createInput.executorId,
    })).toMatchObject({ state: "pending", owner_user_id: null, credential_generation: 0 });
    const credentialRepo = await env.get<ConnectExecutorCredentialRepo>(ConnectExecutorCredentialRepo);
    expect(await credentialRepo.findByTokenHash({
      token_hash: credentials.hashToken(token),
    })).toBeNull();
  });

  it("requires an active browser session as well as matching CSRF for mutations", async () => {
    const now = new Date();
    const policy = await env.get<ConnectAuthPolicy>(ConnectAuthPolicy);
    const sessionRepo = await env.get<ConnectBrowserSessionRepo>(ConnectBrowserSessionRepo);
    const sessions = await env.get<ConnectSessionAuthService>(ConnectSessionAuthService);
    const resolver = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    const sessionToken = Buffer.alloc(32, 3).toString("base64url");
    const csrfToken = Buffer.alloc(32, 4).toString("base64url");
    await insertAccount("usr_mutation01", "mutation.owner");
    await sessionRepo.createSession({
      session_id: "ses_mutation01",
      user_id: "usr_mutation01",
      session_token_hash: credentials.hashToken(sessionToken),
      csrf_token_hash: credentials.hashToken(csrfToken),
      status: "active",
      created_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      idle_expires_at: new Date(now.getTime() + 60_000).toISOString(),
      absolute_expires_at: new Date(now.getTime() + 120_000).toISOString(),
    });
    const request = {
      cookies: {
        [policy.sessionCookieName]: sessionToken,
        [policy.csrfCookieName]: csrfToken,
      },
      headers: { "x-csrf-token": csrfToken },
    } as unknown as Request;
    expect(await resolver.browser(request, "ses_mutation01", true)).toMatchObject({
      ok: true,
      actor: { role: "browser_session", userId: "usr_mutation01" },
    });
    await sessionRepo.revokeSession({
      session_id: "ses_mutation01", revoked_at: new Date().toISOString(),
    });
    expect(await sessions.authorizeLogout(sessionToken, csrfToken, csrfToken)).toMatchObject({
      ok: true,
    });
    expect(await resolver.browser(request, "ses_mutation01", true)).toEqual({
      ok: false, reason: "unauthorized",
    });
  });
});
