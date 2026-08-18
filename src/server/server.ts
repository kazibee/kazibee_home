import path from "node:path";
import { configureLogging as configureNoegoLogging, getLogger } from "@noego/logger";
import { initDatabase } from "./repo/boot";
import TraceAdapter from "./observability/trace_adapter";
import container from "./container";
import { connectRequestError } from "./middleware/connect_request_error";

const baseLogger = getLogger("kazibee");
const dynamicImport = (specifier: string) => import(`${specifier}`);

const SERVER_ROOT = path.resolve(process.cwd(), "server");
export const STITCH_PATH = path.join(SERVER_ROOT, "stitch.yaml");

export async function configureLogging(): Promise<void> {
  configureNoegoLogging({});
}

export async function bootBackendV1(_options: { root?: string } = {}) {
  await configureLogging();
  TraceAdapter.configureWebsiteProcess();
  await initDatabase();

  return {
    contextBuilder: () => {
      const scoped = container.extend();
      return { container: scoped };
    },
    controllerBuilder: async (Controller: any, context: any) => {
      if (context?.container) return context.container.get(Controller);
      return container.get(Controller);
    },
    onRequestError: connectRequestError,
  };
}

export async function bootWorkerV1({ env }: { env?: Record<string, unknown> } = {}) {
  TraceAdapter.configureWebsiteProcess();
  const hooks = { onRequestError: connectRequestError };
  const connectionString = typeof env?.DATABASE_URL === "string" ? env.DATABASE_URL : null;
  if (!connectionString) {
    baseLogger.warn("[kazibee] worker boot: no DATABASE_URL bound — DB-backed routes will fail");
    return hooks;
  }
  try {
    const { SqlStackDB, createPgDb } = await dynamicImport("sqlstack");
    const pg = (await dynamicImport("pg")).default;
    const poolLike = {
      async query(sql: string, params?: unknown[]) {
        const client = new pg.Client({ connectionString });
        await client.connect();
        try {
          return await client.query(sql, params);
        } finally {
          client.end().catch(() => {});
        }
      },
    };
    SqlStackDB.register("primary", createPgDb(poolLike)).setDefault("primary");
    baseLogger.info("[kazibee] worker boot: postgres via sqlstack");
  } catch (error) {
    baseLogger.error("[kazibee] worker boot: postgres registration failed", error);
  }
  return hooks;
}
