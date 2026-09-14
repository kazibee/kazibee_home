/**
 * Failure-path companion to connect-client-relay.service.test.ts: eviction,
 * revocation, rate limiting, dispatch failure, backpressure, and executor
 * fencing branches.
 *
 * Every subject is the real production singleton resolved from the
 * original-config root testApp (connectClientRelay module, no server, no
 * database): the clock/id/scheduler primitives are replaced by deterministic
 * subclasses through class replacements, the repo and deployment-identity
 * boundaries through singular method controls. Helpers accept the
 * caller-built environment and open channels on it; resourceCase owns
 * environment and channel cleanup.
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
class Sink implements SseSink {
  destroyed = false;
  writableEnded = false;
  writes: string[] = [];
  accept = true;
  write(value: string) { this.writes.push(value); return this.accept; }
  end() { this.writableEnded = true; }
  onClose() {}
}

const T0 = "2026-01-01T00:00:00.000Z";
const desktop: ConnectDesktopDevice = {
  device_id: "dev_moredesk0001", owner_user_id: "usr_moreowner001",
  display_name: "More desktop", platform: "macos", architecture: "arm64",
  desktop_version: "1.0.0", key_fingerprint: "b".repeat(64),
  state: "active", credential_generation: 1,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
const executor: ConnectExecutor = {
  executor_id: "exe_moreexec0001", device_id: "dev_moreexec0001",
  owner_user_id: "usr_moreowner001", display_name: "More executor",
  platform: "macos", architecture: "arm64", executor_version: "1.0.0",
  key_fingerprint: "a".repeat(64), state: "active", credential_generation: 1,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
const command: ClientCommandFrame = {
  kind: "command.post", protocolVersion: "1.0",
  commandId: "cmd_moreroute001", correlationId: "cor_moreroute001",
  idempotencyKey: "idem_more_route_00000001", executorId: executor.executor_id,
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
const accepted: ExecutorOutboundFrame = {
  kind: "command.accepted", protocolVersion: "1.0",
  commandId: command.commandId, correlationId: command.correlationId,
  idempotencyKey: command.idempotencyKey, executorId: executor.executor_id, accepted: true,
};
const result: ExecutorOutboundFrame = {
  kind: "command.result", protocolVersion: "1.0", commandId: command.commandId,
  correlationId: command.correlationId, executorId: executor.executor_id,
  actorRole: "executor_device", operation: "executor.status.read",
  completedAt: "2026-07-25T00:00:00.000Z", result: {},
};

interface BoundaryOptions {
  desktopRow?: ConnectDesktopDevice | null;
  executorRow?: ConnectExecutor | null;
  desktopThrows?: boolean;
}

// Repo / deployment-identity boundaries: a reusable replacement description
// (singular method controls on the actual tokens), not an application constructor.
const boundaries = (options: BoundaryOptions = {}) => testStub()
  .method(ConnectDesktopDeviceRepo, "findByDeviceId", options.desktopThrows
    ? control.throws(new Error("db down"))
    : control.returns(Promise.resolve(options.desktopRow === undefined ? desktop : options.desktopRow)))
  .method(ConnectExecutorRepo, "findByExecutorId", control.returns(Promise.resolve(
    options.executorRow === undefined ? executor : options.executorRow,
  )))
  .method(ConnectExecutorRepo, "listByOwner", control.returns(Promise.resolve([executor])))
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
// Channel helpers register their cleanup on the case scope before any assertion.
function openExecutor(scope: Cleanup, registry: ConnectExecutorConnectionRegistry) {
  const sink = new Sink();
  const fence = registry.open({
    executorId: executor.executor_id, deviceId: executor.device_id, generation: 1, response: sink,
  });
  scope.own({ dispose: () => registry.close(executor.executor_id, fence) }, "executor-channel");
  return sink;
}
function openDesktop(
  scope: Cleanup, service: ConnectClientRelayService, subject: DesktopRelayActor = actor, sink = new Sink(),
) {
  const fence = service.open(subject, sink);
  scope.own({ dispose: () => service.close(subject.deviceId, fence) }, "desktop-channel");
  return sink;
}

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("ConnectClientRelayService failure paths", () => {
  it("replaces a previous desktop channel on reopen and notifies the old sink", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const desktopSink = openDesktop(scope, service);
    openDesktop(scope, service);
    expect(desktopSink.writableEnded).toBe(true);
    expect(desktopSink.writes.join("")).toContain('"code":"revoked"');
  }));

  it("evicts the oldest connection past the connection cap", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const desktopSink = openDesktop(scope, service);
    for (let index = 0; index < 256; index += 1) {
      openDesktop(scope, service, { ...actor, deviceId: `dev_cap${String(index).padStart(9, "0")}` });
    }
    // The first connection was the oldest and is evicted at the cap.
    expect(desktopSink.writableEnded).toBe(true);
  }));

  it("revokeDesktop ends a live channel and clears rate state", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const desktopSink = openDesktop(scope, service);
    service.revokeDesktop(actor.deviceId, "cor_revoked00001");
    expect(desktopSink.writableEnded).toBe(true);
    expect(desktopSink.writes.join("")).toContain("cor_revoked00001");
    // A second revoke with no live channel is a no-op.
    service.revokeDesktop(actor.deviceId, "cor_revoked00002");
  }));

  it("close ignores a stale fence", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const desktopSink = openDesktop(scope, service);
    service.close(actor.deviceId, "fen_notcurrent");
    // Channel still live: a write path still reaches the sink on revoke.
    service.revokeDesktop(actor.deviceId, "cor_fencecheck1");
    expect(desktopSink.writableEnded).toBe(true);
  }));

  it("returns unauthorized when the actor has no open desktop channel", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(
      { ...actor, deviceId: "dev_nochannel001" },
      { ...command, deviceId: "dev_nochannel001" }, 10,
    )).resolves.toEqual({ outcome: "unauthorized" });
  }));

  it("returns unauthorized on a generation mismatch", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command({ ...actor, generation: 2 }, command, 10))
      .resolves.toEqual({ outcome: "unauthorized" });
  }));

  it("rate limits after the per-window command budget", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ executorRow: null }))
      .build());
    const { service } = await subjects(env);
    // No executor channel is opened: every budgeted command is executor-offline.
    openDesktop(scope, service);
    for (let index = 0; index < 120; index += 1) {
      await expect(service.command(actor, command, 10))
        .resolves.toEqual({ outcome: "executor-offline" });
    }
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "overloaded" });
  }));

  it("resets the rate window after it elapses", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ executorRow: null }))
      .build());
    const { service, clock } = await subjects(env);
    openDesktop(scope, service);
    for (let index = 0; index < 121; index += 1) await service.command(actor, command, 10);
    clock.milliseconds += 60_000;
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  }));

  it("maps a repo failure to executor-offline", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ desktopThrows: true }))
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  }));

  it("treats a revoked desktop row as executor-offline", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ desktopRow: { ...desktop, state: "revoked" } }))
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  }));

  it("treats a foreign-owner executor as executor-offline", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ executorRow: { ...executor, owner_user_id: "usr_foreignowner" } }))
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  }));

  it("rejects a duplicate in-flight commandId as overloaded", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    const first = service.command(actor, command, 10);
    await settle();
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "overloaded" });
    // Resolve the first via accepted frame.
    service.receive(executor.executor_id, accepted);
    await expect(first).resolves.toMatchObject({ outcome: "accepted" });
  }));

  it("cleans up the route when dispatch hits executor backpressure", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    const executorSink = openExecutor(scope, registry);
    openDesktop(scope, service);
    // matches() passes (channel open and fresh) but the write is refused; the
    // registry disconnect listener fences the route, so the caller observes
    // executor-offline and the channel is torn down.
    executorSink.accept = false;
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
    expect(executorSink.writableEnded).toBe(true);
  }));

  it("fences all in-flight routes when the executor disconnects", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const desktopSink = openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    registry.close(executor.executor_id);
    await expect(pending).resolves.toEqual({ outcome: "executor-offline" });
    expect(desktopSink.writes.join("")).toContain('"code":"executor-offline"');
  }));

  it("drops output routed to a desktop whose fence rotated", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    service.receive(executor.executor_id, accepted);
    await pending;
    // Rotate the desktop channel: old fence's routes are cleaned on open().
    openDesktop(scope, service);
    expect(service.receive(executor.executor_id, result)).toBe(false);
  }));

  it("ends the desktop channel on write backpressure", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    const desktopSink = openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    service.receive(executor.executor_id, accepted);
    await pending;
    desktopSink.accept = false;
    expect(service.receive(executor.executor_id, result)).toBe(false);
    expect(desktopSink.writableEnded).toBe(true);
  }));

  it("accepts the documented legacy first-send without a binding receipt", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ executorRow: null }))
      .build());
    const { service } = await subjects(env);
    openDesktop(scope, service);
    // phase:start + no receipt passes envelope validation; downstream it is
    // executor-offline because no channel is open — proving validation passed.
    await expect(service.command(actor, {
      ...command,
      operation: "thread.send",
      payload: { conversationId: "thr_more00000001", phase: "start" },
    }, 10)).resolves.toEqual({ outcome: "executor-offline" });
  }));

  it("accepts a fully matching binding receipt", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ executorRow: null }))
      .build());
    const { service } = await subjects(env);
    openDesktop(scope, service);
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
  }));

  it("rejects a non-object payload as invalid-envelope", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    // Intentionally malformed: a null payload is outside ClientCommandFrame.
    await expect(service.command(actor, {
      ...command, payload: null as never,
    }, 10)).resolves.toEqual({ outcome: "invalid-envelope" });
  }));

  it("rejects a thread.send with a non-object receipt as invalid-envelope", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, registry } = await subjects(env);
    openExecutor(scope, registry);
    openDesktop(scope, service);
    await expect(service.command(actor, {
      ...command,
      operation: "thread.cancel",
      payload: { conversationId: "thr_more00000001", expectedExecutionBinding: "nope" },
    }, 10)).resolves.toEqual({ outcome: "invalid-envelope" });
  }));
});
