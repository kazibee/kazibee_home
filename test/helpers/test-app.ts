import request from "supertest";
import type { Server } from "node:http";
import { resetContainer, serve } from "@noego/app";
import { resetTestDatabase, closeTestDatabase } from "./test-db";
import { ManifestResolver, SqlStack, SqlStackDB, type Database } from "sqlstack";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createPostgresTestDatabase,
  type PostgresTestDatabase,
} from "./postgres-test-databases";

export interface TestAppResult {
  database: Database;
  server: Server;
  agent: ReturnType<typeof request.agent>;
  persistentDatabase?: PostgresTestDatabase;
  previousDatabaseUrl?: string;
}

async function startTestApp(
  db: Database,
  persistentDatabase?: PostgresTestDatabase,
  previousDatabaseUrl?: string,
): Promise<TestAppResult> {
  const server = await serve({
    cwd: process.cwd(),
    port: 0,
    env: { ...process.env, NODE_ENV: "test" },
  }) as Server;
  server.unref();

  const manifestUrl = pathToFileURL(path.resolve(process.cwd(), "dist/v1/sql-manifest.mjs"));
  manifestUrl.searchParams.set("test", String(Date.now()));
  const { sqlManifest } = await import(manifestUrl.href) as {
    sqlManifest: Record<string, string>;
  };
  SqlStack.useResolver(new ManifestResolver(sqlManifest, { assert: false }));

  return {
    database: db,
    server,
    agent: request.agent(server),
    persistentDatabase,
    previousDatabaseUrl,
  };
}

export async function getTestApp(): Promise<TestAppResult> {
  resetContainer();
  return startTestApp(await resetTestDatabase());
}

export async function getPersistentTestApp(): Promise<TestAppResult> {
  resetContainer();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const persistentDatabase = await createPostgresTestDatabase("full");
  process.env.DATABASE_URL = persistentDatabase.url;
  SqlStackDB.register("test", persistentDatabase.database).setDefault("test");
  return startTestApp(
    persistentDatabase.database,
    persistentDatabase,
    previousDatabaseUrl,
  );
}

export async function restartPersistentTestApp(
  testApp: TestAppResult,
): Promise<TestAppResult> {
  if (!testApp.persistentDatabase) throw new Error("Expected a persistent test database");
  await closeTestServer(testApp);
  resetContainer();
  process.env.DATABASE_URL = testApp.persistentDatabase.url;
  SqlStackDB.register("test", testApp.persistentDatabase.database).setDefault("test");
  return startTestApp(
    testApp.persistentDatabase.database,
    testApp.persistentDatabase,
    testApp.previousDatabaseUrl,
  );
}

async function closeTestServer(testApp?: TestAppResult): Promise<void> {
  if (!testApp?.server.listening) return;
  await new Promise<void>((resolve, reject) => {
    testApp.server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function cleanupTestApp(testApp?: TestAppResult): Promise<void> {
  await closeTestServer(testApp);
  if (testApp?.persistentDatabase) {
    await testApp.persistentDatabase.close();
    if (testApp.previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = testApp.previousDatabaseUrl;
  } else {
    await closeTestDatabase();
  }
  resetContainer();
}
