/**
 * server.main `register` contract (App prepareProduct path) — canaries for the
 * main site and both satellites, plus the per-root provider controls.
 *
 * Nothing here boots the deployment entrypoints (node/worker) or registers
 * process-global SQLStack state. Root isolation uses fresh explicit-schema
 * PostgreSQL fixtures, never migrated templates.
 */
import { describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { createContainer, ExecutionContext } from '@noego/ioc';
import { testApp } from '@noego/app';
import { SqlStack, SqlStackDB, resolveExecution, createPgDb } from 'sqlstack';
import { resourceCase } from '@noego/testing';
import { testPostgres, DEFAULT_ADMIN_URL } from 'sqlstack/testing';
import * as main from '../../src/server/server';
import * as mcp from '../../src/mcp/server';
import * as agent from '../../src/agent/server';
import { createProductionSqlStack } from '../../src/server/repo/sqlstack_provider';
import { connectRequestError } from '../../src/server/middleware/connect_request_error';
import Env from '../../src/server/services/env';
import RawRequest from '../../src/server/services/raw_request';

const CONFIG = path.resolve(__dirname, '../../noego.config.yml');
const ROOT = path.dirname(CONFIG);

/** A declaration-only binder: records tokens and factories, constructs nothing. */
function recordingBind() {
  const tokens: unknown[] = [];
  const factories = new Map<unknown, { factory: (...args: unknown[]) => unknown; dependencies: unknown[] }>();
  const lifetimes = new Map<unknown, string>();
  let constructions = 0;
  const bind = (token: unknown) => {
    tokens.push(token);
    const refinement = {
      singleton: () => { lifetimes.set(token, 'singleton'); return refinement; },
      scoped: () => { lifetimes.set(token, 'scoped'); return refinement; },
      transient: () => { lifetimes.set(token, 'transient'); return refinement; },
      requires: () => refinement,
      dependsOn: () => refinement,
    };
    return {
      to: () => refinement,
      toSelf: () => refinement,
      toFactory: (factory: (...args: unknown[]) => unknown, dependencies: unknown[] = []) => {
        factories.set(token, {
          factory: (...args) => { constructions += 1; return factory(...args); },
          dependencies,
        });
        return refinement;
      },
      toValue: () => {},
    };
  };
  return { bind: bind as never, tokens, factories, lifetimes, constructions: () => constructions };
}

const safeEnv = (values: Record<string, unknown> = {}) => { const env = new Env(); env.load(values); return env; };

describe('server.main register (shared registration contract)', () => {
  it('main, MCP and Agent server.main all export the one shared register', () => {
    expect(typeof main.register).toBe('function');
    expect(mcp.register).toBe(main.register);
    expect(agent.register).toBe(main.register);
    // Legacy deployment boot stays available as the runtime fallback.
    expect(typeof mcp.node).toBe('function');
    expect(typeof agent.worker).toBe('function');
  });

  it('declares Env, RawRequest and SqlStack synchronously without constructing anything', () => {
    const recorder = recordingBind();
    const boot = main.register({ bind: recorder.bind, root: ROOT, target: 'node' });
    expect(boot).not.toBeInstanceOf(Promise);
    expect(recorder.tokens).toEqual([Env, RawRequest, SqlStack]);
    expect(recorder.lifetimes.get(Env)).toBe('singleton');
    expect(recorder.lifetimes.get(RawRequest)).toBe('scoped');
    expect(recorder.lifetimes.get(SqlStack)).toBe('singleton');
    expect(recorder.factories.get(SqlStack)?.dependencies).toEqual([Env]);
    expect(recorder.constructions()).toBe(0);
    expect(typeof boot.requestScope).toBe('function');
    expect(boot.onRequestError).toBe(connectRequestError);
    expect(typeof boot.start).toBe('function');
    expect('contextBuilder' in boot).toBe(false);
    expect('controllerBuilder' in boot).toBe(false);
    // No process-global sqlstack default was registered by declaring.
    expect(() => SqlStackDB.get()).toThrow();
  });

  it('Env provider carries worker bindings from the registration env', () => {
    const recorder = recordingBind();
    main.register({ bind: recorder.bind, root: '.', target: 'cloudflare-worker', env: { SOME_BINDING: 'bound-value' } });
    const env = recorder.factories.get(Env)!.factory() as Env;
    expect(env.string('SOME_BINDING')).toBe('bound-value');
    expect(recorder.constructions()).toBe(1);
  });

  it('requestScope populates the RawRequest holder of the App-owned scope', async () => {
    const recorder = recordingBind();
    const boot = main.register({ bind: recorder.bind, root: ROOT, target: 'node' });
    const root = createContainer();
    try {
      const scope = root.extend();
      const request = new Request('https://kazibee.test/v1/connect/executors/exe_x/channel');
      await boot.requestScope(scope, { request });
      expect(((await scope.get(RawRequest)) as RawRequest).get()).toBe(request);
      const empty = root.extend();
      await boot.requestScope(empty, {});
      expect(((await empty.get(RawRequest)) as RawRequest).get()).toBeNull();
    } finally {
      await root.dispose();
    }
  });

  it('createProductionSqlStack is per-root: owned primary entry, no global default (node)', async () => {
    const stack = createProductionSqlStack({
      target: 'node',
      connectionString: 'postgres://unit:unit@127.0.0.1:1/kazibee_unit',
    });
    try {
      const entry = stack.getEntry();
      expect(entry.name).toBe('primary');
      expect(entry.owned).toBe(true);
      expect(entry.db.dialect).toBe('postgres');
      expect(stack.resolver()).toBeUndefined();
      expect(() => SqlStackDB.get()).toThrow();
    } finally {
      await stack.close();
    }
  });

  it('a worker root without DATABASE_URL gets an empty stack that fails on use, not at registration', () => {
    const warnings: string[] = [];
    const stack = createProductionSqlStack({ target: 'cloudflare-worker', connectionString: undefined, warn: (m) => warnings.push(m) });
    expect(warnings).toHaveLength(1);
    expect(() => stack.getEntry()).toThrow(/no default database/);
  });

  it('testApp ignores developer environment and fails before opening an unconfigured database', resourceCase(async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://developer:unused@127.0.0.1:1/must_not_open');
    try {
      const app = await testApp(CONFIG).select({ server: { path: ['/api/status'] } }).build();
      expect((await app.get<Env>(Env)).string('DATABASE_URL')).toBeUndefined();
      await expect(app.get(SqlStack)).rejects.toThrow(/No DATABASE_URL supplied to this application root/);
      expect(() => SqlStackDB.get()).toThrow();
    } finally { vi.unstubAllEnvs(); }
  }));

  it('testApp resolves the production SqlStack provider lazily from the replaced Env (failing-provider control)', async () => {
    const app = await testApp(CONFIG)
      .select({ server: { path: ['/api/status'] } })
      .value(Env, safeEnv({ DATABASE_URL: 'postgres://unit:unit@127.0.0.1:1/kazibee_unit' }))
      .build();
    let stack: SqlStack | undefined;
    try {
      // Build touched nothing: the root-owned stack is created on first resolution only.
      expect(() => SqlStackDB.get()).toThrow();
      stack = await app.get<SqlStack>(SqlStack);
      expect(stack.getEntry().name).toBe('primary');
      expect(await app.get<SqlStack>(SqlStack)).toBe(stack);
      expect(() => SqlStackDB.get()).toThrow();
    } finally {
      await app.dispose();
      await stack?.close();
    }
  });

  it('two roots keep their own replaced SqlStack under their own execution context', resourceCase(async (resources) => {
    const schema = { version: 1, dialect: 'postgres', tables: {
      root_probe: { columns: { id: { type: 'text', primary: true }, label: { type: 'text', nullable: false } } },
    } };
    const options = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };
    const fixtureA = await testPostgres(schema, options).data({ root_probe: [{ id: 'same', label: 'A' }] }).build();
    const fixtureB = await testPostgres(schema, options).data({ root_probe: [{ id: 'same', label: 'B' }] }).build();
    const a = createPgDb(fixtureA.url), b = createPgDb(fixtureB.url);
    const stackA = resources.own(new SqlStack({ databases: { primary: { db: a, owned: true } }, default: 'primary' }));
    const stackB = resources.own(new SqlStack({ databases: { primary: { db: b, owned: true } }, default: 'primary' }));
    const first = await testApp(CONFIG).select({ server: { path: ['/api/status'] } })
      .value(SqlStack, stackA).value(Env, safeEnv()).build();
    const second = await testApp(CONFIG).select({ server: { path: ['/api/status'] } })
      .value(SqlStack, stackB).value(Env, safeEnv()).build();
    try {
      const [one, two] = await Promise.all([first, second].map((app) =>
        ExecutionContext.run(app.root, () => resolveExecution())));
      expect(one.entry.db).toBe(a);
      expect(two.entry.db).toBe(b);
      expect(one.viaStack && two.viaStack).toBe(true);
      expect(one.entry.stack).not.toBe(two.entry.stack);
      expect(await one.entry.db.query('SELECT current_database() AS name', [])).toEqual([{ name: new URL(fixtureA.url).pathname.slice(1) }]);
      expect(await two.entry.db.query('SELECT current_database() AS name', [])).toEqual([{ name: new URL(fixtureB.url).pathname.slice(1) }]);
      for (const app of [first, second]) {
        const response = await app.request({ method: 'GET', path: '/api/status' });
        expect(response.status).toBe(200);
        await response.text();
      }
    } finally {
      await first.dispose();
      await second.dispose();
    }
    // The values are borrowed by the roots; their case owner still controls closure.
    expect(await a.query('SELECT label FROM root_probe WHERE id = $1', ['same'])).toEqual([{ label: 'A' }]);
    expect(await b.query('SELECT label FROM root_probe WHERE id = $1', ['same'])).toEqual([{ label: 'B' }]);
  }));
});
