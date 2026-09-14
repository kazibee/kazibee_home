/**
 * Negative-path coverage for ConnectDesktopService with a LIVE SQLStack
 * transaction on a fresh PostgreSQL fixture: the rollbackOnly error mapping
 * (Error vs non-Error) runs against the actual TransactionHandle of the
 * app's own database entry, and a sentinel row inserted through the
 * transaction connection proves the transaction really rolled back. The
 * persistence-invariant throws and terminal-decision failure guards run on
 * the same real subject without a transaction or database fixture.
 *
 * The subject is the production ConnectDesktopService resolved from the
 * original-config root testApp (connectDesktops module). Only the repository,
 * clock, relay and deployment-identity boundaries are replaced with singular
 * method controls; the environment is supplied by a caller-built Env.
 * resourceCase owns environment and fixture cleanup.
 */
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import path from "node:path";
import { ExecutionContext } from "@noego/ioc";
import { testApp, type AppTestBuilder } from "@noego/app";
import { resourceCase, testStub, test as control } from "@noego/testing";
import { SqlStack, TransactionHandle, getActiveTransaction, withTransaction } from "sqlstack";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import Env from "../../src/server/services/env";
import ConnectDesktopService from "../../src/server/services/connect_desktop_service";
import type { ConnectDesktopActor } from "../../src/server/services/connect_desktop_actor_resolver";
import { ConnectClock } from "../../src/server/services/connect_auth_primitives";
import ConnectClientRelayService from "../../src/server/services/connect_client_relay_service";
import ConnectWebsiteDeploymentIdentityService from "../../src/server/services/connect_website_deployment_identity_service";
import ConnectDesktopDeviceRepo from "../../src/server/repo/connect_desktop_device_repo";
import ConnectDesktopClaimRepo from "../../src/server/repo/connect_desktop_claim_repo";
import ConnectDesktopCredentialRepo from "../../src/server/repo/connect_desktop_credential_repo";
import ConnectDesktopAuditRepo from "../../src/server/repo/connect_desktop_audit_repo";

const CONFIG = path.resolve(__dirname, "../../noego.config.yml");
const SELECT = { server: { module: ["connectDesktops"] } } as const;

// Independently authored minimal fixture DDL: one probe table whose only job
// is to prove the transaction really rolled back. No production migration
// files, migrated templates or seed services.
const PROBE_SCHEMA = {
  version: 1, dialect: "postgres",
  sql: ["CREATE TABLE rollback_probe (id INTEGER PRIMARY KEY);"],
};
const PROBE_OPTIONS = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const NOW = new Date("2026-01-01T00:00:00.000Z");
const NOW_ISO = NOW.toISOString();
const LATER_ISO = new Date(NOW.getTime() + 60_000).toISOString();
const EARLIER_ISO = new Date(NOW.getTime() - 60_000).toISOString();
const TOKEN = "B".repeat(43);
const TOKEN_HASH = sha256(TOKEN);
const CLAIM_ID = "clm_abcdefgh";
const DEVICE_ID = "dev_abcdefgh";
const USER_ID = "usr_owner001";
const IDEM = "idem_aaaaaaaaaaaaaaaa";
const DEPLOYMENT_ID = "wdp_" + "a".repeat(32);

const claim = {
  claim_id: CLAIM_ID, device_id: DEVICE_ID, bootstrap_token_hash: TOKEN_HASH,
  short_code_hash: "x", idempotency_key: IDEM, envelope_hash: "y",
  status: "pending" as const, created_at: NOW_ISO, expires_at: LATER_ISO,
  decided_at: null, decided_by_user_id: null, decision_idempotency_key: null,
};
const device = {
  device_id: DEVICE_ID, owner_user_id: USER_ID, display_name: "My Desktop",
  platform: "macos" as const, architecture: "arm64" as const, desktop_version: "1.2.3",
  key_fingerprint: "a".repeat(64), state: "active" as const, credential_generation: 1,
  created_at: NOW_ISO, claimed_at: NOW_ISO, updated_at: NOW_ISO, last_seen_at: NOW_ISO,
};
const credential = {
  credential_id: "cred_1", device_id: DEVICE_ID, generation: 1,
  token_hash: TOKEN_HASH, audience: "desktop-relay", status: "active" as const,
  created_at: NOW_ISO, expires_at: LATER_ISO, revoked_at: null,
};
const browserActor: ConnectDesktopActor = {
  role: "browser_session", userId: USER_ID, sessionId: "ses_fixed0001",
};

const createBody = {
  kind: "desktop.claim.create.request", protocolVersion: "1.0",
  claimId: CLAIM_ID, deviceId: DEVICE_ID, actorRole: "desktop_device",
  displayName: "My Desktop", platform: "macos", architecture: "arm64",
  desktopVersion: "1.2.3", keyFingerprint: "a".repeat(64),
  idempotencyKey: IDEM, correlationId: "cor_abcdefgh",
};
const decisionBody = {
  kind: "desktop.claim.decision.request", protocolVersion: "1.0", claimId: CLAIM_ID,
  sessionId: "ses_fixed0001", actorRole: "browser_session", decision: "accept",
  idempotencyKey: IDEM, correlationId: "cor_abcdefgh",
};
const renameBody = {
  kind: "desktop.rename.request", protocolVersion: "1.0", deviceId: DEVICE_ID,
  displayName: "Renamed", idempotencyKey: IDEM, correlationId: "cor_abcdefgh",
};
const revokeBody = {
  kind: "desktop.action.request", protocolVersion: "1.0", deviceId: DEVICE_ID,
  action: "revoke", idempotencyKey: IDEM, correlationId: "cor_abcdefgh",
};

const returns = (value: unknown) => control.returns(Promise.resolve(value));

/** Sequential control: call N resolves to value N; a call past the script fails. */
const seq = (...values: unknown[]) => control.calls(values.map(returns));

// The original plain-fake defaults, now as singular method controls on the
// real repository/clock/relay/deployment-identity tokens. Later writes to the
// same token+method win, so cases override only what they need.
const defaults = testStub()
  .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(null))
  .method(ConnectDesktopDeviceRepo, "createDevice", returns(undefined))
  .method(ConnectDesktopDeviceRepo, "acceptOwner", returns(undefined))
  .method(ConnectDesktopDeviceRepo, "renameOwned", returns(undefined))
  .method(ConnectDesktopDeviceRepo, "revokeOwned", returns(undefined))
  .method(ConnectDesktopDeviceRepo, "listByOwner", returns([]))
  .method(ConnectDesktopClaimRepo, "findByIdempotencyKey", returns(null))
  .method(ConnectDesktopClaimRepo, "findByClaimId", returns(null))
  .method(ConnectDesktopClaimRepo, "findByCodeHash", returns(null))
  .method(ConnectDesktopClaimRepo, "createClaim", returns(undefined))
  .method(ConnectDesktopClaimRepo, "acceptPending", returns(undefined))
  .method(ConnectDesktopClaimRepo, "denyPending", returns(undefined))
  .method(ConnectDesktopCredentialRepo, "findByTokenHash", returns(null))
  .method(ConnectDesktopCredentialRepo, "createCredential", returns(undefined))
  .method(ConnectDesktopCredentialRepo, "revokeForDevice", returns(undefined))
  .method(ConnectDesktopAuditRepo, "appendEvent", returns(undefined))
  .method(ConnectClock, "now", control.returns(NOW))
  .method(ConnectClientRelayService, "revokeDesktop", control.returns(undefined))
  .method(ConnectWebsiteDeploymentIdentityService, "get", returns(DEPLOYMENT_ID));

// Environment data for one case: a caller-built Env loaded with exactly the
// fixture's connection string; process.env is never mutated.
const envWith = (url: string) => () => {
  const env = new Env();
  env.load({ DATABASE_URL: url });
  return env;
};

type ProbeFixture = TestPostgresDatabase;
type App = Awaited<ReturnType<AppTestBuilder["build"]>>;

type ProbeRun<T> = {
  /** The subject's direct outcome. */
  result: T;
  /** How the enclosing real transaction settled. */
  settled: { committed: true } | { committed: false; error: unknown };
  /** Rows left in rollback_probe once the transaction settled. */
  probe: unknown;
  /** First argument of every rollbackOnly call on the actual TransactionHandle. */
  rollbackOnly: readonly unknown[];
};

/**
 * Run `body` inside an actual SQLStack transaction on the caller-built app's
 * root: start the transaction, INSERT a sentinel through the transaction's
 * own entry connection, invoke the subject, then report how the transaction
 * settled and whether the sentinel survived. rollbackOnly is observed with a
 * pass-through spy on the real handle (no replacement implementation) that
 * is always restored. Never constructs an application or fixture.
 */
async function inProbeTransaction<T>(app: App, fixture: ProbeFixture, body: () => Promise<T>): Promise<ProbeRun<T>> {
  const stack = await app.get<SqlStack>(SqlStack);
  const spy = vi.spyOn(TransactionHandle.prototype, "rollbackOnly");
  try {
    let result: T | undefined;
    const settled = await ExecutionContext.run(app.root, () => withTransaction(async () => {
      const active = getActiveTransaction(stack.getEntry());
      if (!active) throw new Error("No active transaction for the app's database entry");
      await active.query("INSERT INTO rollback_probe (id) VALUES (1)", []);
      result = await body();
    })).then(
      () => ({ committed: true as const }),
      (error: unknown) => ({ committed: false as const, error }),
    );
    const probe = await fixture.query("SELECT id FROM rollback_probe");
    // Count only the actual entry owned by this root, never another root's handle.
    const rollbackOnly = spy.mock.calls
      .filter((_call, index) => {
        const handle = spy.mock.contexts[index];
        return handle instanceof TransactionHandle && handle.entry === stack.getEntry();
      })
      .map((call) => call[0]);
    return { result: result as T, settled, probe, rollbackOnly };
  } finally {
    spy.mockRestore();
  }
}

describe("createClaim negative paths (transaction present)", () => {
  it("fails and rolls back when the persisted claim cannot be re-read", resourceCase(async () => {
    const fixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const app = await testApp(CONFIG).select(SELECT).function(Env, envWith(fixture.url)).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", seq(null, null))
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(device))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    const run = await inProbeTransaction(app, fixture, () => subject.createClaim(createBody as never, TOKEN));
    expect(run.result).toEqual({ outcome: "failed" });
    expect(run.rollbackOnly).toHaveLength(1);
    expect((run.rollbackOnly[0] as Error).message).toBe("Claim persistence invariant failed");
    expect(run.settled).toEqual({ committed: false, error: run.rollbackOnly[0] });
    expect(run.probe).toEqual([]);
  }));

  it("wraps a non-Error throw before rolling back and reports failed", resourceCase(async () => {
    const fixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const app = await testApp(CONFIG).select(SELECT).function(Env, envWith(fixture.url)).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByIdempotencyKey", control.throws("disk gone"))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    const run = await inProbeTransaction(app, fixture, () => subject.createClaim(createBody as never, TOKEN));
    expect(run.result).toEqual({ outcome: "failed" });
    expect((run.rollbackOnly[0] as Error).message).toBe("Claim creation failed");
    expect(run.settled).toEqual({ committed: false, error: run.rollbackOnly[0] });
    expect(run.probe).toEqual([]);
  }));

  it("rolls back with the original error on a unique-constraint conflict", resourceCase(async () => {
    const unique = new Error("UNIQUE constraint failed: connect_desktop_claims.claim_id");
    const fixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const app = await testApp(CONFIG).select(SELECT).function(Env, envWith(fixture.url)).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByIdempotencyKey", control.throws(unique))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    const run = await inProbeTransaction(app, fixture, () => subject.createClaim(createBody as never, TOKEN));
    expect(run.result).toEqual({ outcome: "conflict" });
    expect(run.rollbackOnly).toHaveLength(1);
    expect(run.rollbackOnly[0]).toBe(unique);
    expect(run.settled).toEqual({ committed: false, error: unique });
    expect(run.probe).toEqual([]);
  }));
});

describe("decide negative paths (transaction present)", () => {
  it("rolls back with the original Error and reports failed", resourceCase(async () => {
    const boom = new Error("boom");
    const fixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const app = await testApp(CONFIG).select(SELECT).function(Env, envWith(fixture.url)).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", control.throws(boom))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    const run = await inProbeTransaction(app, fixture, () => subject.decide(browserActor, decisionBody as never));
    expect(run.result).toEqual({ outcome: "failed" });
    expect(run.rollbackOnly).toHaveLength(1);
    expect(run.rollbackOnly[0]).toBe(boom);
    expect(run.settled).toEqual({ committed: false, error: boom });
    expect(run.probe).toEqual([]);
  }));

  it("wraps a non-Error throw before rolling back", resourceCase(async () => {
    const fixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const app = await testApp(CONFIG).select(SELECT).function(Env, envWith(fixture.url)).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", control.throws("not-an-error"))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    const run = await inProbeTransaction(app, fixture, () => subject.decide(browserActor, decisionBody as never));
    expect(run.result).toEqual({ outcome: "failed" });
    expect((run.rollbackOnly[0] as Error).message).toBe("Claim decision failed");
    expect(run.settled).toEqual({ committed: false, error: run.rollbackOnly[0] });
    expect(run.probe).toEqual([]);
  }));

  it("idempotent accepted replay fails closed when the device row is gone", resourceCase(async () => {
    const settled = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const app = await testApp(CONFIG).select(SELECT).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", returns(settled))
      .method(ConnectDesktopCredentialRepo, "findByTokenHash", returns(credential))
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(null))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "failed" });
  }));

  it("idempotent accepted replay fails closed when the device owner is someone else", resourceCase(async () => {
    const settled = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const app = await testApp(CONFIG).select(SELECT).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", returns(settled))
      .method(ConnectDesktopCredentialRepo, "findByTokenHash", returns(credential))
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns({ ...device, owner_user_id: "usr_other0001" }))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "failed" });
  }));

  it("accept replays when the accept write is lost entirely", resourceCase(async () => {
    const app = await testApp(CONFIG).select(SELECT).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", seq(claim, null))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "replayed" });
  }));

  it("accept replays when the re-read shows a different idempotency key", resourceCase(async () => {
    const raced = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: "idem_bbbbbbbbbbbbbbbb",
    };
    const app = await testApp(CONFIG).select(SELECT).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", seq(claim, raced))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "replayed" });
  }));

  it("accept propagates a broken owner invariant after acceptOwner", resourceCase(async () => {
    // decide() returns the acceptClaim promise without awaiting it inside its
    // try, so the invariant rejection reaches the caller (the @transaction
    // logic wrapper) instead of the local catch.
    const decided = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const app = await testApp(CONFIG).select(SELECT).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", seq(claim, decided))
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns({ ...device, credential_generation: 7 }))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    await expect(subject.decide(browserActor, decisionBody as never))
      .rejects.toThrow("Claim owner invariant failed");
  }));
});

describe("rename/revoke rollback error wrapping (transaction present)", () => {
  it("rename rolls back with the original Error and wraps non-Errors", resourceCase(async () => {
    const boom = new Error("boom");
    const erroringFixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const erroringApp = await testApp(CONFIG).select(SELECT).function(Env, envWith(erroringFixture.url)).use(defaults)
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(device))
      .method(ConnectDesktopDeviceRepo, "renameOwned", control.throws(boom))
      .build();
    const erroring = await erroringApp.get<ConnectDesktopService>(ConnectDesktopService);
    const erroringRun = await inProbeTransaction(erroringApp, erroringFixture,
      () => erroring.rename(browserActor, renameBody as never));
    expect(erroringRun.result).toEqual({ outcome: "failed" });
    expect(erroringRun.rollbackOnly).toHaveLength(1);
    expect(erroringRun.rollbackOnly[0]).toBe(boom);
    expect(erroringRun.settled).toEqual({ committed: false, error: boom });
    expect(erroringRun.probe).toEqual([]);

    const stringyFixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const stringyApp = await testApp(CONFIG).select(SELECT).function(Env, envWith(stringyFixture.url)).use(defaults)
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(device))
      .method(ConnectDesktopDeviceRepo, "renameOwned", control.throws("oops"))
      .build();
    const stringy = await stringyApp.get<ConnectDesktopService>(ConnectDesktopService);
    const stringyRun = await inProbeTransaction(stringyApp, stringyFixture,
      () => stringy.rename(browserActor, renameBody as never));
    expect(stringyRun.result).toEqual({ outcome: "failed" });
    expect((stringyRun.rollbackOnly[0] as Error).message).toBe("Rename failed");
    expect(stringyRun.settled).toEqual({ committed: false, error: stringyRun.rollbackOnly[0] });
    expect(stringyRun.probe).toEqual([]);
  }));

  it("revoke rolls back with the original Error and wraps non-Errors", resourceCase(async () => {
    const boom = new Error("boom");
    const erroringFixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const erroringApp = await testApp(CONFIG).select(SELECT).function(Env, envWith(erroringFixture.url)).use(defaults)
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(device))
      .method(ConnectDesktopDeviceRepo, "revokeOwned", control.throws(boom))
      .build();
    const erroring = await erroringApp.get<ConnectDesktopService>(ConnectDesktopService);
    const erroringRun = await inProbeTransaction(erroringApp, erroringFixture,
      () => erroring.revoke(browserActor, revokeBody as never));
    expect(erroringRun.result).toEqual({ outcome: "failed" });
    expect(erroringRun.rollbackOnly).toHaveLength(1);
    expect(erroringRun.rollbackOnly[0]).toBe(boom);
    expect(erroringRun.settled).toEqual({ committed: false, error: boom });
    expect(erroringRun.probe).toEqual([]);

    const stringyFixture = await testPostgres(PROBE_SCHEMA, PROBE_OPTIONS).build();
    const stringyApp = await testApp(CONFIG).select(SELECT).function(Env, envWith(stringyFixture.url)).use(defaults)
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(device))
      .method(ConnectDesktopDeviceRepo, "revokeOwned", control.throws("oops"))
      .build();
    const stringy = await stringyApp.get<ConnectDesktopService>(ConnectDesktopService);
    const stringyRun = await inProbeTransaction(stringyApp, stringyFixture,
      () => stringy.revoke(browserActor, revokeBody as never));
    expect(stringyRun.result).toEqual({ outcome: "failed" });
    expect((stringyRun.rollbackOnly[0] as Error).message).toBe("Revoke failed");
    expect(stringyRun.settled).toEqual({ committed: false, error: stringyRun.rollbackOnly[0] });
    expect(stringyRun.probe).toEqual([]);
  }));
});

describe("review of an expired pending claim", () => {
  it("reports the claim status as expired", resourceCase(async () => {
    const expired = { ...claim, expires_at: EARLIER_ISO };
    const app = await testApp(CONFIG).select(SELECT).use(defaults)
      .method(ConnectDesktopClaimRepo, "findByClaimId", returns(expired))
      .method(ConnectDesktopDeviceRepo, "findByDeviceId", returns(device))
      .build();
    const subject = await app.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await subject.review({ claimId: CLAIM_ID })).toEqual({
      outcome: "found", claim: expired, device, status: "expired",
    });
  }));
});
