/**
 * db-tier schema/wiring helpers for sqlstack's testPostgres.
 *
 * The schema is the REAL production migration SQL: every
 * migrations/durable/*.up.sql in filename (timestamp) order, plus the two
 * relay-owned audit tables the connect desktop/executor services write to.
 * Passing the up.sql files as raw sql entries means zero drift between the
 * tests and production DDL.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { testPostgres } from "sqlstack/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import { ManifestResolver, SqlStack, SqlStackDB, createPgDb, type Database } from "sqlstack";

const ROOT = path.resolve(__dirname, "../..");

function upSqlFiles(folder: string, filter?: (name: string) => boolean): string[] {
  return readdirSync(path.join(ROOT, folder))
    .filter((name) => name.endsWith(".up.sql") && (!filter || filter(name)))
    .sort()
    .map((name) => path.join(ROOT, folder, name));
}

/** Full durable schema + the relay audit tables, as raw sql file entries. */
export function productionSchema(): { version: number; dialect: string; sql: string[] } {
  return {
    version: 1,
    dialect: "postgres",
    sql: [
      ...upSqlFiles("migrations/durable"),
      ...upSqlFiles("migrations/relay", (name) => name.includes("audit")),
    ],
  };
}

/** Build a fresh isolated database carrying the production schema. */
export function buildProductionDatabase(): Promise<TestPostgresDatabase> {
  return testPostgres(productionSchema(), { sourceDir: ROOT }).build();
}

/**
 * Point the process-global sqlstack registry at the built database and
 * install the production SQL manifest resolver (same pattern as
 * test-app.ts). Safe because every db-tier FILE runs in its own fork.
 */
export async function registerProductionSql(
  built: TestPostgresDatabase,
  name = "db-tier",
): Promise<Database> {
  const database = createPgDb(built.url);
  SqlStackDB.register(name, database).setDefault(name);
  const manifestUrl = pathToFileURL(path.resolve(ROOT, "dist/v1/sql-manifest.mjs"));
  manifestUrl.searchParams.set("test", String(Date.now()));
  const { sqlManifest } = (await import(manifestUrl.href)) as {
    sqlManifest: Record<string, string>;
  };
  SqlStack.useResolver(new ManifestResolver(sqlManifest, { assert: false }));
  return database;
}

/** Seed one active connect account (FK target for decisions/ownership). */
export async function seedAccount(
  built: TestPostgresDatabase,
  userId: string,
): Promise<void> {
  const suffix = userId.replace(/^usr_/, "").toLowerCase();
  await built.query(
    `INSERT INTO connect_accounts (user_id, username, email, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())`,
    [userId, `owner_${suffix}`, `owner_${suffix}@example.com`],
  );
}
