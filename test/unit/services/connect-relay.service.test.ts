import { describe, expect, it, vi } from "vitest";
import ConnectRelayService from "../../../src/server/services/connect_relay_service";
import type ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import type ConnectExecutorRepo from "../../../src/server/repo/connect_executor_repo";
import type ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import { ConnectClock } from "../../../src/server/services/connect_auth_primitives";
import type { SseSink as Response } from "../../../src/server/services/sse_stream";

/**
 * ConnectRelayService with faked collaborators: presence bookkeeping for
 * channel frames, client fan-out for output frames, and registry delegation.
 */

class Clock extends ConnectClock {
  override now() { return new Date(1_700_000_000_000); }
}

const actor = {
  role: "executor_device" as const, executorId: "exe_relaysvc001",
  deviceId: "dev_relaysvc001", generation: 3,
} as never;

function fixture() {
  const registry = {
    touch: vi.fn(), hello: vi.fn(),
    open: vi.fn(() => "fen_relaysvc01"), close: vi.fn(),
    dispatch: vi.fn(() => ({ ok: true as const })),
  };
  const executors = { updatePresence: vi.fn(async () => {}) };
  const clients = { receive: vi.fn(() => true) };
  const service = new ConnectRelayService(
    registry as unknown as ConnectExecutorConnectionRegistry,
    executors as unknown as ConnectExecutorRepo,
    new Clock(),
    clients as unknown as ConnectClientRelayService,
  );
  return { service, registry, executors, clients };
}

describe("ConnectRelayService", () => {
  it("acknowledges hello with presence, touch, and hello registration", async () => {
    const { service, registry, executors, clients } = fixture();
    await expect(service.receive(actor, {
      kind: "channel.hello", protocolVersion: "1.0", correlationId: "cor_relaysvc001",
    } as never)).resolves.toEqual({
      kind: "channel.ack", protocolVersion: "1.0", executorId: "exe_relaysvc001",
      acknowledgedKind: "channel.hello", correlationId: "cor_relaysvc001",
    });
    expect(executors.updatePresence).toHaveBeenCalledWith({
      executor_id: "exe_relaysvc001", device_id: "dev_relaysvc001",
      credential_generation: 3, last_seen_at: "2023-11-14T22:13:20.000Z",
    });
    expect(registry.touch).toHaveBeenCalledWith("exe_relaysvc001", 3);
    expect(registry.hello).toHaveBeenCalledWith("exe_relaysvc001", 3, "cor_relaysvc001");
    expect(clients.receive).not.toHaveBeenCalled();
  });

  it("acknowledges heartbeat without a hello registration", async () => {
    const { service, registry, executors } = fixture();
    await expect(service.receive(actor, {
      kind: "channel.heartbeat", protocolVersion: "1.0", correlationId: "cor_relaysvc002",
    } as never)).resolves.toMatchObject({ acknowledgedKind: "channel.heartbeat" });
    expect(executors.updatePresence).toHaveBeenCalledTimes(1);
    expect(registry.hello).not.toHaveBeenCalled();
  });

  it("routes output frames to the client relay and answers nothing", async () => {
    const { service, registry, executors, clients } = fixture();
    const frame = {
      kind: "command.result", protocolVersion: "1.0", correlationId: "cor_relaysvc003",
    } as never;
    await expect(service.receive(actor, frame)).resolves.toBeNull();
    expect(clients.receive).toHaveBeenCalledWith("exe_relaysvc001", frame);
    expect(executors.updatePresence).not.toHaveBeenCalled();
    expect(registry.touch).not.toHaveBeenCalled();
  });

  it("delegates open, close, and dispatch to the connection registry", () => {
    const { service, registry } = fixture();
    const response = {} as Response;
    expect(service.open(actor, response)).toBe("fen_relaysvc01");
    expect(registry.open).toHaveBeenCalledWith(expect.objectContaining({
      executorId: "exe_relaysvc001", response,
    }));
    service.close("exe_relaysvc001", "fen_relaysvc01");
    expect(registry.close).toHaveBeenCalledWith("exe_relaysvc001", "fen_relaysvc01");
    const inbound = { kind: "command.post" } as never;
    expect(service.dispatch("exe_relaysvc001", inbound)).toEqual({ ok: true });
    expect(registry.dispatch).toHaveBeenCalledWith("exe_relaysvc001", inbound);
  });
});
