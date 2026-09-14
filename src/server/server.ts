import path from "node:path";
import { configureLogging as configureNoegoLogging, extendLogContext, getLogger } from "@noego/logger";
// Static imports only: the old template-literal dynamicImport defeated the
// bundler's module graph, so on workerd's unbundled tree `import("sqlstack")`
// resolved as a relative path and failed — no worker DB registration ever
// succeeded. Kazidoc imports these statically for exactly this reason.
import { SqlStack, SqlStackDB, createPgDb } from "sqlstack";
import { initDatabase } from "./repo/boot";
import { registerAppSqlStack } from "./repo/sqlstack_scope";
import { createProductionSqlStack, neonHttpPool, processSqlResolver, type ProductTarget } from "./repo/sqlstack_provider";
import TraceAdapter from "./observability/trace_adapter";
import { KaziQueryExport } from "./observability/kaziquery_export";
import GatewayRequestLog from "./observability/gateway_request_log";
import type { ProductRequestSettledContext, ProductRouteMatchedContext } from "@noego/app/runtime";
import { createContainer, type BindFunction, type IContainer } from "@noego/ioc";
import { connectRequestError } from "./middleware/connect_request_error";
import Env from "./services/env";
import RawRequest from "./services/raw_request";

interface BootOptions {
  root?: string;
  env?: Record<string, unknown>;
  /** The App server root. Legacy callers get a boot-owned root, never a process-global one. */
  container?: IContainer;
}

const rootOf = (options: BootOptions): IContainer => options.container ?? createContainer();

/**
 * The App owns the per-request scope (one child of the server root per
 * request, active through ioc's ExecutionContext); this populates the
 * scoped RawRequest holder so controllers can forward the untouched Request
 * (e.g. a WebSocket upgrade) rather than a reconstructed one.
 */
type ScopeLike = { get(token: unknown): unknown };

const requestScope = async (scope: ScopeLike, ctx: { request?: Request; runtime?: unknown }) => {
  KaziQueryExport.attach(scope, ctx.runtime);
  if (ctx.request) {
    // Ambient log context for the whole request: every logger.* call made
    // inside this scope (controllers, services, sqlstack) carries these
    // fields without threading them through signatures.
    const ray = ctx.request.headers.get("cf-ray");
    extendLogContext({
      requestId: crypto.randomUUID(),
      method: ctx.request.method,
      ...(ray ? { cfRay: ray } : {}),
    });
    const requestLog = (await scope.get(GatewayRequestLog)) as GatewayRequestLog;
    requestLog.start(ctx.request, ctx.runtime);
  }
  const rawRequest = (await scope.get(RawRequest)) as RawRequest;
  rawRequest.set(ctx.request ?? null);
};

/** Once per matched route (Dinner or Forge), before body parsing/validation: the RAW pattern, never the concrete path. */
const onRouteMatched = ({ route }: ProductRouteMatchedContext) => {
  extendLogContext({
    ...(route.path ? { route: route.path } : {}),
    ...(route.action ? { action: route.action } : {}),
  });
};

/**
 * Boot hooks, shaped per @noego/app runtime — detected by whether the runtime
 * handed us its container:
 *
 * - Newer runtime (`boot({ root, container })`): owns the per-request scope and
 *   accepts only `requestScope` / `onRequestError`. It REJECTS the legacy
 *   construction hooks, so they must not be returned in this mode.
 * - Published 2.4.x runtime (`boot({ root })`, no container): receives a
 *   boot-owned root and only honours the legacy `contextBuilder` / `controllerBuilder` pair. Without them RawRequest
 *   is never populated and every WebSocket upgrade route (executor channel,
 *   viewer session) answers 500 RAW_REQUEST_UNAVAILABLE. The modern pair is
 *   still returned alongside (that runtime ignores unknown hooks).
 */
const modernHooks = {
  requestScope,
  onRouteMatched,
  async onRequestSettled(context: ProductRequestSettledContext) {
    const requestLog = await context.scope.get(GatewayRequestLog) as GatewayRequestLog;
    requestLog.start(context.request, context.runtime);
    requestLog.finish(context.response, context.error, context.route?.path ?? undefined);
  },
  onRequestError: connectRequestError,
};

const legacyHooks = (container: IContainer) => ({
  ...modernHooks,
  contextBuilder: async (requestContext?: { request?: Request }) => {
    const scoped = container.extend();
    await requestScope(scoped, { request: requestContext?.request });
    return { container: scoped };
  },
  controllerBuilder: async (Controller: any, context: any) => {
    if (context?.container) return context.container.get(Controller);
    return container.get(Controller);
  },
});

const bootHooks = (options: BootOptions, container: IContainer):
  typeof modernHooks | ReturnType<typeof legacyHooks> =>
  options.container ? modernHooks : legacyHooks(container);

const baseLogger = getLogger("kazibee");

const SERVER_ROOT = path.resolve(process.cwd(), "server");
export const STITCH_PATH = path.join(SERVER_ROOT, "stitch.yaml");

export async function configureLogging(): Promise<void> {
  configureNoegoLogging({});
}

/* ------------------------------------------------------------------ */
/* App registration contract (production Node, generated Worker, testApp) */
/* ------------------------------------------------------------------ */

export interface RegistrationContext {
  readonly bind: BindFunction;
  readonly root: string;
  readonly target: ProductTarget;
  /** Worker bindings (EXECUTOR_COORDINATOR, secrets, DATABASE_URL); absent on Node. */
  readonly env?: Record<string, unknown>;
}

/**
 * Shared, synchronous product declarations for one App server root.
 *
 * Nothing is constructed here: Env, the per-request RawRequest holder and the
 * root-owned SqlStack are DECLARED on the App-provided binder and resolve
 * lazily on the root (SqlStack on the first database use). Deployment-only
 * work (logging/trace process configuration) runs once in `start`, after the
 * root exists and any test overlays were applied. Migrations never run here.
 *
 * Tests replace tokens before anything resolves:
 *   testApp(config).value(SqlStack, fixtureStack).value(Env, safeEnv)
 */
export function register({ bind, target, env }: RegistrationContext) {
  // Capture this generation's resolver during registration, not after another root boots.
  const resolver = processSqlResolver();
  bind(Env).toFactory(() => {
    const environment = new Env();
    // Worker bindings live on `env`, not process.env. On Node the Env service
    // reads process.env dynamically when nothing was loaded (same object the
    // legacy node() boot loaded).
    if (env) environment.load(env);
    return environment;
  }).singleton();
  bind(RawRequest).toSelf().scoped();
  bind(SqlStack).toFactory((environment: Env) => createProductionSqlStack({
    target,
    connectionString: environment.string("DATABASE_URL"),
    allowDefaultConnection: env === undefined,
    resolver,
    warn: (message) => baseLogger.warn(message),
  }), [Env]).singleton();
  return {
    ...modernHooks,
    async start(_context: { container: IContainer }) {
      await configureLogging();
      TraceAdapter.configureWebsiteProcess();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Legacy deployment boot (App runtimes without register support)      */
/* ------------------------------------------------------------------ */

export async function node(options: BootOptions = {}) {
  const container = rootOf(options);
  await configureLogging();
  TraceAdapter.configureWebsiteProcess();
  await initDatabase();
  await registerAppSqlStack(container);

  (container.get(Env) as Env).load(process.env as Record<string, unknown>);

  return bootHooks(options, container);
}

export async function worker(options: BootOptions = {}) {
  const container = rootOf(options);
  const env = options.env;
  TraceAdapter.configureWebsiteProcess();
  // Worker bindings (EXECUTOR_COORDINATOR, secrets) live on `env`, not
  // process.env, so they must be published before any request is served.
  const hooks = bootHooks(options, container);
  const connectionString = typeof env?.DATABASE_URL === "string" ? env.DATABASE_URL : null;
  if (!connectionString) {
    baseLogger.warn("[kazibee] worker boot: no DATABASE_URL bound — DB-backed routes will fail");
    (container.get(Env) as Env).load(env ?? {});
    return hooks;
  }
  try {
    SqlStackDB.register("primary", createPgDb(neonHttpPool(connectionString) as never)).setDefault("primary");
    await registerAppSqlStack(container);
    baseLogger.info("[kazibee] worker boot: postgres via neon serverless http");
  } catch (error) {
    baseLogger.error("[kazibee] worker boot: postgres registration failed", error);
  }
  (container.get(Env) as Env).load(env ?? {});
  return hooks;
}
