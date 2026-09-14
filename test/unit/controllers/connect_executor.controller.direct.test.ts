/**
 * ConnectExecutorController error mappings, driven directly against the
 * controller resolved from root testApp over the original configuration
 * (../../../noego.config.yml). The real parser/policy/Env graph runs; the
 * actor resolver and logic are replaced through singular .method controls.
 *
 * The HTTP suites cannot reach these branches: the OpenAPI schema rejects
 * malformed path/query/body shapes before the controller runs, so the
 * controller's own defensive envelope/auth/outcome mappings are exercised
 * here with hand-built CompatRequest/CompatResponse fakes handed straight to
 * the controller methods. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import type { CompatRequest as Request, CompatResponse as Response } from '@noego/dinner';
import ConnectExecutorController from '../../../src/server/controller/connect_executor.controller';
import ConnectExecutorLogic from '../../../src/server/logic/connect_executor.logic';
import ConnectExecutorActorResolver from '../../../src/server/services/connect_executor_actor_resolver';
import type { ActorResolution } from '../../../src/server/services/connect_executor_actor_resolver';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const SESSION_ID = 'ses_abcdefgh';
const CORRELATION_ID = 'cor_abcdefgh';
const IDEMPOTENCY_KEY = 'idem_0123456789abcdef';

const returns = (value: unknown) => control.returns(Promise.resolve(value));

const okActor: ActorResolution = {
  ok: true,
  actor: { role: 'browser_session', userId: 'usr_owner001', sessionId: SESSION_ID },
};
const deniedActor: ActorResolution = { ok: false, reason: 'unauthorized' };

// Actor resolver replacement description: the browser resolution is fixed.
const actors = (resolution: ActorResolution) => testStub()
  .method(ConnectExecutorActorResolver, 'browser', returns(resolution));

/** The built environment a case hands in; the controller resolves through a fresh real App request scope. */
type Environment = { dinner: { controller<T>(controller: new (...args: never[]) => T): Promise<T> } };
const controllerOf = (env: Environment) => env.dinner.controller(ConnectExecutorController);

function makeRes() {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { res.payload = payload; return res; },
  };
  return { res: res as unknown as Response, state: res };
}

const makeReq = (value: {
  params?: Record<string, unknown>; query?: Record<string, unknown>;
  headers?: Record<string, unknown>; body?: unknown;
}) => ({
  params: value.params ?? {}, query: value.query ?? {},
  headers: value.headers ?? {}, body: value.body,
}) as unknown as Request;

const browserQuery = () => ({ sessionId: SESSION_ID, correlationId: CORRELATION_ID });

const renameBody = (overrides: Record<string, unknown> = {}) => ({
  kind: 'executor.rename.request', protocolVersion: '1.0', executorId: EXECUTOR_ID,
  displayName: 'New Name', idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  ...overrides,
});

const revokeBody = (overrides: Record<string, unknown> = {}) => ({
  kind: 'executor.action.request', protocolVersion: '1.0', executorId: EXECUTOR_ID,
  action: 'revoke', idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  ...overrides,
});

describe('claimStatus', () => {
  it('answers 400 when the path value is a short code rather than a claim id', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'claimStatus', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.claimStatus({
      req: makeReq({ params: { claimId: 'ABCD-EFGH' }, query: { correlationId: CORRELATION_ID } }),
      res,
    });
    expect(state.statusCode).toBe(400);
    expect(state.payload).toMatchObject({ kind: 'error', code: 'invalid-envelope' });
  }));

  it('answers 500 when the logic degrades to failed', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'claimStatus', returns({ outcome: 'failed' }))
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.claimStatus({
      req: makeReq({
        params: { claimId: CLAIM_ID },
        query: { correlationId: CORRELATION_ID },
        headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      }),
      res,
    });
    expect(state.statusCode).toBe(500);
    expect(state.payload).toMatchObject({ kind: 'error', correlationId: CORRELATION_ID });
  }));
});

describe('reviewClaim', () => {
  it('answers 400 for an invalid browser query', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'review', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.reviewClaim({
      req: makeReq({ params: { lookup: CLAIM_ID }, query: { sessionId: 'bad' } }), res,
    });
    expect(state.statusCode).toBe(400);
  }));

  it('answers 400 for a garbage lookup value', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'review', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.reviewClaim({
      req: makeReq({ params: { lookup: 'garbage' }, query: browserQuery() }), res,
    });
    expect(state.statusCode).toBe(400);
    expect(state.payload).toMatchObject({ correlationId: CORRELATION_ID });
  }));

  it('answers 401 when the session actor cannot be resolved', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(deniedActor))
      .method(ConnectExecutorLogic, 'review', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.reviewClaim({
      req: makeReq({ params: { lookup: CLAIM_ID }, query: browserQuery() }), res,
    });
    expect(state.statusCode).toBe(401);
    expect(state.payload).toMatchObject({ code: 'revoked' });
  }));

  it('maps not-found and failed review outcomes onto 404 and 500', resourceCase(async () => {
    for (const [outcome, status] of [['not-found', 404], ['failed', 500]] as const) {
      const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(actors(okActor))
        .method(ConnectExecutorLogic, 'review', returns({ outcome }))
        .build();
      const controller = await controllerOf(env);
      const { res, state } = makeRes();
      await controller.reviewClaim({
        req: makeReq({ params: { lookup: CLAIM_ID }, query: browserQuery() }), res,
      });
      expect(state.statusCode).toBe(status);
    }
  }));
});

describe('list', () => {
  it('answers 400 for an invalid browser query', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'list', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.list({ req: makeReq({ query: { nonsense: '1' } }), res });
    expect(state.statusCode).toBe(400);
  }));
});

describe('detail', () => {
  it('answers 400 for an invalid browser query and 401 for a denied actor', resourceCase(async () => {
    const invalidEnv: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'detail', control.never())
      .build();
    const invalid = await controllerOf(invalidEnv);
    const bad = makeRes();
    await invalid.detail({ req: makeReq({ query: {} }), res: bad.res });
    expect(bad.state.statusCode).toBe(400);

    const deniedEnv: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(deniedActor))
      .method(ConnectExecutorLogic, 'detail', control.never())
      .build();
    const denied = await controllerOf(deniedEnv);
    const auth = makeRes();
    await denied.detail({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery() }), res: auth.res,
    });
    expect(auth.state.statusCode).toBe(401);
  }));

  it('passes an empty executor id through to the logic when the param is missing', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'detail', control.once(returns({ outcome: 'not-found' })))
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.detail({ req: makeReq({ query: browserQuery() }), res });
    const seen = control.inspect(env, ConnectExecutorLogic, 'detail').calls.map((call) => call.args[1]);
    expect(seen).toEqual(['']);
    expect(state.statusCode).toBe(404);
  }));

  it('answers 500 when the logic degrades to failed', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'detail', returns({ outcome: 'failed' }))
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.detail({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery() }), res,
    });
    expect(state.statusCode).toBe(500);
  }));
});

describe('rename', () => {
  it('answers 400 for an invalid rename envelope', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'rename', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: 'nope' }),
      res,
    });
    expect(state.statusCode).toBe(400);
  }));

  it('answers 409 for a protocol version mismatch in the envelope', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'rename', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({
        params: { executorId: EXECUTOR_ID }, query: browserQuery(),
        body: renameBody({ protocolVersion: '2.0' }),
      }),
      res,
    });
    expect(state.statusCode).toBe(409);
    expect(state.payload).toMatchObject({
      code: 'protocol-version-mismatch', message: 'Protocol version mismatch',
      correlationId: CORRELATION_ID,
    });
  }));

  it('answers 400 for an invalid browser query alongside a valid body', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'rename', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: {}, body: renameBody() }), res,
    });
    expect(state.statusCode).toBe(400);
  }));

  it('answers 401 when the session actor cannot be resolved', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(deniedActor))
      .method(ConnectExecutorLogic, 'rename', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: renameBody() }),
      res,
    });
    expect(state.statusCode).toBe(401);
  }));
});

describe('revoke', () => {
  it('answers 400 for an invalid revoke envelope', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'revoke', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: 'nope' }),
      res,
    });
    expect(state.statusCode).toBe(400);
  }));

  it('answers 400 for an invalid browser query alongside a valid body', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'revoke', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: {}, body: revokeBody() }), res,
    });
    expect(state.statusCode).toBe(400);
  }));

  it('answers 400 when the body and query correlation ids disagree', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(okActor))
      .method(ConnectExecutorLogic, 'revoke', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({
        params: { executorId: EXECUTOR_ID },
        query: { sessionId: SESSION_ID, correlationId: 'cor_different' },
        body: revokeBody(),
      }),
      res,
    });
    expect(state.statusCode).toBe(400);
    expect(state.payload).toMatchObject({ correlationId: CORRELATION_ID });
  }));

  it('answers 401 when the session actor cannot be resolved', resourceCase(async () => {
    const env: Environment = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .use(actors(deniedActor))
      .method(ConnectExecutorLogic, 'revoke', control.never())
      .build();
    const controller = await controllerOf(env);
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: revokeBody() }),
      res,
    });
    expect(state.statusCode).toBe(401);
  }));
});
