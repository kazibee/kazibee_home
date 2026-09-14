/**
 * ConnectClientRelayService over the original-config root testApp
 * (connectClientRelay module, no server, no database). The service, the
 * in-memory ConnectExecutorConnectionRegistry and the clock/id/scheduler
 * primitives are the real production singletons resolved from the built root:
 * the primitives are replaced by deterministic subclasses through class
 * replacements, the repo and deployment-identity boundaries through singular
 * method controls. Helpers accept the caller-built environment and open
 * channels on it; resourceCase owns environment and channel cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import type { SseSink } from "../../../src/server/services/sse_stream";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock, ConnectIdGenerator, ConnectScheduler,
  type ConnectScheduledTask,
} from "../../../src/server/services/connect_auth_primitives";
import ConnectDesktopDeviceRepo, {
  type ConnectDesktopDevice,
} from "../../../src/server/repo/connect_desktop_device_repo";
import ConnectExecutorRepo, { type ConnectExecutor } from "../../../src/server/repo/connect_executor_repo";
import ConnectWebsiteDeploymentIdentityRepo from "../../../src/server/repo/connect_website_deployment_identity_repo";
import type { DesktopRelayActor } from "../../../src/server/services/connect_desktop_actor_resolver";
import type { ClientCommandFrame } from "../../../src/server/services/connect_client_relay_request_parser";
import type { ExecutorOutboundFrame } from "../../../src/server/services/connect_relay_request_parser";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["connectClientRelay"] } } as const;

type AppEnv = Awaited<ReturnType<ReturnType<typeof testApp>["build"]>>;
/** The slice of a resourceCase scope the channel helpers need. */
interface Cleanup {
  own<T extends { dispose(): unknown }>(resource: T, owner?: string): T;
}

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
class Sink implements SseSink {
  destroyed = false;
  writableEnded = false;
  writes: string[] = [];
  write(value: string) { this.writes.push(value); return true; }
  end() { this.writableEnded = true; }
  onClose() {}
}

const T0 = "2026-01-01T00:00:00.000Z";
const desktop: ConnectDesktopDevice = {
  device_id: "dev_clientdesk01", owner_user_id: "usr_clientowner1",
  display_name: "Client desktop", platform: "macos", architecture: "arm64",
  desktop_version: "1.0.0", key_fingerprint: "b".repeat(64),
  state: "active", credential_generation: 1,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
const executor: ConnectExecutor = {
  executor_id: "exe_clientexec01", device_id: "dev_clientexec01",
  owner_user_id: "usr_clientowner1", display_name: "Client executor",
  platform: "macos", architecture: "arm64", executor_version: "1.0.0",
  key_fingerprint: "a".repeat(64), state: "active", credential_generation: 1,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
const command: ClientCommandFrame = {
  kind: "command.post", protocolVersion: "1.0",
  commandId: "cmd_clientroute01", correlationId: "cor_clientroute01",
  idempotencyKey: "idem_client_route_000001", executorId: executor.executor_id,
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  deviceId: desktop.device_id, actorRole: "desktop_device",
  operation: "executor.status.read", payload: {},
};
const actor: DesktopRelayActor = {
  role: "desktop_device", deviceId: desktop.device_id, generation: 1,
  ownerUserId: desktop.owner_user_id ?? "",
  protocolVersion: "1.0", audience: "desktop-relay",
  credentialState: "active", expiresAt: "2099-01-01T00:00:00.000Z",
};
const accepted = (frame: ClientCommandFrame): ExecutorOutboundFrame => ({
  kind: "command.accepted", protocolVersion: "1.0",
  commandId: frame.commandId, correlationId: frame.correlationId,
  idempotencyKey: frame.idempotencyKey, executorId: executor.executor_id, accepted: true,
});

// Repo / deployment-identity boundaries: a reusable replacement description
// (singular method controls on the actual tokens), not an application constructor.
const boundaries = () => testStub()
  .method(ConnectDesktopDeviceRepo, "findByDeviceId", control.returns(Promise.resolve(desktop)))
  .method(ConnectExecutorRepo, "findByExecutorId", control.returns(Promise.resolve(executor)))
  .method(ConnectExecutorRepo, "listByOwner", control.watch(() =>
    async ({ owner_user_id }: { owner_user_id: string; limit: number }): Promise<ConnectExecutor[]> =>
      owner_user_id === desktop.owner_user_id ? [executor] : []))
  .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.returns(Promise.resolve({
    website_deployment_id: command.websiteDeploymentId, created_at: T0,
  })));

// The real subjects resolved from the caller-built root (never constructed here).
async function subjects(env: AppEnv) {
  const service = await env.get<ConnectClientRelayService>(ConnectClientRelayService);
  const registry = await env.get<ConnectExecutorConnectionRegistry>(ConnectExecutorConnectionRegistry);
  const clock = await env.get<Clock>(ConnectClock);
  const scheduler = await env.get<Scheduler>(ConnectScheduler);
  return { service, registry, clock, scheduler };
}
// Repo lookup counts observed through the watched method histories.
const lookups = (env: AppEnv) => ({
  desktopLookup: control.inspect(env, ConnectDesktopDeviceRepo, "findByDeviceId").calls.length,
  executorLookup: control.inspect(env, ConnectExecutorRepo, "findByExecutorId").calls.length,
});
// Channel helpers register their cleanup on the case scope before any assertion.
function openExecutor(scope: Cleanup, registry: ConnectExecutorConnectionRegistry) {
  const sink = new Sink();
  const fence = registry.open({
    executorId: executor.executor_id, deviceId: executor.device_id, generation: 1, response: sink,
  });
  scope.own({ dispose: () => registry.close(executor.executor_id, fence) }, "executor-channel");
  return sink;
}
function openDesktop(scope: Cleanup, service: ConnectClientRelayService, sink = new Sink()) {
  const fence = service.open(actor, sink);
  scope.own({ dispose: () => service.close(actor.deviceId, fence) }, "desktop-channel");
  return { sink, fence };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("ConnectClientRelayService", () => {
  it("projects only the authenticated Desktop owner's executors with canonical presence", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry, clock } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
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
  }));

  it("waits for the exact acceptance and routes the terminal result only to the origin", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    const executorSink = openExecutor(scope, registry);
    const { sink: desktopSink } = openDesktop(scope, service);
    const pending = service.command(actor, command, 123);
    await settle();
    expect(executorSink.writes.join("")).toContain(command.commandId);
    expect(service.receive(executor.executor_id, accepted(command))).toBe(true);
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
  }));

  it("times out deterministically and rejects late or stale acceptance", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry, scheduler } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    const pending = service.command(actor, command, 123);
    await settle();
    scheduler.advance(5_000);
    await expect(pending).resolves.toEqual({ outcome: "accept-timeout" });
    expect(service.receive(executor.executor_id, accepted(command))).toBe(false);
  }));

  it("rejects a different Website deployment before dispatch or route registration", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    const executorSink = openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(actor, {
      ...command,
      websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff",
    }, 123)).resolves.toEqual({ outcome: "website-deployment-mismatch" });
    expect(executorSink.writes).toEqual([]);

    const pending = service.command(actor, command, 123);
    await settle();
    expect(executorSink.writes.join("")).toContain(command.commandId);
    expect(service.receive(executor.executor_id, accepted(command))).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
  }));

  it("rejects nested creation coordinates before rate, lookup, route, or dispatch side effects", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    const executorSink = openExecutor(scope, registry);
    openDesktop(scope, service);
    const create: ClientCommandFrame = {
      ...command,
      operation: "conversation.create",
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
    expect(lookups(env)).toEqual({ desktopLookup: 0, executorLookup: 0 });
    expect(executorSink.writes).toEqual([]);

    await expect(service.command(actor, {
      ...create,
      payload: {
        ...create.payload,
        websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff",
      },
    }, 123)).resolves.toEqual({ outcome: "website-deployment-mismatch" });
    expect(lookups(env)).toEqual({ desktopLookup: 0, executorLookup: 0 });

    const pending = service.command(actor, create, 123);
    await settle();
    expect(lookups(env)).toEqual({ desktopLookup: 1, executorLookup: 1 });
    expect(executorSink.writes.join("")).toContain(create.commandId);
    expect(service.receive(executor.executor_id, accepted(create))).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
  }));

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
  ] as const)("rejects %s before relay side effects", resourceCase(async (
    scope, _name: string, payload: Record<string, unknown>,
    outcome: "invalid-envelope" | "website-deployment-mismatch",
  ) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    const executorSink = openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(actor, {
      ...command,
      operation: "thread.retry",
      payload,
    }, 123)).resolves.toEqual({ outcome });
    expect(lookups(env)).toEqual({ desktopLookup: 0, executorLookup: 0 });
    expect(executorSink.writes).toEqual([]);
  }));

  it("fences pending acceptance and routing on Desktop disconnect", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const { sink: desktopSink } = openDesktop(scope, service);
    // Reopen on the same sink: the current fence is the one the case closes.
    const { fence } = openDesktop(scope, service, desktopSink);
    const pending = service.command(actor, command, 123);
    await settle();
    service.close(actor.deviceId, fence);
    await expect(pending).resolves.toEqual({ outcome: "unauthorized" });
    expect(service.receive(executor.executor_id, accepted(command))).toBe(false);
  }));
});
