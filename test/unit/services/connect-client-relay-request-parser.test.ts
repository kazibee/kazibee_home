import { describe, expect, it } from "vitest";
import ConnectClientRelayRequestParser from "../../../src/server/services/connect_client_relay_request_parser";

const command = {
  kind: "command.post",
  protocolVersion: "1.0",
  commandId: "cmd_parser0001",
  correlationId: "cor_parser0001",
  idempotencyKey: "idem_parser_command_0001",
  websiteDeploymentId: "wdp_0123456789abcdef0123456789abcdef",
  executorId: "exe_parser0001",
  deviceId: "dev_parser0001",
  actorRole: "desktop_device",
  operation: "executor.status.read",
  payload: {},
};

describe("ConnectClientRelayRequestParser deployment fence", () => {
  const parser = new ConnectClientRelayRequestParser();

  it("accepts only the strict command target", () => {
    expect(parser.command(command)).toMatchObject({
      ok: true,
      value: { websiteDeploymentId: command.websiteDeploymentId },
    });
  });

  it.each([
    ["missing", (() => {
      const value: Record<string, unknown> = { ...command };
      delete value.websiteDeploymentId;
      return value;
    })()],
    ["unknown", {
      ...command,
      websiteDeploymentID: command.websiteDeploymentId,
    }],
  ])("rejects %s deployment fields as an invalid envelope", (_name, value) => {
    expect(parser.command(value)).toMatchObject({
      ok: false,
      reason: "invalid-envelope",
      correlationId: command.correlationId,
    });
  });

  it("accepts strict explicit creation and binding-aware mutation forms", () => {
    const creation = {
      ...command,
      operation: "conversation.create",
      payload: {
        clientCreationId: "ccr_parser_creation_0001",
        title: "Review the current change",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_parser0001",
      },
    };
    expect(parser.command(creation)).toMatchObject({ ok: true });
    expect(parser.command({
      ...command,
      operation: "thread.send",
      payload: {
        conversationId: "thr_parser0001",
        clientOperationId: "cop_parser_operation_0001",
        text: "Continue.",
        mode: "normal",
        model: "app:codex/gpt-5.6-luna",
        expectedExecutionBinding: {
          conversationId: "thr_parser0001",
          kind: "remote",
          websiteDeploymentId: command.websiteDeploymentId,
          executorId: command.executorId,
          remoteWorkspaceId: "wrk_parser0001",
        },
      },
    })).toMatchObject({ ok: true });
  });

  it.each([
    ["missing creation field", {
      ...command,
      operation: "conversation.create",
      payload: {
        clientCreationId: "ccr_parser_creation_0001",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_parser0001",
      },
    }],
    ["extra creation field", {
      ...command,
      operation: "conversation.create",
      payload: {
        clientCreationId: "ccr_parser_creation_0001",
        title: "Review",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_parser0001",
        folderPath: "forbidden",
      },
    }],
    ["case variant mutation field", {
      ...command,
      operation: "thread.retry",
      payload: {
        conversationId: "thr_parser0001",
        clientOperationID: "cop_parser_operation_0001",
        expectedExecutionBinding: {
          conversationId: "thr_parser0001",
          kind: "remote",
          websiteDeploymentId: command.websiteDeploymentId,
          executorId: command.executorId,
          remoteWorkspaceId: "wrk_parser0001",
        },
      },
    }],
    ["canonical and legacy mixed", {
      ...command,
      operation: "thread.send",
      payload: {
        conversationId: "thr_parser0001",
        clientOperationId: "cop_parser_operation_0001",
        text: "Continue.",
        mode: "normal",
        model: "app:codex/gpt-5.6-luna",
        phase: "start",
        expectedExecutionBinding: {
          conversationId: "thr_parser0001",
          kind: "remote",
          websiteDeploymentId: command.websiteDeploymentId,
          executorId: command.executorId,
          remoteWorkspaceId: "wrk_parser0001",
        },
      },
    }],
  ])("rejects %s without broadening the relay", (_name, value) => {
    expect(parser.command(value)).toMatchObject({
      ok: false,
      reason: "invalid-envelope",
    });
  });

  it("retains only the explicit legacy phase:start migration shape", () => {
    const legacy = {
      ...command,
      operation: "thread.send",
      payload: {
        workspaceId: "wrk_parser0001",
        title: "Legacy creation",
        text: "Start.",
        mode: "normal",
        model: "app:codex/gpt-5.6-luna",
        phase: "start",
      },
    };
    expect(parser.command(legacy)).toMatchObject({ ok: true });
    const withoutPhase = { ...legacy, payload: { ...legacy.payload } } as {
      payload: Record<string, unknown>;
    };
    delete withoutPhase.payload.phase;
    expect(parser.command(withoutPhase)).toMatchObject({
      ok: false,
      reason: "invalid-envelope",
    });
  });
});
