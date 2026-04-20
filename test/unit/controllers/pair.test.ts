import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PairController from '../../../src/ui/controllers/pair.svelte.ts';

describe('PairController', () => {
  let controller: PairController;

  beforeEach(() => {
    controller = new PairController();
    controller.initialize();
  });

  afterEach(() => {
    controller.destroy();
    vi.restoreAllMocks();
  });

  it('should start with idle status', () => {
    expect(controller.data.status).toBe('idle');
    expect(controller.data.pairingCode).toBeNull();
    expect(controller.data.isPolling).toBe(false);
    expect(controller.data.error).toBeNull();
  });

  it('should transition to registering on startPairing', async () => {
    // Mock fetch to return a pairing response
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceId: 'dev-123',
          deviceSecret: 'secret-abc',
          pairingCode: 'PAIR99',
        }),
      });

    vi.stubGlobal('fetch', mockFetch);

    const promise = controller.input.startPairing();

    // After the register call resolves, it should be polling
    await promise;

    expect(controller.data.status).toBe('polling');
    expect(controller.data.pairingCode).toBe('PAIR99');
    expect(controller.data.deviceId).toBe('dev-123');
    expect(controller.data.isPolling).toBe(true);
    expect(controller.data.qrValue).toContain('PAIR99');
  });

  it('should handle registration failure', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Registration failed' }),
    });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.startPairing();

    expect(controller.data.status).toBe('error');
    expect(controller.data.error).toBe('Registration failed');
  });

  it('should stop polling on stopPolling', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceId: 'dev-123',
          deviceSecret: 'secret-abc',
          pairingCode: 'PAIR99',
        }),
      });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.startPairing();
    expect(controller.data.isPolling).toBe(true);

    controller.input.stopPolling();

    expect(controller.data.isPolling).toBe(false);
    expect(controller.data.status).toBe('idle');
  });

  it('should clean up timers on destroy', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceId: 'dev-123',
          deviceSecret: 'secret-abc',
          pairingCode: 'PAIR99',
        }),
      });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.startPairing();
    expect(controller.data.isPolling).toBe(true);

    // destroy should clear the poll timer without errors
    controller.destroy();
  });

  it('should transition to paired when poll returns paired=true', async () => {
    vi.useFakeTimers();

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceId: 'dev-123',
          deviceSecret: 'secret-abc',
          pairingCode: 'PAIR99',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paired: true }),
      });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.startPairing();

    // Advance timer to trigger the poll
    await vi.advanceTimersByTimeAsync(3000);

    expect(controller.data.status).toBe('paired');
    expect(controller.data.isPolling).toBe(false);

    vi.useRealTimers();
  });
});
