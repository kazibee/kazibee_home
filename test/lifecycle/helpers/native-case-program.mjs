/**
 * Native lifecycle case program for src/server/repo/boot.ts.
 *
 * Runs in a FRESH Node process per case (spawned by process-driver.ts), so
 * the process-global SqlStackDB registry starts empty every time and no
 * case depends on the order another case ran in. The program imports the
 * actual boot module and the real sqlstack adapters; the only seams are the
 * two native fault seams the parent qualified on Node 22:
 *
 *   - mock.module('sqlstack/adapters') -> createPgDb throws (adapter fault)
 *   - mock.method(SqlStackDB, 'register') -> throws (registry fault)
 *
 * Inputs arrive ONLY through the environment:
 *   KAZIBEE_LIFECYCLE_SCENARIO        one of the scenario names below
 *   KAZIBEE_LIFECYCLE_FIXTURE_URL_A   primary fixture database URL
 *   KAZIBEE_LIFECYCLE_FIXTURE_URL_B   secondary fixture database URL (optional)
 *   KAZIBEE_LIFECYCLE_POISON_URL      unreachable URL for the "must not connect" case
 *
 * Output: exactly one line prefixed with RESULT_MARKER on stdout carrying a
 * JSON report ({ ok, scenario, observations, error?, runtime }). Exit code 0
 * only when every assertion passed and cleanup succeeded.
 *
 * Cleanup: every real adapter opened here is owned by a @noego/testing
 * TestResourceScope and closed exactly once. Fixture databases are NEVER
 * dropped here — the parent owns them.
 */
import assert from "node:assert/strict";
import { mock } from "node:test";
import { withTestScope } from "@noego/testing";

export const RESULT_MARKER = "KAZIBEE_LIFECYCLE_RESULT ";

const SCENARIOS = {
  "fresh-default": freshDefault,
  "existing-default": existingDefault,
  "injected-swaps-default": injectedSwapsDefault,
  "adapter-failure": adapterFailure,
  "injected-first": injectedFirst,
  "register-failure": registerFailure,
};

const env = (name, required = true) => {
  const value = process.env[name];
  if (required && !value) throw new Error(`Missing required env ${name}`);
  return value;
};

const countAccounts = async (database) => {
  const rows = await database.query("SELECT count(*)::int AS n FROM connect_accounts", []);
  return rows[0].n;
};

const currentDatabaseName = async (database) => {
  const rows = await database.query("SELECT current_database() AS name", []);
  return rows[0].name;
};

/** Own a real adapter so the scope closes it exactly once, in reverse order. */
const ownAdapter = (scope, database, owner) =>
  scope.own({ dispose: () => database.close() }, owner);

async function loadReal() {
  const { SqlStackDB } = await import("sqlstack");
  const { createPgDb } = await import("sqlstack/adapters");
  const boot = await import("../../../src/server/repo/boot.ts");
  return { SqlStackDB, createPgDb, boot };
}

const registryIsEmpty = (SqlStackDB) => {
  try {
    SqlStackDB.get();
    return false;
  } catch {
    return true;
  }
};

// 1. fresh: no default registered -> creates from DATABASE_URL, registers primary/default.
async function freshDefault(scope) {
  const { SqlStackDB, boot } = await loadReal();
  assert.equal(registryIsEmpty(SqlStackDB), true, "precondition: fresh process has no default");
  process.env.DATABASE_URL = env("KAZIBEE_LIFECYCLE_FIXTURE_URL_A");

  const database = await boot.initDatabase();
  ownAdapter(scope, database, "boot-created");

  assert.equal(database.dialect, "postgres");
  assert.equal(SqlStackDB.get(), database);
  assert.equal(SqlStackDB.get("primary"), database);
  assert.equal(boot.DATABASE, database);
  const count = await countAccounts(database);
  assert.equal(count, 0);
  return {
    dialect: database.dialect,
    defaultIsBootCreated: true,
    primaryIsBootCreated: true,
    exportedIsBootCreated: true,
    connectAccountsCount: count,
    connectedDatabaseName: await currentDatabaseName(database),
  };
}

// 2. existing default (created in THIS case) -> returned untouched, no new connection.
async function existingDefault(scope) {
  const { SqlStackDB, boot } = await loadReal();
  assert.equal(registryIsEmpty(SqlStackDB), true, "precondition: fresh process has no default");
  process.env.DATABASE_URL = env("KAZIBEE_LIFECYCLE_FIXTURE_URL_A");
  const first = await boot.initDatabase();
  ownAdapter(scope, first, "boot-created");

  // Poison DATABASE_URL: if this path ever tried to connect, it would fail.
  process.env.DATABASE_URL = env("KAZIBEE_LIFECYCLE_POISON_URL");
  const database = await boot.initDatabase();
  assert.equal(database, first);
  assert.equal(boot.DATABASE, database);
  assert.equal(SqlStackDB.get(), database);
  return {
    secondIsFirst: true,
    exportedIsFirst: true,
    defaultIsFirst: true,
    connectAccountsCount: await countAccounts(database),
    connectedDatabaseName: await currentDatabaseName(database),
  };
}

// 3. injected with a default already present -> registers "injected" and swaps default.
async function injectedSwapsDefault(scope) {
  const { SqlStackDB, createPgDb, boot } = await loadReal();
  assert.equal(registryIsEmpty(SqlStackDB), true, "precondition: fresh process has no default");
  process.env.DATABASE_URL = env("KAZIBEE_LIFECYCLE_FIXTURE_URL_A");
  const bootCreated = await boot.initDatabase();
  ownAdapter(scope, bootCreated, "boot-created");
  assert.equal(SqlStackDB.get(), bootCreated, "precondition: a default exists");

  const injected = createPgDb(env("KAZIBEE_LIFECYCLE_FIXTURE_URL_B"));
  ownAdapter(scope, injected, "injected");
  const database = await boot.initDatabase(injected);
  assert.equal(database, injected);
  assert.equal(boot.DATABASE, injected);
  assert.equal(SqlStackDB.get(), injected);
  assert.equal(SqlStackDB.get("injected"), injected);
  assert.equal(SqlStackDB.get("primary"), bootCreated, "previous default remains registered");

  // Re-injecting the current default is a no-op (current === database branch).
  const again = await boot.initDatabase(injected);
  assert.equal(again, injected);
  assert.equal(SqlStackDB.get(), injected);
  return {
    returnedIsInjected: true,
    exportedIsInjected: true,
    defaultIsInjected: true,
    namedInjectedIsInjected: true,
    reinjectionReturnedSame: true,
    injectedConnectedDatabaseName: await currentDatabaseName(injected),
    bootCreatedConnectedDatabaseName: await currentDatabaseName(bootCreated),
    injectedConnectAccountsCount: await countAccounts(injected),
  };
}

// 4. adapter factory throws -> initDatabase logs and rethrows THE SAME error, registers nothing.
async function adapterFailure() {
  const { SqlStackDB } = await import("sqlstack");
  const failure = new Error("simulated createPgDb failure");
  mock.module("sqlstack/adapters", {
    namedExports: {
      createPgDb() {
        throw failure;
      },
    },
  });
  const boot = await import("../../../src/server/repo/boot.ts");
  assert.equal(registryIsEmpty(SqlStackDB), true, "precondition: fresh process has no default");
  process.env.DATABASE_URL = env("KAZIBEE_LIFECYCLE_FIXTURE_URL_A");

  await assert.rejects(boot.initDatabase(), (err) => err === failure);
  assert.equal(registryIsEmpty(SqlStackDB), true, "still no default after the failed boot");
  return { rejectedWithSameError: true, registryStillEmpty: true, exportedUnset: boot.DATABASE === undefined };
}

// 5. injected first with NO default -> registered through the inner catch.
async function injectedFirst(scope) {
  const { SqlStackDB, createPgDb, boot } = await loadReal();
  assert.equal(registryIsEmpty(SqlStackDB), true, "precondition: fresh process has no default");
  const injected = createPgDb(env("KAZIBEE_LIFECYCLE_FIXTURE_URL_A"));
  ownAdapter(scope, injected, "injected");

  const database = await boot.initDatabase(injected);
  assert.equal(database, injected);
  assert.equal(boot.DATABASE, injected);
  assert.equal(SqlStackDB.get(), injected);
  assert.equal(SqlStackDB.get("injected"), injected);
  return {
    returnedIsInjected: true,
    exportedIsInjected: true,
    defaultIsInjected: true,
    namedInjectedIsInjected: true,
    connectAccountsCount: await countAccounts(injected),
    connectedDatabaseName: await currentDatabaseName(injected),
  };
}

// 6. registry.register throws -> warned, injected still returned; old default survives,
//    exported DATABASE points at the new injected connection.
async function registerFailure(scope) {
  const { SqlStackDB, createPgDb, boot } = await loadReal();
  assert.equal(registryIsEmpty(SqlStackDB), true, "precondition: fresh process has no default");
  const url = env("KAZIBEE_LIFECYCLE_FIXTURE_URL_A");
  const injected = createPgDb(url);
  ownAdapter(scope, injected, "injected");
  await boot.initDatabase(injected);
  assert.equal(SqlStackDB.get(), injected, "precondition: an injected default exists");

  const secondInjected = createPgDb(url);
  ownAdapter(scope, secondInjected, "second-injected");
  // Both register attempts (guarded swap and inner-catch retry) must throw
  // for the outer warn branch to engage.
  const registerMock = mock.method(SqlStackDB, "register", () => {
    throw new Error("simulated register failure");
  });
  let returned;
  try {
    returned = await boot.initDatabase(secondInjected);
  } finally {
    registerMock.mock.restore();
  }
  assert.equal(returned, secondInjected);
  assert.equal(boot.DATABASE, secondInjected);
  // The registry rejected the swap, so the previous default survives.
  assert.equal(SqlStackDB.get(), injected);
  assert.equal(registerMock.mock.callCount(), 2, "guarded swap + inner-catch retry both attempted");
  return {
    returnedIsSecondInjected: true,
    exportedIsSecondInjected: true,
    defaultIsFirstInjected: true,
    registerAttempts: registerMock.mock.callCount(),
    secondInjectedConnectAccountsCount: await countAccounts(secondInjected),
  };
}

function serializeError(error) {
  if (error instanceof AggregateError) {
    return { name: error.name, message: error.message, errors: error.errors.map(serializeError) };
  }
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { name: "NonError", message: String(error) };
}

async function main() {
  const scenario = env("KAZIBEE_LIFECYCLE_SCENARIO");
  const run = SCENARIOS[scenario];
  const report = {
    ok: false,
    scenario,
    runtime: { node: process.version, pid: process.pid },
    observations: null,
    error: null,
  };
  try {
    if (!Object.hasOwn(SCENARIOS, scenario) || typeof run !== "function") throw new Error(`Unknown scenario ${scenario}`);
    report.observations = await withTestScope((scope) => run(scope));
    report.ok = true;
  } catch (error) {
    report.error = serializeError(error);
  }
  process.stdout.write(RESULT_MARKER + JSON.stringify(report) + "\n");
  return report.ok ? 0 : 1;
}

process.exitCode = await main();
