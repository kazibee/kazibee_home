import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import ConnectRelayController from "../../../src/server/controller/connect_relay.controller";
import ConnectRelayRequestParser from "../../../src/server/services/connect_relay_request_parser";

function response() {
  const headers = new Map<string, string>();
  const bodies: unknown[] = [];
  const value = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, headerValue: string) {
      headers.set(name.toLowerCase(), headerValue);
      return this;
    },
    json(body: unknown) {
      bodies.push(body);
      return this;
    },
  };
  return { value: value as unknown as Response, headers, bodies };
}

describe("ConnectRelayController", () => {
  it("returns one bounded canonical error before auth lookup for duplicate Authorization", async () => {
    const verify = vi.fn();
    const controller = new ConnectRelayController(
      { receive: vi.fn() } as never,
      new ConnectRelayRequestParser(),
      { verify } as never,
    );
    const req = {
      rawHeaders: [
        "Authorization", `Bearer ${"a".repeat(43)}`,
        "Authorization", `Bearer ${"a".repeat(43)}`,
        "X-Kazi-Executor-Id", "exe_12345678",
        "X-Kazi-Device-Id", "dev_12345678",
        "X-Kazi-Credential-Generation", "1",
        "X-Kazi-Audience", "executor-relay",
        "X-Kazi-Protocol-Version", "1.0",
      ],
      body: {
        kind: "channel.hello",
        protocolVersion: "1.0",
        executorId: "exe_12345678",
        deviceId: "dev_12345678",
        actorRole: "executor_device",
        correlationId: "cor_12345678",
      },
    } as unknown as Request;
    const res = response();

    await controller.post({ req, res: res.value });

    expect(verify).not.toHaveBeenCalled();
    expect(res.value.statusCode).toBe(401);
    expect(res.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(res.bodies).toEqual([{
      kind: "error",
      protocolVersion: "1.0",
      code: "revoked",
      message: "Authentication failed",
      retryable: false,
      correlationId: "cor_relayinvalid",
    }]);
    expect(Buffer.byteLength(JSON.stringify(res.bodies[0]), "utf8")).toBeLessThanOrEqual(512);
  });
});
