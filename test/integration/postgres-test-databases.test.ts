import { describe, expect, it } from "vitest";
import { createPostgresTestDatabase } from "../helpers/postgres-test-databases";

const DURABLE_TABLES = [
  "connect_accounts",
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
  "oauth_connection_executors",
  "oauth_connections",
  "oauth_tokens",
  "proper_migrations_durable",
  "proper_patches",
  "remote_tool_grants",
  "remote_workspaces",
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
  it("creates isolated full-schema clones from migrations", async () => {
    const first = await createPostgresTestDatabase("full");
    const second = await createPostgresTestDatabase("full");
    try {
      const durableHistory = await first.pool.query(
        "SELECT count(*)::int AS count FROM proper_migrations_durable",
      );
      const relayHistory = await first.pool.query(
        "SELECT count(*)::int AS count FROM proper_migrations_relay",
      );
      expect(durableHistory.rows[0]?.count).toBe(15); // through 1788065222225_allow_shared_email_across_connect_accounts
      expect(relayHistory.rows[0]?.count).toBe(8);

      const tables = await first.pool.query(LIST_TABLES_SQL);
      expect(tables.rows.map((row) => row.table_name)).toEqual(
        [...DURABLE_TABLES, ...RELAY_TABLES].sort(),
      );

      await first.pool.query(
        `INSERT INTO sessions
          (session_id, user_id, device_id, session_fence_message_id)
         VALUES ($1, $2, $3, $4)`,
        ["ses_isolation01", "usr_isolation01", "dev_isolation01", 0],
      );

      const firstCount = await first.pool.query(
        "SELECT count(*)::int AS count FROM sessions",
      );
      const secondCount = await second.pool.query(
        "SELECT count(*)::int AS count FROM sessions",
      );
      expect(firstCount.rows[0]?.count).toBe(1);
      expect(secondCount.rows[0]?.count).toBe(0);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });

  it("keeps relay tables out of durable-only clones", async () => {
    const database = await createPostgresTestDatabase("durable");
    try {
      const durableHistory = await database.pool.query(
        "SELECT count(*)::int AS count FROM proper_migrations_durable",
      );
      const relayTable = await database.pool.query(
        "SELECT to_regclass('public.sessions') AS table_name",
      );
      expect(durableHistory.rows[0]?.count).toBe(15); // through 1788065222225_allow_shared_email_across_connect_accounts
      expect(relayTable.rows[0]?.table_name).toBeNull();

      const tables = await database.pool.query(LIST_TABLES_SQL);
      expect(tables.rows.map((row) => row.table_name)).toEqual(DURABLE_TABLES);
    } finally {
      await database.close();
    }
  });
});
