import request from "supertest";
import type { Express } from "express";
import type { Server } from "node:http";
import { buildConfig } from "@noego/app/config";
import { resetContainer } from "@noego/app";
import bootServer from "../../src/server/server";
import boot from "../../src/index";
import { resetTestDatabase, closeTestDatabase } from "./test-db";
import { SqlStackDB, createSqliteDb, type Database } from "sqlstack";
import * as sqlite from "sqlite";
import sqlite3 from "sqlite3";
import { MigrationRunnerFactory } from "@noego/proper";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface TestAppResult {
  app: Express;
  database: Database;
  server: Server;
  agent: ReturnType<typeof request.agent>;
  persistentDirectory?: string;
}

async function startTestApp(db: Database): Promise<TestAppResult> {
  const { config, app } = await buildConfig(boot);
  await bootServer(app, { ...config, database: db });

  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });
  server.unref();

  const agent = request.agent(server);
  return { app, database: db, server, agent };
}

export async function getTestApp(): Promise<TestAppResult> {
  resetContainer();
  return startTestApp(await resetTestDatabase());
}

async function openPersistentDatabase(filename: string, migrate: boolean): Promise<Database> {
  const connection = await sqlite.open({ filename, driver: sqlite3.Database });
  if (migrate) {
    const runner = await MigrationRunnerFactory.create(
      path.resolve(process.cwd(), "proper.json"),
      connection,
    );
    await runner.reset();
  }
  await connection.exec("PRAGMA foreign_keys = ON;");
  const native = connection.db as sqlite3.Database;
  const proxy = new Proxy(native, {
    get(target, property, receiver) {
      if (property === "prepare") return undefined;
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as unknown as sqlite3.Database;
  const database = await createSqliteDb(proxy);
  const connectionName = `persistent-test-${Date.now()}`;
  SqlStackDB.register(connectionName, database).setDefault(connectionName);
  return database;
}

/** Starts a file-backed test app so a later process-style restart can reopen SQLite. */
export async function getPersistentTestApp(): Promise<TestAppResult> {
  resetContainer();
  const persistentDirectory = await mkdtemp(path.join(tmpdir(), "kazibee-auth-"));
  const database = await openPersistentDatabase(
    path.join(persistentDirectory, "connect.sqlite"),
    true,
  );
  return { ...(await startTestApp(database)), persistentDirectory };
}

/** Rebuilds the application container and reopens the same SQLite file. */
export async function restartPersistentTestApp(
  testApp: TestAppResult,
): Promise<TestAppResult> {
  if (!testApp.persistentDirectory) throw new Error("Expected a persistent test app");
  await closeTestServer(testApp);
  await testApp.database.close();
  resetContainer();
  const database = await openPersistentDatabase(
    path.join(testApp.persistentDirectory, "connect.sqlite"),
    false,
  );
  return {
    ...(await startTestApp(database)),
    persistentDirectory: testApp.persistentDirectory,
  };
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
  if (testApp?.persistentDirectory) {
    await testApp.database.close();
    await rm(testApp.persistentDirectory, { recursive: true, force: true });
  } else {
    await closeTestDatabase();
  }
  resetContainer();
}
