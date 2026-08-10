import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectClaimController from '../../../src/ui/controllers/connect_claim.svelte.ts';
import type { ConnectControllerDependencies } from '../../../src/ui/controllers/connect_shared.ts';

const claim = {
  claimKind: 'executor' as const,
  kind: 'executor.claim.review.response',
  protocolVersion: '1.0',
  claimId: 'clm_12345678',
  status: 'pending' as const,
  displayName: 'Office Mac',
  platform: 'macos' as const,
  architecture: 'arm64' as const,
  clientVersion: '1.0.0',
  executorVersion: '1.0.0',
  keyFingerprint: 'a'.repeat(64),
  expiresAt: '2026-07-25T18:00:00.000Z',
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

describe('ConnectClaimController', () => {
  it('preserves the exact claim target when redirecting an unauthenticated user', async () => {
    const deps = dependencies(vi.fn(), null);
    const controller = new ConnectClaimController(deps);
    controller.initialize({ claimId: claim.claimId, skipInitialLoad: true });
    await controller.input.refresh();
    expect(controller.data.status).toBe('signed-out');
    expect(deps.navigate).toHaveBeenCalledWith(
      '/connect/login?returnTo=%2Fconnect%2Fclaim%2Fclm_12345678',
    );
  });

  it('loads a pending claim and owns display formatting', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, claim));
    const controller = new ConnectClaimController(dependencies(fetchMock));
    controller.initialize({ claimId: claim.claimId, skipInitialLoad: true });
    const loading = controller.input.refresh();
    expect(controller.data.status).toBe('loading');
    await loading;
    expect(controller.data.status).toBe('ready');
    expect(controller.data.claim?.status).toBe('pending');
    expect(controller.data.fingerprintLabel.split(' ')).toHaveLength(8);
    expect(fetchMock.mock.calls[0][0]).toContain(`/claims/review/${claim.claimId}?`);
  });

  it('falls back to a Desktop claim only after the executor returns canonical not-found', async () => {
    const desktop = {
      ...claim,
      kind: 'desktop.claim.review.response',
      desktopVersion: '2.0.0',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(404, {
        kind: 'error', protocolVersion: '1.0', code: 'invalid-envelope',
        message: 'Claim not found', retryable: false, correlationId: 'cor_12345678',
      }))
      .mockResolvedValueOnce(jsonResponse(200, desktop));
    const controller = new ConnectClaimController(dependencies(fetchMock));
    controller.initialize({ claimId: claim.claimId, skipInitialLoad: true });
    await controller.input.refresh();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('/v1/connect/executors/claims/review/'),
      expect.stringContaining('/v1/connect/desktops/claims/review/'),
    ]);
    expect(controller.data.claim).toMatchObject({
      claimKind: 'desktop',
      clientVersion: '2.0.0',
    });
  });

  it('does not fall back to Desktop for authentication or server failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, {
      kind: 'error', code: 'invalid-envelope', message: 'Unavailable',
    }));
    const controller = new ConnectClaimController(dependencies(fetchMock));
    controller.initialize({ claimId: claim.claimId, skipInitialLoad: true });
    await controller.input.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(controller.data.status).toBe('error');
  });

  it.each([
    ['accepted', 'accept'],
    ['denied', 'deny'],
  ] as const)('covers %s claim decisions', async (status, decision) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status }));
    const controller = new ConnectClaimController(dependencies(fetchMock));
    controller.initialize({ claim, skipInitialLoad: true });
    await controller.input.decide(decision);
    expect(controller.data.claim?.status).toBe(status);
    expect(controller.data.decisionStatus).toBe(status);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/v1/connect/executors/claims/${claim.claimId}/decision`);
    expect(init.headers['x-csrf-token']).toBe('c'.repeat(43));
    expect(JSON.parse(init.body)).toMatchObject({
      kind: 'executor.claim.decision.request',
      decision,
      sessionId: 'ses_12345678',
    });
  });

  it.each(['accepted', 'denied', 'expired'] as const)('hydrates terminal %s state without deciding', (status) => {
    const controller = new ConnectClaimController(dependencies());
    controller.initialize({ claim: { ...claim, status }, skipInitialLoad: true });
    expect(controller.data.claim?.status).toBe(status);
    expect(controller.data.status).toBe('ready');
  });

  it('covers review and decision API errors without losing claim details', async () => {
    const reviewFetch = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Request not found.' }));
    const review = new ConnectClaimController(dependencies(reviewFetch));
    review.initialize({ claimId: claim.claimId, skipInitialLoad: true });
    await review.input.refresh();
    expect(review.data.status).toBe('error');
    expect(review.data.error).toBe('Request not found.');

    const decisionFetch = vi.fn().mockResolvedValue(jsonResponse(409, { message: 'Request already decided.' }));
    const decisionController = new ConnectClaimController(dependencies(decisionFetch));
    decisionController.initialize({ claim, skipInitialLoad: true });
    await decisionController.input.decide('accept');
    expect(decisionController.data.decisionStatus).toBe('idle');
    expect(decisionController.data.claim?.displayName).toBe('Office Mac');
    expect(decisionController.data.error).toBe('Request already decided.');
  });
});
