import { describe, expect, it, vi } from "vitest";
import type { SseSink as Response } from "../../../src/server/services/sse_stream";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import type ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock, ConnectIdGenerator, ConnectScheduler, WebsiteLoggerAdapter,
  type ConnectScheduledTask,
} from "../../../src/server/services/connect_auth_primitives";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import type ConnectDesktopDeviceRepo from "../../../src/server/repo/connect_desktop_device_repo";
import type ConnectExecutorRepo from "../../../src/server/repo/connect_executor_repo";

/**
 * Registry-faked companion to connect-client-relay.more.test.ts: direct
 * dispatch refusal, unrouted executor output, stale timeout races, terminal
 * versus streaming routing, and writes onto an already-ended desktop sink.
 */

class Clock extends ConnectClock {
  milliseconds = 1_700_000_000_000;
  override now() { return new Date(this.milliseconds); }
}
class Ids extends ConnectIdGenerator {
  sequence = 0;
  override channelFenceId() { return `fen_negative${++this.sequence}`; }
}
class Scheduler extends ConnectScheduler {
  tasks: Array<{ cancelled: boolean; task(): void }> = [];
  override schedule(_delayMs: number, task: () => void): ConnectScheduledTask {
    const item = { cancelled: false, task };
    this.tasks.push(item);
    return { cancel: () => { item.cancelled = true; } };
  }
}
class Sink {
  writableEnded = false;
  writes: string[] = [];
  accept = true;
  write(value: string) { this.writes.push(value); return this.accept; }
  end() { this.writableEnded = true; }
}

const desktop = {
  device_id: "dev_negadesk0001", owner_user_id: "usr_negaowner001",
  state: "active", credential_generation: 1,
};
const executor = {
  executor_id: "exe_negaexec0001", device_id: "dev_negaexec0001",
  owner_user_id: "usr_negaowner001", state: "active", credential_generation: 1,
};
const command = {
  kind: "command.post" as const, protocolVersion: "1.0" as const,
  commandId: "cmd_negaroute001", correlationId: "cor_negaroute001",
  idempotencyKey: "idem_nega_route_00000001", executorId: executor.executor_id,
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  deviceId: desktop.device_id, actorRole: "desktop_device" as const,
  operation: "executor.status.read", payload: {},
};
const actor = {
  role: "desktop_device" as const, deviceId: desktop.device_id, generation: 1,
  ownerUserId: desktop.owner_user_id,
  protocolVersion: "1.0" as const, audience: "desktop-relay" as const,
  credentialState: "active" as const, expiresAt: "2099-01-01T00:00:00.000Z",
};
const accepted = {
  kind: "command.accepted" as const, protocolVersion: "1.0" as const,
  commandId: command.commandId, correlationId: command.correlationId,
  idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
};
const result = {
  kind: "command.result" as const, protocolVersion: "1.0" as const,
  commandId: command.commandId, correlationId: command.correlationId,
  executorId: executor.executor_id, actorRole: "executor_device",
  completedAt: "2026-07-25T00:00:00.000Z", result: {},
};

function fixture(options: { dispatchOk?: boolean } = {}) {
  const clock = new Clock();
  const scheduler = new Scheduler();
  const registry = {
    onDisconnect: vi.fn(),
    matches: vi.fn(() => true),
    presence: vi.fn(async () => "online" as const),
    dispatch: vi.fn(() => options.dispatchOk === false
      ? { ok: false as const, reason: "backpressure" as const } : { ok: true as const }),
  };
  const service = new ConnectClientRelayService(
    { findByDeviceId: async () => desktop } as unknown as ConnectDesktopDeviceRepo,
    { findByExecutorId: async () => executor } as unknown as ConnectExecutorRepo,
    registry as unknown as ConnectExecutorConnectionRegistry,
    clock, new Ids(), scheduler, new WebsiteLoggerAdapter(), new TraceAdapter(),
    { get: async () => command.websiteDeploymentId } as never,
  );
  const desktopSink = new Sink();
  service.open(actor, desktopSink as unknown as Response);
  return { service, registry, scheduler, desktopSink };
}

describe("ConnectClientRelayService negative routing paths", () => {
  it("resolves with the registry refusal reason when dispatch is refused", async () => {
    const { service, scheduler } = fixture({ dispatchOk: false });
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "backpressure" });
    // The pending accept was cancelled with the route.
    expect(scheduler.tasks[0]?.cancelled).toBe(true);
    // The route is gone: a late acceptance is refused.
    expect(service.receive(executor.executor_id, accepted)).toBe(false);
  });

  it("ignores channel frames and logs unrouted executor output", () => {
    const { service } = fixture();
    expect(service.receive(executor.executor_id, {
      kind: "channel.hello", protocolVersion: "1.0", correlationId: "cor_negahello001",
    } as never)).toBe(false);
    expect(service.receive(executor.executor_id, {
      kind: "channel.heartbeat", protocolVersion: "1.0", correlationId: "cor_negahello001",
    } as never)).toBe(false);
    expect(service.receive(executor.executor_id, { ...result, commandId: undefined } as never))
      .toBe(false);
  });

  it("ignores a timeout that fires after its pending accept was resolved", async () => {
    const { service, scheduler } = fixture();
    const pending = service.command(actor, command, 10);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
    // Simulate the scheduled timeout firing despite cancellation: the guard
    // finds no pending accept for the command and does nothing.
    expect(scheduler.tasks).toHaveLength(1);
    scheduler.tasks[0]!.task();
    expect(service.receive(executor.executor_id, { ...result }))
      .toBe(true);
  });

  it("fences only the disconnecting executor's routes", async () => {
    const { service, desktopSink } = fixture();
    const pending = service.command(actor, command, 10);
    await new Promise<void>((resolve) => setImmediate(resolve));
    service.fenceExecutor("exe_negaother001");
    // The route survived the foreign fence.
    expect(desktopSink.writes.join("")).not.toContain("executor-offline");
    service.fenceExecutor(executor.executor_id);
    await expect(pending).resolves.toEqual({ outcome: "executor-offline" });
    expect(desktopSink.writes.join("")).toContain("executor-offline");
  });

  it("keeps the route across streaming output and removes it on terminal output", async () => {
    const { service, desktopSink } = fixture();
    const pending = service.command(actor, command, 10);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await pending;
    expect(service.receive(executor.executor_id, {
      kind: "executor.event", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id, sequence: 1,
    } as never)).toBe(true);
    expect(service.receive(executor.executor_id, {
      kind: "events.replay.gap", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id,
    } as never)).toBe(true);
    // Terminal output removed the route.
    expect(service.receive(executor.executor_id, { ...result })).toBe(false);
    expect(desktopSink.writes.filter((write) => write.includes("owner.sse.event")))
      .toHaveLength(2);
  });

  it("counts in-flight routes per device, not globally", async () => {
    const { service } = fixture();
    const secondActor = { ...actor, deviceId: "dev_negadesk0002" };
    service.open(secondActor, new Sink() as unknown as Response);
    const first = service.command(actor, command, 10);
    await new Promise<void>((resolve) => setImmediate(resolve));
    // The second device dispatches with the first device's route in flight:
    // the per-device budget walk skips the foreign route.
    const second = service.command(secondActor, {
      ...command, commandId: "cmd_negaroute002", correlationId: "cor_negaroute002",
      deviceId: secondActor.deviceId,
    }, 10);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.receive(executor.executor_id, {
      ...accepted, commandId: "cmd_negaroute002", correlationId: "cor_negaroute002",
    })).toBe(true);
    await expect(second).resolves.toMatchObject({ outcome: "accepted" });
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await expect(first).resolves.toMatchObject({ outcome: "accepted" });
  });

  it("tears the channel down when routing onto an already-ended sink", async () => {
    const { service, desktopSink } = fixture();
    const pending = service.command(actor, command, 10);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await pending;
    desktopSink.writableEnded = true;
    expect(service.receive(executor.executor_id, { ...result })).toBe(false);
    // The dead channel and its routes are gone.
    expect(service.receive(executor.executor_id, { ...result })).toBe(false);
  });
});
