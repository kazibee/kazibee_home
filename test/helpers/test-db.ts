import { SqlStackDB, createSqliteDb } from "sqlstack";
import type { Database } from "sqlstack";
import * as sqlite from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { MigrationRunnerFactory } from "@noego/proper";

type MigrationRunner = Awaited<ReturnType<typeof MigrationRunnerFactory.create>>;

let testDb: Database | null = null;
let testRunner: MigrationRunner | null = null;

/**
 * Initialize an in-memory SQLite database for testing.
 *
 * This function:
 * 1. Creates an in-memory SQLite database
 * 2. Runs all migrations using proper
 * 3. Registers it as the default SqlStack connection
 *
 * The database is cached - subsequent calls return the same instance.
 * Use resetTestDatabase() to get a fresh database between tests.
 */
export async function initTestDatabase(): Promise<Database> {
  if (testDb) return testDb;

  const properConfigPath = path.resolve(process.cwd(), "proper.json");

  // Create in-memory SQLite connection
  const sqliteConn = await sqlite.open({
    filename: ":memory:",
    driver: sqlite3.Database,
  });

  // Run migrations
  const runner = await MigrationRunnerFactory.create(properConfigPath, sqliteConn);
  await runner.reset();

  // Enable foreign key constraints (CRITICAL for catching schema bugs)
  await sqliteConn.exec('PRAGMA foreign_keys = ON;');

  // Create SqlStack-compatible database wrapper
  // The proxy ensures prepare() is undefined which sqlstack requires
  const sqliteNative = sqliteConn.db as sqlite3.Database;
  const sqliteProxy = new Proxy(sqliteNative, {
    get(target, prop, receiver) {
      if (prop === "prepare") {
        return undefined;
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  }) as unknown as sqlite3.Database;

  const db = await createSqliteDb(sqliteProxy);
  SqlStackDB.register("test", db).setDefault("test");

  testDb = db;
  testRunner = runner;
  return db;
}

/**
 * Close and cleanup the test database.
 * Call this in afterAll() hooks to properly clean up resources.
 */
export async function closeTestDatabase(): Promise<void> {
  if (testDb) {
    try {
      await testDb.close();
    } catch {
      // Ignore SQLITE_BUSY errors from sqlite :memory: teardown.
    }
    testDb = null;
    testRunner = null;
  }
}

/**
 * Reset the test database - closes existing connection and creates a fresh one.
 * Call this in beforeEach() to ensure test isolation.
 */
export async function resetTestDatabase(): Promise<Database> {
  await closeTestDatabase();
  return initTestDatabase();
}

/**
 * Get the current test database instance.
 * Throws if initTestDatabase() hasn't been called.
 */
export function getTestDatabase(): Database {
  if (!testDb) {
    throw new Error("Test database not initialized. Call initTestDatabase() first.");
  }
  return testDb;
}

/**
 * Get the migration runner for the test database.
 * Useful for running specific migrations or checking migration state.
 */
export function getTestRunner(): MigrationRunner {
  if (!testRunner) {
    throw new Error("Test runner not initialized. Call initTestDatabase() first.");
  }
  return testRunner;
}
