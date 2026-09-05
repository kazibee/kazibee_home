/**
 * sqlstack 3.3 explicit per-IoC-root SqlStack contract, on the db tier.
 *
 * Two testDinner roots over the SAME production module but two DIFFERENT
 * isolated testPostgres databases, each composed with its own SqlStack via
 * composeProductionSql(...).module. Pins:
 *   - each root resolves its OWN SqlStack Singleton bound to its own database;
 *   - a real transactional write through root A lands only in database A;
 *   - a root composed WITHOUT a SqlStack fails closed under an active
 *     execution environment (no silent fallback to the process-global
 *     registry), which is the strictness that broke the old global wiring.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { ExecutionContext } from "@noego/ioc";
import { testDinner } from "@noego/dinner/testing";
import { SqlStack } from "sqlstack";
import type { TestPostgresDatabase } from "sqlstack/testing";
import ConnectExecutorController from "../../src/server/controller/connect_executor.controller";
import ConnectChannelController from "../../src/server/controller/connect_channel.controller";
import ConnectExecutorLogic from "../../src/server/logic/connect_executor.logic";
import type { ConnectExecutorActor } from "../../src/server/services/connect_executor_actor_resolver";
import type { ClaimCreateInput } from "../../src/server/services/connect_executor_request_parser";
import {
  buildProductionDatabase,
  composeProductionSql,
  seedAccount,
  type ProductionSqlRoot,
} from "../helpers/production-schema";

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, "../../src/server/openapi/connect/executors.yaml"), "utf8"),
) as Record<string, unknown>;

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

type Env = Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;

const compose = () =>
  testDinner(executorsSource)
    .select({ module: "connectExecutors" })
    .controllers({
      "connect_executor.controller": ConnectExecutorController,
      "connect_channel.controller": ConnectChannelController,
    })
    .hooks({});

let builtA: TestPostgresDatabase;
let builtB: TestPostgresDatabase;
let sqlA: ProductionSqlRoot;
let sqlB: ProductionSqlRoot;
let envA: Env;
let envB: Env;

const count = (built: TestPostgresDatabase, executorId: string) =>
  built.query(
    "SELECT count(*)::int AS n FROM connect_executors WHERE executor_id = $1",
    [executorId],
  ) as Promise<Array<{ n: number }>>;

beforeAll(async () => {
  [builtA, builtB] = await Promise.all([buildProductionDatabase(), buildProductionDatabase()]);
  await Promise.all([seedAccount(builtA, USER_ID), seedAccount(builtB, USER_ID)]);
  sqlA = await composeProductionSql(builtA, "root-a");
  sqlB = await composeProductionSql(builtB, "root-b");
  envA = await compose().use(sqlA.module).build();
  envB = await compose().use(sqlB.module).build();
});

afterAll(async () => {
  await envA?.dispose();
  await envB?.dispose();
  await sqlA?.database.close();
  await sqlB?.database.close();
  await builtA?.dispose();
  await builtB?.dispose();
});

describe("sqlstack per-root composition on the db tier", () => {
  it("each root owns a distinct SqlStack Singleton bound to its own database", async () => {
    const stackA = await envA.get<SqlStack>(SqlStack);
    const stackB = await envB.get<SqlStack>(SqlStack);
    expect(stackA).toBeInstanceOf(SqlStack);
    expect(stackB).toBeInstanceOf(SqlStack);
    expect(stackA).not.toBe(stackB);
    // Singleton within a root.
    expect(await envA.get<SqlStack>(SqlStack)).toBe(stackA);
    // Externally owned databases: identity preserved, not wrapped or copied.
    expect(stackA.getEntry().db).toBe(sqlA.database);
    expect(stackB.getEntry().db).toBe(sqlB.database);
    expect(stackA.getEntry().owned).toBe(false);
    expect(stackA.getEntry().name).toBe("root-a");
    expect(stackB.getEntry().name).toBe("root-b");
    expect(stackA.resolver()).toBeDefined();
  });

  it("a transactional write through root A lands only in database A", async () => {
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
  });

  it("a root composed without a SqlStack fails closed under its execution environment", async () => {
    const bare = await compose().build();
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
  });
});
