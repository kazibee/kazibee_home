import type { Database } from "sqlstack";
import { SqlStackDB } from "sqlstack";
import { createPgDb } from "sqlstack/adapters";
import { getLogger } from '@noego/logger';
import { Result, Trust } from "@noego/trust";
const baseLogger = getLogger('kazibee:db');

export const LOCAL_DATABASE_URL = "postgres://noego:noego_dev@localhost:5432/kazibee";

export let DATABASE: Database;

/**
 * Initializes the database connection.
 *
 * Connection-aware behavior:
 * - If a default connection already exists (e.g., from tests), uses it
 * - Otherwise, creates a PostgreSQL connection from DATABASE_URL
 *
 * This allows:
 * - Tests to provide in-memory databases that seeds/services respect
 * - Local development to use the local PostgreSQL container
 * - Container services to safely call initDatabase() without breaking test isolation
 *
 * This is the legacy boot edge: a connection that cannot be created rejects
 * with the driver's own error so the process fails to start.
 */
export async function initDatabase(database?: Database): Promise<Database> {
  if (database) {
    baseLogger.info("Using injected database connection");
    DATABASE = database;
    const registered = registerInjected(database);
    // The injected connection is still used; the registry keeps its previous default.
    if (!registered.ok && registered.error.kind === "register_failed") {
      baseLogger.warn("Error registering injected database:", registered.error.cause);
    }
    return database;
  }

  // SqlStackDB.get() throws when no default is registered: that is how a
  // missing default is told apart from an existing one.
  const existing = Trust.try(() => SqlStackDB.get(), (cause) => ({ kind: "no_default", cause }));
  if (existing.ok) {
    baseLogger.info("Using existing default database connection");
    DATABASE = existing.value;
    return existing.value;
  }
  switch (existing.error.kind) {
    case "no_default":
      return createDefaultDatabase();
    default: {
      const unhandled: never = existing.error.kind;
      return unhandled;
    }
  }
}

async function createDefaultDatabase(): Promise<Database> {
  const databaseUrl = process.env.DATABASE_URL || LOCAL_DATABASE_URL;
  baseLogger.info("Initializing PostgreSQL database");
  const created = await Trust.tryAsync(async () => {
    DATABASE = await createPgDb(databaseUrl);
    SqlStackDB
      .register("primary", DATABASE)
      .setDefault("primary");
    return DATABASE;
  }, (cause) => ({ kind: "database_init_failed", cause }));
  if (!created.ok) {
    baseLogger.error("Database initialization failed:", created.error.cause);
    //trust:accept boot contract: initDatabase rejects with the driver's own error so startup fails (test/lifecycle case 4)
    throw created.error.cause;
  }
  baseLogger.info("Database initialized and set as default");
  return created.value;
}

/**
 * Make the injected connection the default. With no default registered it is
 * registered once; replacing a different default is tried a second time when
 * the first attempt fails. A failure is reported to the caller, who warns and
 * keeps the injected connection as DATABASE.
 */
function registerInjected(database: Database) {
  const current = Trust.try(() => SqlStackDB.get(), (cause) => ({ kind: "no_default", cause }));
  if (current.ok && current.value === database) return Result.ok(undefined);
  const attempt = () => Trust.try(
    () => {
      SqlStackDB.register("injected", database).setDefault("injected");
    },
    (cause) => ({ kind: "register_failed", cause }),
  );
  const first = attempt();
  return first.ok || !current.ok ? first : attempt();
}
