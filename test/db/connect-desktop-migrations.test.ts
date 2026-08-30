/**
 * Connect Desktop migrations against real PostgreSQL.
 *
 * Formerly a SQLite-era test writing a throwaway proper.json into tmpdir.
 * Rewritten to run the production migration configs (proper.durable.json
 * for devices/claims/credentials, proper.relay.json for the relay-owned
 * audit events table) on a private database created on the disposable
 * test server (SQLSTACK_TEST_PG_URL, port 55433).
 *
 * Preserved claim: the four one-table Desktop stores migrate down and up
 * reversibly. The audit-events store moved from the (retired) unified
 * SQLite set into the relay set, so the four now span two configs.
 */
import { randomBytes } from "node:crypto";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MigrationRunnerFactory } from "@noego/proper";

const ADMIN_URL =
  process.env.SQLSTACK_TEST_PG_URL ?? "postgres://postgres:postgres@127.0.0.1:55433/postgres";
const DB_NAME = `kazibee_mig_desktop_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;

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

beforeAll(async () => {
  admin = await connectClient(ADMIN_URL);
  await admin.query(`CREATE DATABASE "${DB_NAME}"`);
  db = await connectClient(databaseUrl(DB_NAME));
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

describe("Connect Desktop migrations", () => {
  it("migrates four one-table Desktop stores down and up reversibly", async () => {
    await durableRunner.migrate(await durableRunner.getPendingMigrations(), true);
    await relayRunner.migrate(await relayRunner.getPendingMigrations(), true);

    const durableDesktop = (await durableRunner.getMigrations()).filter((migration) =>
      migration.name.includes("create_connect_desktop_"),
    );
    const relayDesktop = (await relayRunner.getMigrations()).filter((migration) =>
      migration.name.includes("create_connect_desktop_"),
    );
    expect(durableDesktop.map(({ name }) => name.replace(/^\d+_/, "")).sort()).toEqual([
      "create_connect_desktop_claims",
      "create_connect_desktop_credentials",
      "create_connect_desktop_devices",
    ]);
    expect(relayDesktop.map(({ name }) => name.replace(/^\d+_/, ""))).toEqual([
      "create_connect_desktop_audit_events",
    ]);
    expect([...durableDesktop, ...relayDesktop]).toHaveLength(4);

    const names = async () =>
      (await db.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name LIKE 'connect\\_desktop\\_%'
         ORDER BY table_name`,
      )).rows.map(({ table_name }) => table_name);

    expect(await names()).toEqual([
      "connect_desktop_audit_events", "connect_desktop_claims",
      "connect_desktop_credentials", "connect_desktop_devices",
    ]);

    // Down: audit events first (it FKs devices/claims), then the durable
    // three in reverse creation order.
    await relayRunner.migrate([...relayDesktop].reverse(), false);
    await durableRunner.migrate([...durableDesktop].reverse(), false);
    expect(await names()).toEqual([]);

    await durableRunner.migrate(durableDesktop, true);
    await relayRunner.migrate(relayDesktop, true);
    expect(await names()).toHaveLength(4);
  });
});
