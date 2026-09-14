/**
 * src/server/repo/sqlstack_scope.ts — explicit low-level compatibility
 * conformance (R1/R7) for the App 2.4 -> IoC bridge `registerAppSqlStack`.
 *
 * The subject bridges the LEGACY process-global `SqlStackDB` registry and the
 * deprecated static `SqlStack.useResolver` into a bare IoC root. Bare
 * `createContainer()` roots are therefore the correct subject surface here:
 * this is a compatibility test of that bridge, not a product application
 * factory. The ordinary per-root application cases live in
 * test/application/sqlstack-root-isolation.test.ts.
 *
 * Migration from test/unit: the fake `Database` objects, shared `roots` array,
 * `root()` factory and `afterEach` are gone. Every case owns a FRESH real
 * SQLStack SQLite `:memory:` fixture per database (actual engine adapter at
 * `fixture.db`), owned by the resourceCase scope BEFORE the bare containers so
 * reverse-order disposal disposes the roots first and the fixtures last.
 *
 * Global legacy state: the process-global `SqlStackDB` default registry cannot
 * be reset, so every case explicitly overwrites it before use and never relies
 * on a prior case's rows or roots. The deprecated global resolver is captured
 * on entry and restored (or cleared, when there was none) by a scope
 * finalizer instead of a blind clear.
 *
 * "close not called" claims use PASS-THROUGH `vi.spyOn(adapter, 'close')`
 * (never mocked away) and are backed by real SQL rows read from the borrowed
 * adapter after the explicit root dispose / stack close. Spies are restored
 * before the fixture's own final cleanup.
 */
import { describe, expect, it, vi } from "vitest";
import { createContainer, ExecutionContext, type IContainer } from "@noego/ioc";
import { resourceCase } from "@noego/testing";
import {
  ManifestResolver,
  SqlStack,
  SqlStackDB,
  getActiveResolver,
  getActiveTransaction,
  resolveExecution,
  withTransaction,
  type Database,
} from "sqlstack";
import { testSqlite, type TestSqliteDatabase } from "sqlstack/testing";
import { currentAppTransaction } from "../../src/server/repo/current_transaction";
import { registerAppSqlStack } from "../../src/server/repo/sqlstack_scope";

type Scope = { own<T extends { dispose(): unknown }>(resource: T, owner?: string): T };

const PROBE_SCHEMA = {
  version: 1,
  dialect: "sqlite",
  tables: { probe: { columns: { id: { type: "text", primary: true } } } },
};

/** Fresh real SQLite memory database seeded with exactly one probe row. */
const probe = (scope: Scope, id: string): Promise<TestSqliteDatabase> =>
  testSqlite(PROBE_SCHEMA, { mode: "memory" })
    .data({ probe: [{ id }] })
    .build()
    .then(fixture => scope.own(fixture, `fixture-${id}`));

/** Bare IoC root owned by the scope; tolerant of an explicit in-case dispose. */
const bareRoot = (scope: Scope, owner: string): IContainer => {
  const container = createContainer();
  scope.own({ dispose: () => (container.isDisposed() ? undefined : container.dispose()) }, owner);
  return container;
};

/** Capture the deprecated global resolver now; restore (or clear) it on exit. */
const preserveGlobalResolver = (scope: Scope): void => {
  const prior = getActiveResolver();
  scope.own({
    dispose: () => (prior ? SqlStack.useResolver(prior) : SqlStack.clearResolver()),
  }, "global-resolver");
};

/** Real rows through the actual adapter: proves the borrowed connection is alive. */
const ids = async (db: Database): Promise<string[]> =>
  ((await db.query("SELECT id FROM probe ORDER BY id", [])) as Array<{ id: string }>).map(row => row.id);

/** Pass-through close spies (real close still runs); restored before fixture cleanup. */
const spyClose = (scope: Scope, ...databases: Database[]) => {
  const spies = databases.map(db => vi.spyOn(db, "close"));
  scope.own({ dispose: () => spies.forEach(spy => spy.mockRestore()) }, "close-spies");
  return spies;
};

describe("App SqlStack composition", () => {
  it("captures each root's database and manifest without request-time global fallback", resourceCase(async (scope) => {
    preserveGlobalResolver(scope);
    const fixtureA = await probe(scope, "a");
    const fixtureB = await probe(scope, "b");
    const a = fixtureA.db, b = fixtureB.db;
    const [closeA, closeB] = spyClose(scope, a, b);
    const first = bareRoot(scope, "root-first"), second = bareRoot(scope, "root-second");
    const resolverA = new ManifestResolver({ "Repo.find": "SELECT 'a'" }, { assert: false });
    const resolverB = new ManifestResolver({ "Repo.find": "SELECT 'b'" }, { assert: false });
    SqlStackDB.register("primary", a).setDefault("primary");
    SqlStack.useResolver(resolverA);
    await registerAppSqlStack(first);
    SqlStackDB.register("primary", b).setDefault("primary");
    SqlStack.useResolver(resolverB);
    await registerAppSqlStack(second);
    const scopes = [first.extend(), second.extend()];
    try {
      const [one, two] = await Promise.all(scopes.map(scope =>
        ExecutionContext.run(scope, () => resolveExecution())));
      expect(one.entry.db).toBe(a);
      expect(two.entry.db).toBe(b);
      expect(one.resolver).toBe(resolverA);
      expect(two.resolver).toBe(resolverB);
      expect(one.entry.stack).not.toBe(two.entry.stack);
      expect(one.viaStack && two.viaStack).toBe(true);
      // Identity is proven above; now prove each root's manifest SQL really
      // runs against that root's own engine and yields the expected value.
      const request = { className: "Repo", methodName: "find", dialect: "sqlite" as const };
      const sqlA = one.resolver!.resolve(request), sqlB = two.resolver!.resolve(request);
      expect(sqlA).toBe("SELECT 'a'");
      expect(sqlB).toBe("SELECT 'b'");
      const [rowA] = (await one.entry.db.query(sqlA!, [])) as Array<Record<string, string>>;
      const [rowB] = (await two.entry.db.query(sqlB!, [])) as Array<Record<string, string>>;
      expect(Object.values(rowA)).toEqual(["a"]);
      expect(Object.values(rowB)).toEqual(["b"]);
      expect(await ids(a)).toEqual(["a"]);
      expect(await ids(b)).toEqual(["b"]);
    } finally {
      await Promise.all(scopes.map(scope => scope.dispose()));
    }
    // Explicit root dispose: the bridge registered the adapters as borrowed
    // (owned: false), so neither adapter is closed and both still answer SQL.
    await first.dispose();
    await second.dispose();
    expect(closeA).not.toHaveBeenCalled();
    expect(closeB).not.toHaveBeenCalled();
    expect(await ids(a)).toEqual(["a"]);
    expect(await ids(b)).toEqual(["b"]);
  }));

  it("refreshes the existing root on a dev rebuild without replacing its provider", resourceCase(async (scope) => {
    preserveGlobalResolver(scope);
    const fixtureA = await probe(scope, "a");
    const fixtureB = await probe(scope, "b");
    const a = fixtureA.db, b = fixtureB.db;
    const [closeA, closeB] = spyClose(scope, a, b);
    const container = bareRoot(scope, "root");
    SqlStackDB.register("primary", a).setDefault("primary");
    await registerAppSqlStack(container);
    const stack = await container.get(SqlStack) as SqlStack;
    expect(stack.database()).toBe(a);
    expect(await ids(stack.database())).toEqual(["a"]);
    SqlStackDB.register("primary", b).setDefault("primary");
    await registerAppSqlStack(container);
    expect(await container.get(SqlStack)).toBe(stack);
    expect(stack.database()).toBe(b);
    expect(await ids(stack.database())).toEqual(["b"]);
    await stack.close();
    // Both adapters were borrowed: close() must leave them open and answering.
    expect(closeA).not.toHaveBeenCalled();
    expect(closeB).not.toHaveBeenCalled();
    expect(await ids(a)).toEqual(["a"]);
    expect(await ids(b)).toEqual(["b"]);
  }));

  it("marks the root transaction rollback-only even after the global database changes", resourceCase(async (scope) => {
    preserveGlobalResolver(scope);
    const fixtureA = await probe(scope, "a");
    const fixtureB = await probe(scope, "b");
    const container = bareRoot(scope, "root");
    SqlStackDB.register("primary", fixtureA.db).setDefault("primary");
    await registerAppSqlStack(container);
    // The global default moves to B AFTER capture; the root must keep A.
    SqlStackDB.register("primary", fixtureB.db).setDefault("primary");
    const stack = await container.get(SqlStack) as SqlStack;
    const entry = stack.getEntry();
    expect(entry.db).toBe(fixtureA.db);
    const cause = new Error("must roll back");
    await expect(ExecutionContext.run(container, () => withTransaction(async () => {
      // A real write inside the real transaction on the root's own entry.
      const active = getActiveTransaction(entry);
      expect(active).toBeDefined();
      await active!.query("INSERT INTO probe (id) VALUES (?)", ["sentinel"]);
      const transaction = await currentAppTransaction();
      expect(transaction).toBeDefined();
      expect(transaction!.entry).toBe(entry);
      transaction!.rollbackOnly(cause);
    }))).rejects.toBe(cause);
    expect(await ExecutionContext.run(container, () => currentAppTransaction())).toBeUndefined();
    // Rolled back: the sentinel never landed in A, and B was never touched.
    expect(await ids(fixtureA.db)).toEqual(["a"]);
    expect(await ids(fixtureB.db)).toEqual(["b"]);
  }));

  it("does not hide missing registration inside an already active environment", resourceCase(async (scope) => {
    preserveGlobalResolver(scope);
    const fixture = await probe(scope, "a");
    const container = bareRoot(scope, "root");
    SqlStackDB.register("primary", fixture.db).setDefault("primary");
    expect(container.isRegistered(SqlStack)).toBe(false);
    await expect(ExecutionContext.run(container, () => resolveExecution()))
      .rejects.toThrow("no SqlStack is registered");
    // Fail-closed, not fallback: the global default is intact and untouched.
    expect(SqlStackDB.get()).toBe(fixture.db);
    expect(await ids(fixture.db)).toEqual(["a"]);
  }));
});
