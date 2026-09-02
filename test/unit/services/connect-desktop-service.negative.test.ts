/**
 * Negative-path coverage for ConnectDesktopService with a LIVE-looking
 * transaction: `currentTransaction` is mocked so the rollbackOnly error
 * mapping (Error vs non-Error) runs for real, plus the persistence
 * invariant throws and the terminal-decision failure guards.
 *
 * The service is constructed directly with plain fakes — none of its own
 * methods carry @transaction, so no database is needed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import ConnectDesktopService from "../../../src/server/services/connect_desktop_service";
import ConnectDesktopPolicy from "../../../src/server/services/connect_desktop_policy";
import type { ConnectDesktopActor } from "../../../src/server/services/connect_desktop_actor_resolver";

const rollbackOnly = vi.fn();

vi.mock("sqlstack", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  currentTransaction: () => ({ rollbackOnly }),
}));

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

/** Sequential async stub: call N resolves to value N (last value repeats). */
function seq<T>(...values: T[]) {
  let call = 0;
  return vi.fn(async () => values[Math.min(call++, values.length - 1)]);
}

type Overrides = Partial<Record<
  "devices" | "claims" | "credentialsRepo" | "audit" | "relay" | "deploymentIdentity",
  Record<string, unknown>
>>;

function service(overrides: Overrides = {}) {
  const nothing = vi.fn(async () => null);
  const done = vi.fn(async () => undefined);
  const devices = {
    findByDeviceId: nothing, createDevice: done, acceptOwner: done,
    renameOwned: done, revokeOwned: done, listByOwner: vi.fn(async () => []),
    ...overrides.devices,
  };
  const claims = {
    findByIdempotencyKey: nothing, findByClaimId: nothing, findByCodeHash: nothing,
    createClaim: done, acceptPending: done, denyPending: done,
    ...overrides.claims,
  };
  const credentialsRepo = {
    findByTokenHash: nothing, createCredential: done, revokeForDevice: done,
    ...overrides.credentialsRepo,
  };
  const audit = { appendEvent: done, ...overrides.audit };
  const credentials = {
    hashToken: (token: string) => sha256(token),
    matchesHash: (token: string, hash: string) => sha256(token) === hash,
  };
  const ids = { credentialId: () => "crd_00000001", auditEventId: () => "aud_00000001" };
  const clock = { now: () => NOW };
  const logger = { info: vi.fn(), error: vi.fn() };
  const loggers = { forSource: () => logger };
  const trace = { info: vi.fn(), error: vi.fn() };
  const traces = { forSource: () => trace };
  const relay = { revokeDesktop: vi.fn(), ...overrides.relay };
  const deploymentIdentity = { get: vi.fn(async () => "wdp_" + "a".repeat(32)), ...overrides.deploymentIdentity };
  return new ConnectDesktopService(
    devices as never, claims as never, credentialsRepo as never, audit as never,
    credentials as never, ids as never, clock as never, new ConnectDesktopPolicy(),
    loggers as never, traces as never, relay as never, deploymentIdentity as never,
  );
}

beforeEach(() => {
  rollbackOnly.mockClear();
});

describe("createClaim negative paths (transaction present)", () => {
  it("fails and rolls back when the persisted claim cannot be re-read", async () => {
    const subject = service({
      claims: { findByClaimId: seq(null, null) },
      devices: { findByDeviceId: vi.fn(async () => device) },
    });
    expect(await subject.createClaim(createBody as never, TOKEN)).toEqual({ outcome: "failed" });
    expect(rollbackOnly).toHaveBeenCalledTimes(1);
    expect((rollbackOnly.mock.calls[0]![0] as Error).message).toBe("Claim persistence invariant failed");
  });

  it("wraps a non-Error throw before rolling back and reports failed", async () => {
    const subject = service({
      claims: { findByIdempotencyKey: vi.fn(async () => { throw "disk gone"; }) },
    });
    expect(await subject.createClaim(createBody as never, TOKEN)).toEqual({ outcome: "failed" });
    expect((rollbackOnly.mock.calls[0]![0] as Error).message).toBe("Claim creation failed");
  });

  it("rolls back with the original error on a unique-constraint conflict", async () => {
    const unique = new Error("UNIQUE constraint failed: connect_desktop_claims.claim_id");
    const subject = service({
      claims: { findByIdempotencyKey: vi.fn(async () => { throw unique; }) },
    });
    expect(await subject.createClaim(createBody as never, TOKEN)).toEqual({ outcome: "conflict" });
    expect(rollbackOnly).toHaveBeenCalledWith(unique);
  });
});

describe("decide negative paths (transaction present)", () => {
  it("rolls back with the original Error and reports failed", async () => {
    const boom = new Error("boom");
    const subject = service({
      claims: { findByClaimId: vi.fn(async () => { throw boom; }) },
    });
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "failed" });
    expect(rollbackOnly).toHaveBeenCalledWith(boom);
  });

  it("wraps a non-Error throw before rolling back", async () => {
    const subject = service({
      claims: { findByClaimId: vi.fn(async () => { throw "not-an-error"; }) },
    });
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "failed" });
    expect((rollbackOnly.mock.calls[0]![0] as Error).message).toBe("Claim decision failed");
  });

  it("idempotent accepted replay fails closed when the device row is gone", async () => {
    const settled = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const subject = service({
      claims: { findByClaimId: vi.fn(async () => settled) },
      credentialsRepo: { findByTokenHash: vi.fn(async () => credential) },
      devices: { findByDeviceId: vi.fn(async () => null) },
    });
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "failed" });
  });

  it("idempotent accepted replay fails closed when the device owner is someone else", async () => {
    const settled = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const subject = service({
      claims: { findByClaimId: vi.fn(async () => settled) },
      credentialsRepo: { findByTokenHash: vi.fn(async () => credential) },
      devices: { findByDeviceId: vi.fn(async () => ({ ...device, owner_user_id: "usr_other0001" })) },
    });
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "failed" });
  });

  it("accept replays when the accept write is lost entirely", async () => {
    const subject = service({
      claims: { findByClaimId: seq(claim, null) },
    });
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "replayed" });
  });

  it("accept replays when the re-read shows a different idempotency key", async () => {
    const raced = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: "idem_bbbbbbbbbbbbbbbb",
    };
    const subject = service({
      claims: { findByClaimId: seq(claim, raced) },
    });
    expect(await subject.decide(browserActor, decisionBody as never)).toEqual({ outcome: "replayed" });
  });

  it("accept propagates a broken owner invariant after acceptOwner", async () => {
    // decide() returns the acceptClaim promise without awaiting it inside its
    // try, so the invariant rejection reaches the caller (the @transaction
    // logic wrapper) instead of the local catch.
    const decided = {
      ...claim, status: "accepted" as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const subject = service({
      claims: { findByClaimId: seq(claim, decided) },
      devices: { findByDeviceId: vi.fn(async () => ({ ...device, credential_generation: 7 })) },
    });
    await expect(subject.decide(browserActor, decisionBody as never))
      .rejects.toThrow("Claim owner invariant failed");
  });
});

describe("rename/revoke rollback error wrapping (transaction present)", () => {
  it("rename rolls back with the original Error and wraps non-Errors", async () => {
    const boom = new Error("boom");
    const erroring = service({
      devices: {
        findByDeviceId: vi.fn(async () => device),
        renameOwned: vi.fn(async () => { throw boom; }),
      },
    });
    expect(await erroring.rename(browserActor, renameBody as never)).toEqual({ outcome: "failed" });
    expect(rollbackOnly).toHaveBeenCalledWith(boom);

    rollbackOnly.mockClear();
    const stringy = service({
      devices: {
        findByDeviceId: vi.fn(async () => device),
        renameOwned: vi.fn(async () => { throw "oops"; }),
      },
    });
    expect(await stringy.rename(browserActor, renameBody as never)).toEqual({ outcome: "failed" });
    expect((rollbackOnly.mock.calls[0]![0] as Error).message).toBe("Rename failed");
  });

  it("revoke rolls back with the original Error and wraps non-Errors", async () => {
    const boom = new Error("boom");
    const erroring = service({
      devices: {
        findByDeviceId: vi.fn(async () => device),
        revokeOwned: vi.fn(async () => { throw boom; }),
      },
    });
    expect(await erroring.revoke(browserActor, revokeBody as never)).toEqual({ outcome: "failed" });
    expect(rollbackOnly).toHaveBeenCalledWith(boom);

    rollbackOnly.mockClear();
    const stringy = service({
      devices: {
        findByDeviceId: vi.fn(async () => device),
        revokeOwned: vi.fn(async () => { throw "oops"; }),
      },
    });
    expect(await stringy.revoke(browserActor, revokeBody as never)).toEqual({ outcome: "failed" });
    expect((rollbackOnly.mock.calls[0]![0] as Error).message).toBe("Revoke failed");
  });
});

describe("review of an expired pending claim", () => {
  it("reports the claim status as expired", async () => {
    const expired = { ...claim, expires_at: EARLIER_ISO };
    const subject = service({
      claims: { findByClaimId: vi.fn(async () => expired) },
      devices: { findByDeviceId: vi.fn(async () => device) },
    });
    expect(await subject.review({ claimId: CLAIM_ID })).toEqual({
      outcome: "found", claim: expired, device, status: "expired",
    });
  });
});
