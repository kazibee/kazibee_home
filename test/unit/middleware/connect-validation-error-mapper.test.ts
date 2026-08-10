import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import ConnectValidationErrorMapper from "../../../src/server/middleware/connect_validation_error_mapper";

const dinnerFailure = {
  error: true,
  message: "Invalid request body",
  requirements: { oneOf: [] },
  validation_schema: { oneOf: [] },
  path: "/v1/connect/relay",
  method: "post",
  statusCode: 400,
};

function response() {
  const sent: unknown[] = [];
  const headers = new Map<string, string>();
  const value = {
    headersSent: false,
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
      this.headersSent = true;
      sent.push(body);
      return this;
    },
  };
  return { value: value as unknown as Response, sent, headers };
}

function relayRequest(body: unknown): Request {
  return {
    path: "/v1/connect/relay",
    method: "POST",
    body,
    query: {},
  } as unknown as Request;
}

describe("ConnectValidationErrorMapper", () => {
  it("synchronously closes the exact relay Dinner rejection with canonical JSON", () => {
    const mapper = new ConnectValidationErrorMapper();
    const res = response();
    const req = relayRequest({
      kind: "unknown.operation",
      protocolVersion: "1.0",
      correlationId: "cor_relayunknown1",
    });
    const dinner = vi.fn(() => {
      res.value.status(400).json(dinnerFailure);
    }) as unknown as NextFunction;

    mapper.capture(req, res.value, dinner);

    expect(dinner).toHaveBeenCalledOnce();
    expect(res.value.statusCode).toBe(400);
    expect(res.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(res.sent).toEqual([{
      kind: "error",
      protocolVersion: "1.0",
      code: "invalid-envelope",
      message: "Invalid request envelope",
      retryable: false,
      correlationId: "cor_relayunknown1",
    }]);
    expect(JSON.stringify(res.sent)).not.toContain("validation_schema");
  });

  it("maps protocol and oversized relay failures without retaining request data", () => {
    const mapper = new ConnectValidationErrorMapper();
    const protocol = response();
    mapper.capture(relayRequest({
      kind: "channel.heartbeat",
      protocolVersion: "9.9",
      correlationId: "cor_relayversion1",
    }), protocol.value, (() => {
      protocol.value.status(400).json(dinnerFailure);
    }) as NextFunction);
    expect(protocol.value.statusCode).toBe(409);
    expect(protocol.sent[0]).toMatchObject({
      code: "protocol-version-mismatch",
      correlationId: "cor_relayversion1",
    });

    const oversized = response();
    mapper.capture(relayRequest({
      protocolVersion: "1.0",
      correlationId: "cor_relayoversize",
      padding: "CANARY_DO_NOT_PERSIST".repeat(16_384),
    }), oversized.value, (() => {
      oversized.value.status(400).json(dinnerFailure);
    }) as NextFunction);
    expect(oversized.value.statusCode).toBe(413);
    expect(oversized.sent[0]).toMatchObject({
      code: "invalid-envelope",
      correlationId: "cor_relayoversize",
    });
    expect(JSON.stringify(oversized.sent)).not.toContain("CANARY_DO_NOT_PERSIST");
  });
});
