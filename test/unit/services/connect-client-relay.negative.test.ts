/**
 * Registry-controlled companion to connect-client-relay.more.test.ts: direct
 * dispatch refusal, unrouted executor output, stale timeout races, terminal
 * versus streaming routing, and writes onto an already-ended desktop sink.
 *
 * Every subject is the real production singleton resolved from the
 * original-config root testApp (connectClientRelay module, no server, no
 * database). The actual ConnectExecutorConnectionRegistry stays in the graph:
 * only its `matches` / `dispatch` answers are pinned through singular method
 * controls (its `onDisconnect` subscription runs for real and is watched), so
 * no channel is ever opened on it. The clock/id/scheduler primitives are
 * replaced by deterministic subclasses through class replacements, the repo
 * and deployment-identity boundaries through singular method controls.
 * Helpers accept the caller-built environment and open desktop channels on
 * it; resourceCase owns environment and channel cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import type { SseSink } from "../../../src/server/services/sse_stream";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import ConnectExecutorConnectionRegistry, {
  type ExecutorDispatchResult,
} from "../../../src/server/services/connect_executor_connection_registry";
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
/** The slice of a resourceCase scope the channel helper needs. */
interface Cleanup {
  own<T extends { dispose(): unknown }>(resource: T, owner?: string): T;
}

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
class Sink implements SseSink {
  writableEnded = false;
  writes: string[] = [];
  accept = true;
  write(value: string) { this.writes.push(value); return this.accept; }
  end() { this.writableEnded = true; }
  onClose() {}
}

const T0 = "2026-01-01T00:00:00.000Z";
const desktop: ConnectDesktopDevice = {
  device_id: "dev_negadesk0001", owner_user_id: "usr_negaowner001",
  display_name: "Negative desktop", platform: "macos", architecture: "arm64",
  desktop_version: "1.0.0", key_fingerprint: "b".repeat(64),
  state: "active", credential_generation: 1,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
const executor: ConnectExecutor = {
  executor_id: "exe_negaexec0001", device_id: "dev_negaexec0001",
  owner_user_id: "usr_negaowner001", display_name: "Negative executor",
  platform: "macos", architecture: "arm64", executor_version: "1.0.0",
  key_fingerprint: "a".repeat(64), state: "active", credential_generation: 1,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
const command: ClientCommandFrame = {
  kind: "command.post", protocolVersion: "1.0",
  commandId: "cmd_negaroute001", correlationId: "cor_negaroute001",
  idempotencyKey: "idem_nega_route_00000001", executorId: executor.executor_id,
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
  kind: "command.result", protocolVersion: "1.0",
  commandId: command.commandId, correlationId: command.correlationId,
  executorId: executor.executor_id, actorRole: "executor_device",
  completedAt: "2026-07-25T00:00:00.000Z", result: {},
};

// Repo / deployment-identity boundaries plus the registry's pinned answers: a
// reusable replacement description (singular method controls on the actual
// tokens), not an application constructor.
const boundaries = (options: { dispatchOk?: boolean } = {}) => {
  const dispatched: ExecutorDispatchResult = options.dispatchOk === false
    ? { ok: false, reason: "backpressure" } : { ok: true };
  return testStub()
    .method(ConnectDesktopDeviceRepo, "findByDeviceId", control.returns(Promise.resolve(desktop)))
    .method(ConnectExecutorRepo, "findByExecutorId", control.returns(Promise.resolve(executor)))
    .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.returns(Promise.resolve({
      website_deployment_id: command.websiteDeploymentId, created_at: T0,
    })))
    .method(ConnectExecutorConnectionRegistry, "onDisconnect", control.watch())
    .method(ConnectExecutorConnectionRegistry, "matches", control.returns(true))
    .method(ConnectExecutorConnectionRegistry, "dispatch", control.returns(dispatched));
};

// The real subjects resolved from the caller-built root (never constructed here).
async function subjects(env: AppEnv) {
  const service = await env.get<ConnectClientRelayService>(ConnectClientRelayService);
  const scheduler = await env.get<Scheduler>(ConnectScheduler);
  return { service, scheduler };
}
// The desktop channel helper registers its cleanup on the case scope before any assertion.
function openDesktop(scope: Cleanup, service: ConnectClientRelayService, subject: DesktopRelayActor = actor) {
  const sink = new Sink();
  const fence = service.open(subject, sink);
  scope.own({ dispose: () => service.close(subject.deviceId, fence) }, "desktop-channel");
  return sink;
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("ConnectClientRelayService negative routing paths", () => {
  it("resolves with the registry refusal reason when dispatch is refused", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries({ dispatchOk: false }))
      .build());
    const { service, scheduler } = await subjects(env);
    openDesktop(scope, service);
    await expect(service.command(actor, command, 10))
      .resolves.toEqual({ outcome: "backpressure" });
    // The pending accept was cancelled with the route.
    expect(scheduler.tasks[0]?.cancelled).toBe(true);
    // The route is gone: a late acceptance is refused.
    expect(service.receive(executor.executor_id, accepted)).toBe(false);
  }));

  it("ignores channel frames and logs unrouted executor output", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service } = await subjects(env);
    openDesktop(scope, service);
    expect(service.receive(executor.executor_id, {
      kind: "channel.hello", protocolVersion: "1.0", correlationId: "cor_negahello001",
    })).toBe(false);
    expect(service.receive(executor.executor_id, {
      kind: "channel.heartbeat", protocolVersion: "1.0", correlationId: "cor_negahello001",
    })).toBe(false);
    expect(service.receive(executor.executor_id, { ...result, commandId: undefined }))
      .toBe(false);
  }));

  it("ignores a timeout that fires after its pending accept was resolved", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service, scheduler } = await subjects(env);
    openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
    // Simulate the scheduled timeout firing despite cancellation: the guard
    // finds no pending accept for the command and does nothing.
    expect(scheduler.tasks).toHaveLength(1);
    scheduler.tasks[0]!.task();
    expect(service.receive(executor.executor_id, { ...result }))
      .toBe(true);
  }));

  it("fences only the disconnecting executor's routes", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service } = await subjects(env);
    const desktopSink = openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    service.fenceExecutor("exe_negaother001");
    // The route survived the foreign fence.
    expect(desktopSink.writes.join("")).not.toContain("executor-offline");
    service.fenceExecutor(executor.executor_id);
    await expect(pending).resolves.toEqual({ outcome: "executor-offline" });
    expect(desktopSink.writes.join("")).toContain("executor-offline");
  }));

  it("keeps the route across streaming output and removes it on terminal output", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service } = await subjects(env);
    const desktopSink = openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await pending;
    expect(service.receive(executor.executor_id, {
      kind: "executor.event", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id, sequence: 1,
    })).toBe(true);
    expect(service.receive(executor.executor_id, {
      kind: "events.replay.gap", protocolVersion: "1.0", commandId: command.commandId,
      correlationId: command.correlationId, executorId: executor.executor_id,
    })).toBe(true);
    // Terminal output removed the route.
    expect(service.receive(executor.executor_id, { ...result })).toBe(false);
    expect(desktopSink.writes.filter((write) => write.includes("owner.sse.event")))
      .toHaveLength(2);
  }));

  it("counts in-flight routes per device, not globally", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service } = await subjects(env);
    openDesktop(scope, service);
    const secondActor: DesktopRelayActor = { ...actor, deviceId: "dev_negadesk0002" };
    openDesktop(scope, service, secondActor);
    const first = service.command(actor, command, 10);
    await settle();
    // The second device dispatches with the first device's route in flight:
    // the per-device budget walk skips the foreign route.
    const second = service.command(secondActor, {
      ...command, commandId: "cmd_negaroute002", correlationId: "cor_negaroute002",
      deviceId: secondActor.deviceId,
    }, 10);
    await settle();
    expect(service.receive(executor.executor_id, {
      ...accepted, commandId: "cmd_negaroute002", correlationId: "cor_negaroute002",
    })).toBe(true);
    await expect(second).resolves.toMatchObject({ outcome: "accepted" });
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await expect(first).resolves.toMatchObject({ outcome: "accepted" });
  }));

  it("tears the channel down when routing onto an already-ended sink", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .build());
    const { service } = await subjects(env);
    const desktopSink = openDesktop(scope, service);
    const pending = service.command(actor, command, 10);
    await settle();
    expect(service.receive(executor.executor_id, accepted)).toBe(true);
    await pending;
    desktopSink.writableEnded = true;
    expect(service.receive(executor.executor_id, { ...result })).toBe(false);
    // The dead channel and its routes are gone.
    expect(service.receive(executor.executor_id, { ...result })).toBe(false);
  }));
});
