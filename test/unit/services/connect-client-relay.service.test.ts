import { describe, expect, it } from "vitest";
import type { Response } from "express";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock, ConnectIdGenerator, ConnectScheduler, WebsiteLoggerAdapter,
  type ConnectScheduledTask,
} from "../../../src/server/services/connect_auth_primitives";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import type ConnectDesktopDeviceRepo from "../../../src/server/repo/connect_desktop_device_repo";
import type ConnectExecutorRepo from "../../../src/server/repo/connect_executor_repo";

class Clock extends ConnectClock {
  milliseconds = 1_700_000_000_000;
  override now() { return new Date(this.milliseconds); }
}
class Ids extends ConnectIdGenerator {
  sequence = 0;
  override channelFenceId() { return `fen_test${++this.sequence}`; }
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
  write(value: string) { this.writes.push(value); return true; }
  end() { this.writableEnded = true; }
}

const desktop = {
  device_id: "dev_clientdesk01", owner_user_id: "usr_clientowner1",
  state: "active", credential_generation: 1,
};
const executor = {
  executor_id: "exe_clientexec01", device_id: "dev_clientexec01",
  owner_user_id: "usr_clientowner1", state: "active", credential_generation: 1,
};
const command = {
  kind: "command.post" as const, protocolVersion: "1.0" as const,
  commandId: "cmd_clientroute01", correlationId: "cor_clientroute01",
  idempotencyKey: "idem_client_route_000001", executorId: executor.executor_id,
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

function fixture() {
  const clock = new Clock();
  const ids = new Ids();
  const scheduler = new Scheduler();
  const registry = new ConnectExecutorConnectionRegistry(clock, ids);
  const executorSink = new Sink();
  const calls = { desktopLookup: 0, executorLookup: 0 };
  registry.open({
    executorId: executor.executor_id, deviceId: executor.device_id,
    generation: 1, response: executorSink as unknown as Response,
  });
  const service = new ConnectClientRelayService(
    { findByDeviceId: async () => {
      calls.desktopLookup += 1;
      return desktop;
    } } as unknown as ConnectDesktopDeviceRepo,
    {
      findByExecutorId: async () => {
        calls.executorLookup += 1;
        return executor;
      },
      listByOwner: async ({ owner_user_id }: { owner_user_id: string }) =>
        owner_user_id === desktop.owner_user_id
          ? [{ ...executor, display_name: "Client executor" }] : [],
    } as unknown as ConnectExecutorRepo,
    registry, clock, ids, scheduler, new WebsiteLoggerAdapter(), new TraceAdapter(),
    { get: async () => command.websiteDeploymentId } as never,
  );
  const desktopSink = new Sink();
  service.open(actor, desktopSink as unknown as Response);
  return { service, registry, scheduler, executorSink, desktopSink, clock, calls };
}

describe("ConnectClientRelayService", () => {
  it("projects only the authenticated Desktop owner's executors with canonical presence", async () => {
    const { service, clock } = fixture();
    await expect(service.listExecutors(actor)).resolves.toEqual([{
      executorId: executor.executor_id,
      displayName: "Client executor",
      state: "active",
      online: true,
      presence: "online",
      protocolVersion: "1.0",
    }]);
    clock.milliseconds += 46_000;
    await expect(service.listExecutors(actor)).resolves.toEqual([
      expect.objectContaining({ online: false, presence: "stale" }),
    ]);
    clock.milliseconds += 46_000;
    await expect(service.listExecutors(actor)).resolves.toEqual([
      expect.objectContaining({ online: false, presence: "offline" }),
    ]);
    await expect(service.listExecutors({ ...actor, ownerUserId: "usr_otherowner1" }))
      .resolves.toEqual([]);
  });
  it("waits for the exact acceptance and routes the terminal result only to the origin", async () => {
    const { service, executorSink, desktopSink } = fixture();
    const pending = service.command(actor, command, 123);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(executorSink.writes.join("")).toContain(command.commandId);
    expect(service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    })).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });

    expect(service.receive(executor.executor_id, {
      kind: "command.result", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id,
      actorRole: "executor_device", operation: "executor.status.read",
      completedAt: "2026-07-25T00:00:00.000Z",
      result: { state: "idle", displayName: "Executor", capabilities: [] },
    })).toBe(true);
    expect(desktopSink.writes).toHaveLength(1);
    expect(desktopSink.writes[0]).toContain('"kind":"owner.sse.event"');
    expect(service.receive(executor.executor_id, {
      kind: "error", protocolVersion: "1.0", code: "invalid-envelope",
      message: "late", retryable: false, correlationId: command.correlationId,
    })).toBe(false);
  });

  it("times out deterministically and rejects late or stale acceptance", async () => {
    const { service, scheduler } = fixture();
    const pending = service.command(actor, command, 123);
    await new Promise<void>((resolve) => setImmediate(resolve));
    scheduler.advance(5_000);
    await expect(pending).resolves.toEqual({ outcome: "accept-timeout" });
    expect(service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    })).toBe(false);
  });

  it("rejects a different Website deployment before dispatch or route registration", async () => {
    const { service, executorSink } = fixture();
    await expect(service.command(actor, {
      ...command,
      websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff",
    }, 123)).resolves.toEqual({ outcome: "website-deployment-mismatch" });
    expect(executorSink.writes).toEqual([]);

    const pending = service.command(actor, command, 123);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(executorSink.writes.join("")).toContain(command.commandId);
    expect(service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    })).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
  });

  it("rejects nested creation coordinates before rate, lookup, route, or dispatch side effects", async () => {
    const { service, executorSink, calls } = fixture();
    const create = {
      ...command,
      operation: "conversation.create" as const,
      payload: {
        clientCreationId: "ccr_service_creation_0001",
        title: "Review the current change",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_service0001",
      },
    };
    for (let index = 0; index < 121; index += 1) {
      await expect(service.command(actor, {
        ...create,
        payload: { ...create.payload, executorId: "exe_foreignexec1" },
      }, 123)).resolves.toEqual({ outcome: "invalid-envelope" });
    }
    expect(calls).toEqual({ desktopLookup: 0, executorLookup: 0 });
    expect(executorSink.writes).toEqual([]);

    await expect(service.command(actor, {
      ...create,
      payload: {
        ...create.payload,
        websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff",
      },
    }, 123)).resolves.toEqual({ outcome: "website-deployment-mismatch" });
    expect(calls).toEqual({ desktopLookup: 0, executorLookup: 0 });

    const pending = service.command(actor, create, 123);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(calls).toEqual({ desktopLookup: 1, executorLookup: 1 });
    expect(executorSink.writes.join("")).toContain(create.commandId);
    expect(service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: create.commandId, correlationId: create.correlationId,
      idempotencyKey: create.idempotencyKey, executorId: executor.executor_id, accepted: true,
    })).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
  });

  it.each([
    ["wrong receipt conversation", {
      conversationId: "thr_service0001",
      clientOperationId: "cop_service_operation_0001",
      expectedExecutionBinding: {
        conversationId: "thr_different001",
        kind: "remote",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_service0001",
      },
    }, "invalid-envelope"],
    ["wrong receipt executor", {
      conversationId: "thr_service0001",
      clientOperationId: "cop_service_operation_0001",
      expectedExecutionBinding: {
        conversationId: "thr_service0001",
        kind: "remote",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: "exe_foreignexec1",
        remoteWorkspaceId: "wrk_service0001",
      },
    }, "invalid-envelope"],
    ["wrong receipt deployment", {
      conversationId: "thr_service0001",
      clientOperationId: "cop_service_operation_0001",
      expectedExecutionBinding: {
        conversationId: "thr_service0001",
        kind: "remote",
        websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff",
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_service0001",
      },
    }, "website-deployment-mismatch"],
  ] as const)("rejects %s before relay side effects", async (_name, payload, outcome) => {
    const { service, executorSink, calls } = fixture();
    await expect(service.command(actor, {
      ...command,
      operation: "thread.retry",
      payload,
    }, 123)).resolves.toEqual({ outcome });
    expect(calls).toEqual({ desktopLookup: 0, executorLookup: 0 });
    expect(executorSink.writes).toEqual([]);
  });

  it("fences pending acceptance and routing on Desktop disconnect", async () => {
    const { service, desktopSink } = fixture();
    const fence = service.open(actor, desktopSink as unknown as Response);
    const pending = service.command(actor, command, 123);
    await new Promise<void>((resolve) => setImmediate(resolve));
    service.close(actor.deviceId, fence);
    await expect(pending).resolves.toEqual({ outcome: "unauthorized" });
    expect(service.receive(executor.executor_id, {
      kind: "command.accepted", protocolVersion: "1.0",
      commandId: command.commandId, correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
    })).toBe(false);
  });
});
