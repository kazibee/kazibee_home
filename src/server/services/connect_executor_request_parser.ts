import { Component, Inject, LoadAs } from "@noego/ioc";
import type { Request } from "express";
import ConnectExecutorPolicy from "./connect_executor_policy";

export type ExecutorPlatform = "macos" | "linux" | "windows";
export type ExecutorArchitecture = "x64" | "arm64";
export interface ClaimCreateInput {
  kind: "executor.claim.create.request"; protocolVersion: "1.0";
  claimId: string; executorId: string; deviceId: string; actorRole: "executor_device";
  displayName: string; platform: ExecutorPlatform; architecture: ExecutorArchitecture;
  executorVersion: string; keyFingerprint: string; idempotencyKey: string; correlationId: string;
}
export interface ClaimDecisionInput {
  kind: "executor.claim.decision.request"; protocolVersion: "1.0"; claimId: string;
  sessionId: string; actorRole: "browser_session"; decision: "accept" | "deny";
  idempotencyKey: string; correlationId: string;
}
export interface RenameInput {
  kind: "executor.rename.request"; protocolVersion: "1.0"; executorId: string;
  displayName: string; idempotencyKey: string; correlationId: string;
}
export interface RevokeInput {
  kind: "executor.action.request"; protocolVersion: "1.0"; executorId: string;
  action: "revoke"; idempotencyKey: string; correlationId: string;
}
export type ParseResult<T> = { ok: true; value: T } | {
  ok: false; reason: "invalid-envelope" | "protocol-version-mismatch"; correlationId: string;
};

const patterns = {
  claim: /^clm_[A-Za-z0-9]{8,64}$/, executor: /^exe_[A-Za-z0-9]{8,64}$/,
  device: /^dev_[A-Za-z0-9]{8,64}$/, session: /^ses_[A-Za-z0-9]{8,64}$/,
  correlation: /^cor_[A-Za-z0-9]{8,64}$/, idempotency: /^idem_[A-Za-z0-9_-]{16,80}$/,
  display: /^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$/,
  version: /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$/,
  fingerprint: /^[a-f0-9]{64}$/, code: /^[A-Z]{4}-[A-Z]{4}$/,
};
const fallbackCorrelation = "cor_invalid000";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && keys.sort().every((key, index) => actual[index] === key);
};
const matches = (value: unknown, pattern: RegExp): boolean =>
  typeof value === "string" && pattern.test(value);

@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorRequestParser {
  constructor(@Inject(ConnectExecutorPolicy) private readonly policy: ConnectExecutorPolicy) {}

  claimCreate(body: unknown): ParseResult<ClaimCreateInput> {
    const keys = ["kind", "protocolVersion", "claimId", "executorId", "deviceId", "actorRole",
      "displayName", "platform", "architecture", "executorVersion", "keyFingerprint",
      "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !exact(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== "1.0") return this.protocol(body);
    const valid = [
      body.kind === "executor.claim.create.request",
      body.actorRole === "executor_device",
      matches(body.claimId, patterns.claim),
      matches(body.executorId, patterns.executor),
      matches(body.deviceId, patterns.device),
      matches(body.displayName, patterns.display),
      ["macos", "linux", "windows"].includes(String(body.platform)),
      ["x64", "arm64"].includes(String(body.architecture)),
      body.platform !== "windows" || body.architecture === "x64",
      matches(body.executorVersion, patterns.version),
      matches(body.keyFingerprint, patterns.fingerprint),
      matches(body.idempotencyKey, patterns.idempotency),
      matches(body.correlationId, patterns.correlation),
    ].every(Boolean);
    return valid ? { ok: true, value: body as unknown as ClaimCreateInput } : this.invalid(body);
  }

  decision(body: unknown, claimId: unknown): ParseResult<ClaimDecisionInput> {
    const keys = ["kind", "protocolVersion", "claimId", "sessionId", "actorRole", "decision",
      "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !exact(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== "1.0") return this.protocol(body);
    const valid = body.kind === "executor.claim.decision.request" && body.actorRole === "browser_session"
      && body.claimId === claimId && typeof claimId === "string" && patterns.claim.test(claimId)
      && typeof body.sessionId === "string" && patterns.session.test(body.sessionId)
      && (body.decision === "accept" || body.decision === "deny")
      && typeof body.idempotencyKey === "string" && patterns.idempotency.test(body.idempotencyKey)
      && typeof body.correlationId === "string" && patterns.correlation.test(body.correlationId);
    return valid ? { ok: true, value: body as unknown as ClaimDecisionInput } : this.invalid(body);
  }

  rename(body: unknown, executorId: unknown): ParseResult<RenameInput> {
    return this.ownerMutation(body, executorId, "rename") as ParseResult<RenameInput>;
  }

  revoke(body: unknown, executorId: unknown): ParseResult<RevokeInput> {
    return this.ownerMutation(body, executorId, "revoke") as ParseResult<RevokeInput>;
  }

  correlation(req: Request): string {
    const value = typeof req.query.correlationId === "string" ? req.query.correlationId : null;
    return value && patterns.correlation.test(value) ? value : fallbackCorrelation;
  }

  bootstrapToken(req: Request): string | null {
    const value = req.headers[this.policy.bootstrapHeader];
    return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }

  lookup(value: unknown): { claimId?: string; code?: string } | null {
    if (typeof value !== "string") return null;
    if (patterns.claim.test(value)) return { claimId: value };
    if (patterns.code.test(value)) return { code: value };
    return null;
  }

  browserQuery(req: Request): ParseResult<{ sessionId: string; correlationId: string }> {
    const value = req.query;
    if (!isRecord(value) || !exact(value, ["sessionId", "correlationId"])) return this.invalid(value);
    return typeof value.sessionId === "string" && patterns.session.test(value.sessionId)
      && typeof value.correlationId === "string" && patterns.correlation.test(value.correlationId)
      ? { ok: true, value: { sessionId: value.sessionId, correlationId: value.correlationId } }
      : this.invalid(value);
  }

  private ownerMutation(body: unknown, executorId: unknown, action: "rename" | "revoke"):
    ParseResult<RenameInput | RevokeInput> {
    const keys = ["kind", "protocolVersion", "executorId",
      ...(action === "rename" ? ["displayName"] : ["action"]), "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !exact(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== "1.0") return this.protocol(body);
    const common = body.executorId === executorId && typeof executorId === "string"
      && patterns.executor.test(executorId)
      && typeof body.idempotencyKey === "string" && patterns.idempotency.test(body.idempotencyKey)
      && typeof body.correlationId === "string" && patterns.correlation.test(body.correlationId);
    if (!common) return this.invalid(body);
    if (action === "rename") {
      if (body.kind !== "executor.rename.request" || typeof body.displayName !== "string"
        || !patterns.display.test(body.displayName)) return this.invalid(body);
      return { ok: true, value: body as unknown as RenameInput };
    }
    if (body.kind !== "executor.action.request" || body.action !== "revoke") return this.invalid(body);
    return { ok: true, value: body as unknown as RevokeInput };
  }

  private invalid(value: unknown): ParseResult<never> {
    return { ok: false, reason: "invalid-envelope", correlationId: this.extractCorrelation(value) };
  }
  private protocol(value: unknown): ParseResult<never> {
    return { ok: false, reason: "protocol-version-mismatch", correlationId: this.extractCorrelation(value) };
  }
  private extractCorrelation(value: unknown): string {
    return isRecord(value) && typeof value.correlationId === "string"
      && patterns.correlation.test(value.correlationId) ? value.correlationId : fallbackCorrelation;
  }
}
