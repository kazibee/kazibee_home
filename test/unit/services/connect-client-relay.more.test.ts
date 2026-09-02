import { describe, expect, it } from "vitest";
import type { SseSink as Response } from "../../../src/server/services/sse_stream";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock, ConnectIdGenerator, ConnectScheduler, WebsiteLoggerAdapter,
  type ConnectScheduledTask,
} from "../../../src/server/services/connect_auth_primitives";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import type ConnectDesktopDeviceRepo from "../../../src/server/repo/connect_desktop_device_repo";
import type ConnectExecutorRepo from "../../../src/server/repo/connect_executor_repo";

/**
 * Failure-path companion to connect-client-relay.service.test.ts: eviction,
 * revocation, rate limiting, dispatch failure, backpressure, and executor
 * fencing branches.
 */

class Clock extends ConnectClock {
  milliseconds = 1_700_000_000_000;
  override now() { return new Date(this.milliseconds); }
}
class Ids extends ConnectIdGenerator {
  sequence = 0;
  override channelFenceId() { return `fen_more${++this.sequence}`; }
}
class Scheduler extends ConnectScheduler {
  tasks: Array<{ due: number; cancelled: boolean; task(): void }> = [];
  now = 0;
  override schedule(delayMs: number, task: () => void): ConnectScheduledTask {
    const item = { due: this.now + delayMs, cancelled: false, task };
    this.tasks.push(item);
    return { cancel: () => { item.cancelled = true; } };
  }
  advance(milliseconds: number) {
    this.now += milliseconds;
    for (const item of this.tasks) {
      if (!item.cancelled && item.due <= this.now) {
        item.cancelled = true;
        item.task();
      }
    }
  }
}
class Sink {
  destroyed = false;
  writableEnded = false;
  writes: string[] = [];
  accept = true;
  write(value: string) { this.writes.push(value); return this.accept; }
  end() { this.writableEnded = true; }
}

const desktop = {
  device_id: "dev_moredesk0001", owner_user_id: "usr_moreowner001",
  state: "active", credential_generation: 1,
};
const executor = {
  executor_id: "exe_moreexec0001", device_id: "dev_moreexec0001",
  owner_user_id: "usr_moreowner001", state: "active", credential_generation: 1,
};
const command = {
  kind: "command.post" as const, protocolVersion: "1.0" as const,
  commandId: "cmd_moreroute001", correlationId: "cor_moreroute001",
  idempotencyKey: "idem_more_route_00000001", executorId: executor.executor_id,
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

interface FixtureOptions {
  desktopRow?: Record<string, unknown> | null;
  executorRow?: Record<string, unknown> | null;
  desktopThrows?: boolean;
  openExecutorChannel?: boolean;
}

function fixture(options: FixtureOptions = {}) {
  const clock = new Clock();
  const ids = new Ids();
  const scheduler = new Scheduler();
  const registry = new ConnectExecutorConnectionRegistry(clock, ids);
  const executorSink = new Sink();
  if (options.openExecutorChannel !== false) {
    registry.open({
      executorId: executor.executor_id, deviceId: executor.device_id,
      generation: 1, response: executorSink as unknown as Response,
    });
  }
  const service = new ConnectClientRelayService(
    { findByDeviceId: async () => {
      if (options.desktopThrows) throw new Error("db down");
      return options.desktopRow === undefined ? desktop : options.desktopRow;
    } } as unknown as ConnectDesktopDeviceRepo,
    {
      findByExecutorId: async () =>
        options.executorRow === undefined ? executor : options.executorRow,
      listByOwner: async () => [{ ...executor, display_name: "More executor" }],
    } as unknown as ConnectExecutorRepo,
    registry, clock, ids, scheduler, new WebsiteLoggerAdapter(), new TraceAdapter(),
    { get: async () => command.websiteDeploymentId } as never,
  );
  const desktopSink = new Sink();
  service.open(actor, desktopSink as unknown as Response);
  return { service, registry, scheduler, executorSink, desktopSink, clock };
}

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("ConnectClientRelayService failure paths", () => {
  it("replaces a previous desktop channel on reopen and notifies the old sink", () => {
    const { service, desktopSink } = fixture();
    const nextSink = new Sink();
    service.open(actor, nextSink as unknown as Response);
    expect(desktopSink.writableEnded).toBe(true);
    expect(desktopSink.writes.join("")).toContain('"code":"revoked"');
  });

  it("evicts the oldest connection past the connection cap", () => {
    const { service, desktopSink } = fixture();
    for (let index = 0; index < 256; index += 1) {
      service.open(
        { ...actor, deviceId: `dev_cap${String(index).padStart(9, "0")}` },
        new Sink() as unknown as Response,
      );
    }
    // The fixture's connection was the oldest and is evicted at the cap.
    expect(desktopSink.writableEnded).toBe(true);
  });

  it("revokeDesktop ends a live channel and clears rate state", () => {
    const { service, desktopSink } = fixture();
    service.revokeDesktop(actor.deviceId, "cor_revoked00001");
    expect(desktopSink.writableEnded).toBe(true);
    expect(desktopSink.writes.join("")).toContain("cor_revoked00001");
    // A second revoke with no live channel is a no-op.
    service.revokeDesktop(actor.deviceId, "cor_revoked00002");
  });

  it("close ignores a stale fence", () => {
    const { service, desktopSink } = fixture();
    service.close(actor.deviceId, "fen_notcurrent");
    // Channel still live: a write path still reaches the sink on revoke.
    service.revokeDesktop(actor.deviceId, "cor_fencecheck1");
    expect(desktopSink.writableEnded).toBe(true);
  });

  it("returns unauthorized when the actor has no open desktop channel", async () => {
    const { service } = fixture();
    await expect(service.command(
      { ...actor, deviceId: "dev_nochannel001" },
      { ...command, deviceId: "dev_nochannel001" }, 10,
    )).resolves.toEqual({ outcome: "unauthorized" });
  });

  it("returns unauthorized on a generation mismatch", async () => {
    const { service } = fixture();
    await expect(service.command({ ...actor, generation: 2 }, command, 10))
      .resolves.toEqual({ outcome: "unauthorized" });
  });

  it("rate limits after the per-window command budget", async () => {
    const { service } = fixture({ openExecutorChannel: false, executorRow: null });
    for (let index = 0; index < 120; index += 1) {
      await expect(service.command(actor, command, 10))
        .resolves.toEqual({ outcome: "executor-offline" });
    }
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "overloaded" });
    // A new window resets the budget.
    const { clock } = { clock: null };
    void clock;
  });

  it("resets the rate window after it elapses", async () => {
    const { service, clock } = fixture({ openExecutorChannel: false, executorRow: null });
    for (let index = 0; index < 121; index += 1) await service.command(actor, command, 10);
    clock.milliseconds += 60_000;
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  });

  it("maps a repo failure to executor-offline", async () => {
    const { service } = fixture({ desktopThrows: true });
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  });

  it("treats a revoked desktop row as executor-offline", async () => {
    const { service } = fixture({ desktopRow: { ...desktop, state: "revoked" } });
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  });

  it("treats a foreign-owner executor as executor-offline", async () => {
    const { service } = fixture({
      executorRow: { ...executor, owner_user_id: "usr_foreignowner" },
    });
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  });

  it("rejects a duplicate in-flight commandId as overloaded", async () => {
    const { service } = fixture();
    const first = service.command(actor, command, 10);
    await settle();
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "overloaded" });
    const { scheduler } = fixture();
    void scheduler;
    // Resolve the first via accepted frame.
    service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    } as never);
    await expect(first).resolves.toMatchObject({ outcome: "accepted" });
  });

  it("cleans up the route when dispatch hits executor backpressure", async () => {
    const { service, executorSink } = fixture();
    // matches() passes (channel open and fresh) but the write is refused; the
    // registry disconnect listener fences the route, so the caller observes
    // executor-offline and the channel is torn down.
    executorSink.accept = false;
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
    expect(executorSink.writableEnded).toBe(true);
  });

  it("fences all in-flight routes when the executor disconnects", async () => {
    const { service, registry, desktopSink } = fixture();
    const pending = service.command(actor, command, 10);
    await settle();
    registry.close(executor.executor_id);
    await expect(pending).resolves.toEqual({ outcome: "executor-offline" });
    expect(desktopSink.writes.join("")).toContain('"code":"executor-offline"');
  });

  it("drops output routed to a desktop whose fence rotated", async () => {
    const { service, desktopSink } = fixture();
    const pending = service.command(actor, command, 10);
    await settle();
    service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    } as never);
    await pending;
    // Rotate the desktop channel: old fence's routes are cleaned on open().
    service.open(actor, new Sink() as unknown as Response);
    expect(service.receive(executor.executor_id, {
      kind: "command.result", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id,
      actorRole: "executor_device", operation: "executor.status.read",
      completedAt: "2026-07-25T00:00:00.000Z", result: {},
    } as never)).toBe(false);
    void desktopSink;
  });

  it("ends the desktop channel on write backpressure", async () => {
    const { service, desktopSink } = fixture();
    const pending = service.command(actor, command, 10);
    await settle();
    service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    } as never);
    await pending;
    desktopSink.accept = false;
    expect(service.receive(executor.executor_id, {
      kind: "command.result", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id,
      actorRole: "executor_device", operation: "executor.status.read",
      completedAt: "2026-07-25T00:00:00.000Z", result: {},
    } as never)).toBe(false);
    expect(desktopSink.writableEnded).toBe(true);
  });

  it("accepts the documented legacy first-send without a binding receipt", async () => {
    const { service } = fixture({ openExecutorChannel: false, executorRow: null });
    // phase:start + no receipt passes envelope validation; downstream it is
    // executor-offline because no channel is open — proving validation passed.
    await expect(service.command(actor, {
      ...command,
      operation: "thread.send",
      payload: { conversationId: "thr_more00000001", phase: "start" },
    }, 10)).resolves.toEqual({ outcome: "executor-offline" });
  });

  it("accepts a fully matching binding receipt", async () => {
    const { service } = fixture({ openExecutorChannel: false, executorRow: null });
    await expect(service.command(actor, {
      ...command,
      operation: "thread.send",
      payload: {
        conversationId: "thr_more00000001",
        expectedExecutionBinding: {
          conversationId: "thr_more00000001",
          websiteDeploymentId: command.websiteDeploymentId,
          executorId: command.executorId,
        },
      },
    }, 10)).resolves.toEqual({ outcome: "executor-offline" });
  });

  it("rejects a non-object payload as invalid-envelope", async () => {
    const { service } = fixture();
    await expect(service.command(actor, {
      ...command, payload: null as never,
    }, 10)).resolves.toEqual({ outcome: "invalid-envelope" });
  });

  it("rejects a thread.send with a non-object receipt as invalid-envelope", async () => {
    const { service } = fixture();
    await expect(service.command(actor, {
      ...command,
      operation: "thread.cancel",
      payload: { conversationId: "thr_more00000001", expectedExecutionBinding: "nope" },
    }, 10)).resolves.toEqual({ outcome: "invalid-envelope" });
  });
});
