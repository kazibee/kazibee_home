import request from "supertest";
import type { Express } from "express";
import { buildConfig } from "@noego/app/config";
import { getContainer, resetContainer } from "@noego/app";
import bootServer from "../../src/server/server";
import boot from "../../src/index";
import { resetTestDatabase, closeTestDatabase } from "./test-db";
import { BEACON } from "../../src/server/beacon_instance";
import type { Beacon } from "@noego/beacon";
import type { Database } from "sqlstack";

export interface TestAppResult {
  app: Express;
  database: Database;
  agent: ReturnType<typeof request.agent>;
}

export async function getTestApp(): Promise<TestAppResult> {
  // Reset container for test isolation — each test suite gets a fresh container
  resetContainer();

  const db = await resetTestDatabase();
  const { config, app } = await buildConfig(boot);
  await bootServer(app, { ...config, database: db });

  const server = app.listen(0, "127.0.0.1");
  server.unref();

  const agent = request.agent(server);
  return { app, database: db, agent };
}

export async function cleanupTestApp(): Promise<void> {
  // Close beacon to stop heartbeat interval and SSE connections
  try {
    const container = getContainer();
    const beacon = container.get<Beacon>(BEACON);
    if (beacon && typeof beacon.close === 'function') {
      await beacon.close();
    }
  } catch {
    // beacon may not have been registered
  }
  await closeTestDatabase();
  // Reset container so next test suite starts fresh
  resetContainer();
}
