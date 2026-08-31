/**
 * Connect auth deep flows through testDinner (no server, no database).
 *
 * Extends connect_auth.testdinner.test.ts with the Google sign-in route
 * (real ConnectGoogleTokenVerifier over a stubbed global fetch), the signup
 * linking/duplicate branches, session/logout HTTP routes, and parser edge
 * shapes. Globals and env are restored after every test.
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectAuthController from '../../../src/server/controller/connect_auth.controller';
import ConnectAuthRequestParser from '../../../src/server/services/connect_auth_request_parser';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import ConnectIdentityRepo from '../../../src/server/repo/connect_identity_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';
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

const googleBody = {
  kind: 'auth.google.request',
  protocolVersion: '1.0',
  credential: 'google-id-token',
  idempotencyKey: 'idem_aaaaaaaaaaaaaaaa',
  correlationId: 'cor_abcdefgh',
};

function stubTokeninfo(claims: Record<string, unknown> | null) {
  vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
    expect(String(input)).toContain('https://oauth2.googleapis.com/tokeninfo?id_token=');
    if (!claims) return new Response('bad token', { status: 400 });
    return new Response(JSON.stringify(claims), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }));
}

const validClaims = {
  aud: GOOGLE_CLIENT_ID,
  sub: 'google-subject-1',
  email: 'Shavyg2@Gmail.com',
  email_verified: 'true',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (savedGoogleClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = savedGoogleClientId;
});

describe('connect auth google route (real verifier, stubbed fetch)', () => {
  it('signs up a brand-new Google account, links the identity, and starts a session', async () => {
    process.env.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
    stubTokeninfo(validClaims);
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByEmail: control.calls([
            control.returns(Promise.resolve(null)),
            control.returns(Promise.resolve(account)),
          ]),
          createAccount: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectIdentityRepo, {
          linkGoogle: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectBrowserSessionRepo, {
          createSession: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectIdGenerator, {
          userId: control.returns('usr_fixed0001'),
          identityId: control.returns('idn_fixed0001'),
          sessionId: control.returns('ses_fixed0001'),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'auth.login.response',
      userId: 'usr_existing01',
      sessionId: 'ses_fixed0001',
      actorRole: 'browser_session',
      correlationId: 'cor_abcdefgh',
    });
    expect(response.headers.get('set-cookie') ?? '').toContain('kazi_connect_session');
    await env.verify();
    await env.dispose();
  });

  it('logs an existing Google account in without creating a new one', async () => {
    process.env.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
    stubTokeninfo(validClaims);
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByEmail: control.once(control.returns(Promise.resolve(account))),
          createAccount: control.never(),
        }],
        [ConnectIdentityRepo, {
          linkGoogle: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectBrowserSessionRepo, {
          createSession: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectIdGenerator, {
          identityId: control.returns('idn_fixed0001'),
          sessionId: control.returns('ses_fixed0001'),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(200);
    await env.verify();
    await env.dispose();
  });

  it('a rejected Google token (non-2xx tokeninfo) is a uniform 401', async () => {
    process.env.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
    stubTokeninfo(null);
    const env = await base()
      .methods([ [ConnectAccountRepo, { findByEmail: control.never() }] ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Invalid Google account' });
    await env.verify();
    await env.dispose();
  });

  it('a token for another audience or an unverified/disallowed email is a 401', async () => {
    process.env.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
    for (const claims of [
      { ...validClaims, aud: 'someone-else' },
      { ...validClaims, email_verified: 'false' },
      { ...validClaims, email: 'stranger@example.com' },
    ]) {
      stubTokeninfo(claims);
      const env = await base()
        .methods([ [ConnectAccountRepo, { findByEmail: control.never() }] ])
        .build();
      const response = await env.dinner.request({
        method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
      });
      expect(response.status).toBe(401);
      await env.verify();
      await env.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('an unconfigured verifier (no GOOGLE_CLIENT_ID) degrades to a structured 500', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const env = await base()
      .methods([ [ConnectAccountRepo, { findByEmail: control.never() }] ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/google', body: googleBody,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });

  it('parser edge shapes: extra keys, oversized credentials, bad kinds are invalid envelopes', async () => {
    const env = await base().build();
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
    await env.dispose();
  });
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
  it('signup links a password onto an existing password-less account', async () => {
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findPasswordlessByEmail: control.once(control.returns(Promise.resolve(account))),
          setPassword: control.once(control.returns(Promise.resolve())),
          createAccount: control.never(),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      kind: 'auth.signup.response',
      userId: 'usr_existing01',
      username: 'shavyg2',
    });
    await env.verify();
    await env.dispose();
  });

  it('a unique-constraint race on createAccount maps to the 409 duplicate outcome', async () => {
    const violation = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findPasswordlessByEmail: control.once(control.returns(Promise.resolve(null))),
          createAccount: control.once(control.throws(violation)),
        }],
        [ConnectClock, { now: control.returns(NOW) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'invalid-envelope' });
    await env.verify();
    await env.dispose();
  });

  it('login accepts the allowed email as identifier but a disabled account is still a 401', async () => {
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByEmail: control.once(control.returns(Promise.resolve({
            ...account,
            password_hash: '$2b$04$invalidhashinvalidhashinvalidhashinvalidhashinvalid.',
            status: 'disabled',
          }))),
          findByUsername: control.never(),
        }],
        [ConnectBrowserSessionRepo, { createSession: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('a password-less account takes the canary verification path and stays a 401', async () => {
    const env = await base()
      .methods([
        [ConnectAccountRepo, {
          findByUsername: control.once(control.returns(Promise.resolve(account))),
        }],
        [ConnectBrowserSessionRepo, { createSession: control.never() }],
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
    expect(response.status).toBe(401);
    await env.verify();
    await env.dispose();
  });

  it('parser depth: protocol mismatch, oversized identifiers, and disallowed identifiers', async () => {
    const env = await base().build();
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
    await env.dispose();
  });
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

  it('GET /session with a valid cookie authenticates via the query envelope', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(sessionRow))),
          touchSession: control.returns(Promise.resolve()),
        }],
        [ConnectAccountRepo, {
          findByUserId: control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('parser depth: session/logout envelopes, cookie readers, and the query fallback', async () => {
    const env = await base().build();
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
    await env.dispose();
  });

  it('a repo failure during session lookup degrades to a structured 500', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.once(control.throws(new Error('connection refused'))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: '/v1/connect/auth/session',
      query: sessionQuery,
      headers: { cookie: `kazi_connect_session=${sessionToken}` },
    });
    expect(response.status).toBe(500);
    await env.dispose();
  });

  it('POST /logout with session + CSRF proof revokes the session and clears cookies', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(sessionRow))),
          touchSession: control.returns(Promise.resolve()),
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
    await env.dispose();
  });

  it('POST /logout without any session is a 401 that clears cookies', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.never(),
          revokeSession: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('a logout for a different sessionId than the cookie session is unauthorized', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(sessionRow))),
          touchSession: control.returns(Promise.resolve()),
          revokeSession: control.never(),
        }],
        [ConnectAccountRepo, {
          findByUserId: control.once(control.returns(Promise.resolve({ ...account, password_hash: 'x' }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.verify();
    await env.dispose();
  });
});
