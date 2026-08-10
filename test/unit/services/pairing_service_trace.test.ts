import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DeviceRepo from "../../../src/server/repo/device_repo";
import RelayService from "../../../src/server/services/relay_service";
import PairingService from "../../../src/server/services/pairing_service";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import { TraceProbe } from "../../helpers/trace-probe";

describe("PairingService trace metadata", () => {
  let probe: TraceProbe;

  beforeEach(() => {
    TraceAdapter.configureWebsiteProcess();
    probe = new TraceProbe();
    probe.start();
  });

  afterEach(() => {
    probe.stop();
  });

  it("never emits the generated pairing code", async () => {
    let storedPairingCode: string | null | undefined;
    const deviceRepo = {
      async createDevice(device: { pairing_code?: string | null }) {
        storedPairingCode = device.pairing_code;
      },
    } as unknown as DeviceRepo;
    const relayService = {} as RelayService;
    const service = new PairingService(
      deviceRepo,
      relayService,
      new TraceAdapter(),
    );

    const result = await service.registerDevice("test desktop", "desktop");
    await probe.flush();

    expect(result.pairingCode).toBe(storedPairingCode);
    expect(result.pairingCode).toMatch(/^[A-Z2-9]{6}$/);

    const events = probe.query({
      source: "PairingService",
      event: "register",
    });
    expect(events).toHaveLength(1);
    expect(events[0].context).not.toHaveProperty("pairingCode");
    expect(JSON.stringify(events)).not.toContain(result.pairingCode);
  });
});
