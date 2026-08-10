import path from "node:path";
import sqlite3 from "sqlite3";
import * as sqlite from "sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { MigrationRunnerFactory } from "@noego/proper";

describe("Connect auth Proper migrations", () => {
  let connection: Awaited<ReturnType<typeof sqlite.open>> | undefined;

  afterEach(async () => {
    await connection?.close();
    connection = undefined;
  });

  it("migrates up, enforces constraints, down, and re-up", async () => {
    connection = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
    await connection.exec("PRAGMA foreign_keys = ON");
    const runner = await MigrationRunnerFactory.create(
      path.resolve(process.cwd(), "proper.json"),
      connection,
    );
    await runner.reset();

    const tables = await connection.all<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'connect_%' ORDER BY name",
    );
    expect(tables.map((row) => row.name)).toEqual([
      "connect_accounts",
      "connect_browser_sessions",
      "connect_desktop_audit_events",
      "connect_desktop_claims",
      "connect_desktop_credentials",
      "connect_desktop_devices",
      "connect_executor_audit_events",
      "connect_executor_claims",
      "connect_executor_credentials",
      "connect_executors",
      "connect_website_deployment_identity",
    ]);
    await connection.exec(
      "CREATE TABLE legacy_mobile_pairings_proof (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
    );
    await connection.run(
      "INSERT INTO legacy_mobile_pairings_proof (id, payload) VALUES (?, ?)",
      "legacy-1",
      "must-survive-connect-migrations",
    );

    await expect(connection.run(
      `INSERT INTO connect_accounts
       (user_id, username, password_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      "usr_12345678",
      "UPPER",
      "hash",
      "active",
      "2026-01-01T00:00:00.000Z",
    )).rejects.toThrow();

    const migrations = await runner.getMigrations();
    const connectMigrations = migrations.filter((migration) =>
      migration.name.includes("create_connect_"),
    );
    expect(connectMigrations).toHaveLength(11);
    await runner.migrate([...connectMigrations].reverse(), false);
    const afterDown = await connection.all<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'connect_%'",
    );
    expect(afterDown).toEqual([]);
    await runner.migrate(connectMigrations, true);
    const afterReUp = await connection.all<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'connect_%'",
    );
    expect(afterReUp).toHaveLength(11);
    expect(await connection.get<{ payload: string }>(
      "SELECT payload FROM legacy_mobile_pairings_proof WHERE id = ?",
      "legacy-1",
    )).toEqual({ payload: "must-survive-connect-migrations" });
  });
});
