import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectAuthController from '../../../src/ui/controllers/connect_auth.svelte.ts';
import { validateReturnTarget, type ConnectControllerDependencies } from '../../../src/ui/controllers/connect_shared.ts';

function jsonResponse(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dependencies(fetchMock = vi.fn()): ConnectControllerDependencies {
  return {
    fetch: fetchMock as typeof fetch,
    navigate: vi.fn(),
    getSessionId: vi.fn(() => null),
    setSessionId: vi.fn(),
    clearSessionId: vi.fn(),
    getCsrfToken: vi.fn(() => null),
    origin: vi.fn(() => 'https://kazibee.test'),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('ConnectAuthController', () => {
  it('validates same-origin return targets and rejects open redirects', () => {
    expect(validateReturnTarget('/connect/claim/clm_12345678?next=1', 'https://kazibee.test'))
      .toBe('/connect/claim/clm_12345678?next=1');
    expect(validateReturnTarget('https://kazibee.test/connect', 'https://kazibee.test')).toBe('/connect');
    expect(validateReturnTarget('https://evil.test/connect', 'https://kazibee.test')).toBe('/connect');
    expect(validateReturnTarget('//evil.test/connect', 'https://kazibee.test')).toBe('/connect');
    expect(validateReturnTarget('/connect\\evil', 'https://kazibee.test')).toBe('/connect');
  });

  it('owns login validation and does not send invalid credentials', async () => {
    const deps = dependencies();
    const controller = new ConnectAuthController(deps);
    controller.initialize({ mode: 'login' });
    controller.input.setUsername('ab');
    controller.input.setPassword('short');
    await controller.input.submit();
    expect(controller.data.status).toBe('error');
    expect(controller.data.error).toContain('username');
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('logs in with the canonical envelope, stores only the session id, and preserves return target', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      kind: 'auth.login.response',
      sessionId: 'ses_12345678',
    }));
    const deps = dependencies(fetchMock);
    const controller = new ConnectAuthController(deps);
    controller.initialize({ mode: 'login', returnTo: '/connect/claim/clm_12345678' });
    controller.input.setUsername('Owner.Name');
    controller.input.setPassword('correct horse battery');
    await controller.input.submit();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('/v1/connect/auth/login');
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toMatchObject({
      kind: 'auth.login.request',
      protocolVersion: '1.0',
      username: 'Owner.Name',
    });
    expect(request.password).toBe('correct horse battery');
    expect(deps.setSessionId).toHaveBeenCalledWith('ses_12345678');
    expect(deps.navigate).toHaveBeenCalledWith('/connect/claim/clm_12345678');
    expect(controller.data.password).toBe('');
  });

  it('creates an account and exposes a sign-in continuation without retaining the password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { kind: 'auth.signup.response' }));
    const controller = new ConnectAuthController(dependencies(fetchMock));
    controller.initialize({ mode: 'signup', returnTo: '/connect' });
    controller.input.setUsername('new.owner');
    controller.input.setPassword('a secure password');
    controller.input.setConfirmPassword('a secure password');
    await controller.input.submit();
    expect(controller.data.status).toBe('success');
    expect(controller.data.loginHref).toContain('returnTo=%2Fconnect');
    expect(controller.data.password).toBe('');
    expect(controller.data.confirmPassword).toBe('');
  });

  it('covers password mismatch and safe API error states', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(409, { message: 'Username is already registered.' }));
    const controller = new ConnectAuthController(dependencies(fetchMock));
    controller.initialize({ mode: 'signup' });
    controller.input.setUsername('new.owner');
    controller.input.setPassword('a secure password');
    controller.input.setConfirmPassword('a different password');
    await controller.input.submit();
    expect(controller.data.error).toBe('Passwords do not match.');
    expect(fetchMock).not.toHaveBeenCalled();

    controller.input.setConfirmPassword('a secure password');
    await controller.input.submit();
    expect(controller.data.status).toBe('error');
    expect(controller.data.error).toBe('Username is already registered.');
    expect(controller.data.password).toBe('');
  });
});

