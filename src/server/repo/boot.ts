import type { Database } from "sqlstack";
import { SqlStackDB, createSqliteDb } from "sqlstack";
import path from "path";
import { getLogger } from '@noego/logger';
const baseLogger = getLogger('kazibee:db');

// Default to repo-local SQLite file for dev/tests if env not provided
export const SQLITE_URL = path.resolve(process.cwd(), process.env.SQLITE_URL || 'database/db.sqlite');

export let DATABASE: Database;

/**
 * Initializes the database connection.
 *
 * Connection-aware behavior:
 * - If a default connection already exists (e.g., from tests), uses it
 * - Otherwise, creates a new file-based SQLite connection
 *
 * This allows:
 * - Tests to provide in-memory databases that seeds/services respect
 * - Production to create file-based connections as normal
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
  } catch (error) {
    // No default connection exists - create one
    baseLogger.info("Initializing new database at", SQLITE_URL);

    try {
      DATABASE = await createSqliteDb(SQLITE_URL);

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
