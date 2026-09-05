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
import { defineModule, type ApplicationModule } from "@noego/ioc";
import { testPostgres } from "sqlstack/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import {
  ManifestResolver,
  SqlStack,
  SqlStackDB,
  createPgDb,
  type Database,
  type SqlResolver,
} from "sqlstack";

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

/** The production SQL manifest resolver (dist/v1/sql-manifest.mjs). */
export async function productionSqlResolver(): Promise<SqlResolver> {
  const manifestUrl = pathToFileURL(path.resolve(ROOT, "dist/v1/sql-manifest.mjs"));
  manifestUrl.searchParams.set("test", String(Date.now()));
  const { sqlManifest } = (await import(manifestUrl.href)) as {
    sqlManifest: Record<string, string>;
  };
  return new ManifestResolver(sqlManifest, { assert: false });
}

/**
 * Per-root SqlStack composition for a testDinner/testIoc root.
 *
 * sqlstack 3.3 forbids falling back to the process-global registry while an
 * IoC execution environment is active: every root must register its own
 * SqlStack Singleton at composition time (the same contract production
 * satisfies with `registerSqlStack` from "sqlstack/ioc"). The returned
 * ApplicationModule is that registration expressed in the @noego/testing
 * composition language, so it is applied on the fresh root BEFORE anything
 * is resolved:
 *
 *   testDinner(source).use(sql.module)....build()
 *
 * The database is externally supplied (owned: false), so SqlStack.close()
 * during env.dispose() leaves it open — the caller keeps cleanup ownership
 * and closes `database` after disposing every root that used it.
 */
export interface ProductionSqlRoot {
  /** The pg adapter over the built test database (caller closes it). */
  database: Database;
  /** Composition preset registering this root's SqlStack Singleton. */
  module: ApplicationModule;
}

export function productionSqlModule(
  database: Database,
  name: string,
  resolver: SqlResolver,
): ApplicationModule {
  return defineModule(`production-sql:${name}`, (bind) => {
    bind(SqlStack).toFactory(() => new SqlStack({
      databases: { [name]: { db: database, owned: false } },
      default: name,
      resolver,
    })).singleton();
  });
}

/**
 * Open the built database and prepare the explicit per-root SqlStack
 * composition preset for testDinner roots. Every root built from the preset
 * gets its own SqlStack instance over the same externally owned database.
 */
export async function composeProductionSql(
  built: TestPostgresDatabase,
  name = "db-tier",
): Promise<ProductionSqlRoot> {
  const database = createPgDb(built.url);
  const resolver = await productionSqlResolver();
  return { database, module: productionSqlModule(database, name, resolver) };
}

/**
 * Legacy process-global wiring (SqlStackDB default + static resolver) for
 * code that executes OUTSIDE any IoC execution environment. Roots built
 * with testDinner must use composeProductionSql(...).module instead — under
 * an active root, sqlstack never consults this global state.
 */
export async function registerProductionSql(
  built: TestPostgresDatabase,
  name = "db-tier",
): Promise<Database> {
  const database = createPgDb(built.url);
  SqlStackDB.register(name, database).setDefault(name);
  SqlStack.useResolver(await productionSqlResolver());
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
