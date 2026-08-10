import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as sqlite from "sqlite";
import sqlite3 from "sqlite3";
import { MigrationRunnerFactory } from "@noego/proper";

describe("Connect Desktop migrations", () => {
  let directory: string | undefined;
  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("migrates four one-table Desktop stores down and up reversibly", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "desktop-migrations-"));
    const databasePath = path.join(directory, "desktop.sqlite");
    const configPath = path.join(directory, "proper.json");
    await writeFile(configPath, JSON.stringify({
      migration_folder: path.resolve(process.cwd(), "migrations"),
      migration_table: "proper_migrations",
      database: "sqlite",
      sqlite: { database: databasePath },
    }));
    const connection = await sqlite.open({ filename: databasePath, driver: sqlite3.Database });
    const runner = await MigrationRunnerFactory.create(configPath, connection);
    await runner.reset();
    const desktopMigrations = (await runner.getMigrations()).filter((migration) =>
      migration.name.includes("create_connect_desktop_"),
    );
    expect(desktopMigrations).toHaveLength(4);
    const names = async () => (await connection.all<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'connect_desktop_%' ORDER BY name",
    )).map(({ name }) => name);
    expect(await names()).toEqual([
      "connect_desktop_audit_events", "connect_desktop_claims",
      "connect_desktop_credentials", "connect_desktop_devices",
    ]);
    await runner.migrate([...desktopMigrations].reverse(), false);
    expect(await names()).toEqual([]);
    await runner.migrate(desktopMigrations, true);
    expect(await names()).toHaveLength(4);
    await connection.close();
  });
});
