/**
 * ConnectRelayService over the original-config root testApp (connectRelay
 * module, no server, no database). The service is the real production
 * singleton resolved from the built root: the clock is replaced by a
 * deterministic subclass through a class replacement, and the registry /
 * executor repo / client relay collaborators are controlled through singular
 * method replacements on their actual tokens. Presence bookkeeping for
 * channel frames, client fan-out for output frames, and registry delegation
 * are observed through the watched method histories. resourceCase owns
 * environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import ConnectRelayService from "../../../src/server/services/connect_relay_service";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import ConnectExecutorRepo from "../../../src/server/repo/connect_executor_repo";
import ConnectClientRelayService from "../../../src/server/services/connect_client_relay_service";
import { ConnectClock } from "../../../src/server/services/connect_auth_primitives";
import type { SseSink as Response } from "../../../src/server/services/sse_stream";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["connectRelay"] } } as const;

type AppEnv = Awaited<ReturnType<ReturnType<typeof testApp>["build"]>>;

class Clock extends ConnectClock {
  override now() { return new Date(1_700_000_000_000); }
}

const actor = {
  role: "executor_device" as const, executorId: "exe_relaysvc001",
  deviceId: "dev_relaysvc001", generation: 3,
} as never;

// Collaborator boundaries: a reusable replacement description (singular
// method controls on the actual tokens), not an application constructor.
const collaborators = () => testStub()
  .method(ConnectExecutorConnectionRegistry, "touch", control.returns(undefined))
  .method(ConnectExecutorConnectionRegistry, "hello", control.returns(undefined))
  .method(ConnectExecutorConnectionRegistry, "open", control.returns("fen_relaysvc01"))
  .method(ConnectExecutorConnectionRegistry, "close", control.returns(undefined))
  .method(ConnectExecutorConnectionRegistry, "dispatch", control.returns({ ok: true as const }))
  .method(ConnectExecutorRepo, "updatePresence", control.returns(Promise.resolve(undefined)))
  .method(ConnectClientRelayService, "receive", control.returns(true));

// Recorded argument lists of one watched collaborator method.
const calls = (env: AppEnv, token: unknown, method: string) =>
  control.inspect(env, token, method).calls.map((call) => call.args);

describe("ConnectRelayService", () => {
  it("acknowledges hello with presence, touch, and hello registration", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock)
      .use(collaborators())
      .build());
    const service = await env.get<ConnectRelayService>(ConnectRelayService);
    await expect(service.receive(actor, {
      kind: "channel.hello", protocolVersion: "1.0", correlationId: "cor_relaysvc001",
    } as never)).resolves.toEqual({
      kind: "channel.ack", protocolVersion: "1.0", executorId: "exe_relaysvc001",
      acknowledgedKind: "channel.hello", correlationId: "cor_relaysvc001",
    });
    expect(calls(env, ConnectExecutorRepo, "updatePresence")).toContainEqual([{
      executor_id: "exe_relaysvc001", device_id: "dev_relaysvc001",
      credential_generation: 3, last_seen_at: "2023-11-14T22:13:20.000Z",
    }]);
    expect(calls(env, ConnectExecutorConnectionRegistry, "touch")).toContainEqual(["exe_relaysvc001", 3]);
    expect(calls(env, ConnectExecutorConnectionRegistry, "hello"))
      .toContainEqual(["exe_relaysvc001", 3, "cor_relaysvc001"]);
    expect(control.inspect(env, ConnectClientRelayService, "receive").count).toBe(0);
  }));

  it("acknowledges heartbeat without a hello registration", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock)
      .use(collaborators())
      .build());
    const service = await env.get<ConnectRelayService>(ConnectRelayService);
    await expect(service.receive(actor, {
      kind: "channel.heartbeat", protocolVersion: "1.0", correlationId: "cor_relaysvc002",
    } as never)).resolves.toMatchObject({ acknowledgedKind: "channel.heartbeat" });
    expect(control.inspect(env, ConnectExecutorRepo, "updatePresence").count).toBe(1);
    expect(control.inspect(env, ConnectExecutorConnectionRegistry, "hello").count).toBe(0);
  }));

  it("routes output frames to the client relay and answers nothing", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock)
      .use(collaborators())
      .build());
    const service = await env.get<ConnectRelayService>(ConnectRelayService);
    const frame = {
      kind: "command.result", protocolVersion: "1.0", correlationId: "cor_relaysvc003",
    } as never;
    await expect(service.receive(actor, frame)).resolves.toBeNull();
    expect(calls(env, ConnectClientRelayService, "receive")).toContainEqual(["exe_relaysvc001", frame]);
    expect(control.inspect(env, ConnectExecutorRepo, "updatePresence").count).toBe(0);
    expect(control.inspect(env, ConnectExecutorConnectionRegistry, "touch").count).toBe(0);
  }));

  it("delegates open, close, and dispatch to the connection registry", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .class(ConnectClock, Clock)
      .use(collaborators())
      .build());
    const service = await env.get<ConnectRelayService>(ConnectRelayService);
    const response = {} as Response;
    expect(service.open(actor, response)).toBe("fen_relaysvc01");
    expect(calls(env, ConnectExecutorConnectionRegistry, "open")).toContainEqual([expect.objectContaining({
      executorId: "exe_relaysvc001", response,
    })]);
    service.close("exe_relaysvc001", "fen_relaysvc01");
    expect(calls(env, ConnectExecutorConnectionRegistry, "close")).toContainEqual(["exe_relaysvc001", "fen_relaysvc01"]);
    const inbound = { kind: "command.post" } as never;
    expect(service.dispatch("exe_relaysvc001", inbound)).toEqual({ ok: true });
    expect(calls(env, ConnectExecutorConnectionRegistry, "dispatch")).toContainEqual(["exe_relaysvc001", inbound]);
  }));
});
