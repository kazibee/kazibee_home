/**
 * ConnectAgentSessionRepo against REAL SQL.
 *
 * The HTTP/service flows are pinned in the unit tier on repo doubles, which
 * is exactly why the first deploy shipped a consumeHandoff that came back as
 * a write result (bare UPDATE ... RETURNING) instead of the handoff row:
 * the service then inserted a session with user_id undefined and the agent
 * origin answered 500 on every /handoff/:token. This file pins the repo
 * methods against the production migration DDL: handoff issue/consume
 * (fresh, replayed, expired, unknown), session create/find, touch, and the
 * @Single null paths.
 *
 * Harness matches oauth-repo-sql.test.ts: "full" migrated template database
 * via test-db.ts and a plain `new` repo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "sqlstack";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db";
import ConnectAgentSessionRepo from "../../src/server/repo/connect_agent_session_repo";

let database: Database;

const repo = new ConnectAgentSessionRepo();

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-01T00:00:30.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";
const USER = "usr_agent00001";
const EXECUTOR = "exe_agentsession001";
const hash64 = (pair: string) => pair.repeat(32);

beforeAll(async () => {
  database = await resetTestDatabase();
  await database.query(
    `INSERT INTO connect_accounts (user_id, username, email, created_at, updated_at)
     VALUES ($1, 'agent_owner', 'agent_owner@example.com', now(), now())`,
    [USER],
  );
  await database.query(
    `INSERT INTO connect_executors (
       executor_id, device_id, owner_user_id, display_name, platform, architecture,
       executor_version, key_fingerprint, state, credential_generation,
       created_at, claimed_at, updated_at, last_seen_at)
     VALUES ($1, 'dev_agentsess001', $2, 'Agent session executor', 'macos', 'arm64',
       '0.1.0', $3, 'active', 1, $4, $4, $4, $4)`,
    [EXECUTOR, USER, "e".repeat(64), NOW],
  );
});

afterAll(async () => {
  await closeTestDatabase();
});

describe("ConnectAgentSessionRepo handoffs", () => {
  it("consumes a fresh handoff exactly once and returns the row (not a write result)", async () => {
    await repo.createHandoff({
      token_hash: hash64("a1"), user_id: USER, executor_id: EXECUTOR,
      created_at: NOW, expires_at: FUTURE,
    });

    const consumed = await repo.consumeHandoff({ token_hash: hash64("a1"), consumed_at: LATER });
    expect(consumed).toMatchObject({ token_hash: hash64("a1"), user_id: USER, executor_id: EXECUTOR });
    expect(consumed?.consumed_at).not.toBeNull();

    // Replay: already consumed.
    expect(await repo.consumeHandoff({ token_hash: hash64("a1"), consumed_at: LATER })).toBeNull();
  });

  it("never consumes expired or unknown handoffs", async () => {
    await repo.createHandoff({
      token_hash: hash64("a2"), user_id: USER, executor_id: EXECUTOR,
      created_at: PAST, expires_at: PAST,
    });
    expect(await repo.consumeHandoff({ token_hash: hash64("a2"), consumed_at: NOW })).toBeNull();
    expect(await repo.consumeHandoff({ token_hash: hash64("a9"), consumed_at: NOW })).toBeNull();
  });
});

describe("ConnectAgentSessionRepo sessions", () => {
  it("creates, finds by token hash, touches, and misses unknown tokens", async () => {
    await repo.createSession({
      session_id: "ags_" + "1".repeat(32),
      session_token_hash: hash64("b1"),
      user_id: USER,
      executor_id: EXECUTOR,
      created_at: NOW,
      last_seen_at: NOW,
      idle_expires_at: LATER,
      expires_at: FUTURE,
    });

    const found = await repo.findByTokenHash({ session_token_hash: hash64("b1") });
    expect(found).toMatchObject({
      session_id: "ags_" + "1".repeat(32),
      user_id: USER,
      executor_id: EXECUTOR,
      revoked_at: null,
    });
    expect(await repo.findByTokenHash({ session_token_hash: hash64("b9") })).toBeNull();

    await repo.touchSession({
      session_id: "ags_" + "1".repeat(32),
      last_seen_at: LATER,
      idle_expires_at: FUTURE,
    });
    const touched = await repo.findByTokenHash({ session_token_hash: hash64("b1") });
    expect(new Date(String(touched?.last_seen_at)).toISOString()).toBe(LATER);
    expect(new Date(String(touched?.idle_expires_at)).toISOString()).toBe(FUTURE);
  });
});
