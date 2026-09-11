/**
 * Executor-authority client relay: a Desktop client reusing its machine's
 * executor credential (audience executor-relay) instead of a desktop-relay
 * credential. Covers the admission resolver, the relay service's connection
 * authority (open / command / cross-authority rejection), and executor
 * revocation fencing the client SSE + pending routes even when no executor
 * channel is connected. Every subject is the real production singleton
 * resolved from the original-config root testApp (connectClientRelay /
 * connectExecutors modules, no server, no database); repo boundaries are
 * replaced through singular method controls. resourceCase owns cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import type { CompatRequest as Request } from "@noego/dinner";
import type { SseSink } from "../../../src/server/services/sse_stream";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import ConnectExecutorService from "../../../src/server/services/connect_executor_service";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock, ConnectIdGenerator, ConnectScheduler, type ConnectScheduledTask,
} from "../../../src/server/services/connect_auth_primitives";
import ConnectDesktopDeviceRepo, {
  type ConnectDesktopDevice,
} from "../../../src/server/repo/connect_desktop_device_repo";
import ConnectDesktopCredentialRepo from "../../../src/server/repo/connect_desktop_credential_repo";
import ConnectExecutorRepo, { type ConnectExecutor } from "../../../src/server/repo/connect_executor_repo";
import ConnectExecutorCredentialRepo from "../../../src/server/repo/connect_executor_credential_repo";
import ConnectExecutorAuditRepo from "../../../src/server/repo/connect_executor_audit_repo";
import ConnectWebsiteDeploymentIdentityRepo from "../../../src/server/repo/connect_website_deployment_identity_repo";
import {
  ConnectDesktopRelayActorResolver,
  type DesktopRelayActor, type ExecutorRelayActor,
} from "../../../src/server/services/connect_desktop_actor_resolver";
import type { ClientCommandFrame } from "../../../src/server/services/connect_client_relay_request_parser";
import type { ExecutorOutboundFrame } from "../../../src/server/services/connect_relay_request_parser";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const RELAY = { server: { module: ["connectClientRelay"] } } as const;
const EXECUTORS = { server: { module: ["connectExecutors"] } } as const;

type AppEnv = Awaited<ReturnType<ReturnType<typeof testApp>["build"]>>;
interface Cleanup {
  own<T extends { dispose(): unknown }>(resource: T, owner?: string): T;
}

class Clock extends ConnectClock {
  milliseconds = 1_700_000_000_000;
  override now() { return new Date(this.milliseconds); }
}
class Ids extends ConnectIdGenerator {
  sequence = 0;
  override channelFenceId() { return `fen_auth${++this.sequence}`; }
}
class Scheduler extends ConnectScheduler {
  tasks: Array<{ due: number; cancelled: boolean; task(): void }> = [];
  now = 0;
  override schedule(delayMs: number, task: () => void): ConnectScheduledTask {
    const item = { due: this.now + delayMs, cancelled: false, task };
    this.tasks.push(item);
    return { cancel: () => { item.cancelled = true; } };
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
const OWNER = "usr_authowner001";
const TOKEN = "E".repeat(43);
/** The machine whose executor credential the Desktop client reuses. */
const source: ConnectExecutor = {
  executor_id: "exe_authsource01", device_id: "dev_authmachine1",
  owner_user_id: OWNER, display_name: "Source machine",
  platform: "macos", architecture: "arm64", executor_version: "1.0.0",
  key_fingerprint: "a".repeat(64), state: "active", credential_generation: 3,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};
/** The executor the Desktop client targets with commands. */
const target: ConnectExecutor = {
  ...source, executor_id: "exe_authtarget01", device_id: "dev_authtarget01",
  display_name: "Target executor", credential_generation: 1,
};
const executorActor: ExecutorRelayActor = {
  role: "desktop_device", deviceId: source.device_id, generation: source.credential_generation,
  ownerUserId: OWNER, protocolVersion: "1.0", audience: "executor-relay",
  credentialState: "active", executorId: source.executor_id,
};
const desktopActor: DesktopRelayActor = {
  role: "desktop_device", deviceId: source.device_id, generation: source.credential_generation,
  ownerUserId: OWNER, protocolVersion: "1.0", audience: "desktop-relay",
  credentialState: "active", expiresAt: "2099-01-01T00:00:00.000Z",
};
const command: ClientCommandFrame = {
  kind: "command.post", protocolVersion: "1.0",
  commandId: "cmd_authroute0001", correlationId: "cor_authroute0001",
  idempotencyKey: "idem_auth_route_00000001", executorId: target.executor_id,
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  deviceId: source.device_id, actorRole: "desktop_device",
  operation: "executor.status.read", payload: {},
};
const accepted: ExecutorOutboundFrame = {
  kind: "command.accepted", protocolVersion: "1.0",
  commandId: command.commandId, correlationId: command.correlationId,
  idempotencyKey: command.idempotencyKey, executorId: target.executor_id, accepted: true,
};

/** The same machine's legacy desktop-relay row, for desktop-authority cases only. */
const desktopRow: ConnectDesktopDevice = {
  device_id: source.device_id, owner_user_id: OWNER, display_name: "Source desktop",
  platform: "macos", architecture: "arm64", desktop_version: "1.0.0",
  key_fingerprint: "b".repeat(64), state: "active", credential_generation: source.credential_generation,
  created_at: T0, claimed_at: T0, updated_at: T0, last_seen_at: T0,
};

interface Rows { source?: ConnectExecutor | null; target?: ConnectExecutor | null; desktop?: boolean }
// Executor rows by id; the desktop device repo must never be consulted for an
// executor-authority client (only cases that also drive a desktop-authority
// actor opt into the desktop row).
const boundaries = (rows: Rows = {}) => testStub()
  .method(ConnectDesktopDeviceRepo, "findByDeviceId",
    rows.desktop ? control.returns(Promise.resolve(desktopRow)) : control.never())
  .method(ConnectExecutorRepo, "findByExecutorId", control.watch(() =>
    async ({ executor_id }: { executor_id: string }): Promise<ConnectExecutor | null> => {
      if (executor_id === source.executor_id) return rows.source === undefined ? source : rows.source;
      if (executor_id === target.executor_id) return rows.target === undefined ? target : rows.target;
      return null;
    }))
  .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.returns(Promise.resolve({
    website_deployment_id: command.websiteDeploymentId, created_at: T0,
  })));

async function subjects(env: AppEnv) {
  const service = await env.get<ConnectClientRelayService>(ConnectClientRelayService);
  const registry = await env.get<ConnectExecutorConnectionRegistry>(ConnectExecutorConnectionRegistry);
  return { service, registry };
}
function openTarget(scope: Cleanup, registry: ConnectExecutorConnectionRegistry) {
  const sink = new Sink();
  const fence = registry.open({
    executorId: target.executor_id, deviceId: target.device_id, generation: 1, response: sink,
  });
  scope.own({ dispose: () => registry.close(target.executor_id, fence) }, "executor-channel");
  return sink;
}
function openClient(
  scope: Cleanup, service: ConnectClientRelayService,
  actor: ExecutorRelayActor | DesktopRelayActor = executorActor, sink = new Sink(),
) {
  const fence = service.open(actor, sink);
  scope.own({ dispose: () => service.close(actor.deviceId, fence) }, "client-channel");
  return { sink, fence };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const build = (rows?: Rows) => testApp(CONFIG).select(RELAY)
  .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
  .use(boundaries(rows)).build();

describe("ConnectClientRelayService executor authority", () => {
  it("does not dispatch when revoked during asynchronous authorization", resourceCase(async (scope) => {
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => { resume = resolve; });
    const env = scope.environment(await testApp(CONFIG).select(RELAY)
      .class(ConnectClock, Clock).class(ConnectIdGenerator, Ids).class(ConnectScheduler, Scheduler)
      .use(boundaries())
      .method(ConnectExecutorRepo, "findByExecutorId", control.watch(() =>
        async ({ executor_id }: { executor_id: string }) => {
          await gate;
          return executor_id === source.executor_id ? source : target;
        })).build());
    const { service, registry } = await subjects(env);
    const targetSink = openTarget(scope, registry);
    openClient(scope, service);
    const pending = service.command(executorActor, command, 10);
    await settle();
    service.revokeExecutor(source.executor_id, "cor_authrevoke04");
    resume();
    await expect(pending).resolves.toEqual({ outcome: "unauthorized" });
    expect(targetSink.writes).toEqual([]);
    expect(service.receive(target.executor_id, accepted)).toBe(false);
  }));

  it("dispatches a command for an executor-authority client after revalidating the source machine", resourceCase(async (scope) => {
    const env = scope.environment(await build());
    const { service, registry } = await subjects(env);
    const targetSink = openTarget(scope, registry);
    openClient(scope, service);
    const pending = service.command(executorActor, command, 10);
    await settle();
    expect(targetSink.writes.join("")).toContain(command.commandId);
    expect(service.receive(target.executor_id, accepted)).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
    const looked = control.inspect(env, ConnectExecutorRepo, "findByExecutorId").calls
      .map((call) => (call.args[0] as { executor_id: string }).executor_id).sort();
    expect(looked).toEqual([source.executor_id, target.executor_id].sort());
  }));

  it.each([
    ["missing source executor", { source: null }],
    ["revoked source executor", { source: { ...source, state: "revoked" as const } }],
    ["unowned source executor", { source: { ...source, owner_user_id: null } }],
    ["source device mismatch", { source: { ...source, device_id: "dev_othermachine" } }],
    ["source generation fence", { source: { ...source, credential_generation: 4 } }],
    ["target owned by someone else", { target: { ...target, owner_user_id: "usr_foreignowner" } }],
  ])("refuses the command as executor-offline on %s", resourceCase(async (scope, _name: string, rows: Rows) => {
    const env = scope.environment(await build(rows));
    const { service, registry } = await subjects(env);
    openTarget(scope, registry);
    openClient(scope, service);
    await expect(service.command(executorActor, command, 10))
      .resolves.toEqual({ outcome: "executor-offline" });
  }));

  it("rejects a command whose actor authority differs from the open connection's", resourceCase(async (scope) => {
    const env = scope.environment(await build());
    const { service, registry } = await subjects(env);
    openTarget(scope, registry);
    // Connection opened under the executor credential; a desktop credential
    // for the same device/generation may not command through it.
    openClient(scope, service, executorActor);
    await expect(service.command(desktopActor, command, 10))
      .resolves.toEqual({ outcome: "unauthorized" });
    await expect(service.command({ ...executorActor, executorId: "exe_otherauthor1" }, command, 10))
      .resolves.toEqual({ outcome: "unauthorized" });
  }));

  it("refuses a cross-authority takeover of a live connection and keeps the original", resourceCase(async (scope) => {
    const env = scope.environment(await build({ desktop: true }));
    const { service, registry } = await subjects(env);
    openTarget(scope, registry);
    const { sink: original } = openClient(scope, service, desktopActor);
    const { sink: intruder } = openClient(scope, service, executorActor);
    expect(intruder.writableEnded).toBe(true);
    expect(intruder.writes.join("")).toContain('"code":"revoked"');
    expect(original.writableEnded).toBe(false);
    // The original desktop-authority connection still commands.
    const pending = service.command(desktopActor, command, 10);
    await settle();
    expect(service.receive(target.executor_id, accepted)).toBe(true);
    await expect(pending).resolves.toMatchObject({ outcome: "accepted" });
  }));

  it("revokeExecutor fences the client SSE and its pending routes without an executor channel", resourceCase(async (scope) => {
    const env = scope.environment(await build());
    const { service, registry } = await subjects(env);
    openTarget(scope, registry);
    const { sink } = openClient(scope, service);
    const pending = service.command(executorActor, command, 10);
    await settle();
    // The source machine's executor channel is not connected; revocation of
    // its credential must still close the client SSE and resolve the route.
    service.revokeExecutor(source.executor_id, "cor_authrevoke01");
    expect(sink.writableEnded).toBe(true);
    expect(sink.writes.join("")).toContain("cor_authrevoke01");
    expect(sink.writes.join("")).toContain('"code":"revoked"');
    await expect(pending).resolves.toEqual({ outcome: "unauthorized" });
    expect(service.receive(target.executor_id, accepted)).toBe(false);
    // A second revoke is a no-op.
    service.revokeExecutor(source.executor_id, "cor_authrevoke02");
  }));

  it("revokeExecutor also fences desktop-authority routes targeting the revoked executor", resourceCase(async (scope) => {
    const env = scope.environment(await build({ desktop: true }));
    const { service, registry } = await subjects(env);
    openTarget(scope, registry);
    const { sink } = openClient(scope, service, desktopActor);
    const pending = service.command(desktopActor, command, 10);
    await settle();
    service.revokeExecutor(target.executor_id, "cor_authrevoke03");
    await expect(pending).resolves.toEqual({ outcome: "executor-offline" });
    expect(sink.writes.join("")).toContain('"code":"executor-offline"');
    expect(sink.writableEnded).toBe(false);
  }));
});

describe("ConnectDesktopRelayActorResolver executor-relay admission", () => {
  const asReq = (rawHeaders: string[]) => ({ rawHeaders }) as unknown as Request;
  const headers = (overrides: Record<string, string> = {}) => Object.entries({
    Authorization: `Bearer ${TOKEN}`, "X-Kazi-Device-Id": source.device_id,
    "X-Kazi-Credential-Generation": String(source.credential_generation),
    "X-Kazi-Audience": "executor-relay", "X-Kazi-Protocol-Version": "1.0", ...overrides,
  }).flat();
  const credential = {
    credential_id: "cred_authsource1", executor_id: source.executor_id,
    generation: source.credential_generation, token_hash: "ignored", status: "active" as const,
    created_at: T0, revoked_at: null,
  };
  const admission = (cred: unknown = credential, row: unknown = source) => testStub()
    .method(ConnectDesktopCredentialRepo, "findByTokenHash", control.never())
    .method(ConnectDesktopDeviceRepo, "findByDeviceId", control.never())
    .method(ConnectExecutorCredentialRepo, "findByTokenHash", control.returns(Promise.resolve(cred)))
    .method(ConnectExecutorRepo, "findByExecutorId", control.returns(Promise.resolve(row)));
  const resolver = (env: AppEnv) =>
    env.get<ConnectDesktopRelayActorResolver>(ConnectDesktopRelayActorResolver);

  it("admits the current executor credential as an executor-authority desktop client", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(RELAY).use(admission()).build());
    expect(await (await resolver(env)).resolve(asReq(headers()))).toEqual({
      ok: true, actor: executorActor,
    });
  }));

  it.each([
    ["missing credential", null, source],
    ["revoked credential", { ...credential, status: "revoked" }, source],
    ["executor generation fence", credential, { ...source, credential_generation: 4 }],
    ["revoked executor", credential, { ...source, state: "revoked" }],
    ["unowned executor", credential, { ...source, owner_user_id: null }],
    ["device header mismatch", credential, { ...source, device_id: "dev_othermachine" }],
  ])("fails closed on %s", resourceCase(async (scope, _name: string, cred: unknown, row: unknown) => {
    const env = scope.environment(await testApp(CONFIG).select(RELAY).use(admission(cred, row)).build());
    expect(await (await resolver(env)).resolve(asReq(headers()))).toEqual({ ok: false });
  }));

  it("fails closed on a generation header that differs from the credential", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(RELAY).use(admission()).build());
    expect(await (await resolver(env)).resolve(asReq(headers({ "X-Kazi-Credential-Generation": "2" }))))
      .toEqual({ ok: false });
  }));

  it("rejects duplicated or malformed executor-relay headers before any lookup", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(RELAY)
      .method(ConnectExecutorCredentialRepo, "findByTokenHash", control.never())
      .method(ConnectDesktopCredentialRepo, "findByTokenHash", control.never())
      .build());
    const r = await resolver(env);
    expect(await r.resolve(asReq([...headers(), "X-Kazi-Audience", "executor-relay"]))).toEqual({ ok: false });
    expect(await r.resolve(asReq(headers({ Authorization: "Bearer " })))).toEqual({ ok: false });
    expect(await r.resolve(asReq(headers({ "X-Kazi-Protocol-Version": "1.1" })))).toEqual({ ok: false });
    expect(await r.resolve(asReq(headers({ "X-Kazi-Audience": "browser" })))).toEqual({ ok: false });
  }));
});

describe("ConnectExecutorService.revoke fences the client relay", () => {
  const returns = (value: unknown) => control.returns(Promise.resolve(value));
  it("asks the client relay to fence the revoked executor's clients", resourceCase(async () => {
    const env = await testApp(CONFIG).select(EXECUTORS)
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
        returns(source), returns({ ...source, state: "revoked", credential_generation: 4 }),
      ]))
      .method(ConnectExecutorRepo, "revokeOwned", control.once(returns(undefined)))
      .method(ConnectExecutorCredentialRepo, "revokeForExecutor", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .method(ConnectClientRelayService, "revokeExecutor", control.once(control.returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
    const result = await service.revoke(
      { role: "browser_session", userId: OWNER, sessionId: "ses_authsess0001" },
      { kind: "executor.action.request", protocolVersion: "1.0", executorId: source.executor_id,
        action: "revoke", idempotencyKey: "idem_auth_revoke_0000001", correlationId: "cor_authrevoke09" },
    );
    expect(result).toMatchObject({ outcome: "revoked" });
    expect(control.inspect(env, ConnectClientRelayService, "revokeExecutor").calls.map((call) => call.args))
      .toEqual([[source.executor_id, "cor_authrevoke09"]]);
    await env.verify();
  }));
});
