import { describe, expect, it } from "vitest";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectRelayRequestParser from "../../../src/server/services/connect_relay_request_parser";

/**
 * Negative-path companion to connect-relay-request-parser.test.ts: protocol
 * fencing, malformed header shapes, identity spoofing inside frames, and
 * correlation fallback selection.
 */

const actor = {
  role: "executor_device" as const, executorId: "exe_12345678",
  deviceId: "dev_12345678", generation: 1,
};
function request(headers: unknown): Request {
  return { rawHeaders: headers } as unknown as Request;
}

const headers = [
  "Authorization", `Bearer ${"a".repeat(43)}`,
  "X-Kazi-Executor-Id", actor.executorId,
  "X-Kazi-Device-Id", actor.deviceId,
  "X-Kazi-Credential-Generation", "1",
  "X-Kazi-Audience", "executor-relay",
  "X-Kazi-Protocol-Version", "1.0",
];
function withHeader(name: string, value: string): string[] {
  const next = [...headers];
  next[next.indexOf(name) + 1] = value;
  return next;
}

describe("ConnectRelayRequestParser negative paths", () => {
  const parser = new ConnectRelayRequestParser();

  it("rejects a wrong or absent protocol version header", () => {
    expect(parser.headers(request(withHeader("X-Kazi-Protocol-Version", "2.0"))))
      .toEqual({ ok: false, reason: "protocol-version-mismatch" });
    expect(parser.headers(request(headers.slice(0, headers.length - 2))))
      .toEqual({ ok: false, reason: "protocol-version-mismatch" });
  });

  it("treats non-array rawHeaders as no headers at all", () => {
    expect(parser.headers(request(undefined)))
      .toEqual({ ok: false, reason: "protocol-version-mismatch" });
  });

  it("treats a header name with a missing value as an empty value", () => {
    expect(parser.headers(request(["X-Kazi-Protocol-Version"])))
      .toEqual({ ok: false, reason: "protocol-version-mismatch" });
  });

  it("rejects malformed executor, device, and generation headers", () => {
    expect(parser.headers(request(withHeader("X-Kazi-Executor-Id", "spy_12345678"))))
      .toEqual({ ok: false, reason: "unauthorized" });
    expect(parser.headers(request(withHeader("X-Kazi-Device-Id", "device"))))
      .toEqual({ ok: false, reason: "unauthorized" });
    expect(parser.headers(request(withHeader("X-Kazi-Credential-Generation", "01"))))
      .toEqual({ ok: false, reason: "unauthorized" });
    expect(parser.headers(request(withHeader("Authorization", "Token abc"))))
      .toEqual({ ok: false, reason: "unauthorized" });
    expect(parser.headers(request(withHeader("Authorization", "Bearer "))))
      .toEqual({ ok: false, reason: "unauthorized" });
  });

  it("rejects an absent generation header", () => {
    const index = headers.indexOf("X-Kazi-Credential-Generation");
    expect(parser.headers(request([
      ...headers.slice(0, index), ...headers.slice(index + 2),
    ]))).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("rejects a syntactically valid but unsafely large generation", () => {
    expect(parser.headers(request(withHeader(
      "X-Kazi-Credential-Generation", "12345678901234567890",
    )))).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("rejects a frame that cannot be serialized", () => {
    expect(parser.frame({ nested: { value: 1n } }, actor)).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_relayinvalid",
    });
  });

  it("falls back to the invalid correlation on oversize frames without one", () => {
    expect(parser.frame({
      kind: "error", protocolVersion: "1.0", code: "invalid-envelope",
      message: "x".repeat(300_000), retryable: false, correlationId: "bad",
    }, actor)).toEqual({
      ok: false, reason: "payload-too-large", correlationId: "cor_relayinvalid",
    });
    expect(parser.frame({
      kind: "error", protocolVersion: "1.0", code: "invalid-envelope",
      message: "x".repeat(300_000), retryable: false, correlationId: 7,
    }, actor)).toEqual({
      ok: false, reason: "payload-too-large", correlationId: "cor_relayinvalid",
    });
  });

  it("rejects non-object and unknown-kind bodies as invalid envelopes", () => {
    expect(parser.frame(null, actor)).toMatchObject({ ok: false, reason: "invalid-envelope" });
    expect(parser.frame([1, 2], actor)).toMatchObject({ ok: false, reason: "invalid-envelope" });
    expect(parser.frame({ kind: "command.post" }, actor))
      .toMatchObject({ ok: false, reason: "invalid-envelope" });
  });

  it.each([
    ["executorId", { executorId: "exe_spoofed001" }],
    ["deviceId", { deviceId: "dev_spoofed001" }],
  ] as const)("rejects a frame whose %s does not match the actor", (_name, patch) => {
    expect(parser.frame({
      kind: "channel.hello", protocolVersion: "1.0", executorId: actor.executorId,
      deviceId: actor.deviceId, actorRole: "executor_device",
      correlationId: "cor_12345678", ...patch,
    }, actor)).toEqual({
      ok: false, reason: "unauthorized", correlationId: "cor_12345678",
    });
  });
});
