/**
 * Executor registry behavior through the original application and real SQL.
 * Each case owns a fresh SQLStack PostgreSQL fixture from an independently
 * authored repository schema; no migrated template, shared reset or app factory.
 * Historical case names and the full scenario assertions are retained.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import type { CompatRequest as Request } from "@noego/dinner";
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
import Env from "../../src/server/services/env";
import { executorRegistrySchema } from "../schemas/executor-registry";

const CONFIG = path.resolve(__dirname, "../../noego.config.yml");

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

const insertAccount = (fixture: TestPostgresDatabase, userId: string, username: string) =>
  fixture.query(
    "INSERT INTO connect_accounts (user_id, username, email, password_hash, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', now(), now())",
    [userId, username, username.replace(/[^a-z0-9]/g, "") + "@example.com", PASSWORD_HASH],
  );

describe("Connect executor registry", () => {
  it("creates a recoverable challenge, accepts once, and fences credentials on revoke", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const credentials = await env.get<ConnectCredentials>(ConnectCredentials);
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;

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

    await insertAccount(built, "usr_registry01", "registry.owner");
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
  }));

  it("fails closed when an idempotent retry changes fingerprint or token", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const credentials = await env.get<ConnectCredentials>(ConnectCredentials);
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;

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
  }));

  it("fails closed on a fresh claim after denial and rejects replay by another account", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const credentials = await env.get<ConnectCredentials>(ConnectCredentials);
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;

    const actor = {
      role: "executor_device" as const, executorId: createInput.executorId,
      deviceId: createInput.deviceId, generation: 0,
    };
    expect((await logic.createClaim(actor, createInput, token)).outcome).toBe("created");
    await insertAccount(built, "usr_registry01", "registry.one");
    await insertAccount(built, "usr_registry02", "registry.two");
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
  }));

  it("reports expiry and never lets an expired challenge create ownership or credentials", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const credentials = await env.get<ConnectCredentials>(ConnectCredentials);
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;

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
    await insertAccount(built, "usr_registry01", "registry.owner");
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
  }));

  it("requires an active browser session as well as matching CSRF for mutations", resourceCase(async () => {
    const built = await testPostgres(executorRegistrySchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const logic = await env.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const credentials = await env.get<ConnectCredentials>(ConnectCredentials);
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;

    const now = new Date();
    const policy = await env.get<ConnectAuthPolicy>(ConnectAuthPolicy);
    const sessionRepo = await env.get<ConnectBrowserSessionRepo>(ConnectBrowserSessionRepo);
    const sessions = await env.get<ConnectSessionAuthService>(ConnectSessionAuthService);
    const resolver = await env.get<ConnectExecutorActorResolver>(ConnectExecutorActorResolver);
    const sessionToken = Buffer.alloc(32, 3).toString("base64url");
    const csrfToken = Buffer.alloc(32, 4).toString("base64url");
    await insertAccount(built, "usr_mutation01", "mutation.owner");
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
  }));
});
