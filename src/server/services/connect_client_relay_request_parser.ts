import { Component } from "@noego/ioc";
import Ajv2020 from "ajv/dist/2020.js";
import protocolSchema from "../../../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json" with { type: "json" };

const MAX_FRAME_BYTES = 256 * 1024;
const CORRELATION = /^cor_[A-Za-z0-9]{8,64}$/;

export type ClientCommandFrame = Record<string, unknown> & {
  kind: "command.post";
  protocolVersion: "1.0";
  commandId: string;
  correlationId: string;
  idempotencyKey: string;
  websiteDeploymentId: string;
  executorId: string;
  deviceId: string;
  actorRole: "desktop_device";
  operation: "executor.status.read" | "workspaces.read" | "threads.read" | "thread.read"
    | "conversation.create" | "thread.send" | "thread.retry" | "thread.cancel" | "events.replay";
  payload: Record<string, unknown>;
};
export type ClientRelayFailure =
  | "unauthorized" | "protocol-version-mismatch" | "invalid-envelope"
  | "payload-too-large" | "executor-offline" | "backpressure" | "accept-timeout"
  | "website-deployment-mismatch";

@Component()
export default class ConnectClientRelayRequestParser {
  private readonly validate = new Ajv2020({ allErrors: false, strict: true }).compile(protocolSchema);

  command(body: unknown): { ok: true; value: ClientCommandFrame; byteCount: number } | {
    ok: false; reason: ClientRelayFailure; correlationId: string;
  } {
    let encoded: string;
    try {
      encoded = JSON.stringify(body);
    } catch {
      return this.invalid(body);
    }
    const byteCount = Buffer.byteLength(encoded, "utf8");
    if (byteCount > MAX_FRAME_BYTES) {
      return { ok: false, reason: "payload-too-large", correlationId: this.correlation(body) };
    }
    if (!this.validate(body) || !this.object(body) || body.kind !== "command.post") {
      return this.invalid(body);
    }
    if (body.protocolVersion !== "1.0") {
      return { ok: false, reason: "protocol-version-mismatch", correlationId: this.correlation(body) };
    }
    return { ok: true, value: body as ClientCommandFrame, byteCount };
  }

  queryCorrelation(value: unknown): string | null {
    return typeof value === "string" && CORRELATION.test(value) ? value : null;
  }

  private invalid(value: unknown) {
    return { ok: false as const, reason: "invalid-envelope" as const, correlationId: this.correlation(value) };
  }
  private correlation(value: unknown): string {
    return this.object(value) && typeof value.correlationId === "string"
      && CORRELATION.test(value.correlationId) ? value.correlationId : "cor_invalid000";
  }
  private object(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
