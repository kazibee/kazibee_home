import type { Database } from "sqlstack";
import { SqlStackDB } from "sqlstack";
import { createPgDb } from "sqlstack/adapters";
import { getLogger } from '@noego/logger';
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
 */
export async function initDatabase(database?: Database): Promise<Database> {
  if (database) {
    baseLogger.info("Using injected database connection");
    DATABASE = database;

    try {
      try {
        const current = SqlStackDB.get();
        if (current !== database) {
          SqlStackDB.register("injected", database).setDefault("injected");
        }
      } catch {
        SqlStackDB.register("injected", database).setDefault("injected");
      }
    } catch (err) {
       baseLogger.warn("Error registering injected database:", err);
    }

    return database;
  }

  // Try to get existing default connection
  try {
    const existingDb = SqlStackDB.get();
    baseLogger.info("Using existing default database connection");
    DATABASE = existingDb;
    return existingDb;
  } catch {
    // No default connection exists - create one
    const databaseUrl = process.env.DATABASE_URL || LOCAL_DATABASE_URL;
    baseLogger.info("Initializing PostgreSQL database");

    try {
      DATABASE = await createPgDb(databaseUrl);

      SqlStackDB
        .register("primary", DATABASE)
        .setDefault("primary");

      baseLogger.info("Database initialized and set as default");
      return DATABASE;
    } catch (initError) {
      baseLogger.error("Database initialization failed:", initError);
      throw initError;
    }
  }
}
