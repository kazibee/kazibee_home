/**
 * ConnectAuthController over the original-config client testApp.
 *
 * Each case opens the production login/signup page through the selected client
 * aperture: the real auth.load.ts derives mode/returnTo from the production URL
 * and the framework constructs the production controller in a client page
 * scope. The controller's only dependency is the framework-owned client
 * runtime (APP_CLIENT_RUNTIME): fetch/navigate/origin/cookie are replaced per
 * case with immutable testStub method descriptors; session storage is the
 * runtime's own, so "stores the session id" is a real storage observation.
 * SQL methods are never reached; the stack boundary keeps every build DB-free.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { APP_CLIENT_RUNTIME, type AppClientRuntime } from '@noego/app/client';
import { test as control, testStub, resourceCase, type MethodDescriptor } from '@noego/testing';
import { SqlStack } from 'sqlstack';
import Env from '../../../src/server/services/env';
import type ConnectAuthController from '../../../src/ui/controllers/connect_auth.svelte.ts';
import { CONNECT_SESSION_STORAGE_KEY, validateReturnTarget } from '../../../src/ui/controllers/connect_shared.ts';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const ORIGIN = 'https://kazibee.test';

// Each build owns its own empty stack. Unexpected SQL fails instead of opening a DB.
const boundaries = testStub()
  .function(SqlStack, () => new SqlStack())
  .function(Env, () => { const env = new Env(); env.load({}); return env; });

function jsonResponse(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const resolved = (status: number, body: object) => control.returns(Promise.resolve(jsonResponse(status, body)));

/** The controller's declared browser boundary (client owner), replaced per case. */
function dependencies(fetch: MethodDescriptor = control.never()) {
  return testStub()
    .method(APP_CLIENT_RUNTIME, 'fetch', fetch, { owner: 'client' })
    .method(APP_CLIENT_RUNTIME, 'navigate', control.returns(undefined), { owner: 'client' })
    .method(APP_CLIENT_RUNTIME, 'origin', control.returns(ORIGIN), { owner: 'client' })
    .method(APP_CLIENT_RUNTIME, 'cookie', control.returns(null), { owner: 'client' });
}

type FetchCall = readonly [string, { headers: Record<string, string>; body: string }];
const fetchCalls = (env: { client?: unknown }): FetchCall[] =>
  control.inspect(env.client, APP_CLIENT_RUNTIME, 'fetch').calls.map((call) => call.args as unknown as FetchCall);
const navigations = (env: { client?: unknown }): string[] =>
  control.inspect(env.client, APP_CLIENT_RUNTIME, 'navigate').calls.map((call) => call.args[0] as string);

describe('ConnectAuthController', () => {
  it.each(['sashaun13@gmail.com', ' SASHAUN13@GMAIL.COM '])('allows email login for %s', resourceCase(async (scope, email: string) => {
    const env = scope.environment(await testApp(CONFIG).use(boundaries)
      .use(dependencies(resolved(200, { kind: 'auth.login.response', sessionId: 'ses_12345678' })))
      .select({ server: {}, client: { path: ['/connect/login'] } })
      .build());
    const controller = await env.frontend!.open<ConnectAuthController>({ path: '/connect/login' });
    controller.input.setUsername(email);
    controller.input.setPassword('a secure password');
    await controller.input.submit();
    expect(fetchCalls(env)).toHaveLength(1);
  }));

  it('rejects signup with an unlisted email', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).use(boundaries)
      .use(dependencies())
      .select({ server: {}, client: { path: ['/connect/signup'] } })
      .build());
    const controller = await env.frontend!.open<ConnectAuthController>({ path: '/connect/signup' });
    controller.input.setUsername('new.owner');
    controller.input.setEmail('other@gmail.com');
    controller.input.setPassword('a secure password');
    controller.input.setConfirmPassword('a secure password');
    await controller.input.submit();
    expect(controller.data.status).toBe('error');
    expect(fetchCalls(env)).toHaveLength(0);
  }));

  it('validates same-origin return targets and rejects open redirects', () => {
    expect(validateReturnTarget('/connect/claim/clm_12345678?next=1', 'https://kazibee.test'))
      .toBe('/connect/claim/clm_12345678?next=1');
    expect(validateReturnTarget('https://kazibee.test/connect', 'https://kazibee.test')).toBe('/connect');
    expect(validateReturnTarget('https://evil.test/connect', 'https://kazibee.test')).toBe('/connect');
    expect(validateReturnTarget('//evil.test/connect', 'https://kazibee.test')).toBe('/connect');
    expect(validateReturnTarget('/connect\\evil', 'https://kazibee.test')).toBe('/connect');
  });

  it('owns login validation and does not send invalid credentials', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).use(boundaries)
      .use(dependencies())
      .select({ server: {}, client: { path: ['/connect/login'] } })
      .build());
    const controller = await env.frontend!.open<ConnectAuthController>({ path: '/connect/login' });
    controller.input.setUsername('ab');
    controller.input.setPassword('short');
    await controller.input.submit();
    expect(controller.data.status).toBe('error');
    expect(controller.data.error).toContain('username');
    expect(fetchCalls(env)).toHaveLength(0);
  }));

  it('logs in with the canonical envelope, stores only the session id, and preserves return target', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).use(boundaries)
      .use(dependencies(resolved(200, {
        kind: 'auth.login.response',
        sessionId: 'ses_12345678',
      })))
      .select({ server: {}, client: { path: ['/connect/login'] } })
      .build());
    const storage = (await env.client!.get<AppClientRuntime>(APP_CLIENT_RUNTIME)).storage;
    // The REAL auth.load.ts ran: returnTo derived from the production URL.
    const controller = await env.frontend!.open<ConnectAuthController>({ path: '/connect/login?returnTo=/connect/claim/clm_12345678' });
    controller.input.setUsername('Owner.Name');
    controller.input.setPassword('correct horse battery');
    await controller.input.submit();

    expect(fetchCalls(env)).toHaveLength(1);
    expect(fetchCalls(env)[0][0]).toBe('/v1/connect/auth/login');
    const request = JSON.parse(fetchCalls(env)[0][1].body);
    expect(request).toMatchObject({
      kind: 'auth.login.request',
      protocolVersion: '1.0',
      username: 'Owner.Name',
    });
    expect(request.password).toBe('correct horse battery');
    expect(storage.getItem(CONNECT_SESSION_STORAGE_KEY)).toBe('ses_12345678');
    expect(navigations(env)).toContain('/connect/claim/clm_12345678');
    expect(controller.data.password).toBe('');
  }));

  it.each(['shavyg2@gmail.com', 'sashaun13@gmail.com', ' SASHAUN13@GMAIL.COM '])('creates an account for %s without retaining the password', resourceCase(async (scope, email: string) => {
    const env = scope.environment(await testApp(CONFIG).use(boundaries)
      .use(dependencies(resolved(201, { kind: 'auth.signup.response' })))
      .select({ server: {}, client: { path: ['/connect/signup'] } })
      .build());
    const controller = await env.frontend!.open<ConnectAuthController>({ path: '/connect/signup?returnTo=/connect' });
    controller.input.setUsername('new.owner');
    controller.input.setEmail(email);
    controller.input.setPassword('a secure password');
    controller.input.setConfirmPassword('a secure password');
    await controller.input.submit();
    expect(controller.data.status).toBe('success');
    expect(controller.data.loginHref).toContain('returnTo=%2Fconnect');
    expect(controller.data.password).toBe('');
    expect(controller.data.confirmPassword).toBe('');
  }));

  it('covers password mismatch and safe API error states', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).use(boundaries)
      .use(dependencies(resolved(409, { message: 'Username is already registered.' })))
      .select({ server: {}, client: { path: ['/connect/signup'] } })
      .build());
    const controller = await env.frontend!.open<ConnectAuthController>({ path: '/connect/signup' });
    controller.input.setUsername('new.owner');
    controller.input.setEmail('shavyg2@gmail.com');
    controller.input.setPassword('a secure password');
    controller.input.setConfirmPassword('a different password');
    await controller.input.submit();
    expect(controller.data.error).toBe('Passwords do not match.');
    expect(fetchCalls(env)).toHaveLength(0);

    controller.input.setConfirmPassword('a secure password');
    await controller.input.submit();
    expect(controller.data.status).toBe('error');
    expect(controller.data.error).toBe('Username is already registered.');
    expect(controller.data.password).toBe('');
  }));
});
