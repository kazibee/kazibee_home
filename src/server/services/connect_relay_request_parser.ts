import { Component } from "@noego/ioc";
import type { Request } from "express";
import Ajv2020 from "ajv/dist/2020.js";
import protocolSchema from "../../../packages/kazi-connect-protocol/schemas/kazi-connect-v1.schema.json" with { type: "json" };
import type { ConnectExecutorActor } from "./connect_executor_actor_resolver";

const PROTOCOL = "1.0";
const MAX_FRAME_BYTES = 256 * 1024;
const allowedKinds = new Set([
  "channel.hello", "channel.heartbeat", "command.accepted", "command.result",
  "executor.event", "events.replay.result", "events.replay.gap", "error",
]);

export type ExecutorOutboundFrame = Record<string, unknown> & {
  kind: "channel.hello" | "channel.heartbeat" | "command.accepted" | "command.result"
    | "executor.event" | "events.replay.result" | "events.replay.gap" | "error";
  protocolVersion: "1.0";
  correlationId: string;
};
export type RelayRequestFailure =
  | "unauthorized" | "protocol-version-mismatch" | "invalid-envelope" | "payload-too-large";

@Component()
export default class ConnectRelayRequestParser {
  private readonly validate = new Ajv2020({ allErrors: false, strict: true }).compile(protocolSchema);

  headers(req: Request): {
    ok: true; token: string; executorId: string; deviceId: string; generation: number;
  } | { ok: false; reason: RelayRequestFailure } {
    const protocol = this.single(req, "x-kazi-protocol-version");
    if (protocol !== PROTOCOL) return { ok: false, reason: "protocol-version-mismatch" };
    const auth = this.single(req, "authorization");
    const executorId = this.single(req, "x-kazi-executor-id");
    const deviceId = this.single(req, "x-kazi-device-id");
    const generation = this.single(req, "x-kazi-credential-generation");
    const audience = this.single(req, "x-kazi-audience");
    if (!auth?.startsWith("Bearer ") || auth.length <= 7 || audience !== "executor-relay"
      || !/^exe_[A-Za-z0-9]{8,64}$/.test(executorId ?? "")
      || !/^dev_[A-Za-z0-9]{8,64}$/.test(deviceId ?? "")
      || !/^(?:0|[1-9][0-9]*)$/.test(generation ?? "")) {
      return { ok: false, reason: "unauthorized" };
    }
    const parsedGeneration = Number(generation);
    if (!Number.isSafeInteger(parsedGeneration)) return { ok: false, reason: "unauthorized" };
    return {
      ok: true, token: auth.slice(7), executorId: executorId!,
      deviceId: deviceId!, generation: parsedGeneration,
    };
  }

  frame(body: unknown, actor: Extract<ConnectExecutorActor, { role: "executor_device" }>): {
    ok: true; value: ExecutorOutboundFrame;
  } | { ok: false; reason: RelayRequestFailure; correlationId: string } {
    let encoded: string;
    try {
      encoded = JSON.stringify(body);
    } catch {
      return { ok: false, reason: "invalid-envelope", correlationId: "cor_relayinvalid" };
    }
    if (Buffer.byteLength(encoded, "utf8") > MAX_FRAME_BYTES) {
      return { ok: false, reason: "payload-too-large", correlationId: this.correlation(body) };
    }
    if (!this.validate(body) || !this.object(body) || !allowedKinds.has(String(body.kind))) {
      return { ok: false, reason: "invalid-envelope", correlationId: this.correlation(body) };
    }
    const frame = body as ExecutorOutboundFrame;
    if (frame.protocolVersion !== PROTOCOL) {
      return { ok: false, reason: "protocol-version-mismatch", correlationId: frame.correlationId };
    }
    if ("executorId" in frame && frame.executorId !== actor.executorId) {
      return { ok: false, reason: "unauthorized", correlationId: frame.correlationId };
    }
    if ("deviceId" in frame && frame.deviceId !== actor.deviceId) {
      return { ok: false, reason: "unauthorized", correlationId: frame.correlationId };
    }
    if ("actorRole" in frame && frame.actorRole !== "executor_device") {
      return { ok: false, reason: "unauthorized", correlationId: frame.correlationId };
    }
    if (frame.kind === "command.result" && frame.operation === "conversation.create") {
      const result = this.object(frame.result) ? frame.result : null;
      const receipt = result && this.object(result.executionBinding)
        ? result.executionBinding : null;
      if (!receipt || receipt.executorId !== frame.executorId
        || receipt.conversationId !== result!.conversationId) {
        return { ok: false, reason: "invalid-envelope", correlationId: frame.correlationId };
      }
    }
    return { ok: true, value: frame };
  }

  private single(req: Request, name: string): string | null {
    const raw = req.rawHeaders;
    const values: string[] = [];
    for (let index = 0; index < raw.length; index += 2) {
      if (raw[index]?.toLowerCase() === name) values.push(raw[index + 1] ?? "");
    }
    return values.length === 1 && !values[0]!.includes(",") ? values[0]! : null;
  }
  private object(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  private correlation(value: unknown): string {
    return this.object(value) && typeof value.correlationId === "string"
      && /^cor_[A-Za-z0-9]{8,64}$/.test(value.correlationId)
      ? value.correlationId : "cor_relayinvalid";
  }
}
