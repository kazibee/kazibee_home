import request from "supertest";
import type { Express } from "express";
import { buildConfig } from "@noego/app/config";
import bootServer from "../../src/server/server";
import boot from "../../src/index";
import { resetTestDatabase, closeTestDatabase } from "./test-db";
import type { Database } from "sqlstack";

export interface TestAppResult {
  /** The Express application instance */
  app: Express;
  /** The database instance used by the app */
  database: Database;
  /** Supertest agent bound to the server - use for making HTTP requests */
  agent: ReturnType<typeof request.agent>;
}

/**
 * Get a fully configured test application with database initialized.
 *
 * This function:
 * 1. Resets the test database (in-memory SQLite with migrations)
 * 2. Builds the app configuration
 * 3. Boots the server with the test database injected
 * 4. Creates a Supertest agent for making HTTP requests
 *
 * Usage:
 * ```typescript
 * import { getTestApp, cleanupTestApp } from '../helpers/test-app';
 *
 * describe('My API', () => {
 *   let agent: ReturnType<typeof request.agent>;
 *
 *   beforeEach(async () => {
 *     const result = await getTestApp();
 *     agent = result.agent;
 *   });
 *
 *   afterAll(async () => {
 *     await cleanupTestApp();
 *   });
 *
 *   it('should work', async () => {
 *     const response = await agent.get('/api/status');
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */
export async function getTestApp(): Promise<TestAppResult> {
  // Reset database for fresh state
  const db = await resetTestDatabase();

  // Build app configuration
  const { config, app } = await buildConfig(boot);

  // Boot server with test database
  await bootServer(app, { ...config, database: db });

  // Create HTTP server bound to localhost
  // Binding to 127.0.0.1 is required in sandboxed environments
  // unref() allows Node to exit even if server is still listening
  const server = app.listen(0, "127.0.0.1");
  server.unref();

  // Create supertest agent for making requests
  const agent = request.agent(server);

  return { app, database: db, agent };
}

/**
 * Cleanup test resources after tests complete.
 * Call this in afterAll() to close the database connection.
 * Server cleanup is handled automatically via unref().
 */
export async function cleanupTestApp(): Promise<void> {
  await closeTestDatabase();
}
