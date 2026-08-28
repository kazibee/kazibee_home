import path from "node:path";
import { configureLogging as configureNoegoLogging, getLogger } from "@noego/logger";
// Static imports only: the old template-literal dynamicImport defeated the
// bundler's module graph, so on workerd's unbundled tree `import("sqlstack")`
// resolved as a relative path and failed — no worker DB registration ever
// succeeded. Kazidoc imports these statically for exactly this reason.
import { SqlStackDB, createPgDb } from "sqlstack";
import { neon, Pool } from "@neondatabase/serverless";
import { initDatabase } from "./repo/boot";
import TraceAdapter from "./observability/trace_adapter";
import container from "./container";
import { connectRequestError } from "./middleware/connect_request_error";
import Env from "./services/env";
import RawRequest from "./services/raw_request";

const baseLogger = getLogger("kazibee");

const SERVER_ROOT = path.resolve(process.cwd(), "server");
export const STITCH_PATH = path.join(SERVER_ROOT, "stitch.yaml");

export async function configureLogging(): Promise<void> {
  configureNoegoLogging({});
}

export async function node(_options: { root?: string } = {}) {
  await configureLogging();
  TraceAdapter.configureWebsiteProcess();
  await initDatabase();

  (container.get(Env) as Env).load(process.env as Record<string, unknown>);

  return {
    contextBuilder: async (requestContext?: { request?: Request }) => {
      const scoped = container.extend();
      // Captured so controllers can forward the untouched Request (e.g. a
      // WebSocket upgrade) rather than a reconstructed one.
      const rawRequest = (await scoped.get(RawRequest)) as RawRequest;
      rawRequest.set(requestContext?.request ?? null);
      return { container: scoped };
    },
    controllerBuilder: async (Controller: any, context: any) => {
      if (context?.container) return context.container.get(Controller);
      return container.get(Controller);
    },
    onRequestError: connectRequestError,
  };
}

export async function worker({ env }: { env?: Record<string, unknown> } = {}) {
  TraceAdapter.configureWebsiteProcess();
  // Worker bindings (EXECUTOR_COORDINATOR, secrets) live on `env`, not
  // process.env, so they must be published before any request is served.
  (container.get(Env) as Env).load(env ?? {});
  const hooks = {
    onRequestError: connectRequestError,
    contextBuilder: async (requestContext?: { request?: Request }) => {
      const scoped = container.extend();
      const rawRequest = (await scoped.get(RawRequest)) as RawRequest;
      rawRequest.set(requestContext?.request ?? null);
      return { container: scoped };
    },
    controllerBuilder: async (Controller: any, context: any) => {
      if (context?.container) return context.container.get(Controller);
      return container.get(Controller);
    },
  };
  const connectionString = typeof env?.DATABASE_URL === "string" ? env.DATABASE_URL : null;
  if (!connectionString) {
    baseLogger.warn("[kazibee] worker boot: no DATABASE_URL bound — DB-backed routes will fail");
    return hooks;
  }
  try {
    // Neon serverless driver in stateless HTTP mode (kazidoc's proven worker
    // recipe): each query is one fetch to Neon's SQL-over-HTTP endpoint — no
    // TCP/TLS handshake, and no live connection object. Workers forbid
    // sharing I/O objects across requests, which rules out pg Pool/Client
    // here. fullResults gives pg-shaped { rows, rowCount, fields } for
    // sqlstack.
    const httpQuery = neon(connectionString, { fullResults: true });
    const poolLike = {
      async query(sql: string, params?: unknown[]) {
        return httpQuery.query(sql, (params ?? []) as unknown[]);
      },
      // sqlstack transactions need a dedicated session (.connect()); the HTTP
      // driver is stateless, so hand out a WebSocket-backed client created per
      // transaction and torn down on release — request-scoped, which is the
      // only lifetime Workers allow for I/O objects.
      async connect() {
        const pool = new Pool({ connectionString });
        const client = await pool.connect();
        const release = client.release.bind(client);
        client.release = ((...args: unknown[]) => {
          release(...(args as []));
          void pool.end().catch(() => {});
        }) as typeof client.release;
        return client;
      },
    };
    SqlStackDB.register("primary", createPgDb(poolLike)).setDefault("primary");
    baseLogger.info("[kazibee] worker boot: postgres via neon serverless http");
  } catch (error) {
    baseLogger.error("[kazibee] worker boot: postgres registration failed", error);
  }
  return hooks;
}
