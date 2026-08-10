import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import ConnectClientRelayController from "../../../src/server/controller/connect_client_relay.controller";
import ConnectClientRelayRequestParser from "../../../src/server/services/connect_client_relay_request_parser";

function response() {
  const headers = new Map<string, string>();
  const bodies: unknown[] = [];
  const value = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(name: string, header: string) {
      headers.set(name.toLowerCase(), header);
      return this;
    },
    json(body: unknown) { bodies.push(body); return this; },
  };
  return { value: value as unknown as Response, headers, bodies };
}

const actor = {
  role: "desktop_device" as const,
  deviceId: "dev_controller01",
  generation: 1,
  ownerUserId: "usr_controller01",
  protocolVersion: "1.0" as const,
  audience: "desktop-relay" as const,
  credentialState: "active" as const,
  expiresAt: "2030-01-01T00:00:00Z",
};
const command = {
  kind: "command.post",
  protocolVersion: "1.0",
  commandId: "cmd_controller01",
  correlationId: "cor_controller01",
  idempotencyKey: "idem_controller_command_001",
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  executorId: "exe_controller01",
  deviceId: actor.deviceId,
  actorRole: "desktop_device",
  operation: "conversation.create",
  payload: {
    clientCreationId: "ccr_controller_creation_01",
    title: "Review the current change",
    websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
    executorId: "exe_controller01",
    remoteWorkspaceId: "wrk_controller01",
  },
};

describe("ConnectClientRelayController", () => {
  it("returns a canonical 400 for a service coordinate mismatch", async () => {
    const logic = { command: vi.fn(async () => ({ outcome: "invalid-envelope" })) };
    const controller = new ConnectClientRelayController(
      logic as never,
      new ConnectClientRelayRequestParser(),
      { resolve: vi.fn(async () => ({ ok: true, actor })) } as never,
    );
    const res = response();
    await controller.commands({
      req: { body: command } as Request,
      res: res.value,
    });

    expect(logic.command).toHaveBeenCalledOnce();
    expect(res.value.statusCode).toBe(400);
    expect(res.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(res.bodies).toEqual([{
      kind: "error",
      protocolVersion: "1.0",
      code: "invalid-envelope",
      message: "Invalid request envelope",
      retryable: false,
      correlationId: command.correlationId,
    }]);
  });

  it("rejects unknown creation fields before calling relay logic", async () => {
    const logic = { command: vi.fn() };
    const controller = new ConnectClientRelayController(
      logic as never,
      new ConnectClientRelayRequestParser(),
      { resolve: vi.fn(async () => ({ ok: true, actor })) } as never,
    );
    const res = response();
    await controller.commands({
      req: {
        body: { ...command, payload: { ...command.payload, folderPath: "forbidden" } },
      } as Request,
      res: res.value,
    });
    expect(logic.command).not.toHaveBeenCalled();
    expect(res.value.statusCode).toBe(400);
  });
});
