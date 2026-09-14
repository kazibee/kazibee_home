/** Historical case names retained. Migration/table-history assertions now live only
 * in the Proper lane. Fresh per-case databases replace shared template clones. */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { resourceCase } from "@noego/testing";
import { testPostgres } from "sqlstack/testing";
import { testMigrations, type TestMigrationsEnvironment } from "@noego/proper/testing";

const DURABLE_CONFIG = path.resolve(__dirname, "../../proper.durable.json");
const RELAY_CONFIG = path.resolve(__dirname, "../../proper.relay.json");
const EMPTY_SCHEMA = { version: 1, dialect: "postgres", sql: ["SELECT 1;"] };
// Value-shape adapter only; no application or database construction is hidden.
async function queryRows(database: TestMigrationsEnvironment, sql: string, params: unknown[] = []) {
  return { rows: await database.query(sql, params) as Array<Record<string, any>> };
}

const DURABLE_TABLES = [
  "connect_accounts",
  "connect_agent_handoffs",
  "connect_agent_sessions",
  "connect_browser_sessions",
  "connect_desktop_claims",
  "connect_desktop_credentials",
  "connect_desktop_devices",
  "connect_executor_claims",
  "connect_executor_credentials",
  "connect_executors",
  "connect_identities",
  "connect_website_deployment_identity",
  "oauth_clients",
  "oauth_codes",
  "oauth_connections",
  "oauth_tokens",
  "proper_migrations_durable",
  "proper_patches",
  "remote_tool_grants",
  "remote_workspaces",
  "swarm_machines",
  "swarms",
];

const RELAY_TABLES = [
  "connect_desktop_audit_events",
  "connect_executor_audit_events",
  "devices",
  "messages",
  "proper_migrations_relay",
  "relay_conversations",
  "relay_events",
  "relay_messages",
  "sessions",
];

const LIST_TABLES_SQL = `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
   ORDER BY table_name`;

describe("PostgreSQL test database templates", () => {
  it("creates isolated full-schema clones from migrations", resourceCase(async (scope) => {
    const firstFixture = await testPostgres(EMPTY_SCHEMA).build();
    const secondFixture = await testPostgres(EMPTY_SCHEMA).build();
    const first = scope.own(await testMigrations(DURABLE_CONFIG).database(firstFixture).build());
    const firstRelay = scope.own(await testMigrations(RELAY_CONFIG).database(firstFixture).build());
    const second = scope.own(await testMigrations(DURABLE_CONFIG).database(secondFixture).build());
    const secondRelay = scope.own(await testMigrations(RELAY_CONFIG).database(secondFixture).build());
    await first.up();
    await firstRelay.up();
    await second.up();
    await secondRelay.up();
      const durableHistory = await queryRows(first, 
        "SELECT count(*)::int AS count FROM proper_migrations_durable",
      );
      const relayHistory = await queryRows(first, 
        "SELECT count(*)::int AS count FROM proper_migrations_relay",
      );
      expect(durableHistory.rows[0]?.count).toBe(20); // through 1788541133826_create_agent_sessions
      expect(relayHistory.rows[0]?.count).toBe(8);

      const tables = await queryRows(first, LIST_TABLES_SQL);
      expect(tables.rows.map((row) => row.table_name)).toEqual(
        [...DURABLE_TABLES, ...RELAY_TABLES].sort(),
      );

      await queryRows(first, 
        `INSERT INTO sessions
          (session_id, user_id, device_id, session_fence_message_id)
         VALUES ($1, $2, $3, $4)`,
        ["ses_isolation01", "usr_isolation01", "dev_isolation01", 0],
      );

      const firstCount = await queryRows(first, 
        "SELECT count(*)::int AS count FROM sessions",
      );
      const secondCount = await queryRows(second, 
        "SELECT count(*)::int AS count FROM sessions",
      );
      expect(firstCount.rows[0]?.count).toBe(1);
      expect(secondCount.rows[0]?.count).toBe(0);
  }));

  it("keeps relay tables out of durable-only clones", resourceCase(async (scope) => {
    const fixture = await testPostgres(EMPTY_SCHEMA).build();
    const database = scope.own(await testMigrations(DURABLE_CONFIG).database(fixture).build());
    await database.up();
      const durableHistory = await queryRows(database, 
        "SELECT count(*)::int AS count FROM proper_migrations_durable",
      );
      const relayTable = await queryRows(database, 
        "SELECT to_regclass('public.sessions') AS table_name",
      );
      expect(durableHistory.rows[0]?.count).toBe(20); // through 1788541133826_create_agent_sessions
      expect(relayTable.rows[0]?.table_name).toBeNull();

      const tables = await queryRows(database, LIST_TABLES_SQL);
      expect(tables.rows.map((row) => row.table_name)).toEqual(DURABLE_TABLES);
  }));
});
