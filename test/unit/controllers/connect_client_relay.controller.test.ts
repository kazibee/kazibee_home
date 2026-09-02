import { describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectClientRelayController from "../../../src/server/controller/connect_client_relay.controller";
import ConnectClientRelayRequestParser from "../../../src/server/services/connect_client_relay_request_parser";
import type ConnectClientRelayLogic from "../../../src/server/logic/connect_client_relay.logic";
import type { ConnectDesktopRelayActorResolver } from "../../../src/server/services/connect_desktop_actor_resolver";
import type { CommandDispatchResult } from "../../../src/server/services/connect_client_relay_service";

/**
 * Desktop client relay controller with the real parser and faked actor
 * resolution/logic: command outcome mapping, executor listing fencing, and
 * SSE lifecycle wiring.
 */

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

function fixture(options: {
  resolved?: boolean;
  outcome?: CommandDispatchResult;
} = {}) {
  const logic = {
    command: vi.fn(async () => options.outcome
      ?? { outcome: "accepted", frame: { kind: "command.accepted" } }),
    listExecutors: vi.fn(async () => [{ executorId: command.executorId }]),
    open: vi.fn(() => "fen_clientctrl1"),
    close: vi.fn(),
  };
  const actors = {
    resolve: vi.fn(async () => options.resolved === false
      ? { ok: false } : { ok: true, actor }),
  };
  const controller = new ConnectClientRelayController(
    logic as unknown as ConnectClientRelayLogic,
    new ConnectClientRelayRequestParser(),
    actors as unknown as ConnectDesktopRelayActorResolver,
  );
  return { controller, logic, actors };
}

describe("ConnectClientRelayController.commands", () => {
  it("returns the accepted frame for a dispatched command", async () => {
    const { controller, logic } = fixture();
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: "command.accepted" });
    expect(res.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(logic.command).toHaveBeenCalledWith(actor, command, expect.any(Number));
  });

  it("answers 401 revoked when the desktop actor does not resolve", async () => {
    const { controller, logic } = fixture({ resolved: false });
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      code: "revoked", message: "Authentication failed",
      retryable: false, correlationId: "cor_invalid000",
    });
    expect(logic.command).not.toHaveBeenCalled();
  });

  it("answers 400 for an invalid envelope before reaching the logic", async () => {
    const { controller, logic } = fixture();
    const res = fakeResponse();
    await controller.commands({ req: requestFor({ ...command, extra: true }), res });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      code: "invalid-envelope", correlationId: command.correlationId,
    });
    expect(logic.command).not.toHaveBeenCalled();
  });

  it("answers 413 for an oversize command frame", async () => {
    const { controller } = fixture();
    const res = fakeResponse();
    await controller.commands({
      req: requestFor({ ...command, payload: { note: "x".repeat(300_000) } }), res,
    });
    expect(res.statusCode).toBe(413);
    expect(res.body).toMatchObject({ code: "invalid-envelope" });
  });

  it.each([
    ["unauthorized", 401, "revoked", "Authentication failed", false],
    ["overloaded", 429, "invalid-envelope", "Relay is backpressured", true],
    ["executor-offline", 503, "executor-offline", "Executor is offline", true],
    ["accept-timeout", 503, "executor-offline", "Executor is offline", true],
    ["website-deployment-mismatch", 409, "website-deployment-mismatch", "Website deployment mismatch", false],
    ["invalid-envelope", 400, "invalid-envelope", "Invalid request envelope", false],
  ] as const)("maps the %s outcome to %d", async (outcome, status, code, message, retryable) => {
    const { controller } = fixture({ outcome: { outcome } as CommandDispatchResult });
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(status);
    expect(res.body).toEqual({
      kind: "error", protocolVersion: "1.0", code, message, retryable,
      correlationId: command.correlationId,
    });
  });

  it("maps a parser protocol-version-mismatch failure to 409", async () => {
    const { logic, actors } = fixture();
    const parser = {
      command: () => ({
        ok: false as const, reason: "protocol-version-mismatch" as const,
        correlationId: command.correlationId,
      }),
    };
    const controller = new ConnectClientRelayController(
      logic as unknown as ConnectClientRelayLogic,
      parser as unknown as ConnectClientRelayRequestParser,
      actors as unknown as ConnectDesktopRelayActorResolver,
    );
    const res = fakeResponse();
    await controller.commands({ req: requestFor(command), res });
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      kind: "error", protocolVersion: "1.0", code: "protocol-version-mismatch",
      message: "Protocol version mismatch", retryable: false,
      correlationId: command.correlationId,
    });
  });
});

describe("ConnectClientRelayController.executors", () => {
  it("lists executors for a resolved desktop actor", async () => {
    const { controller, logic } = fixture();
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
    expect(logic.listExecutors).toHaveBeenCalledWith(actor);
  });

  it("answers 400 with the fallback correlation for a malformed correlation", async () => {
    const { controller, actors } = fixture();
    const res = fakeResponse();
    await controller.executors({ req: requestFor(undefined, { correlationId: "bad" }), res });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
    expect(actors.resolve).not.toHaveBeenCalled();
  });

  it("answers 400 when unexpected query parameters are present", async () => {
    const { controller } = fixture();
    const res = fakeResponse();
    await controller.executors({
      req: requestFor(undefined, { correlationId: "cor_listexec0001", verbose: "1" }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ correlationId: "cor_listexec0001" });
  });

  it("answers 401 when the desktop actor does not resolve", async () => {
    const { controller } = fixture({ resolved: false });
    const res = fakeResponse();
    await controller.executors({
      req: requestFor(undefined, { correlationId: "cor_listexec0001" }), res,
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: "revoked", correlationId: "cor_listexec0001" });
  });
});

describe("ConnectClientRelayController.events", () => {
  it("answers 401 with the protocol header before opening a stream", async () => {
    const { controller, logic } = fixture({ resolved: false });
    const res = fakeResponse();
    await controller.events({ req: requestFor(), res });
    expect(res.statusCode).toBe(401);
    expect(res.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(logic.open).not.toHaveBeenCalled();
  });

  it("opens an SSE stream and closes the logic fence when the stream ends", async () => {
    const { controller, logic } = fixture();
    const res = fakeResponse();
    const response = await controller.events({ req: requestFor(), res }) as globalThis.Response;
    expect(response.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(logic.open).toHaveBeenCalledWith(actor, expect.objectContaining({ write: expect.any(Function) }));
    expect(logic.close).not.toHaveBeenCalled();
    await response.body?.cancel();
    expect(logic.close).toHaveBeenCalledWith(actor.deviceId, "fen_clientctrl1");
  });
});
