/**
 * Connect Desktop migrations against real PostgreSQL.
 *
 * Runs the production migration configs (proper.durable.json for
 * devices/claims/credentials, proper.relay.json for the relay-owned audit
 * events table) through the @noego/proper/testing facade on a per-case
 * SQLStack-minted disposable database (SQLSTACK_TEST_PG_URL, port 55433).
 *
 * Preserved claim: the four one-table Desktop stores migrate down and up
 * reversibly. The audit-events store moved from the (retired) unified
 * SQLite set into the relay set, so the four now span two configs.
 *
 * Rollback granularity (truthful): the facade only rolls back an ordered
 * suffix — down(target) reverts every completed key AFTER the exact target.
 *  - relay: the target is the key immediately before
 *    create_connect_desktop_audit_events (the final relay key), so exactly
 *    that one audit migration is rolled back.
 *  - durable: the target is the key immediately before the earliest
 *    create_connect_desktop_* migration. The three Desktop migrations are
 *    contiguous right after it, but every later durable migration
 *    (website_deployment_identity, remote_*, oauth_*, swarms, agent
 *    sessions, ...) is rolled back with them and re-applied on up. The
 *    Desktop tables are therefore proven reversible, but NOT in isolation
 *    the way the old runner-level three-node rollback did.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resourceCase } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL } from "sqlstack/testing";
import { testMigrations, type TestMigrationsEnvironment } from "@noego/proper/testing";

const DURABLE_CONFIG = path.resolve(__dirname, "../../proper.durable.json");
const RELAY_CONFIG = path.resolve(__dirname, "../../proper.relay.json");

const stripStamp = (key: string) => key.replace(/^\d+_/, "");

/** Exact key that sorts immediately before the first key matching `predicate`. */
const keyBefore = (keys: readonly string[], predicate: (key: string) => boolean): string => {
  const index = keys.findIndex(predicate);
  if (index <= 0) throw new Error(`no predecessor key for the first matching migration in: ${keys.join(", ")}`);
  return keys[index - 1];
};

const desktopTableNames = async (env: TestMigrationsEnvironment) =>
  ((await env.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE 'connect\\_desktop\\_%'
     ORDER BY table_name`,
  )) as Array<{ table_name: string }>).map(({ table_name }) => table_name);

describe("Connect Desktop migrations", () => {
  it("migrates four one-table Desktop stores down and up reversibly", resourceCase(async (scope) => {
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

    const isDesktop = (key: string) => key.includes("create_connect_desktop_");
    const durableStatus = await durable.status();
    const relayStatus = await relay.status();
    const durableDesktop = durableStatus.filter(({ key }) => isDesktop(key));
    const relayDesktop = relayStatus.filter(({ key }) => isDesktop(key));
    expect(durableDesktop.map(({ key }) => stripStamp(key)).sort()).toEqual([
      "create_connect_desktop_claims",
      "create_connect_desktop_credentials",
      "create_connect_desktop_devices",
    ]);
    expect(relayDesktop.map(({ key }) => stripStamp(key))).toEqual([
      "create_connect_desktop_audit_events",
    ]);
    expect([...durableDesktop, ...relayDesktop]).toHaveLength(4);
    expect([...durableDesktop, ...relayDesktop].every(({ completed }) => completed)).toBe(true);

    expect(await desktopTableNames(durable)).toEqual([
      "connect_desktop_audit_events", "connect_desktop_claims",
      "connect_desktop_credentials", "connect_desktop_devices",
    ]);

    // Down: audit events first (it FKs devices/claims), then the durable
    // suffix starting at the earliest Desktop migration (see header for the
    // exact granularity — later durable migrations ride along).
    const durableKeys = durableStatus.map(({ key }) => key);
    const relayKeys = relayStatus.map(({ key }) => key);
    await relay.down(keyBefore(relayKeys, isDesktop));
    await durable.down(keyBefore(durableKeys, isDesktop));
    expect(await desktopTableNames(durable)).toEqual([]);

    await durable.up();
    await relay.up();
    expect(await desktopTableNames(durable)).toHaveLength(4);
  }));
});
