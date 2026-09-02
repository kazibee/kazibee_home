/**
 * ConnectExecutorController error mappings, driven directly against the
 * controller with a real parser and stubbed logic/actor collaborators.
 *
 * The testDinner suites cannot reach these branches: the OpenAPI schema
 * rejects malformed path/query/body shapes before the controller runs, so
 * the controller's own defensive envelope/auth/outcome mappings are
 * exercised here with hand-built CompatRequest/CompatResponse fakes.
 */
import { describe, it, expect } from 'vitest';
import type { CompatRequest as Request, CompatResponse as Response } from '@noego/dinner';
import Env from '../../../src/server/services/env';
import ConnectExecutorPolicy from '../../../src/server/services/connect_executor_policy';
import ConnectExecutorRequestParser from '../../../src/server/services/connect_executor_request_parser';
import ConnectExecutorController from '../../../src/server/controller/connect_executor.controller';
import type ConnectExecutorLogic from '../../../src/server/logic/connect_executor.logic';
import type ConnectExecutorActorResolver from '../../../src/server/services/connect_executor_actor_resolver';
import type { ActorResolution } from '../../../src/server/services/connect_executor_actor_resolver';

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const SESSION_ID = 'ses_abcdefgh';
const CORRELATION_ID = 'cor_abcdefgh';
const IDEMPOTENCY_KEY = 'idem_0123456789abcdef';

const parser = new ConnectExecutorRequestParser(new ConnectExecutorPolicy(new Env()));

const okActor: ActorResolution = {
  ok: true,
  actor: { role: 'browser_session', userId: 'usr_owner001', sessionId: SESSION_ID },
};
const deniedActor: ActorResolution = { ok: false, reason: 'unauthorized' };

const actors = (resolution: ActorResolution) =>
  ({ browser: async () => resolution } as unknown as ConnectExecutorActorResolver);

const logic = (methods: Record<string, unknown> = {}) => methods as unknown as ConnectExecutorLogic;

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
  it('answers 400 when the path value is a short code rather than a claim id', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.claimStatus({
      req: makeReq({ params: { claimId: 'ABCD-EFGH' }, query: { correlationId: CORRELATION_ID } }),
      res,
    });
    expect(state.statusCode).toBe(400);
    expect(state.payload).toMatchObject({ kind: 'error', code: 'invalid-envelope' });
  });

  it('answers 500 when the logic degrades to failed', async () => {
    const controller = new ConnectExecutorController(
      logic({ claimStatus: async () => ({ outcome: 'failed' }) }), parser, actors(okActor),
    );
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
  });
});

describe('reviewClaim', () => {
  it('answers 400 for an invalid browser query', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.reviewClaim({
      req: makeReq({ params: { lookup: CLAIM_ID }, query: { sessionId: 'bad' } }), res,
    });
    expect(state.statusCode).toBe(400);
  });

  it('answers 400 for a garbage lookup value', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.reviewClaim({
      req: makeReq({ params: { lookup: 'garbage' }, query: browserQuery() }), res,
    });
    expect(state.statusCode).toBe(400);
    expect(state.payload).toMatchObject({ correlationId: CORRELATION_ID });
  });

  it('answers 401 when the session actor cannot be resolved', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(deniedActor));
    const { res, state } = makeRes();
    await controller.reviewClaim({
      req: makeReq({ params: { lookup: CLAIM_ID }, query: browserQuery() }), res,
    });
    expect(state.statusCode).toBe(401);
    expect(state.payload).toMatchObject({ code: 'revoked' });
  });

  it('maps not-found and failed review outcomes onto 404 and 500', async () => {
    for (const [outcome, status] of [['not-found', 404], ['failed', 500]] as const) {
      const controller = new ConnectExecutorController(
        logic({ review: async () => ({ outcome }) }), parser, actors(okActor),
      );
      const { res, state } = makeRes();
      await controller.reviewClaim({
        req: makeReq({ params: { lookup: CLAIM_ID }, query: browserQuery() }), res,
      });
      expect(state.statusCode).toBe(status);
    }
  });
});

describe('list', () => {
  it('answers 400 for an invalid browser query', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.list({ req: makeReq({ query: { nonsense: '1' } }), res });
    expect(state.statusCode).toBe(400);
  });
});

describe('detail', () => {
  it('answers 400 for an invalid browser query and 401 for a denied actor', async () => {
    const invalid = new ConnectExecutorController(logic(), parser, actors(okActor));
    const bad = makeRes();
    await invalid.detail({ req: makeReq({ query: {} }), res: bad.res });
    expect(bad.state.statusCode).toBe(400);

    const denied = new ConnectExecutorController(logic(), parser, actors(deniedActor));
    const auth = makeRes();
    await denied.detail({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery() }), res: auth.res,
    });
    expect(auth.state.statusCode).toBe(401);
  });

  it('passes an empty executor id through to the logic when the param is missing', async () => {
    const seen: string[] = [];
    const controller = new ConnectExecutorController(
      logic({
        detail: async (_actor: unknown, executorId: string) => {
          seen.push(executorId);
          return { outcome: 'not-found' };
        },
      }), parser, actors(okActor),
    );
    const { res, state } = makeRes();
    await controller.detail({ req: makeReq({ query: browserQuery() }), res });
    expect(seen).toEqual(['']);
    expect(state.statusCode).toBe(404);
  });

  it('answers 500 when the logic degrades to failed', async () => {
    const controller = new ConnectExecutorController(
      logic({ detail: async () => ({ outcome: 'failed' }) }), parser, actors(okActor),
    );
    const { res, state } = makeRes();
    await controller.detail({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery() }), res,
    });
    expect(state.statusCode).toBe(500);
  });
});

describe('rename', () => {
  it('answers 400 for an invalid rename envelope', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: 'nope' }),
      res,
    });
    expect(state.statusCode).toBe(400);
  });

  it('answers 409 for a protocol version mismatch in the envelope', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
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
  });

  it('answers 400 for an invalid browser query alongside a valid body', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: {}, body: renameBody() }), res,
    });
    expect(state.statusCode).toBe(400);
  });

  it('answers 401 when the session actor cannot be resolved', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(deniedActor));
    const { res, state } = makeRes();
    await controller.rename({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: renameBody() }),
      res,
    });
    expect(state.statusCode).toBe(401);
  });
});

describe('revoke', () => {
  it('answers 400 for an invalid revoke envelope', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: 'nope' }),
      res,
    });
    expect(state.statusCode).toBe(400);
  });

  it('answers 400 for an invalid browser query alongside a valid body', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: {}, body: revokeBody() }), res,
    });
    expect(state.statusCode).toBe(400);
  });

  it('answers 400 when the body and query correlation ids disagree', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(okActor));
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
  });

  it('answers 401 when the session actor cannot be resolved', async () => {
    const controller = new ConnectExecutorController(logic(), parser, actors(deniedActor));
    const { res, state } = makeRes();
    await controller.revoke({
      req: makeReq({ params: { executorId: EXECUTOR_ID }, query: browserQuery(), body: revokeBody() }),
      res,
    });
    expect(state.statusCode).toBe(401);
  });
});
