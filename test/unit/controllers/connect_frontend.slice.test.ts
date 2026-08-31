/**
 * Frontend application slice (spec 18) — kazibee web reference.
 *
 * The full crossing, with no browser, no listener, and no global patching:
 *
 *   real PageController (rune-backed, vitest-svelte compiled)
 *   → injected fetch over the in-process Dinner transport
 *   → real route/schema/middleware/controller/logic/service graph
 *   → response back into frontend state
 *   → production navigation intent → next real page (loader + controller)
 *
 * Only the SQL boundary and nondeterministic primitives are replaced —
 * the same seams the backend testdinner tier uses.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { appTest } from '../../helpers/app_test';
import { test as control } from '@noego/testing';
import type { ConnectControllerDependencies } from '../../../src/ui/controllers/connect_shared';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';

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

async function buildSlice() {
  const passwordHash = await bcrypt.hash('a-long-password-123', 4);

  // Test-owned browser boundary: in-memory storage, deps wired to the
  // environment's transport + navigator after build (the factory below
  // constructs lazily, at page-open time).
  const storage = new Map<string, string>();
  const deps: Partial<Record<string, unknown>> = {};
  const dependencies = () => deps.current as ConnectControllerDependencies;

  const { default: ConnectAuthController } = await import('../../../src/ui/controllers/connect_auth.svelte.ts');
  const { default: ConnectDashboardController } = await import('../../../src/ui/controllers/connect_dashboard.svelte.ts');

  const env = await appTest()
    .select({ client: { pages: ['login', 'dashboard'] } })
    .methods([
      [ConnectAccountRepo, {
        findByUsername: control.once(control.returns(Promise.resolve(accountRow(passwordHash)))),
        findByUserId: control.returns(Promise.resolve(accountRow())),
      }],
      [ConnectBrowserSessionRepo, {
        createSession: control.once(control.returns(Promise.resolve())),
        findByTokenHash: control.returns(Promise.resolve(sessionRow())),
        touchSession: control.returns(Promise.resolve(undefined)),
      }],
      [ConnectExecutorRepo, {
        listByOwner: control.once(control.returns(Promise.resolve([]))),
      }],
      [OAuthRepo, {
        listConnectionsByUser: control.returns(Promise.resolve([])),
      }],
      [ConnectIdGenerator, { sessionId: control.returns('ses_fixed0001') }],
      [ConnectClock, { now: control.returns(NOW) }],
    ])
    .client((client) => client.functions([
      [ConnectAuthController, () => new ConnectAuthController(dependencies())],
      [ConnectDashboardController, () => new ConnectDashboardController(dependencies())],
    ]))
    .buildFrontend();

  deps.current = {
    fetch: env.fetch,
    navigate: (target: string) => env.navigator.navigate(target),
    getSessionId: () => storage.get('session') ?? null,
    setSessionId: (value: string) => void storage.set('session', value),
    clearSessionId: () => void storage.delete('session'),
    getCsrfToken: () => null,
    origin: () => 'http://dinner.test',
  } satisfies ConnectControllerDependencies;

  return { env, storage };
}

describe('connect login — frontend application slice', () => {
  it('drives login through the real backend and production navigation to the dashboard', async () => {
    const { env, storage } = await buildSlice();

    const login = await env.frontend.open<InstanceType<typeof import('../../../src/ui/controllers/connect_auth.svelte.ts').default>>({
      page: 'login',
    });
    // The REAL auth.load.ts ran: mode derived from the production URL.
    expect(login.data.mode).toBe('login');
    expect(login.data.returnTo).toBe('/connect');

    login.input.setUsername('shavyg2');
    login.input.setPassword('a-long-password-123');
    await env.frontend.act(() => login.input.submit());

    // The response crossed the real route/schema/service graph: the
    // server-generated session id landed in frontend-owned storage.
    expect({ status: login.data.status, error: login.data.error }).toEqual({ status: 'success', error: null });
    expect(storage.get('session')).toBe('ses_fixed0001');

    // Production navigation: deps.navigate(returnTo) → aperture-resolved
    // dashboard page, whose detached initialize().refresh() fetched the
    // real executor listing (drained by settle, no sleeps).
    const dashboard = env.frontend.current();
    expect(dashboard?.identity).toBe('dashboard');
    expect((dashboard?.data as { status: string }).status).toBe('ready');
    expect((dashboard?.data as { executors: unknown[] }).executors).toEqual([]);

    expect(env.frontend.errors).toEqual([]);
    await env.verify();
    await env.dispose();
  });

  it('a wrong password surfaces the real uniform 401 as frontend error state without navigating', async () => {
    const passwordHash = await bcrypt.hash('the-actual-password', 4);
    const storage = new Map<string, string>();
    const deps: { current?: ConnectControllerDependencies } = {};
    const { default: ConnectAuthController } = await import('../../../src/ui/controllers/connect_auth.svelte.ts');

    const env = await appTest()
      .select({ client: { page: 'login' } })
      .methods([
        [ConnectAccountRepo, {
          findByUsername: control.once(control.returns(Promise.resolve(accountRow(passwordHash)))),
        }],
      ])
      .client((client) => client.functions([
        [ConnectAuthController, () => new ConnectAuthController(deps.current)],
      ]))
      .buildFrontend();
    deps.current = {
      fetch: env.fetch,
      navigate: (target: string) => env.navigator.navigate(target),
      getSessionId: () => storage.get('session') ?? null,
      setSessionId: (value: string) => void storage.set('session', value),
      clearSessionId: () => void storage.delete('session'),
      getCsrfToken: () => null,
      origin: () => 'http://dinner.test',
    };

    const login = await env.frontend.open({ page: 'login' });
    const input = login.input as { setUsername(v: string): void; setPassword(v: string): void; submit(): Promise<void> };
    input.setUsername('shavyg2');
    input.setPassword('not-the-password');
    await env.frontend.act(() => input.submit());

    const data = login.data as { status: string; error: string | null; password: string };
    expect(data.status).toBe('error');
    expect(data.error).toBeTruthy();
    expect(data.password).toBe(''); // cleared on failure — production behavior
    expect(storage.has('session')).toBe(false);
    expect(env.frontend.current()?.identity).toBe('login');
    await env.verify();
    await env.dispose();
  });

  it('opening a page outside the selected aperture fails with production identities', async () => {
    const env = await appTest()
      .select({ client: { page: 'login' } })
      .buildFrontend();
    await expect(env.frontend.open({ page: 'dashboard' })).rejects.toThrow(/available pages/);
    await env.dispose();
  });
});
