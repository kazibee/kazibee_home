/**
 * Connect auth Proper migrations against real PostgreSQL.
 *
 * Formerly a SQLite-era test that ran the stale root proper.json (whose
 * migration_folder no longer contains any migration files). Rewritten to
 * run the real production migration sets — proper.durable.json plus
 * proper.relay.json (the relay set owns the connect_* audit tables) — on
 * a private database created on the disposable test server
 * (SQLSTACK_TEST_PG_URL, port 55433).
 *
 * Preserved claims, translated to Postgres:
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
import { randomBytes } from "node:crypto";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MigrationRunnerFactory } from "@noego/proper";

const ADMIN_URL =
  process.env.SQLSTACK_TEST_PG_URL ?? "postgres://postgres:postgres@127.0.0.1:55433/postgres";
const DB_NAME = `kazibee_mig_auth_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;

function databaseUrl(name: string): string {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

async function connectClient(url: string): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

type Runner = Awaited<ReturnType<typeof MigrationRunnerFactory.create>>;

let admin: Client;
let db: Client;
let durableRunner: Runner;
let relayRunner: Runner;

const tableNames = async (like: string) =>
  (await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE $1 ORDER BY table_name`,
    [like],
  )).rows.map((row) => row.table_name);

beforeAll(async () => {
  admin = await connectClient(ADMIN_URL);
  await admin.query(`CREATE DATABASE "${DB_NAME}"`);
  db = await connectClient(databaseUrl(DB_NAME));
  // Each runner gets its own driver connection: runner.close() ends it.
  durableRunner = await MigrationRunnerFactory.create(
    path.resolve(process.cwd(), "proper.durable.json"),
    await connectClient(databaseUrl(DB_NAME)),
  );
  relayRunner = await MigrationRunnerFactory.create(
    path.resolve(process.cwd(), "proper.relay.json"),
    await connectClient(databaseUrl(DB_NAME)),
  );
});

afterAll(async () => {
  await durableRunner?.close();
  await relayRunner?.close();
  await db?.end();
  await admin?.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
  await admin?.end();
});

describe("Connect auth Proper migrations", () => {
  it("migrates up, enforces constraints, down, and re-up", async () => {
    await durableRunner.migrate(await durableRunner.getPendingMigrations(), true);
    await relayRunner.migrate(await relayRunner.getPendingMigrations(), true);

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
    expect(await tableNames("connect\\_%")).toEqual(expectedConnectTables);

    await db.query(
      "CREATE TABLE legacy_mobile_pairings_proof (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
    );
    await db.query(
      "INSERT INTO legacy_mobile_pairings_proof (id, payload) VALUES ($1, $2)",
      ["legacy-1", "must-survive-connect-migrations"],
    );

    // Uppercase usernames are rejected by the lowercase CHECK constraint.
    await expect(db.query(
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

    const durableMigrations = await durableRunner.getMigrations();
    const relayMigrations = await relayRunner.getMigrations();
    const connectMigrations = [...durableMigrations, ...relayMigrations].filter(
      (migration) => migration.name.includes("create_connect_"),
    );
    expect(connectMigrations).toHaveLength(12);

    // Down: relay audit tables first (they FK the durable connect tables),
    // then the full durable set in reverse (later durable migrations FK
    // the connect tables, so the subset alone cannot be dropped).
    const relayConnectMigrations = relayMigrations.filter(
      (migration) => migration.name.includes("create_connect_"),
    );
    await relayRunner.migrate([...relayConnectMigrations].reverse(), false);
    await durableRunner.migrate([...durableMigrations].reverse(), false);
    expect(await tableNames("connect\\_%")).toEqual([]);

    await durableRunner.migrate(durableMigrations, true);
    await relayRunner.migrate(relayConnectMigrations, true);
    expect(await tableNames("connect\\_%")).toEqual(expectedConnectTables);

    const survivor = await db.query(
      "SELECT payload FROM legacy_mobile_pairings_proof WHERE id = $1",
      ["legacy-1"],
    );
    expect(survivor.rows).toEqual([{ payload: "must-survive-connect-migrations" }]);
  });
});
