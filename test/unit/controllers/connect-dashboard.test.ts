import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectDashboardController, {
  presentExecutor,
  type ExecutorSummary,
} from '../../../src/ui/controllers/connect_dashboard.svelte.ts';
import type { ConnectControllerDependencies } from '../../../src/ui/controllers/connect_shared.ts';

const online: ExecutorSummary = {
  executorId: 'exe_12345678',
  displayName: 'Office Mac',
  state: 'active',
  online: true,
  presence: 'online',
  protocolVersion: '1.0',
};

function jsonResponse(status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function dependencies(fetchMock = vi.fn(), sessionId: string | null = 'ses_12345678'): ConnectControllerDependencies {
  return {
    fetch: fetchMock as typeof fetch,
    navigate: vi.fn(),
    getSessionId: vi.fn(() => sessionId),
    setSessionId: vi.fn(),
    clearSessionId: vi.fn(),
    getCsrfToken: vi.fn(() => 'c'.repeat(43)),
    origin: vi.fn(() => 'https://kazibee.test'),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('ConnectDashboardController', () => {
  it('uses registry-supplied presence and prioritizes revoked state', () => {
    expect(presentExecutor(online).statusLabel).toBe('Online');
    expect(presentExecutor({ ...online, online: false, presence: 'offline' }).statusLabel).toBe('Offline');
    expect(presentExecutor({ ...online, online: false, presence: 'stale' }).statusLabel).toBe('Stale');
    expect(presentExecutor({ ...online, state: 'revoked', presence: 'online' })).toMatchObject({
      statusLabel: 'Revoked',
      canManage: false,
    });
  });

  it('covers loading to empty and populated list states', async () => {
    // refresh() loads executors then connections; route by URL, with the
    // executors payload changing between the first and second refresh.
    let executorCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/v1/remote-tools/connections')) {
        return jsonResponse(200, { connections: [] });
      }
      executorCalls += 1;
      return executorCalls === 1
        ? jsonResponse(200, { executors: [] })
        : jsonResponse(200, {
            executors: [
              online,
              { ...online, executorId: 'exe_abcdefgh', displayName: 'Linux', online: false, presence: 'offline' },
              { ...online, executorId: 'exe_stale123', displayName: 'Stale', online: false, presence: 'stale' },
            ],
          });
    });
    const controller = new ConnectDashboardController(dependencies(fetchMock));
    controller.initialize({ skipInitialLoad: true });
    const first = controller.input.refresh();
    expect(controller.data.status).toBe('loading');
    await first;
    expect(controller.data.status).toBe('ready');
    expect(controller.data.executors).toEqual([]);
    await controller.input.refresh();
    expect(controller.data.executors.map((item) => item.statusLabel)).toEqual(['Online', 'Offline', 'Stale']);
  });

  it('redirects signed-out and expired sessions through login', async () => {
    const missingDeps = dependencies(vi.fn(), null);
    const missing = new ConnectDashboardController(missingDeps);
    missing.initialize({ skipInitialLoad: true });
    await missing.input.refresh();
    expect(missing.data.status).toBe('signed-out');
    expect(missingDeps.navigate).toHaveBeenCalledWith('/connect/login?returnTo=%2Fconnect');

    const expiredDeps = dependencies(vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Unauthorized' })));
    const expired = new ConnectDashboardController(expiredDeps);
    expired.initialize({ skipInitialLoad: true });
    await expired.input.refresh();
    expect(expiredDeps.clearSessionId).toHaveBeenCalled();
    expect(expiredDeps.navigate).toHaveBeenCalled();
  });

  it('shows bounded list API errors and can retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { message: 'Registry unavailable.' }));
    const controller = new ConnectDashboardController(dependencies(fetchMock));
    controller.initialize({ skipInitialLoad: true });
    await controller.input.refresh();
    expect(controller.data.status).toBe('error');
    expect(controller.data.error).toBe('Registry unavailable.');
  });

  it('renames with CSRF and updates its presentation model', async () => {
    const renamed = { ...online, displayName: 'Studio Mac' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { executor: renamed }));
    const controller = new ConnectDashboardController(dependencies(fetchMock));
    controller.initialize({ executors: [online] });
    controller.input.openRename(online.executorId);
    controller.input.setRenameValue('Studio Mac');
    await controller.input.rename();
    expect(controller.data.executors[0].displayName).toBe('Studio Mac');
    expect(controller.data.renameId).toBeNull();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/v1/connect/executors/${online.executorId}/rename?`);
    expect(init.headers['x-csrf-token']).toBe('c'.repeat(43));
    const queryCorrelation = new URL(url, 'https://kazibee.test').searchParams.get('correlationId');
    expect(JSON.parse(init.body).correlationId).toBe(queryCorrelation);
  });

  it('validates rename, handles action errors, and revokes without inferring presence', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(500, { message: 'Rename failed.' }))
      .mockResolvedValueOnce(jsonResponse(200, { state: 'revoked' }));
    const controller = new ConnectDashboardController(dependencies(fetchMock));
    controller.initialize({ executors: [online] });
    controller.input.openRename(online.executorId);
    controller.input.setRenameValue('!invalid');
    await controller.input.rename();
    expect(controller.data.actionError).toContain('start with');
    expect(fetchMock).not.toHaveBeenCalled();
    controller.input.setRenameValue('Valid Name');
    await controller.input.rename();
    expect(controller.data.actionError).toBe('Rename failed.');

    controller.input.openRevoke(online.executorId);
    await controller.input.revoke();
    expect(controller.data.executors[0]).toMatchObject({
      state: 'revoked',
      online: false,
      presence: 'offline',
      statusLabel: 'Revoked',
    });
  });

  it('clears local session even when logout request fails', async () => {
    const deps = dependencies(vi.fn().mockRejectedValue(new Error('network')));
    const controller = new ConnectDashboardController(deps);
    controller.initialize({ skipInitialLoad: true });
    await controller.input.logout();
    expect(deps.clearSessionId).toHaveBeenCalled();
    expect(deps.navigate).toHaveBeenCalledWith('/connect/login?returnTo=%2Fconnect');
  });
});
