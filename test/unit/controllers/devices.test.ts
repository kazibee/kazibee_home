import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DevicesController from '../../../src/ui/controllers/devices.svelte.ts';

describe('DevicesController', () => {
  let controller: DevicesController;

  const mockDevices = [
    { id: 1, device_id: 'dev-1', name: 'Phone', paired_at: '2026-01-01', last_seen_at: '2026-03-23', created_at: '2026-01-01' },
    { id: 2, device_id: 'dev-2', name: 'Tablet', paired_at: '2026-02-01', last_seen_at: '2026-03-22', created_at: '2026-02-01' },
  ];

  beforeEach(() => {
    controller = new DevicesController();
  });

  afterEach(() => {
    controller.destroy();
    vi.restoreAllMocks();
  });

  it('should initialize with load data', () => {
    controller.initialize({ devices: mockDevices });

    expect(controller.data.devices).toHaveLength(2);
    expect(controller.data.devices[0].name).toBe('Phone');
    expect(controller.data.isLoading).toBe(false);
    expect(controller.data.error).toBeNull();
  });

  it('should initialize with empty devices when no load data', () => {
    controller.initialize({});

    expect(controller.data.devices).toHaveLength(0);
  });

  it('should refresh devices from server', async () => {
    controller.initialize({ devices: [] });

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ devices: mockDevices }),
    });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.refresh();

    expect(controller.data.devices).toHaveLength(2);
    expect(controller.data.isLoading).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith('/api/devices');
  });

  it('should handle refresh failure', async () => {
    controller.initialize({ devices: mockDevices });

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Server error' }),
    });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.refresh();

    expect(controller.data.error).toBe('Server error');
    expect(controller.data.isLoading).toBe(false);
  });

  it('should remove a device', async () => {
    controller.initialize({ devices: mockDevices });

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.removeDevice(1);

    expect(controller.data.devices).toHaveLength(1);
    expect(controller.data.devices[0].id).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith('/api/devices/1', { method: 'DELETE' });
  });

  it('should handle remove device failure', async () => {
    controller.initialize({ devices: mockDevices });

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Device not found' }),
    });

    vi.stubGlobal('fetch', mockFetch);

    await controller.input.removeDevice(999);

    expect(controller.data.error).toBe('Device not found');
    // Devices list should remain unchanged
    expect(controller.data.devices).toHaveLength(2);
  });
});
