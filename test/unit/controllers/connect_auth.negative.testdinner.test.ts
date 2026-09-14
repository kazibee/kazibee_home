/**
 * Connect auth negative paths through root testApp over the original
 * configuration (no server, no database). Historical case names remain stable.
 *
 * Complements connect_auth.testdinner.test.ts / connect_auth_flows with the
 * branches the OpenAPI envelope normally shields: controller-level parse
 * rejections (invalid via direct controller invocation, since dinner's schema
 * validation would otherwise answer first), non-Error repo failures, the
 * Google persistence guard, disabled accounts, and logout failure/idempotency
 * branches. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import Env from '../../../src/server/services/env';
import ConnectGoogleTokenInfoClient from '../../../src/server/services/connect_google_token_info_client';
import ConnectAuthController from '../../../src/server/controller/connect_auth.controller';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import ConnectIdentityRepo from '../../../src/server/repo/connect_identity_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const NOW = new Date('2026-01-01T00:00:00.000Z');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';

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

const tokeninfo = (claims: Record<string, unknown>) => testStub()
  .function(Env, () => {
    const value = new Env(); value.load({ GOOGLE_CLIENT_ID }); return value;
  })
  .method(ConnectGoogleTokenInfoClient, 'request', control.watch(() => async () => Response.json(claims)));

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


describe('connect auth controller parse rejections (direct controller, below the OpenAPI envelope)', () => {
  it('every route maps an invalid envelope to a logged 400 with the fallback correlationId', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } }).build();
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
  }));

  it('a protocol version the parser does not speak is a 409 protocol-version-mismatch', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } }).build();
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
  }));
});

describe('connect auth failure outcomes (routes)', () => {
  it('a non-Error repo rejection during signup degrades to a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      // Non-Error rejection value: exercises the String(error) diagnostic
      // path and the isUniqueViolation non-Error guard.
      .method(ConnectAccountRepo, 'findPasswordlessByEmail', control.once(control.throws('db exploded')))
      .method(ConnectAccountRepo, 'createAccount', control.never())
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
  }));

  it('a wrapped repo failure (Error with cause) during login is still a uniform 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByUsername', control.once(control.throws(
        Object.assign(new Error('query failed'), { cause: new Error('connection reset') }),
      )))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/login',
      body: {
        kind: 'auth.login.request', protocolVersion: '1.0',
        username: 'shavyg2', password: 'a-long-password-123',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(500);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('a Google account that vanishes after creation is a 500, never a half-session', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .use(tokeninfo(validClaims))
      .method(ConnectAccountRepo, 'findByEmail', control.calls([
        control.returns(Promise.resolve(null)),
        control.returns(Promise.resolve(null)),
      ]))
      .method(ConnectAccountRepo, 'createAccount', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdentityRepo, 'linkGoogle', control.never())
      .method(ConnectBrowserSessionRepo, 'createSession', control.never())
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(500);
    await response.body?.cancel();
    await env.verify();
  }));

  it('a disabled account behind a valid Google token is a uniform 401, no session row', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .use(tokeninfo(validClaims))
      .method(ConnectAccountRepo, 'findByEmail', control.once(control.returns(Promise.resolve({ ...account, status: 'disabled' }))))
      .method(ConnectAccountRepo, 'createAccount', control.never())
      .method(ConnectIdentityRepo, 'linkGoogle', control.once(control.returns(Promise.resolve())))
      .method(ConnectBrowserSessionRepo, 'createSession', control.never())
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Invalid Google account' });
    await env.verify();
  }));
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

  it('a revocation write failure during logout is a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(sessionRow))))
      .method(ConnectBrowserSessionRepo, 'revokeSession', control.once(control.throws(new Error('write failed'))))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      headers: logoutHeaders, body: logoutBody,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
  }));

  it('logging out an already-revoked session is idempotent: 200 ended with count 0', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve({
        ...sessionRow, status: 'revoked',
      }))))
      .method(ConnectBrowserSessionRepo, 'revokeSession', control.once(control.returns(Promise.resolve())))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      headers: logoutHeaders, body: logoutBody,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'auth.logout.response', sessionId: 'ses_fixed0001', ended: true,
    });
    await env.verify();
  }));
});
