import { SqlStackDB, type Database } from "sqlstack";
import {
  createPostgresTestDatabase,
  type PostgresTestDatabase,
} from "./postgres-test-databases";

let testDatabase: PostgresTestDatabase | null = null;
let previousDatabaseUrl: string | undefined;

export async function initTestDatabase(): Promise<Database> {
  if (testDatabase) return testDatabase.database;

  previousDatabaseUrl = process.env.DATABASE_URL;
  testDatabase = await createPostgresTestDatabase("full");
  process.env.DATABASE_URL = testDatabase.url;
  SqlStackDB.register("test", testDatabase.database).setDefault("test");
  return testDatabase.database;
}

export async function closeTestDatabase(): Promise<void> {
  const current = testDatabase;
  testDatabase = null;
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
  previousDatabaseUrl = undefined;
  if (current) await current.close();
}

export async function resetTestDatabase(): Promise<Database> {
  await closeTestDatabase();
  return initTestDatabase();
}

export function getTestDatabase(): Database {
  if (!testDatabase) {
    throw new Error("Test database not initialized. Call initTestDatabase() first.");
  }
  return testDatabase.database;
}
