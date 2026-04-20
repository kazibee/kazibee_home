import type { PageController } from '@noego/forge/client';

interface PairData {
  pairingCode: string | null;
  deviceId: string | null;
  deviceToken: string | null;
  status: 'idle' | 'registering' | 'polling' | 'paired' | 'error';
  qrValue: string | null;
  isPolling: boolean;
  error: string | null;
}

interface PairInput {
  startPairing(): Promise<void>;
  stopPolling(): void;
}

const POLL_INTERVAL_MS = 3000;

export default class PairController implements PageController<PairData, PairInput> {
  data: PairData = $state({
    pairingCode: null,
    deviceId: null,
    deviceToken: null,
    status: 'idle',
    qrValue: null,
    isPolling: false,
    error: null,
  });

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private deviceSecret: string | null = null;

  input: PairInput = {
    startPairing: async () => {
      this.data.status = 'registering';
      this.data.error = null;

      try {
        const res = await fetch('/api/pair/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Mobile Device' }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || 'Failed to register device');
        }

        const { deviceId, deviceSecret, pairingCode } = await res.json();

        this.data.pairingCode = pairingCode;
        this.data.deviceId = deviceId;
        this.deviceSecret = deviceSecret;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        this.data.qrValue = JSON.stringify({ pairingCode, server: origin });
        this.data.status = 'polling';
        this.data.isPolling = true;

        this.startPolling(deviceId, deviceSecret, pairingCode);
      } catch (e) {
        this.data.status = 'error';
        this.data.error = e instanceof Error ? e.message : 'Unknown error';
      }
    },

    stopPolling: () => {
      this.clearPollTimer();
      this.data.isPolling = false;
      if (this.data.status === 'polling') {
        this.data.status = 'idle';
      }
    },
  };

  private startPolling(deviceId: string, deviceSecret: string, pairingCode: string) {
    this.clearPollTimer();

    this.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/pair/status?pairingCode=${encodeURIComponent(pairingCode)}`, {
          headers: {
            'X-Device-Id': deviceId,
            'X-Device-Secret': deviceSecret,
          },
        });

        if (!res.ok) return;

        const body = await res.json();
        if (body.paired) {
          this.data.status = 'paired';
          this.data.isPolling = false;
          this.clearPollTimer();
        }
      } catch {
        // Silently retry on next interval
      }
    }, POLL_INTERVAL_MS);
  }

  private clearPollTimer() {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  initialize() {
    // No server-side data needed; pairing starts on user action
  }

  destroy() {
    this.clearPollTimer();
  }
}
