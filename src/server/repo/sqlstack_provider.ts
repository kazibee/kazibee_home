import type { SqlResolver } from "sqlstack";
import { SqlStack, createPgDb, getActiveResolver } from "sqlstack";
import { neon, Pool } from "@neondatabase/serverless";

/**
 * Per-root SqlStack provider for the App registration path.
 *
 * Everything here is a pure factory: nothing connects, registers a
 * process-global default (SqlStackDB), or touches the network until the
 * owning root resolves its SqlStack Singleton on the first request. Tests
 * supply a fresh fixture URL through Env to exercise this provider, or replace
 * SqlStack with a real borrowed fixture stack before anything resolves.
 */
export type ProductTarget = "node" | "cloudflare-worker";

export interface SqlStackProviderOptions {
  readonly target: ProductTarget;
  /** DATABASE_URL from the root's Env provider (worker bindings or process env). */
  readonly connectionString: string | undefined;
  /** Only implicit deployment environments may use the local development fallback. */
  readonly allowDefaultConnection?: boolean;
  /** The SQL manifest resolver installed by the App runtime, if any. */
  readonly resolver?: SqlResolver;
  readonly warn?: (message: string) => void;
}

/** Same fallback as repo/boot.ts (kept local: boot.ts is the legacy global path). */
export const DEFAULT_NODE_DATABASE_URL = "postgres://noego:noego_dev@localhost:5432/kazibee";

/**
 * The manifest resolver the App runtime registers process-wide
 * (`SqlStack.useResolver(new ManifestResolver(sqlManifest))` before the
 * backend bundle is imported, on Node and in the generated worker entry).
 * sqlstack keeps that registration in one shared global slot; capturing it
 * into the root's own stack preserves the bundled-repository SQL lookup
 * without consulting global state at request time. Undefined when no
 * manifest was registered (tests, source-scan development).
 */
export function processSqlResolver(): SqlResolver | undefined {
  return getActiveResolver();
}

/**
 * Neon serverless driver in stateless HTTP mode (kazidoc's proven worker
 * recipe): each query is one fetch to Neon's SQL-over-HTTP endpoint — no
 * TCP/TLS handshake, and no live connection object. Workers forbid sharing
 * I/O objects across requests, which rules out pg Pool/Client here.
 * fullResults gives pg-shaped { rows, rowCount, fields } for sqlstack.
 */
export function neonHttpPool(connectionString: string) {
  const httpQuery = neon(connectionString, { fullResults: true });
  return {
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
}

/**
 * Build the root-owned production SqlStack. Called by the IoC factory on
 * first resolution, never at registration time.
 *
 * - node: pg Pool over DATABASE_URL (local dev fallback), owned by the stack.
 * - cloudflare-worker: neon HTTP pool over the bound DATABASE_URL; without a
 *   binding the stack is empty and DB-backed routes fail on use (same
 *   observable behaviour as the legacy worker boot, minus the global default).
 */
export function createProductionSqlStack(options: SqlStackProviderOptions): SqlStack {
  const { target, resolver, warn } = options;
  if (target === 'node' && options.allowDefaultConnection === false && !options.connectionString) {
    throw new Error('No DATABASE_URL supplied to this application root; provide a SQLStack fixture URL or replace its SqlStack provider');
  }
  const connectionString = options.connectionString
    ?? (target === "node" ? DEFAULT_NODE_DATABASE_URL : undefined);
  if (!connectionString) {
    warn?.("[kazibee] worker root: no DATABASE_URL bound — DB-backed routes will fail");
    return new SqlStack(resolver ? { resolver } : undefined);
  }
  return new SqlStack({
    databases: {
      primary: {
        db: () => target === "cloudflare-worker"
          ? createPgDb(neonHttpPool(connectionString) as never)
          : createPgDb(connectionString),
        owned: true,
      },
    },
    default: "primary",
    ...(resolver ? { resolver } : {}),
  });
}
