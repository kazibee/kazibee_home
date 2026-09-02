/**
 * Connect auth negative paths through testDinner (no server, no database).
 *
 * Complements connect_auth.testdinner.test.ts / connect_auth_flows with the
 * branches the OpenAPI envelope normally shields: controller-level parse
 * rejections (invalid via direct controller invocation, since dinner's schema
 * validation would otherwise answer first), non-Error repo failures, the
 * Google persistence guard, disabled accounts, and logout failure/idempotency
 * branches.
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectAuthController from '../../../src/server/controller/connect_auth.controller';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import ConnectIdentityRepo from '../../../src/server/repo/connect_identity_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';

const authSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/auth.yaml'), 'utf8')
) as Record<string, unknown>;

const NOW = new Date('2026-01-01T00:00:00.000Z');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const base = () =>
  testDinner(authSource)
    .select({ module: 'connectAuth' })
    .controllers({ 'connect_auth.controller': ConnectAuthController })
    .hooks({});

const GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
const savedGoogleClientId = process.env.GOOGLE_CLIENT_ID;

const account = {
  user_id: 'usr_existing01', username: 'shavyg2', email: 'shavyg2@gmail.com',
  email_verified_at: null, password_hash: null, status: 'active',
  created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
};

const signupBody = {
  kind: 'auth.signup.request',
  protocolVersion: '1.0',
  username: 'shavyg2',
  email: 'shavyg2@gmail.com',
  password: 'a-long-password-123',
  idempotencyKey: 'idem_aaaaaaaaaaaaaaaa',
  correlationId: 'cor_abcdefgh',
};

const googleBody = {
  kind: 'auth.google.request',
  protocolVersion: '1.0',
  credential: 'google-id-token',
  idempotencyKey: 'idem_aaaaaaaaaaaaaaaa',
  correlationId: 'cor_abcdefgh',
};

const validClaims = {
  aud: GOOGLE_CLIENT_ID,
  sub: 'google-subject-1',
  email: 'Shavyg2@Gmail.com',
  email_verified: 'true',
};

function stubTokeninfo(claims: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(claims), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));
}

/** Minimal CompatResponse capturing status/json for direct controller calls. */
function fakeRes() {
  const captured: { status: number | null; body: unknown } = { status: null, body: null };
  const res = {
    status(code: number) { captured.status = code; return res; },
    json(body: unknown) { captured.body = body; return res; },
    cookie() { return res; },
    clearCookie() { return res; },
  };
  return { res: res as never, captured };
}

const fakeReq = (overrides: Record<string, unknown> = {}) =>
  ({ body: {}, query: {}, cookies: {}, headers: {}, ...overrides }) as never;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (savedGoogleClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = savedGoogleClientId;
});

describe('connect auth controller parse rejections (direct controller, below the OpenAPI envelope)', () => {
  it('every route maps an invalid envelope to a logged 400 with the fallback correlationId', async () => {
    const env = await base().build();
    const controller = await env.get<ConnectAuthController>(ConnectAuthController);

    const { res, captured } = fakeRes();
    await controller.signup({ req: fakeReq({ body: null }), res });
    expect(captured.status).toBe(400);
    expect(captured.body).toMatchObject({
      kind: 'error', code: 'invalid-envelope',
      message: 'Invalid request envelope', correlationId: 'cor_invalid000',
    });

    const login = fakeRes();
    await controller.login({ req: fakeReq({ body: [] }), res: login.res });
    expect(login.captured.status).toBe(400);

    const google = fakeRes();
    await controller.google({ req: fakeReq({ body: {} }), res: google.res });
    expect(google.captured.status).toBe(400);

    // Session/logout read the query fallback; a non-record query is invalid.
    const session = fakeRes();
    await controller.session({ req: fakeReq({ body: {}, query: undefined }), res: session.res });
    expect(session.captured.status).toBe(400);

    const logout = fakeRes();
    await controller.logout({ req: fakeReq({ body: [], query: [] }), res: logout.res });
    expect(logout.captured.status).toBe(400);

    await env.dispose();
  });

  it('a protocol version the parser does not speak is a 409 protocol-version-mismatch', async () => {
    const env = await base().build();
    const controller = await env.get<ConnectAuthController>(ConnectAuthController);

    const signup = fakeRes();
    await controller.signup({
      req: fakeReq({ body: { ...signupBody, protocolVersion: '9.9' } }),
      res: signup.res,
    });
    expect(signup.captured.status).toBe(409);
    expect(signup.captured.body).toMatchObject({
      kind: 'error', code: 'protocol-version-mismatch',
      message: 'Protocol version mismatch', correlationId: 'cor_abcdefgh',
    });

    const login = fakeRes();
    await controller.login({
      req: fakeReq({ body: {
        kind: 'auth.login.request', protocolVersion: '9.9',
        username: 'shavyg2', password: 'a-long-password-123',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      } }),
      res: login.res,
    });
    expect(login.captured.status).toBe(409);

    await env.dispose();
  });
});

describe('connect auth failure outcomes (routes)', () => {
  it('a non-Error repo rejection during signup degrades to a structured 500', async () => {
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          // Non-Error rejection value: exercises the String(error) diagnostic
          // path and the isUniqueViolation non-Error guard.
          findPasswordlessByEmail: control.once(control.throws('db exploded')),
          createAccount: control.never(),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });

  it('a wrapped repo failure (Error with cause) during login is still a uniform 500', async () => {
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByUsername: control.once(control.throws(
            Object.assign(new Error('query failed'), { cause: new Error('connection reset') }),
          )),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/login',
      body: {
        kind: 'auth.login.request', protocolVersion: '1.0',
        username: 'shavyg2', password: 'a-long-password-123',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(500);
    await env.verify();
    await env.dispose();
  });

  it('a Google account that vanishes after creation is a 500, never a half-session', async () => {
    process.env.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
    stubTokeninfo(validClaims);
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByEmail: control.calls([
            control.returns(Promise.resolve(null)),
            control.returns(Promise.resolve(null)),
          ]),
          createAccount: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectIdentityRepo, { linkGoogle: control.never() }],
        [ConnectBrowserSessionRepo, { createSession: control.never() }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(500);
    await env.verify();
    await env.dispose();
  });

  it('a disabled account behind a valid Google token is a uniform 401, no session row', async () => {
    process.env.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
    stubTokeninfo(validClaims);
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByEmail: control.once(control.returns(Promise.resolve({ ...account, status: 'disabled' }))),
          createAccount: control.never(),
        }],
        [ConnectIdentityRepo, {
          linkGoogle: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectBrowserSessionRepo, { createSession: control.never() }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Invalid Google account' });
    await env.verify();
    await env.dispose();
  });
});

describe('connect auth logout failure and idempotency branches (routes)', () => {
  const sessionToken = 'opaque-session-token';
  const csrfToken = 'opaque-csrf-token';
  const sessionRow = {
    session_id: 'ses_fixed0001', user_id: 'usr_existing01',
    session_token_hash: sha256(sessionToken), csrf_token_hash: sha256(csrfToken),
    status: 'active',
    created_at: NOW.toISOString(), last_seen_at: NOW.toISOString(),
    idle_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    absolute_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  const logoutBody = {
    kind: 'auth.logout.request', protocolVersion: '1.0',
    sessionId: 'ses_fixed0001', actorRole: 'browser_session',
    idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
  };
  const logoutHeaders = {
    cookie: `kazi_connect_session=${sessionToken}; kazi_connect_csrf=${csrfToken}`,
    'x-csrf-token': csrfToken,
  };

  it('a revocation write failure during logout is a structured 500', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(sessionRow))),
          revokeSession: control.once(control.throws(new Error('write failed'))),
        }],
        [ConnectAccountRepo, {
          findByUserId: control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      headers: logoutHeaders, body: logoutBody,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });

  it('logging out an already-revoked session is idempotent: 200 ended with count 0', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve({
            ...sessionRow, status: 'revoked',
          }))),
          revokeSession: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectAccountRepo, {
          findByUserId: control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      headers: logoutHeaders, body: logoutBody,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'auth.logout.response', sessionId: 'ses_fixed0001', ended: true,
    });
    await env.verify();
    await env.dispose();
  });
});
