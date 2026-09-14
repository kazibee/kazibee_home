/**
 * Frontend application slice (spec 18) — kazibee web reference.
 *
 * The full crossing, with no browser, no listener, and no global patching:
 *
 *   real PageController (rune-backed, vitest-svelte compiled)
 *   → framework-owned client runtime (fetch over the in-process transport)
 *   → real route/schema/middleware/controller/logic/service graph
 *   → response back into frontend state
 *   → production navigation intent → next real page (loader + controller)
 *
 * Only the SQL boundary and nondeterministic primitives are replaced —
 * the same seams the backend testdinner tier uses. SQL methods are replaced;
 * no database claim. Controllers are the production classes: their default
 * dependencies resolve the client runtime testApp binds on every build.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { testApp } from '@noego/app';
import { APP_CLIENT_RUNTIME, type AppClientRuntime } from '@noego/app/client';
import { test as control, testStub, resourceCase } from '@noego/testing';
import { CONNECT_SESSION_STORAGE_KEY } from '../../../src/ui/controllers/connect_shared';
import type ConnectAuthController from '../../../src/ui/controllers/connect_auth.svelte.ts';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const NOW = new Date('2026-01-01T00:00:00.000Z');
const FUTURE = '2027-01-01T00:00:00.000Z';
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const sessionRow = () => ({
  session_id: 'ses_fixed0001',
  user_id: 'usr_existing01',
  session_token_hash: sha256('ses_fixed0001'),
  csrf_token_hash: sha256('C'.repeat(43)),
  status: 'active',
  created_at: NOW.toISOString(),
  last_seen_at: NOW.toISOString(),
  idle_expires_at: FUTURE,
  absolute_expires_at: FUTURE,
  revoked_at: null,
});

const accountRow = (passwordHash: string | null = null) => ({
  user_id: 'usr_existing01',
  username: 'shavyg2',
  email: 'shavyg2@gmail.com',
  email_verified_at: NOW.toISOString(),
  password_hash: passwordHash,
  status: 'active',
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
});

// The login pipeline's replaced seams (SQL repos + nondeterministic primitives).
const loginBoundaries = (passwordHash: string) => testStub()
  .method(ConnectAccountRepo, 'findByUsername', control.once(control.returns(Promise.resolve(accountRow(passwordHash)))))
  .method(ConnectAccountRepo, 'findByUserId', control.returns(Promise.resolve(accountRow())))
  .method(ConnectBrowserSessionRepo, 'createSession', control.once(control.returns(Promise.resolve())))
  .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.returns(Promise.resolve(sessionRow())))
  .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
  .method(ConnectExecutorRepo, 'listByOwner', control.once(control.returns(Promise.resolve([]))))
  .method(OAuthRepo, 'listConnectionsByUser', control.returns(Promise.resolve([])))
  .method(ConnectIdGenerator, 'sessionId', control.returns('ses_fixed0001'))
  .method(ConnectClock, 'now', control.returns(NOW));

type LoginInput = { setUsername(v: string): void; setPassword(v: string): void; submit(): Promise<void> };

const browserStorage = async (env: { client?: { get<T>(token: unknown): Promise<T> } }) => {
  if (!env.client) throw new Error('This frontend slice requires the selected client owner');
  return (await env.client.get<AppClientRuntime>(APP_CLIENT_RUNTIME)).storage;
};

describe('connect login — frontend application slice', () => {
  it('drives login through the real backend and production navigation to the dashboard', resourceCase(async scope => {
    const passwordHash = await bcrypt.hash('a-long-password-123', 4);
    const env = scope.environment(await testApp(CONFIG)
      .select({ server: {}, client: { path: ['/connect/login', '/connect'] } })
      .use(loginBoundaries(passwordHash))
      .build());
    const storage = await browserStorage(env);

    const login = await env.frontend!.open<ConnectAuthController>({ page: 'login' });
    // The REAL auth.load.ts ran: mode derived from the production URL.
    expect(login.data.mode).toBe('login');
    expect(login.data.returnTo).toBe('/connect');

    login.input.setUsername('shavyg2');
    login.input.setPassword('a-long-password-123');
    await env.frontend!.act(() => login.input.submit());

    // The response crossed the real route/schema/service graph: the
    // server-generated session id landed in the framework-owned browser storage.
    expect({ status: login.data.status, error: login.data.error }).toEqual({ status: 'success', error: null });
    expect(storage.getItem(CONNECT_SESSION_STORAGE_KEY)).toBe('ses_fixed0001');

    // Production navigation: runtime.navigate(returnTo) → aperture-resolved
    // dashboard page, whose detached initialize().refresh() fetched the
    // real executor listing (drained by settle, no sleeps).
    const dashboard = env.frontend!.current();
    expect(dashboard?.identity).toBe('dashboard');
    expect((dashboard?.data as { status: string }).status).toBe('ready');
    expect((dashboard?.data as { executors: unknown[] }).executors).toEqual([]);

    expect(env.frontend!.errors).toEqual([]);
  }));

  it('a wrong password surfaces the real uniform 401 as frontend error state without navigating', resourceCase(async scope => {
    const passwordHash = await bcrypt.hash('the-actual-password', 4);
    const env = scope.environment(await testApp(CONFIG)
      .select({ server: {}, client: { path: ['/connect/login'] } })
      .method(ConnectAccountRepo, 'findByUsername', control.once(control.returns(Promise.resolve(accountRow(passwordHash)))))
      .build());
    const storage = await browserStorage(env);

    const login = await env.frontend!.open({ page: 'login' });
    const input = login.input as LoginInput;
    input.setUsername('shavyg2');
    input.setPassword('not-the-password');
    await env.frontend!.act(() => input.submit());

    const data = login.data as { status: string; error: string | null; password: string };
    expect(data.status).toBe('error');
    expect(data.error).toBeTruthy();
    expect(data.password).toBe(''); // cleared on failure — production behavior
    expect(storage.getItem(CONNECT_SESSION_STORAGE_KEY)).toBeNull();
    expect(env.frontend!.current()?.identity).toBe('login');
  }));

  it('opening a page outside the selected aperture fails with production identities', resourceCase(async scope => {
    const env = scope.environment(await testApp(CONFIG)
      .select({ server: {}, client: { path: ['/connect/login'] } })
      .build());
    await expect(env.frontend!.open({ page: 'dashboard' })).rejects.toThrow(/available pages/);
  }));
});
