/**
 * src/server/repo/boot.ts error and first-registration paths.
 *
 * Companion to boot.test.ts, which walks the three happy paths in order and
 * documents that the "no default at all" branch of the injected path is
 * unreachable once a default exists in the process. This file runs the
 * OTHER order in its own fork, again relying on the process-global
 * SqlStackDB registry being append-only (order matters):
 *
 *   1. failed fresh init:  createPgDb throws -> initDatabase logs and
 *                          rethrows, leaving no default registered
 *   2. injected first:     no default yet, so the injected connection is
 *                          registered through the inner catch
 *   3. register failure:   a throwing registry is warned about, and the
 *                          injected connection is still returned
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { SqlStackDB, createPgDb, type Database } from "sqlstack";
import type { TestPostgresDatabase } from "sqlstack/testing";
import { initDatabase, DATABASE } from "../../src/server/repo/boot";
import { buildProductionDatabase } from "../helpers/production-schema";

const adapterState = vi.hoisted(() => ({ fail: false }));

vi.mock("sqlstack/adapters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sqlstack/adapters")>();
  return {
    ...actual,
    createPgDb: (...args: Parameters<typeof actual.createPgDb>) => {
      if (adapterState.fail) throw new Error("simulated createPgDb failure");
      return actual.createPgDb(...args);
    },
  };
});

let built: TestPostgresDatabase;
let injected: Database;
let secondInjected: Database;
let previousDatabaseUrl: string | undefined;

beforeAll(async () => {
  previousDatabaseUrl = process.env.DATABASE_URL;
  built = await buildProductionDatabase();
});

afterAll(async () => {
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
  await injected?.close();
  await secondInjected?.close();
  await built?.dispose();
});

describe("initDatabase error paths (order matters: failed fresh -> injected-first -> register failure)", () => {
  it("logs and rethrows when creating the connection fails, registering nothing", async () => {
    expect(() => SqlStackDB.get()).toThrow(); // precondition: fresh fork
    process.env.DATABASE_URL = built.url;
    adapterState.fail = true;
    try {
      await expect(initDatabase()).rejects.toThrow("simulated createPgDb failure");
    } finally {
      adapterState.fail = false;
    }
    expect(() => SqlStackDB.get()).toThrow(); // still no default
  });

  it("registers an injected connection as default when no default exists yet", async () => {
    injected = createPgDb(built.url);
    const database = await initDatabase(injected);
    expect(database).toBe(injected);
    expect(DATABASE).toBe(injected);
    expect(SqlStackDB.get()).toBe(injected);
    expect(SqlStackDB.get("injected")).toBe(injected);
  });

  it("warns and still returns the injected connection when registration throws", async () => {
    secondInjected = createPgDb(built.url);
    // Both register attempts (the guarded swap and the inner-catch retry)
    // must throw for the outer warn branch to engage.
    const registerSpy = vi.spyOn(SqlStackDB, "register").mockImplementation(() => {
      throw new Error("simulated register failure");
    });
    try {
      await expect(initDatabase(secondInjected)).resolves.toBe(secondInjected);
    } finally {
      registerSpy.mockRestore();
    }
    expect(DATABASE).toBe(secondInjected);
    // The registry rejected the swap, so the previous default survives.
    expect(SqlStackDB.get()).toBe(injected);
  });
});
