/**
 * Original three repository cases: real PostgreSQL and production SQL, including
 * UPDATE/CTE RETURNING row shape, replay denial, expiry and session touches.
 * Each case now owns an explicit schema/data fixture and original Agent config
 * root. The parent tables are a declared subset, not full migration equivalence.
 */
import { describe, expect, it } from 'vitest';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
import { testPostgres, DEFAULT_ADMIN_URL } from 'sqlstack/testing';
import ConnectAgentSessionRepo from '../../src/server/repo/connect_agent_session_repo';
import Env from '../../src/server/services/env';

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-01T00:00:30.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";
const USER = "usr_agent00001";
const EXECUTOR = "exe_agentsession001";
const hash64 = (pair: string) => pair.repeat(32);

const schema = { version: 1, dialect: 'postgres', tables: {
  connect_accounts: { columns: { user_id: { type: 'text', primary: true } } },
  connect_executors: { columns: {
    executor_id: { type: 'text', primary: true }, owner_user_id: { type: 'text', nullable: false },
  } },
}, sql: [`
  ALTER TABLE connect_executors ADD FOREIGN KEY (owner_user_id) REFERENCES connect_accounts(user_id);
  CREATE TABLE connect_agent_handoffs (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
    executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
  );
  CREATE TABLE connect_agent_sessions (
    session_id TEXT PRIMARY KEY,
    session_token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
    executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id),
    created_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    idle_expires_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
  );
`] };

describe("ConnectAgentSessionRepo handoffs", () => {
  it("consumes a fresh handoff exactly once and returns the row (not a write result)", resourceCase(async () => {
    const fixture = await testPostgres(schema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).data({ connect_accounts: [{ user_id: USER }], connect_executors: [{ executor_id: EXECUTOR, owner_user_id: USER }] }).build();
    const app = await testApp('./apps/agent/noego.config.yml').select({ server: { module: ['agent'] } })
      .function(Env, () => { const env = new Env(); env.load({ DATABASE_URL: fixture.url }); return env; }).build();
    const repo = await app.get<ConnectAgentSessionRepo>(ConnectAgentSessionRepo);

    await repo.createHandoff({
      token_hash: hash64("a1"), user_id: USER, executor_id: EXECUTOR,
      created_at: NOW, expires_at: FUTURE,
    });

    const consumed = await repo.consumeHandoff({ token_hash: hash64("a1"), consumed_at: LATER });
    expect(consumed).toMatchObject({ token_hash: hash64("a1"), user_id: USER, executor_id: EXECUTOR });
    expect(consumed?.consumed_at).not.toBeNull();

    // Replay: already consumed.
    expect(await repo.consumeHandoff({ token_hash: hash64("a1"), consumed_at: LATER })).toBeNull();
  }));

  it("never consumes expired or unknown handoffs", resourceCase(async () => {
    const fixture = await testPostgres(schema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).data({ connect_accounts: [{ user_id: USER }], connect_executors: [{ executor_id: EXECUTOR, owner_user_id: USER }] }).build();
    const app = await testApp('./apps/agent/noego.config.yml').select({ server: { module: ['agent'] } })
      .function(Env, () => { const env = new Env(); env.load({ DATABASE_URL: fixture.url }); return env; }).build();
    const repo = await app.get<ConnectAgentSessionRepo>(ConnectAgentSessionRepo);

    await repo.createHandoff({
      token_hash: hash64("a2"), user_id: USER, executor_id: EXECUTOR,
      created_at: PAST, expires_at: PAST,
    });
    expect(await repo.consumeHandoff({ token_hash: hash64("a2"), consumed_at: NOW })).toBeNull();
    expect(await repo.consumeHandoff({ token_hash: hash64("a9"), consumed_at: NOW })).toBeNull();
  }));
});

describe("ConnectAgentSessionRepo sessions", () => {
  it("creates, finds by token hash, touches, and misses unknown tokens", resourceCase(async () => {
    const fixture = await testPostgres(schema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).data({ connect_accounts: [{ user_id: USER }], connect_executors: [{ executor_id: EXECUTOR, owner_user_id: USER }] }).build();
    const app = await testApp('./apps/agent/noego.config.yml').select({ server: { module: ['agent'] } })
      .function(Env, () => { const env = new Env(); env.load({ DATABASE_URL: fixture.url }); return env; }).build();
    const repo = await app.get<ConnectAgentSessionRepo>(ConnectAgentSessionRepo);

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
  }));
});
