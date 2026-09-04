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
import type { Container } from "@noego/ioc";
import legacyContainer from "./container";
import { connectRequestError } from "./middleware/connect_request_error";
import Env from "./services/env";
import RawRequest from "./services/raw_request";

interface BootOptions {
  root?: string;
  env?: Record<string, unknown>;
  /** The App server root (absent only for legacy callers → the deprecated global). */
  container?: Container;
}

const rootOf = (options: BootOptions): Container => options.container ?? legacyContainer;

/**
 * The App owns the per-request scope (one child of the server root per
 * request, active through ioc's ExecutionContext); this populates the
 * scoped RawRequest holder so controllers can forward the untouched Request
 * (e.g. a WebSocket upgrade) rather than a reconstructed one.
 */
const requestScope = async (scope: Container, ctx: { request?: Request }) => {
  const rawRequest = (await scope.get(RawRequest)) as RawRequest;
  rawRequest.set(ctx.request ?? null);
};

const baseLogger = getLogger("kazibee");

const SERVER_ROOT = path.resolve(process.cwd(), "server");
export const STITCH_PATH = path.join(SERVER_ROOT, "stitch.yaml");

export async function configureLogging(): Promise<void> {
  configureNoegoLogging({});
}

export async function node(options: BootOptions = {}) {
  const container = rootOf(options);
  await configureLogging();
  TraceAdapter.configureWebsiteProcess();
  await initDatabase();

  (container.get(Env) as Env).load(process.env as Record<string, unknown>);

  return { requestScope, onRequestError: connectRequestError };
}

export async function worker(options: BootOptions = {}) {
  const container = rootOf(options);
  const env = options.env;
  TraceAdapter.configureWebsiteProcess();
  // Worker bindings (EXECUTOR_COORDINATOR, secrets) live on `env`, not
  // process.env, so they must be published before any request is served.
  (container.get(Env) as Env).load(env ?? {});
  const hooks = { requestScope, onRequestError: connectRequestError };
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
