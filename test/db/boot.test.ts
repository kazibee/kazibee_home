/**
 * src/server/repo/boot.ts initDatabase contract against real PostgreSQL.
 *
 * The sqlstack registry (SqlStackDB) is process-global and exposes no
 * unregister/reset API, so the three paths are exercised IN ORDER within
 * this single forked file, each building on the registry state the
 * previous one left behind:
 *
 *   1. fresh:            no default registered -> creates from DATABASE_URL
 *   2. existing default: returns the current default untouched
 *   3. injected:         registers and returns the injected connection
 *
 * What cannot be reset (and is therefore documented rather than reset):
 * once a default is set it cannot be cleared, so the "no default at all"
 * branch of the injected path (the inner catch that registers when
 * SqlStackDB.get() throws) is unreachable after test 1 in this process.
 * Per-file fork isolation keeps all of this invisible to other files.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SqlStackDB, type Database } from "sqlstack";
import type { TestPostgresDatabase } from "sqlstack/testing";
import { createPgDb } from "sqlstack/adapters";
import { initDatabase, DATABASE } from "../../src/server/repo/boot";
import { buildProductionDatabase } from "../helpers/production-schema";

let freshDb: TestPostgresDatabase;
let injectedDb: TestPostgresDatabase;
let injectedConnection: Database;
let bootCreated: Database | undefined;
let previousDatabaseUrl: string | undefined;

beforeAll(async () => {
  previousDatabaseUrl = process.env.DATABASE_URL;
  [freshDb, injectedDb] = await Promise.all([
    buildProductionDatabase(),
    buildProductionDatabase(),
  ]);
});

afterAll(async () => {
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
  await bootCreated?.close();
  await injectedConnection?.close();
  await freshDb?.dispose();
  await injectedDb?.dispose();
});

describe("initDatabase (order matters: fresh -> existing default -> injected)", () => {
  it("with no default registered, creates a connection from DATABASE_URL and registers it as default", async () => {
    expect(() => SqlStackDB.get()).toThrow(); // precondition: fresh fork
    process.env.DATABASE_URL = freshDb.url;

    const database = await initDatabase();
    bootCreated = database;

    expect(database.dialect).toBe("postgres");
    expect(SqlStackDB.get()).toBe(database);
    expect(SqlStackDB.get("primary")).toBe(database);
    expect(DATABASE).toBe(database);
    // It is a live connection to the database DATABASE_URL named.
    const result = (await database.query(
      "SELECT count(*)::int AS n FROM connect_accounts",
      [],
    )) as Array<{ n: number }>;
    expect(result[0].n).toBe(0);
  });

  it("with a default already registered, returns it without creating a new connection", async () => {
    // Poison DATABASE_URL: if this path ever tried to connect, it would fail.
    process.env.DATABASE_URL = "postgres://nobody:nope@127.0.0.1:1/does_not_exist";
    const database = await initDatabase();
    expect(database).toBe(bootCreated);
    expect(DATABASE).toBe(database);
    expect(SqlStackDB.get()).toBe(database);
  });

  it("with an injected connection, registers it as the new default and returns it", async () => {
    injectedConnection = createPgDb(injectedDb.url);
    const database = await initDatabase(injectedConnection);
    expect(database).toBe(injectedConnection);
    expect(DATABASE).toBe(injectedConnection);
    expect(SqlStackDB.get()).toBe(injectedConnection);
    expect(SqlStackDB.get("injected")).toBe(injectedConnection);

    // Re-injecting the connection that is already the default is a no-op
    // (the current === database branch) and still returns it.
    await expect(initDatabase(injectedConnection)).resolves.toBe(injectedConnection);
    expect(SqlStackDB.get()).toBe(injectedConnection);
  });
});
