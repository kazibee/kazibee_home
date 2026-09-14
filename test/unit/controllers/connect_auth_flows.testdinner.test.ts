/**
 * Connect auth deep flows through root testApp over the original
 * configuration (no server, no database). Historical case names remain stable.
 *
 * Extends connect_auth.testdinner.test.ts with the Google sign-in route
 * (real ConnectGoogleTokenVerifier over its per-root HTTP boundary), the signup
 * linking/duplicate branches, session/logout HTTP routes, and parser edge
 * shapes. No globals are patched; resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import Env from '../../../src/server/services/env';
import ConnectGoogleTokenInfoClient from '../../../src/server/services/connect_google_token_info_client';
import ConnectAuthRequestParser from '../../../src/server/services/connect_auth_request_parser';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import ConnectIdentityRepo from '../../../src/server/repo/connect_identity_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';
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

const googleBody = {
  kind: 'auth.google.request',
  protocolVersion: '1.0',
  credential: 'google-id-token',
  idempotencyKey: 'idem_aaaaaaaaaaaaaaaa',
  correlationId: 'cor_abcdefgh',
};

const tokeninfo = (claims: Record<string, unknown> | null) => testStub()
  .function(Env, () => {
    const env = new Env();
    env.load({ GOOGLE_CLIENT_ID });
    return env;
  })
  .method(ConnectGoogleTokenInfoClient, 'request', control.watch(() => async (input: string) => {
    expect(input).toContain('https://oauth2.googleapis.com/tokeninfo?id_token=');
    if (!claims) return new Response('bad token', { status: 400 });
    return Response.json(claims);
  }));

const validClaims = {
  aud: GOOGLE_CLIENT_ID,
  sub: 'google-subject-1',
  email: 'Shavyg2@Gmail.com',
  email_verified: 'true',
};

describe('connect auth google route (real verifier, stubbed fetch)', () => {
  it.each(['shavyg2@gmail.com', 'sashaun13@gmail.com'])('signs up %s with its own username, links the identity, and starts a session', resourceCase(async (_resources, email: string) => {

    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .use(tokeninfo({ ...validClaims, email }))
      .method(ConnectAccountRepo, 'findByEmail', control.calls([
        control.returns(Promise.resolve(null)),
        control.returns(Promise.resolve({ ...account, user_id: 'usr_fixed0001', username: 'usr_fixed0001', email })),
      ]))
      .method(ConnectAccountRepo, 'createAccount', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdentityRepo, 'linkGoogle', control.once(control.returns(Promise.resolve())))
      .method(ConnectBrowserSessionRepo, 'createSession', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdGenerator, 'userId', control.returns('usr_fixed0001'))
      .method(ConnectIdGenerator, 'identityId', control.returns('idn_fixed0001'))
      .method(ConnectIdGenerator, 'sessionId', control.returns('ses_fixed0001'))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(200);
    expect(control.inspect(env, ConnectAccountRepo, 'createAccount').calls).toMatchObject([
      { args: [expect.objectContaining({ user_id: 'usr_fixed0001', username: 'usr_fixed0001', email })] },
    ]);
    expect(await response.json()).toMatchObject({
      kind: 'auth.login.response',
      userId: 'usr_fixed0001',
      sessionId: 'ses_fixed0001',
      actorRole: 'browser_session',
      correlationId: 'cor_abcdefgh',
    });
    expect(response.headers.get('set-cookie') ?? '').toContain('kazi_connect_session');
    await env.verify();
  }));

  it('logs an existing Google account in without creating a new one', resourceCase(async () => {

    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .use(tokeninfo(validClaims))
      .method(ConnectAccountRepo, 'findByEmail', control.once(control.returns(Promise.resolve(account))))
      .method(ConnectAccountRepo, 'createAccount', control.never())
      .method(ConnectIdentityRepo, 'linkGoogle', control.once(control.returns(Promise.resolve())))
      .method(ConnectBrowserSessionRepo, 'createSession', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdGenerator, 'identityId', control.returns('idn_fixed0001'))
      .method(ConnectIdGenerator, 'sessionId', control.returns('ses_fixed0001'))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(200);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('a rejected Google token (non-2xx tokeninfo) is a uniform 401', resourceCase(async () => {

    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .use(tokeninfo(null))
      .method(ConnectAccountRepo, 'findByEmail', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Invalid Google account' });
    await env.verify();
  }));

  it('a token for another audience or an unverified/disallowed email is a 401', resourceCase(async () => {

    for (const claims of [
      { ...validClaims, aud: 'someone-else' },
      { ...validClaims, email_verified: 'false' },
      { ...validClaims, email: 'stranger@example.com' },
    ]) {
      const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
        .use(tokeninfo(claims))
        .method(ConnectAccountRepo, 'findByEmail', control.never())
        .build();
      const response = await env.request({
        method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
      });
      expect(response.status).toBe(401);
      await response.body?.cancel();
      await env.verify();

    }
  }));

  it('an unconfigured verifier (no GOOGLE_CLIENT_ID) degrades to a structured 500', resourceCase(async () => {

    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByEmail', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
  }));

  it('parser edge shapes: extra keys, oversized credentials, bad kinds are invalid envelopes', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } }).build();
    const parser = await env.get<ConnectAuthRequestParser>(ConnectAuthRequestParser);
    expect(parser.google({ ...googleBody, extra: 'key' })).toMatchObject({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_abcdefgh',
    });
    expect(parser.google({ ...googleBody, credential: 'x'.repeat(8193) })).toMatchObject({
      ok: false, reason: 'invalid-envelope',
    });
    expect(parser.google({ ...googleBody, kind: 'auth.login.request' })).toMatchObject({
      ok: false, reason: 'invalid-envelope',
    });
    expect(parser.google('not-an-object')).toMatchObject({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000',
    });
    expect(parser.google({ ...googleBody, protocolVersion: '2.0' })).toMatchObject({
      ok: false, reason: 'protocol-version-mismatch',
    });
  }));
});

const signupBody = {
  kind: 'auth.signup.request',
  protocolVersion: '1.0',
  username: 'shavyg2',
  email: 'shavyg2@gmail.com',
  password: 'a-long-password-123',
  idempotencyKey: 'idem_aaaaaaaaaaaaaaaa',
  correlationId: 'cor_abcdefgh',
};

describe('connect auth signup/login remaining branches', () => {
  it('signup links a password onto an existing password-less account', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findPasswordlessByEmail', control.once(control.returns(Promise.resolve(account))))
      .method(ConnectAccountRepo, 'setPassword', control.once(control.returns(Promise.resolve())))
      .method(ConnectAccountRepo, 'createAccount', control.never())
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      kind: 'auth.signup.response',
      userId: 'usr_existing01',
      username: 'shavyg2',
    });
    await env.verify();
  }));

  it('a unique-constraint race on createAccount maps to the 409 duplicate outcome', resourceCase(async () => {
    const violation = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findPasswordlessByEmail', control.once(control.returns(Promise.resolve(null))))
      .method(ConnectAccountRepo, 'createAccount', control.once(control.throws(violation)))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'invalid-envelope' });
    await env.verify();
  }));

  it('login accepts the allowed email as identifier but a disabled account is still a 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByEmail', control.once(control.returns(Promise.resolve({
        ...account,
        password_hash: '$2b$04$invalidhashinvalidhashinvalidhashinvalidhashinvalid.',
        status: 'disabled',
      }))))
      .method(ConnectAccountRepo, 'findByUsername', control.never())
      .method(ConnectBrowserSessionRepo, 'createSession', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/login',
      body: {
        kind: 'auth.login.request', protocolVersion: '1.0',
        username: 'shavyg2@gmail.com', password: 'a-long-password-123',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Invalid credentials' });
    await env.verify();
  }));

  it('a password-less account takes the canary verification path and stays a 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByUsername', control.once(control.returns(Promise.resolve(account))))
      .method(ConnectBrowserSessionRepo, 'createSession', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/login',
      body: {
        kind: 'auth.login.request', protocolVersion: '1.0',
        username: 'shavyg2', password: 'a-long-password-123',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(401);
    await response.body?.cancel();
    await env.verify();
  }));

  it('parser depth: protocol mismatch, oversized identifiers, and disallowed identifiers', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } }).build();
    const parser = await env.get<ConnectAuthRequestParser>(ConnectAuthRequestParser);
    const loginBody = {
      kind: 'auth.login.request', protocolVersion: '1.0',
      username: 'shavyg2', password: 'a-long-password-123',
      idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
    };
    expect(parser.login({ ...loginBody, protocolVersion: '2.0' })).toMatchObject({
      ok: false, reason: 'protocol-version-mismatch', correlationId: 'cor_abcdefgh',
    });
    expect(parser.login({ ...loginBody, username: 'a'.repeat(200) })).toMatchObject({
      ok: false, reason: 'invalid-envelope',
    });
    // An email identifier other than the allowed one fails the identifier policy.
    expect(parser.login({ ...loginBody, username: 'stranger@example.com' })).toMatchObject({
      ok: false, reason: 'invalid-envelope',
    });
    // Uppercase identifiers normalize before the policy check.
    const normalized = parser.login({ ...loginBody, username: '  SHAVYG2 ' });
    expect(normalized).toMatchObject({ ok: true });
    if (normalized.ok) expect(normalized.value.identifier).toBe('shavyg2');
    expect(parser.signup({
      ...signupBody, password: 'short',
    })).toMatchObject({ ok: false, reason: 'invalid-envelope' });
    expect(parser.signup({
      ...signupBody, email: 'stranger@example.com',
    })).toMatchObject({ ok: false, reason: 'invalid-envelope' });
  }));
});

describe('connect auth session/logout HTTP routes', () => {
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
  const sessionQuery = {
    kind: 'auth.session.request', protocolVersion: '1.0',
    sessionId: 'ses_fixed0001', actorRole: 'browser_session', correlationId: 'cor_abcdefgh',
  };

  it('GET /session with a valid cookie authenticates via the query envelope', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(sessionRow))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve()))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))))
      .build();
    const response = await env.request({
      method: 'GET', path: '/v1/connect/auth/session',
      query: sessionQuery,
      headers: { cookie: `kazi_connect_session=${sessionToken}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'auth.session.response',
      userId: 'usr_existing01',
      sessionId: 'ses_fixed0001',
      expiresAt: sessionRow.absolute_expires_at,
    });
    await env.verify();
  }));

  it('parser depth: session/logout envelopes, cookie readers, and the query fallback', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } }).build();
    const parser = await env.get<ConnectAuthRequestParser>(ConnectAuthRequestParser);
    const request = (overrides: Record<string, unknown>) => ({
      body: {}, query: {}, cookies: {}, headers: {}, ...overrides,
    }) as never;

    // Body takes precedence; an empty body falls back to the query envelope.
    expect(parser.session(request({ query: sessionQuery }))).toMatchObject({ ok: true });
    expect(parser.session(request({
      query: { ...sessionQuery, sessionId: 'not-a-session-id', correlationId: 'nope' },
    }))).toMatchObject({ ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000' });
    expect(parser.session(request({
      query: { ...sessionQuery, actorRole: 'desktop' },
    }))).toMatchObject({ ok: false, reason: 'invalid-envelope' });

    const logoutBody = {
      kind: 'auth.logout.request', protocolVersion: '1.0',
      sessionId: 'ses_fixed0001', actorRole: 'browser_session',
      idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
    };
    expect(parser.logout(request({ body: logoutBody }))).toMatchObject({ ok: true });
    expect(parser.logout(request({
      body: { ...logoutBody, idempotencyKey: 'bad' },
    }))).toMatchObject({ ok: false, reason: 'invalid-envelope' });
    expect(parser.logout(request({
      body: { ...logoutBody, protocolVersion: '9.9' },
    }))).toMatchObject({ ok: false, reason: 'protocol-version-mismatch' });

    // Cookie/header readers tolerate absent cookie jars and non-string headers.
    expect(parser.sessionCookie(request({ cookies: undefined }))).toBeNull();
    expect(parser.sessionCookie(request({ cookies: { kazi_connect_session: 'tok' } }))).toBe('tok');
    expect(parser.csrfCookie(request({ cookies: { kazi_connect_csrf: 'csrf' } }))).toBe('csrf');
    expect(parser.csrfCookie(request({ cookies: undefined }))).toBeNull();
    expect(parser.csrfHeader(request({ headers: { 'x-csrf-token': 'csrf' } }))).toBe('csrf');
    expect(parser.csrfHeader(request({ headers: {} }))).toBeNull();
  }));

  it('a repo failure during session lookup degrades to a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.throws(new Error('connection refused'))))
      .build();
    const response = await env.request({
      method: 'GET', path: '/v1/connect/auth/session',
      query: sessionQuery,
      headers: { cookie: `kazi_connect_session=${sessionToken}` },
    });
    expect(response.status).toBe(500);
    await response.body?.cancel();
  }));

  it('POST /logout with session + CSRF proof revokes the session and clears cookies', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(sessionRow))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve()))
      .method(ConnectBrowserSessionRepo, 'revokeSession', control.once(control.returns(Promise.resolve())))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      headers: {
        cookie: `kazi_connect_session=${sessionToken}; kazi_connect_csrf=${csrfToken}`,
        'x-csrf-token': csrfToken,
      },
      body: {
        kind: 'auth.logout.request', protocolVersion: '1.0',
        sessionId: 'ses_fixed0001', actorRole: 'browser_session',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'auth.logout.response',
      sessionId: 'ses_fixed0001',
      ended: true,
    });
    expect(response.headers.get('set-cookie') ?? '').toContain('kazi_connect_session=;');
    await env.verify();
  }));

  it('POST /logout without any session is a 401 that clears cookies', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.never())
      .method(ConnectBrowserSessionRepo, 'revokeSession', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      body: {
        kind: 'auth.logout.request', protocolVersion: '1.0',
        sessionId: 'ses_fixed0001', actorRole: 'browser_session',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
  }));

  it('a logout for a different sessionId than the cookie session is unauthorized', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(sessionRow))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve()))
      .method(ConnectBrowserSessionRepo, 'revokeSession', control.never())
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/logout',
      headers: {
        cookie: `kazi_connect_session=${sessionToken}; kazi_connect_csrf=${csrfToken}`,
        'x-csrf-token': csrfToken,
      },
      body: {
        kind: 'auth.logout.request', protocolVersion: '1.0',
        sessionId: 'ses_other000', actorRole: 'browser_session',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(401);
    await response.body?.cancel();
    await env.verify();
  }));
});
