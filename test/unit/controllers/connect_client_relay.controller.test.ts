/**
 * Desktop client relay controller driven directly against the production
 * controller resolved from root testApp over the original configuration
 * (../../../noego.config.yml): the real parser runs; actor resolution and
 * logic are replaced through singular .method controls. Covers command
 * outcome mapping, executor listing fencing, and SSE lifecycle wiring.
 * resourceCase owns environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { test as control, testStub, resourceCase, type TestResourceScope } from "@noego/testing";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectClientRelayController from "../../../src/server/controller/connect_client_relay.controller";
import ConnectClientRelayRequestParser from "../../../src/server/services/connect_client_relay_request_parser";
import ConnectClientRelayLogic from "../../../src/server/logic/connect_client_relay.logic";
import { ConnectDesktopRelayActorResolver } from "../../../src/server/services/connect_desktop_actor_resolver";
import type { CommandDispatchResult } from "../../../src/server/services/connect_client_relay_service";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

const actor = {
  role: "desktop_device" as const, deviceId: "dev_clientctrl01", generation: 1,
  ownerUserId: "usr_clientctrl01",
};
const command = {
  kind: "command.post",
  protocolVersion: "1.0",
  commandId: "cmd_clientctrl01",
  correlationId: "cor_clientctrl01",
  idempotencyKey: "idem_client_ctrl_000001",
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  executorId: "exe_clientctrl01",
  deviceId: actor.deviceId,
  actorRole: "desktop_device",
  operation: "executor.status.read",
  payload: {},
};

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  return res as typeof res & Response;
}
function requestFor(body?: unknown, query: Record<string, unknown> = {}): Request {
  return { body, query } as unknown as Request;
}

// Reusable replacement descriptions (immutable), not application constructors:
// the desktop actor resolution and the logic boundary are fixed per case.
const actors = (resolved = true) => testStub()
  .method(ConnectDesktopRelayActorResolver, "resolve", control.returns(
    Promise.resolve(resolved ? { ok: true, actor } : { ok: false }),
  ));
const logic = (outcome?: CommandDispatchResult) => testStub()
  .method(ConnectClientRelayLogic, "command", control.returns(
    Promise.resolve(outcome ?? { outcome: "accepted", frame: { kind: "command.accepted" } }),
  ))
  .method(ConnectClientRelayLogic, "listExecutors", control.returns(Promise.resolve([{ executorId: command.executorId }])))
  .method(ConnectClientRelayLogic, "open", control.returns("fen_clientctrl1"))
  .method(ConnectClientRelayLogic, "close", control.returns(undefined));

describe("ConnectClientRelayController.commands", () => {
  it("returns the accepted frame for a dispatched command", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: "command.accepted" });
    expect(res.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(control.inspect(env, ConnectClientRelayLogic, "command").calls.map((call) => call.args))
      .toEqual([[actor, command, expect.any(Number)]]);
  }));

  it("answers 401 revoked when the desktop actor does not resolve", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors(false)).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      code: "revoked", message: "Authentication failed",
      retryable: false, correlationId: "cor_invalid000",
    });
    expect(control.inspect(env, ConnectClientRelayLogic, "command").count).toBe(0);
  }));

  it("answers 400 for an invalid envelope before reaching the logic", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.commands({ req: requestFor({ ...command, extra: true }), res });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      code: "invalid-envelope", correlationId: command.correlationId,
    });
    expect(control.inspect(env, ConnectClientRelayLogic, "command").count).toBe(0);
  }));

  it("answers 413 for an oversize command frame", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.commands({
      req: requestFor({ ...command, payload: { note: "x".repeat(300_000) } }), res,
    });
    expect(res.statusCode).toBe(413);
    expect(res.body).toMatchObject({ code: "invalid-envelope" });
  }));

  it.each([
    ["unauthorized", 401, "revoked", "Authentication failed", false],
    ["overloaded", 429, "invalid-envelope", "Relay is backpressured", true],
    ["executor-offline", 503, "executor-offline", "Executor is offline", true],
    ["accept-timeout", 503, "executor-offline", "Executor is offline", true],
    ["website-deployment-mismatch", 409, "website-deployment-mismatch", "Website deployment mismatch", false],
    ["invalid-envelope", 400, "invalid-envelope", "Invalid request envelope", false],
  ] as const)("maps the %s outcome to %d", resourceCase(async (
    _scope: TestResourceScope, outcome: string, status: number,
    code: string, message: string, retryable: boolean,
  ) => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic({ outcome } as CommandDispatchResult)).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(status);
    expect(res.body).toEqual({
      kind: "error", protocolVersion: "1.0", code, message, retryable,
      correlationId: command.correlationId,
    });
  }));

  it("maps a parser protocol-version-mismatch failure to 409", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic())
      .method(ConnectClientRelayRequestParser, "command", control.returns({
        ok: false as const, reason: "protocol-version-mismatch" as const,
        correlationId: command.correlationId,
      }))
      .build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      kind: "error", protocolVersion: "1.0", code: "protocol-version-mismatch",
      message: "Protocol version mismatch", retryable: false,
      correlationId: command.correlationId,
    });
  }));
});

describe("ConnectClientRelayController.executors", () => {
  it("lists executors for a resolved desktop actor", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.executors({
      req: requestFor(undefined, { correlationId: "cor_listexec0001" }), res,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      kind: "executor.list.response", protocolVersion: "1.0",
      executors: [{ executorId: command.executorId }],
      correlationId: "cor_listexec0001",
    });
    expect(control.inspect(env, ConnectClientRelayLogic, "listExecutors").calls.map((call) => call.args))
      .toEqual([[actor]]);
  }));

  it("answers 400 with the fallback correlation for a malformed correlation", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.executors({ req: requestFor(undefined, { correlationId: "bad" }), res });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
    expect(control.inspect(env, ConnectDesktopRelayActorResolver, "resolve").count).toBe(0);
  }));

  it("answers 400 when unexpected query parameters are present", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.executors({
      req: requestFor(undefined, { correlationId: "cor_listexec0001", verbose: "1" }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ correlationId: "cor_listexec0001" });
  }));

  it("answers 401 when the desktop actor does not resolve", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors(false)).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.executors({
      req: requestFor(undefined, { correlationId: "cor_listexec0001" }), res,
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: "revoked", correlationId: "cor_listexec0001" });
  }));
});

describe("ConnectClientRelayController.events", () => {
  it("answers 401 with the protocol header before opening a stream", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors(false)).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    await controller.events({ req: requestFor(), res });
    expect(res.statusCode).toBe(401);
    expect(res.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(control.inspect(env, ConnectClientRelayLogic, "open").count).toBe(0);
  }));

  it("opens an SSE stream and closes the logic fence when the stream ends", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectClientRelay"] } }).use(actors()).use(logic()).build();
    const controller = await env.dinner.controller(ConnectClientRelayController);
    const res = fakeResponse();
    const response = await controller.events({ req: requestFor(), res }) as globalThis.Response;
    expect(response.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(control.inspect(env, ConnectClientRelayLogic, "open").calls.map((call) => call.args))
      .toEqual([[actor, expect.objectContaining({ write: expect.any(Function) })]]);
    expect(control.inspect(env, ConnectClientRelayLogic, "close").count).toBe(0);
    await response.body?.cancel();
    expect(control.inspect(env, ConnectClientRelayLogic, "close").calls.map((call) => call.args))
      .toEqual([[actor.deviceId, "fen_clientctrl1"]]);
  }));
});
