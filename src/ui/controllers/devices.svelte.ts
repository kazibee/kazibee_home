import type { PageController } from '@noego/forge/client';

interface DeviceRecord {
  id: number;
  device_id: string;
  name: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

interface DevicesData {
  devices: DeviceRecord[];
  isLoading: boolean;
  error: string | null;
}

interface DevicesInput {
  refresh(): Promise<void>;
  removeDevice(id: number): Promise<void>;
}

export default class DevicesController implements PageController<DevicesData, DevicesInput> {
  data: DevicesData = $state({
    devices: [],
    isLoading: false,
    error: null,
  });

  input: DevicesInput = {
    refresh: async () => {
      this.data.isLoading = true;
      this.data.error = null;

      try {
        const res = await fetch('/api/devices');
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || 'Failed to load devices');
        }

        const body = await res.json();
        this.data.devices = body.devices;
      } catch (e) {
        this.data.error = e instanceof Error ? e.message : 'Unknown error';
      } finally {
        this.data.isLoading = false;
      }
    },

    removeDevice: async (id: number) => {
      this.data.error = null;

      try {
        const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || 'Failed to remove device');
        }

        this.data.devices = this.data.devices.filter(d => d.id !== id);
      } catch (e) {
        this.data.error = e instanceof Error ? e.message : 'Unknown error';
      }
    },
  };

  initialize(loadData: { devices?: DeviceRecord[] }) {
    if (loadData.devices) {
      this.data.devices = loadData.devices;
    }
  }

  destroy() {
    // No cleanup needed
  }
}
