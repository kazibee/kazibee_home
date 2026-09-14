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
 * Each case owns a fresh SQLStack PostgreSQL fixture from an independently
 * authored schema, plain SQL initial rows, and an original-config testApp
 * that resolves the repo under test; no migrated template or shared reset.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import ConnectExecutorRepo from "../../src/server/repo/connect_executor_repo";
import ConnectExecutorClaimRepo from "../../src/server/repo/connect_executor_claim_repo";
import ConnectDesktopDeviceRepo from "../../src/server/repo/connect_desktop_device_repo";
import ConnectDesktopClaimRepo from "../../src/server/repo/connect_desktop_claim_repo";
import RemoteWorkspaceRepo from "../../src/server/repo/remote_workspace_repo";
import Env from "../../src/server/services/env";
import { executorRegistrySchema } from "../schemas/executor-registry";
import { connectDesktopSchema } from "../schemas/connect-desktop";
import { remoteWorkspaceSchema } from "../schemas/remote-workspace";

const CONFIG = path.resolve(__dirname, "../../noego.config.yml");

const hash64 = (pair: string) => pair.repeat(32);
const iso = (value: unknown) => new Date(value as string).toISOString();

const T1 = "2026-01-01T00:00:00.000Z";
const T2 = "2026-02-01T00:00:00.000Z";
const T3 = "2026-03-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";
const OWNER = "usr_connect001";

const ADMIN = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };

async function insertAccount(fixture: TestPostgresDatabase, userId: string): Promise<void> {
  const suffix = userId.replace(/^usr_/, "").toLowerCase();
  await fixture.query(
    `INSERT INTO connect_accounts (user_id, username, email, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())`,
    [userId, `owner_${suffix}`, `owner_${suffix}@example.com`],
  );
}

/** Pending executor (no owner, generation 0) or, with an owner, an active claimed one at generation 1. */
async function insertExecutor(
  fixture: TestPostgresDatabase, executorId: string, createdAt: string, owner: string | null = null,
): Promise<void> {
  await fixture.query(
    `INSERT INTO connect_executors (
       executor_id, device_id, owner_user_id, display_name, platform, architecture,
       executor_version, key_fingerprint, state, credential_generation,
       created_at, claimed_at, updated_at, last_seen_at
     ) VALUES ($1, $2, $3, $4, 'linux', 'x64', '1.0.0', $5, $6, $7, $8, $9, $10, $8)`,
    [
      executorId, `dev_${executorId.slice(4)}`, owner, `Executor ${executorId}`, "e".repeat(64),
      owner ? "active" : "pending", owner ? 1 : 0,
      createdAt, owner ? T3 : null, owner ? T3 : createdAt,
    ],
  );
}

/** Pending desktop (no owner, generation 0) or, with an owner, an active claimed one at generation 1. */
async function insertDesktop(
  fixture: TestPostgresDatabase, deviceId: string, createdAt: string, owner: string | null = null,
): Promise<void> {
  await fixture.query(
    `INSERT INTO connect_desktop_devices (
       device_id, owner_user_id, display_name, platform, architecture, desktop_version,
       key_fingerprint, state, credential_generation, created_at, claimed_at, updated_at, last_seen_at
     ) VALUES ($1, $2, $3, 'macos', 'arm64', '1.0.0', $4, $5, $6, $7, $8, $9, $7)`,
    [
      deviceId, owner, `Desktop ${deviceId}`, "d".repeat(64),
      owner ? "active" : "pending", owner ? 1 : 0,
      createdAt, owner ? T3 : null, owner ? T3 : createdAt,
    ],
  );
}

describe("ConnectExecutorRepo", () => {
  it("lists owned executors newest-first with a limit, and empty for strangers", resourceCase(async () => {
    const fixture = await testPostgres(executorRegistrySchema, ADMIN).build();
    await insertAccount(fixture, OWNER);
    await insertExecutor(fixture, "exe_own000001", T1, OWNER);
    await insertExecutor(fixture, "exe_own000002", T2, OWNER);
    await insertExecutor(fixture, "exe_own000003", T3, OWNER);
    await insertExecutor(fixture, "exe_unclaimed", T1);
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => { const value = new Env(); value.load({ DATABASE_URL: fixture.url }); return value; })
      .build();
    const executorRepo = await env.get<ConnectExecutorRepo>(ConnectExecutorRepo);

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
  }));

  it("updatePresence touches only the active executor at the fenced generation", resourceCase(async () => {
    const fixture = await testPostgres(executorRegistrySchema, ADMIN).build();
    await insertAccount(fixture, OWNER);
    await insertExecutor(fixture, "exe_own000001", T1, OWNER);
    await insertExecutor(fixture, "exe_own000002", T2, OWNER);
    await insertExecutor(fixture, "exe_own000003", T3, OWNER);
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => { const value = new Env(); value.load({ DATABASE_URL: fixture.url }); return value; })
      .build();
    const executorRepo = await env.get<ConnectExecutorRepo>(ConnectExecutorRepo);

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
  }));
});

describe("ConnectExecutorClaimRepo", () => {
  it("finds pending claims by short-code hash and null for unknown hashes", resourceCase(async () => {
    const fixture = await testPostgres(executorRegistrySchema, ADMIN).build();
    await insertExecutor(fixture, "exe_unclaimed", T1);
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(Env, () => { const value = new Env(); value.load({ DATABASE_URL: fixture.url }); return value; })
      .build();
    const executorClaimRepo = await env.get<ConnectExecutorClaimRepo>(ConnectExecutorClaimRepo);

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
  }));
});

describe("ConnectDesktopDeviceRepo / ConnectDesktopClaimRepo", () => {
  it("lists owned desktops newest-first with a limit, and empty for strangers", resourceCase(async () => {
    const fixture = await testPostgres(connectDesktopSchema, ADMIN).build();
    await insertAccount(fixture, OWNER);
    await insertDesktop(fixture, "dev_desk0001", T1, OWNER);
    await insertDesktop(fixture, "dev_desk0002", T2, OWNER);
    await insertDesktop(fixture, "dev_deskfree", T1);
    const env = await testApp(CONFIG).select({ server: { module: ["connectDesktops"] } })
      .function(Env, () => { const value = new Env(); value.load({ DATABASE_URL: fixture.url }); return value; })
      .build();
    const desktopRepo = await env.get<ConnectDesktopDeviceRepo>(ConnectDesktopDeviceRepo);

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
  }));

  it("finds pending desktop claims by short-code hash and null for unknown hashes", resourceCase(async () => {
    const fixture = await testPostgres(connectDesktopSchema, ADMIN).build();
    await insertDesktop(fixture, "dev_deskfree", T1);
    const env = await testApp(CONFIG).select({ server: { module: ["connectDesktops"] } })
      .function(Env, () => { const value = new Env(); value.load({ DATABASE_URL: fixture.url }); return value; })
      .build();
    const desktopClaimRepo = await env.get<ConnectDesktopClaimRepo>(ConnectDesktopClaimRepo);

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
  }));
});

describe("RemoteWorkspaceRepo", () => {
  it("takes the (executor, local) slot once, refreshes on conflict, and finds by id", resourceCase(async () => {
    const fixture = await testPostgres(remoteWorkspaceSchema, ADMIN).build();
    await insertAccount(fixture, OWNER);
    await insertExecutor(fixture, "exe_own000001", T1, OWNER);
    const env = await testApp(CONFIG).select({ server: { module: ["remoteTools"] } })
      .function(Env, () => { const value = new Env(); value.load({ DATABASE_URL: fixture.url }); return value; })
      .build();
    const remoteWorkspaceRepo = await env.get<RemoteWorkspaceRepo>(RemoteWorkspaceRepo);

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
  }));
});
