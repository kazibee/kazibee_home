/**
 * Connect auth Proper migrations against real PostgreSQL.
 *
 * Runs the real production migration sets — proper.durable.json plus
 * proper.relay.json (the relay set owns the connect_* audit tables) — through
 * the @noego/proper/testing facade on a per-case SQLStack-minted disposable
 * database (SQLSTACK_TEST_PG_URL, port 55433). The facade strips the config
 * connection settings and borrows the fixture's connection; nothing here
 * creates databases or clients by hand.
 *
 * Preserved claims:
 *  - migrating up yields the expected connect_* table list
 *  - a pre-existing unrelated table and its row survive migrations
 *  - connect_accounts rejects an uppercase username (CHECK constraint)
 *  - migrating down removes every connect_* table while leaving the
 *    unrelated table intact; re-up restores the connect tables
 *
 * The connect durable tables are FK-referenced by later durable
 * migrations (oauth_*, remote_*), so "down" rolls back the durable set in
 * full (reverse order) rather than only the create_connect_ subset — the
 * SQLite-era subset rollback is impossible under real FK enforcement.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resourceCase } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL } from "sqlstack/testing";
import { testMigrations, type TestMigrationsEnvironment } from "@noego/proper/testing";

const DURABLE_CONFIG = path.resolve(__dirname, "../../proper.durable.json");
const RELAY_CONFIG = path.resolve(__dirname, "../../proper.relay.json");

// Last relay key BEFORE the two create_connect_* audit migrations. The facade's
// down(target) rolls back every completed key after the target, so this rolls
// back exactly the relay connect audit tables (verified against
// migrations/relay: the two create_connect_*_audit_events keys are the final
// two entries of the ordered relay manifest).
const RELAY_LAST_NON_CONNECT_KEY = "1787072229593_create_messages";

const tableNames = async (env: TestMigrationsEnvironment, like: string) =>
  ((await env.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE $1 ORDER BY table_name`,
    [like],
  )) as Array<{ table_name: string }>).map((row) => row.table_name);

describe("Connect auth Proper migrations", () => {
  it("migrates up, enforces constraints, down, and re-up", resourceCase(async (scope) => {
    const fixture = await testPostgres(
      { version: 1, dialect: "postgres", sql: ["SELECT 1;"] },
      { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL },
    ).build();
    const durable = scope.own(
      await testMigrations(DURABLE_CONFIG).database(fixture).build(),
      "durable-migrations",
    );
    const relay = scope.own(
      await testMigrations(RELAY_CONFIG).database(fixture).build(),
      "relay-migrations",
    );

    await durable.up();
    await relay.up();

    const expectedConnectTables = [
      "connect_accounts",
      "connect_agent_handoffs",
      "connect_agent_sessions",
      "connect_browser_sessions",
      "connect_desktop_audit_events",
      "connect_desktop_claims",
      "connect_desktop_credentials",
      "connect_desktop_devices",
      "connect_executor_audit_events",
      "connect_executor_claims",
      "connect_executor_credentials",
      "connect_executors",
      "connect_identities",
      "connect_website_deployment_identity",
    ];
    expect(await tableNames(durable, "connect\\_%")).toEqual(expectedConnectTables);

    await durable.query(
      "CREATE TABLE legacy_mobile_pairings_proof (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
    );
    await durable.query(
      "INSERT INTO legacy_mobile_pairings_proof (id, payload) VALUES ($1, $2)",
      ["legacy-1", "must-survive-connect-migrations"],
    );

    // Uppercase usernames are rejected by the lowercase CHECK constraint.
    await expect(durable.query(
      `INSERT INTO connect_accounts
       (user_id, username, email, password_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [
        "usr_12345678",
        "UPPER",
        "upper@example.com",
        "$2a$12$mNZq4pezRTG8xgASJtIRPuauRl3fxLPmzHx7Abc3DOgQsGtGj17jy",
        "active",
        "2026-01-01T00:00:00.000Z",
      ],
    )).rejects.toThrow();

    const durableStatus = await durable.status();
    const relayStatus = await relay.status();
    const connectMigrations = [...durableStatus, ...relayStatus].filter(
      (migration) => migration.key.includes("create_connect_"),
    );
    expect(connectMigrations).toHaveLength(12);
    expect(connectMigrations.every((migration) => migration.completed)).toBe(true);

    // Down: relay audit tables first (they FK the durable connect tables),
    // then the full durable set in reverse (later durable migrations FK
    // the connect tables, so the subset alone cannot be dropped).
    expect(relayStatus.some((migration) => migration.key === RELAY_LAST_NON_CONNECT_KEY)).toBe(true);
    await relay.down(RELAY_LAST_NON_CONNECT_KEY);
    await durable.down();
    expect(await tableNames(durable, "connect\\_%")).toEqual([]);

    await durable.up();
    await relay.up();
    expect(await tableNames(durable, "connect\\_%")).toEqual(expectedConnectTables);

    const survivor = await durable.query(
      "SELECT payload FROM legacy_mobile_pairings_proof WHERE id = $1",
      ["legacy-1"],
    );
    expect(survivor).toEqual([{ payload: "must-survive-connect-migrations" }]);
  }));
});
