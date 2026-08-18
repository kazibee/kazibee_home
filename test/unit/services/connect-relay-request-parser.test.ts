import { describe, expect, it } from "vitest";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectRelayRequestParser from "../../../src/server/services/connect_relay_request_parser";

const actor = {
  role: "executor_device" as const, executorId: "exe_12345678",
  deviceId: "dev_12345678", generation: 1,
};
function request(headers: string[]): Request {
  return { rawHeaders: headers } as unknown as Request;
}

describe("ConnectRelayRequestParser", () => {
  const parser = new ConnectRelayRequestParser();
  const headers = [
    "Authorization", `Bearer ${"a".repeat(43)}`,
    "X-Kazi-Executor-Id", actor.executorId,
    "X-Kazi-Device-Id", actor.deviceId,
    "X-Kazi-Credential-Generation", "1",
    "X-Kazi-Audience", "executor-relay",
    "X-Kazi-Protocol-Version", "1.0",
  ];

  it("accepts the exact audience-fenced header and canonical hello", () => {
    expect(parser.headers(request(headers))).toEqual({
      ok: true, token: "a".repeat(43), executorId: actor.executorId,
      deviceId: actor.deviceId, generation: 1,
    });
    expect(parser.frame({
      kind: "channel.hello", protocolVersion: "1.0", executorId: actor.executorId,
      deviceId: actor.deviceId, actorRole: "executor_device",
      correlationId: "cor_12345678",
    }, actor).ok).toBe(true);
  });

  it("rejects duplicate headers, wrong audience, extra fields, malformed time and oversize frames", () => {
    expect(parser.headers(request([
      ...headers.slice(0, 2),
      "Authorization", `Bearer ${"a".repeat(43)}`,
      ...headers.slice(2),
    ]))).toEqual({
      ok: false, reason: "unauthorized",
    });
    const commaJoinedAuthorization = [...headers];
    commaJoinedAuthorization[1] = `Bearer ${"a".repeat(43)}, Bearer ${"a".repeat(43)}`;
    expect(parser.headers(request(commaJoinedAuthorization))).toEqual({
      ok: false, reason: "unauthorized",
    });
    expect(parser.headers(request([...headers, "X-Kazi-Audience", "executor-relay"]))).toEqual({
      ok: false, reason: "unauthorized",
    });
    const wrongAudience = [...headers];
    wrongAudience[wrongAudience.indexOf("executor-relay")] = "browser";
    expect(parser.headers(request(wrongAudience))).toEqual({ ok: false, reason: "unauthorized" });
    expect(parser.frame({
      kind: "channel.hello", protocolVersion: "1.0", executorId: actor.executorId,
      deviceId: actor.deviceId, actorRole: "executor_device",
      correlationId: "cor_12345678", extra: true,
    }, actor).ok).toBe(false);
    expect(parser.frame({
      kind: "channel.heartbeat", protocolVersion: "1.0", executorId: actor.executorId,
      deviceId: actor.deviceId, actorRole: "executor_device", state: "idle",
      sentAt: "2026-02-30T00:00:00Z", correlationId: "cor_12345678",
    }, actor).ok).toBe(false);
    expect(parser.frame({
      kind: "error", protocolVersion: "1.0", code: "invalid-envelope",
      message: "x".repeat(300_000), retryable: false, correlationId: "cor_12345678",
    }, actor)).toMatchObject({ ok: false, reason: "payload-too-large" });
  });

  it("accepts only the exact conversation creation result projection", () => {
    const result = {
      kind: "command.result",
      protocolVersion: "1.0",
      commandId: "cmd_create0001",
      correlationId: "cor_create0001",
      executorId: actor.executorId,
      actorRole: "executor_device",
      operation: "conversation.create",
      completedAt: "2030-01-01T00:00:01Z",
      result: {
        conversationId: "thr_created001",
        title: "Review the current change",
        createdAt: "2030-01-01T00:00:01Z",
        executionBinding: {
          conversationId: "thr_created001",
          kind: "remote",
          websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
          executorId: actor.executorId,
          remoteWorkspaceId: "wrk_sample001",
        },
      },
    };
    expect(parser.frame(result, actor)).toMatchObject({ ok: true });
    expect(parser.frame({
      ...result,
      result: { ...result.result, remoteThreadId: "thr_forbidden01" },
    }, actor)).toMatchObject({ ok: false, reason: "invalid-envelope" });
    const missing = { ...result, result: { ...result.result } } as {
      result: Record<string, unknown>;
    };
    delete missing.result.executionBinding;
    expect(parser.frame(missing, actor)).toMatchObject({
      ok: false,
      reason: "invalid-envelope",
    });
    expect(parser.frame({
      ...result,
      result: {
        ...result.result,
        executionBinding: {
          ...result.result.executionBinding,
          conversationId: "thr_different001",
        },
      },
    }, actor)).toMatchObject({ ok: false, reason: "invalid-envelope" });
  });
});
