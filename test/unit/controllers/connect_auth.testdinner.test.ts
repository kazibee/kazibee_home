/**
 * Connect auth routes through root testApp over the original configuration
 * (no server, no database). Historical case names remain stable.
 *
 * Real production auth.yaml module selection, real controller → logic →
 * service → policy graph. Only the SQL boundary (@Query repos) and the
 * nondeterministic primitives (ConnectClock / ConnectIdGenerator) are
 * replaced through singular method controls. resourceCase owns cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
import ConnectAuthLogic from '../../../src/server/logic/connect_auth.logic';
import { GUEST_ACTOR } from '../../../src/server/types/actor';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const NOW = new Date('2026-01-01T00:00:00.000Z');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const signupBody = {
  kind: 'auth.signup.request',
  protocolVersion: '1.0',
  username: 'shavyg2',
  email: 'shavyg2@gmail.com',
  password: 'a-long-password-123',
  idempotencyKey: 'idem_aaaaaaaaaaaaaaaa',
  correlationId: 'cor_abcdefgh',
};

describe('connect auth routes through testDinner (no server, no database)', () => {
  it('POST /signup creates an account when the email is unknown', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findPasswordlessByEmail', control.once(control.returns(Promise.resolve(null))))
      .method(ConnectAccountRepo, 'createAccount', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdGenerator, 'userId', control.returns('usr_fixed0001'))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/signup', body: signupBody,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      kind: 'auth.signup.response',
      protocolVersion: '1.0',
      userId: 'usr_fixed0001',
      username: 'shavyg2',
      email: 'shavyg2@gmail.com',
      correlationId: 'cor_abcdefgh',
    });
    await env.verify();
  }));

  it('POST /signup with an already-passworded account is a 409 duplicate', resourceCase(async () => {
    // New contract: a passworded account is invisible to the passwordless
    // lookup; the duplicate surfaces as createAccount's unique violation
    // (username UNIQUE), which signup maps to the 409 duplicate outcome.
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

  it('POST /signup with a malformed envelope is a 400 that never reaches the repos', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByEmail', control.never())
      .method(ConnectAccountRepo, 'createAccount', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/signup',
      body: { ...signupBody, correlationId: 'not-a-correlation-id' },
    });
    expect(response.status).toBe(400);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('POST /login with a valid password creates a persisted session and sets cookies', resourceCase(async () => {
    const password = 'a-long-password-123';
    const passwordHash = await bcrypt.hash(password, 4);
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByUsername', control.once(control.returns(Promise.resolve({
        user_id: 'usr_existing01', username: 'shavyg2', email: 'shavyg2@gmail.com',
        email_verified_at: null, password_hash: passwordHash, status: 'active',
        created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
      }))))
      .method(ConnectBrowserSessionRepo, 'createSession', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdGenerator, 'sessionId', control.returns('ses_fixed0001'))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/login',
      body: {
        kind: 'auth.login.request', protocolVersion: '1.0',
        username: 'shavyg2', password,
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'auth.login.response',
      userId: 'usr_existing01',
      sessionId: 'ses_fixed0001',
      actorRole: 'browser_session',
      // 7-day absolute expiry from the fixed clock.
      expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const cookies = response.headers.get('set-cookie') ?? '';
    expect(cookies).toContain('kazi_connect_session');
    await env.verify();
  }));

  it('POST /login for an unknown identifier is a uniform 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByUsername', control.once(control.returns(Promise.resolve(null))))
      .method(ConnectBrowserSessionRepo, 'createSession', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/auth/login',
      body: {
        kind: 'auth.login.request', protocolVersion: '1.0',
        username: 'nobodyhere', password: 'a-long-password-123',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
      },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Invalid credentials' });
    await env.verify();
  }));

  it('login repo failures degrade to a structured 500, not a leak', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectAccountRepo, 'findByUsername', control.once(control.throws(new Error('connection refused'))))
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
    expect(await response.json()).toMatchObject({ kind: 'error', message: 'Internal server error' });
    await env.verify();
  }));

  it('logic-depth session check: unknown session token is unauthorized', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(null))))
      .method(ConnectAccountRepo, 'findByUserId', control.never())
      .build();
    const logic = await env.get<ConnectAuthLogic>(ConnectAuthLogic);
    const result = await logic.session(GUEST_ACTOR, {
      kind: 'auth.session.request', protocolVersion: '1.0',
      sessionId: 'ses_fixed0001', actorRole: 'browser_session', correlationId: 'cor_abcdefgh',
    }, 'some-opaque-session-token');
    expect(result).toEqual({ outcome: 'unauthorized' });
    await env.verify();
  }));

  it('logic-depth logout: an authenticated session without CSRF proof is rejected as csrf', resourceCase(async () => {
    const sessionToken = 'opaque-session-token';
    const csrfToken = 'opaque-csrf-token';
    const session = {
      session_id: 'ses_fixed0001', user_id: 'usr_existing01',
      session_token_hash: sha256(sessionToken), csrf_token_hash: sha256(csrfToken),
      status: 'active',
      created_at: NOW.toISOString(), last_seen_at: NOW.toISOString(),
      idle_expires_at: new Date(NOW.getTime() + 60_000).toISOString(),
      absolute_expires_at: new Date(NOW.getTime() + 60_000).toISOString(),
    };
    const env = await testApp(CONFIG).select({ server: { module: ['connectAuth'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(session))))
      .method(ConnectBrowserSessionRepo, 'revokeSession', control.never())
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve({
        user_id: 'usr_existing01', username: 'shavyg2', email: 'shavyg2@gmail.com',
        email_verified_at: null, password_hash: 'x', status: 'active',
        created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
      }))))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const logic = await env.get<ConnectAuthLogic>(ConnectAuthLogic);
    const result = await logic.logout(GUEST_ACTOR, {
      kind: 'auth.logout.request', protocolVersion: '1.0',
      sessionId: 'ses_fixed0001', actorRole: 'browser_session',
      idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: 'cor_abcdefgh',
    }, sessionToken, null, null);
    expect(result).toEqual({ outcome: 'csrf' });
    await env.verify();
  }));
});
