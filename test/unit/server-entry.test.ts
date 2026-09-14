import { describe, expect, it } from "vitest";
import { createContainer } from "@noego/ioc";
import { resourceCase } from "@noego/testing";
import { SqlStack, SqlStackDB } from "sqlstack";
import { testSqlite } from "sqlstack/testing";
import { configureLogging, node, STITCH_PATH, worker } from "../../src/server/server";
import Env from "../../src/server/services/env";
import RawRequest from "../../src/server/services/raw_request";

const ENTRY_SCHEMA = {
  version: 1,
  dialect: "sqlite",
  tables: {
    entry_probe: {
      columns: { id: { type: "text", primary: true } },
    },
  },
} as const;

/**
 * Server-entry qualification deliberately uses the real composition seams.
 * Database boot itself is covered in test/lifecycle/boot*.test.ts and the
 * root-owned provider contract in test/application/server-registration.test.ts.
 * These cases only prove the entrypoint chooses the correct hook shape and
 * publishes its ready database/environment into the App-owned root.
 */
describe("server entrypoints", () => {
  it("exports the stitch path under server/", () => {
    expect(STITCH_PATH.endsWith("server/stitch.yaml")).toBe(true);
  });

  it("configureLogging resolves", async () => {
    await expect(configureLogging()).resolves.toBeUndefined();
  });

  it("worker without DATABASE_URL returns legacy hooks and publishes env", async () => {
    const hooks = await worker({ env: { SOME_BINDING: "bound-value" } });
    expect(typeof hooks.requestScope).toBe("function");
    expect(typeof hooks.onRequestError).toBe("function");
    if (!("contextBuilder" in hooks)) throw new Error("expected legacy hooks");
    expect(typeof hooks.contextBuilder).toBe("function");
    expect(typeof hooks.controllerBuilder).toBe("function");

    const request = new Request("https://kazibee.test/worker-legacy");
    const legacy = await hooks.contextBuilder({ request });
    expect(((await legacy.container.get(RawRequest)) as RawRequest).get()).toBe(request);
  });

  /** The App 3 request hooks server.ts returns for an App-owned root (no legacy contextBuilder/controllerBuilder). */
  const MODERN_HOOKS = ["onRequestError", "onRequestSettled", "onRouteMatched", "requestScope"];

  it("worker with an App-owned root returns only modern hooks", async () => {
    const container = createContainer();
    try {
      const hooks = await worker({ env: { SOME_BINDING: "isolated" }, container });
      expect(Object.keys(hooks).sort()).toEqual(MODERN_HOOKS);
      expect((container.get(Env) as Env).string("SOME_BINDING")).toBe("isolated");

      const scope = container.extend();
      try {
        const request = new Request("https://kazibee.test/worker");
        await hooks.requestScope(scope, { request });
        expect(((await scope.get(RawRequest)) as RawRequest).get()).toBe(request);
      } finally {
        await scope.dispose();
      }
    } finally {
      await container.dispose();
    }
  });

  it("worker with DATABASE_URL registers its real SQLStack bridge on the supplied root without opening a query", async () => {
    const container = createContainer();
    try {
      const hooks = await worker({
        env: { DATABASE_URL: "postgres://user:pass@db.invalid/kazibee" },
        container,
      });
      expect(Object.keys(hooks).sort()).toEqual(MODERN_HOOKS);
      expect(container.isRegistered(SqlStack)).toBe(true);
      const stack = await container.get(SqlStack) as SqlStack;
      expect(stack.getEntry().name).toBe("primary");
      expect(stack.getEntry().owned).toBe(false);
    } finally {
      await container.dispose();
    }
  });

  it("node bridges a ready real SQLStack fixture into the App-owned root", resourceCase(async (scope) => {
    const fixture = scope.own(
      await testSqlite(ENTRY_SCHEMA, { mode: "memory" })
        .data({ entry_probe: [{ id: "ready" }] })
        .build(),
      "entry-fixture",
    );
    // Legacy node boot intentionally consumes the deployment-global default;
    // the bridge captures it into this root. The fixture remains test-owned.
    SqlStackDB.register("entry-test", fixture.db).setDefault("entry-test");

    const container = createContainer();
    scope.own({
      dispose: () => container.isDisposed() ? undefined : container.dispose(),
    }, "app-root");

    const hooks = await node({ container });
    expect(Object.keys(hooks).sort()).toEqual(MODERN_HOOKS);
    expect(container.isRegistered(SqlStack)).toBe(true);
    const stack = await container.get(SqlStack) as SqlStack;
    expect(stack.database()).toBe(fixture.db);
    expect((await fixture.db.query("SELECT id FROM entry_probe", [])) as unknown[])
      .toEqual([{ id: "ready" }]);
    expect((container.get(Env) as Env).string("PATH")).toBe(process.env.PATH);
  }));
});
