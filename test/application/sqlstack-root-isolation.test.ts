/**
 * Per-root SQLStack ownership through original-config applications and real
 * PostgreSQL fixtures. Each case owns its two databases and borrowed adapters.
 * The last case deliberately uses the low-level testIoc conformance primitive
 * to test ABSENT composition: a valid original application always declares
 * SqlStack, so it cannot represent that negative contract. It is not an
 * alternate product application constructor or an HTTP application claim.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { ExecutionContext } from "@noego/ioc";
import { testApp } from "@noego/app";
import { testIoc, resourceCase } from "@noego/testing";
import { SqlStack, createPgDb, SourceScanResolver } from "sqlstack";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import ConnectExecutorLogic from "../../src/server/logic/connect_executor.logic";
import type { ConnectExecutorActor } from "../../src/server/services/connect_executor_actor_resolver";
import type { ClaimCreateInput } from "../../src/server/services/connect_executor_request_parser";
import { executorRegistrySchema } from "../schemas/executor-registry";
import { insertAccount } from "../schemas/executor-transaction-data";

const CONFIG = path.resolve(__dirname, "../../noego.config.yml");

const USER_ID = "usr_dbisolate1";
const TOKEN = "I".repeat(43);
const actor: ConnectExecutorActor = {
  role: "browser_session",
  userId: USER_ID,
  sessionId: "ses_dbisolate1",
};

const createInput = (n: string): ClaimCreateInput => ({
  kind: "executor.claim.create.request",
  protocolVersion: "1.0",
  claimId: `clm_dbiso${n}`,
  executorId: `exe_dbiso${n}`,
  deviceId: `dev_dbiso${n}`,
  actorRole: "executor_device",
  displayName: `Isolated ${n}`,
  platform: "linux",
  architecture: "x64",
  executorVersion: "2.0.1",
  keyFingerprint: "d".repeat(64),
  idempotencyKey: `idem_dbiso_${n}_0123456789`,
  correlationId: `cor_dbiso${n}`,
});

const count = (built: TestPostgresDatabase, executorId: string) =>
  built.query(
    "SELECT count(*)::int AS n FROM connect_executors WHERE executor_id = $1",
    [executorId],
  ) as Promise<Array<{ n: number }>>;

describe("sqlstack per-root composition on the db tier", () => {
  it("each root owns a distinct SqlStack Singleton bound to its own database", resourceCase(async (scope) => {
    const options = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };
    const builtA = await testPostgres(executorRegistrySchema, options).build();
    const builtB = await testPostgres(executorRegistrySchema, options).build();
    await insertAccount(builtA, USER_ID);
    await insertAccount(builtB, USER_ID);
    const databaseA = createPgDb(builtA.url);
    scope.own({ dispose: () => databaseA.close() }, 'root-a-adapter');
    const databaseB = createPgDb(builtB.url);
    scope.own({ dispose: () => databaseB.close() }, 'root-b-adapter');
    const envA = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(SqlStack, () => new SqlStack({
        databases: { 'root-a': { db: databaseA, owned: false } },
        default: 'root-a',
        resolver: new SourceScanResolver(path.dirname(CONFIG)),
      })).build();
    const envB = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(SqlStack, () => new SqlStack({
        databases: { 'root-b': { db: databaseB, owned: false } },
        default: 'root-b',
        resolver: new SourceScanResolver(path.dirname(CONFIG)),
      })).build();

    const stackA = await envA.get<SqlStack>(SqlStack);
    const stackB = await envB.get<SqlStack>(SqlStack);
    expect(stackA).toBeInstanceOf(SqlStack);
    expect(stackB).toBeInstanceOf(SqlStack);
    expect(stackA).not.toBe(stackB);
    // Singleton within a root.
    expect(await envA.get<SqlStack>(SqlStack)).toBe(stackA);
    // Externally owned databases: identity preserved, not wrapped or copied.
    expect(stackA.getEntry().db).toBe(databaseA);
    expect(stackB.getEntry().db).toBe(databaseB);
    expect(stackA.getEntry().owned).toBe(false);
    expect(stackA.getEntry().name).toBe("root-a");
    expect(stackB.getEntry().name).toBe("root-b");
    expect(stackA.resolver()).toBeDefined();
    await envA.dispose();
    await envB.dispose();
    expect(await databaseA.query("SELECT 1 AS alive", [])).toEqual([{ alive: 1 }]);
    expect(await databaseB.query("SELECT 1 AS alive", [])).toEqual([{ alive: 1 }]);
  }));

  it("a transactional write through root A lands only in database A", resourceCase(async (scope) => {
    const options = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };
    const builtA = await testPostgres(executorRegistrySchema, options).build();
    const builtB = await testPostgres(executorRegistrySchema, options).build();
    await insertAccount(builtA, USER_ID);
    await insertAccount(builtB, USER_ID);
    const databaseA = createPgDb(builtA.url);
    scope.own({ dispose: () => databaseA.close() }, 'root-a-adapter');
    const databaseB = createPgDb(builtB.url);
    scope.own({ dispose: () => databaseB.close() }, 'root-b-adapter');
    const envA = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(SqlStack, () => new SqlStack({
        databases: { 'root-a': { db: databaseA, owned: false } },
        default: 'root-a',
        resolver: new SourceScanResolver(path.dirname(CONFIG)),
      })).build();
    const envB = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(SqlStack, () => new SqlStack({
        databases: { 'root-b': { db: databaseB, owned: false } },
        default: 'root-b',
        resolver: new SourceScanResolver(path.dirname(CONFIG)),
      })).build();

    const logicA = await envA.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const input = createInput("001");
    const result = await logicA.createClaim(actor, input, TOKEN);
    expect(result.outcome).toBe("created");
    expect(await count(builtA, input.executorId)).toEqual([{ n: 1 }]);
    expect(await count(builtB, input.executorId)).toEqual([{ n: 0 }]);

    const logicB = await envB.get<ConnectExecutorLogic>(ConnectExecutorLogic);
    const other = createInput("002");
    expect((await logicB.createClaim(actor, other, TOKEN)).outcome).toBe("created");
    expect(await count(builtB, other.executorId)).toEqual([{ n: 1 }]);
    expect(await count(builtA, other.executorId)).toEqual([{ n: 0 }]);
  }));

  it("a root composed without a SqlStack fails closed under its execution environment", resourceCase(async (scope) => {
    const options = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };
    const builtA = await testPostgres(executorRegistrySchema, options).build();
    const builtB = await testPostgres(executorRegistrySchema, options).build();
    await insertAccount(builtA, USER_ID);
    await insertAccount(builtB, USER_ID);
    const databaseA = createPgDb(builtA.url);
    scope.own({ dispose: () => databaseA.close() }, 'root-a-adapter');
    const databaseB = createPgDb(builtB.url);
    scope.own({ dispose: () => databaseB.close() }, 'root-b-adapter');
    const envA = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(SqlStack, () => new SqlStack({
        databases: { 'root-a': { db: databaseA, owned: false } },
        default: 'root-a',
        resolver: new SourceScanResolver(path.dirname(CONFIG)),
      })).build();
    const envB = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .function(SqlStack, () => new SqlStack({
        databases: { 'root-b': { db: databaseB, owned: false } },
        default: 'root-b',
        resolver: new SourceScanResolver(path.dirname(CONFIG)),
      })).build();

    const bare = await testIoc().build();
    try {
      expect(bare.root.isRegistered(SqlStack)).toBe(false);
      const logic = await bare.get<ConnectExecutorLogic>(ConnectExecutorLogic);
      // The @transaction wrapper may surface the missing-stack error as a
      // rejection, or the service may map it to its `failed` outcome — either
      // shape proves the query never fell back to the global registry.
      let settled: { outcome?: string; error?: unknown };
      try {
        settled = await ExecutionContext.run(bare.root, () =>
          logic.createClaim(actor, createInput("003"), TOKEN));
      } catch (error) {
        settled = { error };
      }
      if (settled.error !== undefined) {
        expect(String((settled.error as Error).message ?? settled.error)).toMatch(/no SqlStack is registered/);
      } else {
        expect(settled.outcome).toBe("failed");
      }
      // Strictness, not a silent global fallback: nothing was written anywhere.
      expect(await count(builtA, "exe_dbiso003")).toEqual([{ n: 0 }]);
      expect(await count(builtB, "exe_dbiso003")).toEqual([{ n: 0 }]);
    } finally {
      await bare.dispose();
    }
  }));
});
