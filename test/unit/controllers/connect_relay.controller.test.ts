/**
 * Executor relay controller driven directly against the production
 * controller resolved from root testApp over the original configuration
 * (../../../noego.config.yml): the real parser runs; the device auth
 * verifier and logic are replaced through singular .method controls. Covers
 * header fencing, identity cross-checks, frame validation, and the
 * ack/no-content split. resourceCase owns environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { test as control, testStub, resourceCase, type TestResourceScope } from "@noego/testing";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectRelayController from "../../../src/server/controller/connect_relay.controller";
import ConnectRelayLogic from "../../../src/server/logic/connect_relay.logic";
import { ConnectExecutorDeviceAuthVerifier } from "../../../src/server/services/connect_executor_actor_resolver";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

const actor = {
  role: "executor_device" as const, executorId: "exe_relayctrl01",
  deviceId: "dev_relayctrl01", generation: 1,
};
const headers = [
  "Authorization", `Bearer ${"a".repeat(43)}`,
  "X-Kazi-Executor-Id", actor.executorId,
  "X-Kazi-Device-Id", actor.deviceId,
  "X-Kazi-Credential-Generation", "1",
  "X-Kazi-Audience", "executor-relay",
  "X-Kazi-Protocol-Version", "1.0",
];
const hello = {
  kind: "channel.hello", protocolVersion: "1.0", executorId: actor.executorId,
  deviceId: actor.deviceId, actorRole: "executor_device",
  correlationId: "cor_relayctrl01",
};

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    end() { this.ended = true; return this; },
  };
  return res as typeof res & Response;
}
function requestFor(rawHeaders: string[], body?: unknown): Request {
  return { rawHeaders, body } as unknown as Request;
}

// Reusable replacement descriptions (immutable), not application constructors.
const auth = (verifiedActor: Record<string, unknown> | null = actor) => testStub()
  .method(ConnectExecutorDeviceAuthVerifier, "verify", control.returns(
    Promise.resolve(verifiedActor ? { ok: true, actor: verifiedActor } : { ok: false }),
  ));
// The hello/heartbeat acknowledgement the faked logic answered before; output
// frames are answered with null per case.
const ack = (kind: string) => ({ kind: "channel.ack", acknowledgedKind: kind });
const logic = (receive: unknown) => testStub()
  .method(ConnectRelayLogic, "receive", control.returns(Promise.resolve(receive)))
  .method(ConnectRelayLogic, "open", control.returns("fen_relayctrl01"));

describe("ConnectRelayController.post", () => {
  it("acknowledges a hello frame from a verified executor", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth()).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.post({ req: requestFor(headers, hello), res });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ kind: "channel.ack" });
    expect(res.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(control.inspect(env, ConnectRelayLogic, "receive").count).toBeGreaterThan(0);
  }));

  it("answers 204 for an output frame the logic does not acknowledge", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth()).use(logic(null)).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.post({
      req: requestFor(headers, {
        kind: "executor.event", protocolVersion: "1.0", executorId: actor.executorId,
        eventId: "evt_relayctrl01", correlationId: "cor_relayctrl01",
        threadId: "thr_relayctrl01", sequence: 1,
        occurredAt: "2030-01-01T00:00:01Z",
        data: { eventType: "thread.status", text: "idle" },
      }),
      res,
    });
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  }));

  it("answers 409 protocol-version-mismatch before verifying credentials", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth()).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    const wrongProtocol = [...headers];
    wrongProtocol[wrongProtocol.indexOf("1.0")] = "2.0";
    await controller.post({ req: requestFor(wrongProtocol, hello), res });
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      code: "protocol-version-mismatch", message: "Protocol version mismatch",
      retryable: false, correlationId: "cor_relayinvalid",
    });
    expect(control.inspect(env, ConnectExecutorDeviceAuthVerifier, "verify").count).toBe(0);
  }));

  it("answers 401 revoked when the token does not verify", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth(null)).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.post({ req: requestFor(headers, hello), res });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: "revoked", message: "Authentication failed" });
  }));

  it.each([
    ["role", { role: "desktop_device" }],
    ["executorId", { executorId: "exe_otherexec01" }],
    ["deviceId", { deviceId: "dev_otherdevice" }],
    ["generation", { generation: 2 }],
  ] as const)("answers 401 when the verified %s disagrees with the headers", resourceCase(async (
    _scope: TestResourceScope, _name: string, patch: Record<string, unknown>,
  ) => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth({ ...actor, ...patch })).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.post({ req: requestFor(headers, hello), res });
    expect(res.statusCode).toBe(401);
    expect(control.inspect(env, ConnectRelayLogic, "receive").count).toBe(0);
  }));

  it("answers 400 invalid-envelope for a frame that fails validation", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth()).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.post({ req: requestFor(headers, { ...hello, extra: true }), res });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      code: "invalid-envelope", message: "Invalid request envelope",
    });
  }));

  it("answers 413 with the invalid-envelope code for an oversize frame", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth()).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.post({
      req: requestFor(headers, {
        kind: "error", protocolVersion: "1.0", code: "invalid-envelope",
        message: "x".repeat(300_000), retryable: false, correlationId: "cor_relayctrl01",
      }),
      res,
    });
    expect(res.statusCode).toBe(413);
    expect(res.body).toMatchObject({ code: "invalid-envelope" });
  }));
});

describe("ConnectRelayController.events", () => {
  it("answers 401 with the protocol header before opening a stream", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth(null)).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    await controller.events({ req: requestFor(headers), res });
    expect(res.statusCode).toBe(401);
    expect(res.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(control.inspect(env, ConnectRelayLogic, "open").count).toBe(0);
  }));

  it("opens an SSE stream for a verified executor", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectRelay"] } }).use(auth()).use(logic(ack("channel.hello"))).build();
    const controller = await env.dinner.controller(ConnectRelayController);
    const res = fakeResponse();
    const response = await controller.events({ req: requestFor(headers), res }) as globalThis.Response;
    expect(response.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(control.inspect(env, ConnectRelayLogic, "open").calls.map((call) => call.args))
      .toEqual([[actor, expect.objectContaining({ write: expect.any(Function) })]]);
    await response.body?.cancel();
  }));
});
