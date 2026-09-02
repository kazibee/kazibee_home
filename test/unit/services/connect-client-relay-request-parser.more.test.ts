import { describe, expect, it } from "vitest";
import ConnectClientRelayRequestParser from "../../../src/server/services/connect_client_relay_request_parser";

/**
 * Negative-path companion to connect-client-relay-request-parser.test.ts:
 * serialization failures, frame-size fencing, and query correlation parsing.
 */

const command = {
  kind: "command.post",
  protocolVersion: "1.0",
  commandId: "cmd_parser0002",
  correlationId: "cor_parser0002",
  idempotencyKey: "idem_parser_command_0002",
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  executorId: "exe_parser0002",
  deviceId: "dev_parser0002",
  actorRole: "desktop_device",
  operation: "executor.status.read",
  payload: {},
};

describe("ConnectClientRelayRequestParser negative paths", () => {
  const parser = new ConnectClientRelayRequestParser();

  it("rejects a body that cannot be serialized", () => {
    expect(parser.command({ nested: { value: 1n } })).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
  });

  it("rejects an oversize frame and keeps a well-formed correlation", () => {
    expect(parser.command({
      ...command, payload: { note: "x".repeat(300_000) },
    })).toEqual({
      ok: false, reason: "payload-too-large", correlationId: command.correlationId,
    });
  });

  it("falls back to the invalid correlation for malformed correlation ids", () => {
    expect(parser.command({
      ...command, correlationId: "bad", payload: { note: "x".repeat(300_000) },
    })).toEqual({
      ok: false, reason: "payload-too-large", correlationId: "cor_invalid000",
    });
    expect(parser.command({
      ...command, correlationId: 42, payload: { note: "x".repeat(300_000) },
    })).toEqual({
      ok: false, reason: "payload-too-large", correlationId: "cor_invalid000",
    });
  });

  it("rejects non-object and wrong-kind bodies", () => {
    expect(parser.command(null)).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
    expect(parser.command([command])).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
    expect(parser.command({
      kind: "channel.hello", protocolVersion: "1.0", executorId: "exe_parser0002",
      deviceId: "dev_parser0002", actorRole: "executor_device",
      correlationId: "cor_parser0002",
    })).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_parser0002",
    });
  });

  it("parses only a single well-formed query correlation", () => {
    expect(parser.queryCorrelation("cor_query000001")).toBe("cor_query000001");
    expect(parser.queryCorrelation("nope")).toBeNull();
    expect(parser.queryCorrelation(undefined)).toBeNull();
    expect(parser.queryCorrelation(["cor_query000001"])).toBeNull();
  });
});
