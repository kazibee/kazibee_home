import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainer, ExecutionContext, type Container } from "@noego/ioc";
import { ManifestResolver, SqlStack, SqlStackDB, resolveExecution, withTransaction, type Database } from "sqlstack";
import { currentAppTransaction } from "../../src/server/repo/current_transaction";
import { registerAppSqlStack } from "../../src/server/repo/sqlstack_scope";

const roots: Container[] = [];
const root = () => {
  const container = createContainer();
  roots.push(container);
  return container;
};
const database = (): Database => ({
  dialect: "postgres", conn: {}, query: vi.fn(async () => []), close: vi.fn(async () => {}),
});

afterEach(async () => {
  await Promise.all(roots.splice(0).map(container => container.dispose()));
  SqlStack.clearResolver();
});

describe("App SqlStack composition", () => {
  it("captures each root's database and manifest without request-time global fallback", async () => {
    const first = root(), second = root();
    const a = database(), b = database();
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
    } finally {
      await Promise.all(scopes.map(scope => scope.dispose()));
    }
    expect(a.close).not.toHaveBeenCalled();
    expect(b.close).not.toHaveBeenCalled();
  });

  it("refreshes the existing root on a dev rebuild without replacing its provider", async () => {
    const container = root();
    const a = database(), b = database();
    SqlStackDB.register("primary", a).setDefault("primary");
    await registerAppSqlStack(container);
    const stack = await container.get(SqlStack) as SqlStack;
    SqlStackDB.register("primary", b).setDefault("primary");
    await registerAppSqlStack(container);
    expect(await container.get(SqlStack)).toBe(stack);
    expect(stack.database()).toBe(b);
    await stack.close();
    expect(a.close).not.toHaveBeenCalled();
    expect(b.close).not.toHaveBeenCalled();
  });

  it("marks the root transaction rollback-only even after the global database changes", async () => {
    const container = root();
    SqlStackDB.register("primary", database()).setDefault("primary");
    await registerAppSqlStack(container);
    SqlStackDB.register("primary", database()).setDefault("primary");
    const cause = new Error("must roll back");
    await expect(ExecutionContext.run(container, () => withTransaction(async () => {
      const transaction = await currentAppTransaction();
      expect(transaction).toBeDefined();
      transaction!.rollbackOnly(cause);
    }))).rejects.toBe(cause);
    expect(await ExecutionContext.run(container, () => currentAppTransaction())).toBeUndefined();
  });

  it("does not hide missing registration inside an already active environment", async () => {
    const container = root();
    SqlStackDB.register("primary", database()).setDefault("primary");
    await expect(ExecutionContext.run(container, () => resolveExecution()))
      .rejects.toThrow("no SqlStack is registered");
  });
});
