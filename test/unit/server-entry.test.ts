import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * server.ts entrypoints (node() / worker()) — the boot wiring itself, with the
 * heavy edges (real database boot, the neon driver, sqlstack registration)
 * mocked at the module boundary.
 */

const initDatabase = vi.fn(async () => {});
vi.mock("../../src/server/repo/boot", () => ({ initDatabase }));

const registered: Array<{ name: string; db: unknown }> = [];
const setDefault = vi.fn();
const createPgDb = vi.fn((poolLike: unknown) => ({ poolLike }));
vi.mock("sqlstack", () => ({
  SqlStackDB: {
    register: vi.fn((name: string, db: unknown) => {
      registered.push({ name, db });
      return { setDefault };
    }),
  },
  createPgDb,
  transaction: vi.fn(),
  currentTransaction: vi.fn(),
}));

const neonQuery = vi.fn(async (_sql: string, _params: unknown[]) => ({ rows: [], rowCount: 0 }));
const neon = vi.fn(() => Object.assign(() => {}, { query: neonQuery }));
const poolEnd = vi.fn(async () => {});
const releaseSpy = vi.fn();
const poolClient = { release: releaseSpy as unknown };
const poolConnect = vi.fn(async () => poolClient);
class FakePool {
  static instances: FakePool[] = [];
  connect = poolConnect;
  end = poolEnd;
  constructor(public options: unknown) { FakePool.instances.push(this); }
}
vi.mock("@neondatabase/serverless", () => ({ neon, Pool: FakePool }));

const { node, worker, configureLogging, STITCH_PATH } = await import("../../src/server/server");
const { default: RawRequest } = await import("../../src/server/services/raw_request");
const { default: Env } = await import("../../src/server/services/env");

describe("server entrypoints", () => {
  beforeEach(() => {
    registered.length = 0;
    vi.clearAllMocks();
    poolClient.release = releaseSpy;
  });

  it("exports the stitch path under server/", () => {
    expect(STITCH_PATH.endsWith("server/stitch.yaml")).toBe(true);
  });

  it("configureLogging resolves", async () => {
    await expect(configureLogging()).resolves.toBeUndefined();
  });

  describe("node()", () => {
    it("boots the database and returns dinner hooks", async () => {
      const hooks = await node();
      expect(initDatabase).toHaveBeenCalledTimes(1);
      expect(typeof hooks.contextBuilder).toBe("function");
      expect(typeof hooks.controllerBuilder).toBe("function");
      expect(typeof hooks.onRequestError).toBe("function");
    });

    it("contextBuilder captures the raw request in a scoped container", async () => {
      const hooks = await node();
      const request = new Request("https://kazibee.test/connect");
      const context = await hooks.contextBuilder({ request });
      const rawRequest = (await context.container.get(RawRequest)) as RawRequest;
      expect(rawRequest.get()).toBe(request);
    });

    it("contextBuilder stores null when no request is given", async () => {
      const hooks = await node();
      const context = await hooks.contextBuilder();
      const rawRequest = (await context.container.get(RawRequest)) as RawRequest;
      expect(rawRequest.get()).toBeNull();
    });

    it("controllerBuilder resolves from the scoped container when present", async () => {
      const hooks = await node();
      const context = await hooks.contextBuilder({ request: new Request("https://kazibee.test/") });
      const scoped = await hooks.controllerBuilder(RawRequest, context);
      const again = await hooks.controllerBuilder(RawRequest, context);
      expect(scoped).toBe(again);
      // Without a context it falls back to the root container.
      const root = await hooks.controllerBuilder(Env, null);
      expect(root).toBeInstanceOf(Env);
    });
  });

  describe("worker()", () => {
    it("returns hooks without registering a database when DATABASE_URL is absent", async () => {
      const hooks = await worker({ env: {} });
      expect(registered).toHaveLength(0);
      expect(typeof hooks.contextBuilder).toBe("function");
      expect(typeof hooks.onRequestError).toBe("function");
    });

    it("tolerates a missing env bag entirely", async () => {
      const hooks = await worker();
      expect(registered).toHaveLength(0);
      expect(typeof hooks.controllerBuilder).toBe("function");
    });

    it("publishes env bindings to the Env service", async () => {
      await worker({ env: { SOME_BINDING: "bound-value" } });
      const { default: container } = await import("../../src/server/container");
      const env = container.get(Env) as Env;
      expect(env.string("SOME_BINDING")).toBe("bound-value");
    });

    it("registers the neon-backed primary database when DATABASE_URL is bound", async () => {
      await worker({ env: { DATABASE_URL: "postgres://neon.example/db" } });
      expect(neon).toHaveBeenCalledWith("postgres://neon.example/db", { fullResults: true });
      expect(registered).toHaveLength(1);
      expect(registered[0]!.name).toBe("primary");
      expect(setDefault).toHaveBeenCalledWith("primary");
      expect(createPgDb).toHaveBeenCalledTimes(1);
    });

    it("routes poolLike.query through the stateless http driver", async () => {
      await worker({ env: { DATABASE_URL: "postgres://neon.example/db" } });
      const poolLike = (createPgDb.mock.calls[0]![0]) as {
        query(sql: string, params?: unknown[]): Promise<unknown>;
      };
      await poolLike.query("select 1", [7]);
      expect(neonQuery).toHaveBeenCalledWith("select 1", [7]);
      await poolLike.query("select 2");
      expect(neonQuery).toHaveBeenLastCalledWith("select 2", []);
    });

    it("hands out a per-transaction client whose release tears the pool down", async () => {
      await worker({ env: { DATABASE_URL: "postgres://neon.example/db" } });
      const poolLike = (createPgDb.mock.calls[0]![0]) as {
        connect(): Promise<{ release(...args: unknown[]): void }>;
      };
      const client = await poolLike.connect();
      expect(FakePool.instances.at(-1)!.options).toEqual({
        connectionString: "postgres://neon.example/db",
      });
      client.release();
      expect(releaseSpy).toHaveBeenCalledTimes(1);
      expect(poolEnd).toHaveBeenCalledTimes(1);
    });

    it("swallows a pool.end rejection during release", async () => {
      poolEnd.mockRejectedValueOnce(new Error("teardown failed"));
      await worker({ env: { DATABASE_URL: "postgres://neon.example/db" } });
      const poolLike = (createPgDb.mock.calls[0]![0]) as {
        connect(): Promise<{ release(...args: unknown[]): void }>;
      };
      const client = await poolLike.connect();
      client.release();
      await new Promise((resolve) => setImmediate(resolve));
      expect(poolEnd).toHaveBeenCalledTimes(1);
    });

    it("still returns hooks when database registration throws", async () => {
      neon.mockImplementationOnce(() => { throw new Error("bad connection string"); });
      const hooks = await worker({ env: { DATABASE_URL: "postgres://broken" } });
      expect(registered).toHaveLength(0);
      expect(typeof hooks.contextBuilder).toBe("function");
    });

    it("worker contextBuilder and controllerBuilder mirror the node hooks", async () => {
      const hooks = await worker({ env: {} });
      const request = new Request("https://kazibee.test/worker");
      const context = await hooks.contextBuilder({ request });
      const rawRequest = (await context.container.get(RawRequest)) as RawRequest;
      expect(rawRequest.get()).toBe(request);
      const controller = await hooks.controllerBuilder(RawRequest, context);
      expect(controller).toBe(rawRequest);
      const fallback = await hooks.controllerBuilder(Env, undefined);
      expect(fallback).toBeInstanceOf(Env);
    });
  });
});
