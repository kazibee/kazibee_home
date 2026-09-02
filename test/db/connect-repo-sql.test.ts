/**
 * Connect registry repo methods the service flows never reach, against
 * REAL SQL.
 *
 * The executor/desktop registry FLOWS are pinned in
 * connect-executor-registry.test.ts and the transaction suites; this file
 * pins the remaining repo surface directly: owner listings (ordering,
 * limit, empty), short-code claim lookups, presence updates (including the
 * generation-fence and revoked-state no-ops), and the remote workspace
 * upsert slot.
 *
 * Harness matches connect-website-deployment-identity.service.test.ts:
 * "full" migrated template database via test-db.ts and plain `new` repos.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "sqlstack";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db";
import ConnectExecutorRepo from "../../src/server/repo/connect_executor_repo";
import ConnectExecutorClaimRepo from "../../src/server/repo/connect_executor_claim_repo";
import ConnectDesktopDeviceRepo from "../../src/server/repo/connect_desktop_device_repo";
import ConnectDesktopClaimRepo from "../../src/server/repo/connect_desktop_claim_repo";
import RemoteWorkspaceRepo from "../../src/server/repo/remote_workspace_repo";

let database: Database;

const executorRepo = new ConnectExecutorRepo();
const executorClaimRepo = new ConnectExecutorClaimRepo();
const desktopRepo = new ConnectDesktopDeviceRepo();
const desktopClaimRepo = new ConnectDesktopClaimRepo();
const remoteWorkspaceRepo = new RemoteWorkspaceRepo();

const hash64 = (pair: string) => pair.repeat(32);
const iso = (value: unknown) => new Date(value as string).toISOString();

const T1 = "2026-01-01T00:00:00.000Z";
const T2 = "2026-02-01T00:00:00.000Z";
const T3 = "2026-03-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";
const OWNER = "usr_connect001";

async function insertAccount(userId: string): Promise<void> {
  const suffix = userId.replace(/^usr_/, "").toLowerCase();
  await database.query(
    `INSERT INTO connect_accounts (user_id, username, email, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())`,
    [userId, `owner_${suffix}`, `owner_${suffix}@example.com`],
  );
}

async function insertExecutor(executorId: string, createdAt: string): Promise<void> {
  await executorRepo.createExecutor({
    executor_id: executorId,
    device_id: `dev_${executorId.slice(4)}`,
    display_name: `Executor ${executorId}`,
    platform: "linux",
    architecture: "x64",
    executor_version: "1.0.0",
    key_fingerprint: "e".repeat(64),
    created_at: createdAt,
    updated_at: createdAt,
    last_seen_at: createdAt,
  });
}

async function insertDesktop(deviceId: string, createdAt: string): Promise<void> {
  await desktopRepo.createDevice({
    device_id: deviceId,
    display_name: `Desktop ${deviceId}`,
    platform: "macos",
    architecture: "arm64",
    desktop_version: "1.0.0",
    key_fingerprint: "d".repeat(64),
    created_at: createdAt,
    updated_at: createdAt,
    last_seen_at: createdAt,
  });
}

beforeAll(async () => {
  database = await resetTestDatabase();
  await insertAccount(OWNER);
});

afterAll(async () => {
  await closeTestDatabase();
});

describe("ConnectExecutorRepo", () => {
  it("lists owned executors newest-first with a limit, and empty for strangers", async () => {
    await insertExecutor("exe_own000001", T1);
    await insertExecutor("exe_own000002", T2);
    await insertExecutor("exe_own000003", T3);
    await insertExecutor("exe_unclaimed", T1);
    for (const executorId of ["exe_own000001", "exe_own000002", "exe_own000003"]) {
      await executorRepo.acceptOwner({
        executor_id: executorId, owner_user_id: OWNER, claimed_at: T3,
      });
    }

    const listed = await executorRepo.listByOwner({ owner_user_id: OWNER, limit: 10 });
    expect(listed.map((executor) => executor.executor_id))
      .toEqual(["exe_own000003", "exe_own000002", "exe_own000001"]);
    expect(listed[0]).toMatchObject({ state: "active", owner_user_id: OWNER });

    expect(
      (await executorRepo.listByOwner({ owner_user_id: OWNER, limit: 2 }))
        .map((executor) => executor.executor_id),
    ).toEqual(["exe_own000003", "exe_own000002"]);
    expect(await executorRepo.listByOwner({ owner_user_id: "usr_nobody", limit: 10 }))
      .toEqual([]);
  });

  it("updatePresence touches only the active executor at the fenced generation", async () => {
    await executorRepo.updatePresence({
      executor_id: "exe_own000001", device_id: "dev_own000001",
      credential_generation: 1, last_seen_at: FUTURE,
    });
    const touched = await executorRepo.findByExecutorId({ executor_id: "exe_own000001" });
    expect(iso(touched?.last_seen_at)).toBe(FUTURE);

    // Stale generation: fenced out, row untouched.
    await executorRepo.updatePresence({
      executor_id: "exe_own000002", device_id: "dev_own000002",
      credential_generation: 0, last_seen_at: FUTURE,
    });
    const fenced = await executorRepo.findByExecutorId({ executor_id: "exe_own000002" });
    expect(iso(fenced?.last_seen_at)).toBe(T2);

    // Revoked executors never surface presence again.
    await executorRepo.revokeOwned({
      executor_id: "exe_own000003", owner_user_id: OWNER, updated_at: T3,
    });
    await executorRepo.updatePresence({
      executor_id: "exe_own000003", device_id: "dev_own000003",
      credential_generation: 1, last_seen_at: FUTURE,
    });
    const revoked = await executorRepo.findByExecutorId({ executor_id: "exe_own000003" });
    expect(revoked).toMatchObject({ state: "revoked" });
    expect(iso(revoked?.last_seen_at)).toBe(T3);
  });
});

describe("ConnectExecutorClaimRepo", () => {
  it("finds pending claims by short-code hash and null for unknown hashes", async () => {
    await executorClaimRepo.createClaim({
      claim_id: "clm_exec00001",
      executor_id: "exe_unclaimed",
      bootstrap_token_hash: hash64("1a"),
      short_code_hash: hash64("2b"),
      idempotency_key: "idem_exec_claim_00000001",
      envelope_hash: hash64("3c"),
      created_at: T1,
      expires_at: FUTURE,
    });

    expect(await executorClaimRepo.findByCodeHash({ short_code_hash: hash64("2b") }))
      .toMatchObject({ claim_id: "clm_exec00001", status: "pending", decided_at: null });
    expect(await executorClaimRepo.findByCodeHash({ short_code_hash: hash64("9f") }))
      .toBeNull();
  });
});

describe("ConnectDesktopDeviceRepo / ConnectDesktopClaimRepo", () => {
  it("lists owned desktops newest-first with a limit, and empty for strangers", async () => {
    await insertDesktop("dev_desk0001", T1);
    await insertDesktop("dev_desk0002", T2);
    await insertDesktop("dev_deskfree", T1);
    for (const deviceId of ["dev_desk0001", "dev_desk0002"]) {
      await desktopRepo.acceptOwner({
        device_id: deviceId, owner_user_id: OWNER, claimed_at: T3,
      });
    }

    const listed = await desktopRepo.listByOwner({ owner_user_id: OWNER, limit: 10 });
    expect(listed.map((device) => device.device_id))
      .toEqual(["dev_desk0002", "dev_desk0001"]);
    expect(listed[0]).toMatchObject({ state: "active", owner_user_id: OWNER });
    expect(
      (await desktopRepo.listByOwner({ owner_user_id: OWNER, limit: 1 }))
        .map((device) => device.device_id),
    ).toEqual(["dev_desk0002"]);
    expect(await desktopRepo.listByOwner({ owner_user_id: "usr_nobody", limit: 10 }))
      .toEqual([]);
  });

  it("finds pending desktop claims by short-code hash and null for unknown hashes", async () => {
    await desktopClaimRepo.createClaim({
      claim_id: "clm_desk00001",
      device_id: "dev_deskfree",
      bootstrap_token_hash: hash64("4d"),
      short_code_hash: hash64("5e"),
      idempotency_key: "idem_desk_claim_00000001",
      envelope_hash: hash64("6a"),
      created_at: T1,
      expires_at: FUTURE,
    });

    expect(await desktopClaimRepo.findByCodeHash({ short_code_hash: hash64("5e") }))
      .toMatchObject({ claim_id: "clm_desk00001", status: "pending", decided_at: null });
    expect(await desktopClaimRepo.findByCodeHash({ short_code_hash: hash64("8c") }))
      .toBeNull();
  });
});

describe("RemoteWorkspaceRepo", () => {
  it("takes the (executor, local) slot once, refreshes on conflict, and finds by id", async () => {
    const created = await remoteWorkspaceRepo.upsertRemoteWorkspace({
      remote_workspace_id: "rws_" + "1a".repeat(16),
      user_id: OWNER,
      executor_id: "exe_own000001",
      local_workspace_id: "wrk_local0001",
      display_name: "First name",
      now: T1,
    });
    expect(created).toMatchObject({
      remote_workspace_id: "rws_" + "1a".repeat(16),
      executor_id: "exe_own000001",
      display_name: "First name",
    });

    // Same slot again: the original remote id survives, the name refreshes.
    const refreshed = await remoteWorkspaceRepo.upsertRemoteWorkspace({
      remote_workspace_id: "rws_" + "2b".repeat(16),
      user_id: OWNER,
      executor_id: "exe_own000001",
      local_workspace_id: "wrk_local0001",
      display_name: "Renamed",
      now: T2,
    });
    expect(refreshed).toMatchObject({
      remote_workspace_id: "rws_" + "1a".repeat(16),
      display_name: "Renamed",
    });

    expect(await remoteWorkspaceRepo.findRemoteWorkspace({
      remote_workspace_id: "rws_" + "1a".repeat(16),
    })).toMatchObject({ display_name: "Renamed", local_workspace_id: "wrk_local0001" });
    expect(await remoteWorkspaceRepo.findRemoteWorkspace({
      remote_workspace_id: "rws_" + "9f".repeat(16),
    })).toBeNull();
  });
});
