import { Component, Inject, LoadAs } from "@noego/ioc";
import type { Request } from "express";
import ConnectDesktopPolicy from "./connect_desktop_policy";

export type DesktopPlatform = "macos" | "linux" | "windows";
export type DesktopArchitecture = "x64" | "arm64";
export interface DesktopClaimCreateInput {
  kind: "desktop.claim.create.request"; protocolVersion: "1.0";
  claimId: string; deviceId: string; actorRole: "desktop_device";
  displayName: string; platform: DesktopPlatform; architecture: DesktopArchitecture;
  desktopVersion: string; keyFingerprint: string; idempotencyKey: string; correlationId: string;
}
export interface DesktopClaimDecisionInput {
  kind: "desktop.claim.decision.request"; protocolVersion: "1.0"; claimId: string;
  sessionId: string; actorRole: "browser_session"; decision: "accept" | "deny";
  idempotencyKey: string; correlationId: string;
}
export interface DesktopRenameInput {
  kind: "desktop.rename.request"; protocolVersion: "1.0"; deviceId: string;
  displayName: string; idempotencyKey: string; correlationId: string;
}
export interface DesktopRevokeInput {
  kind: "desktop.action.request"; protocolVersion: "1.0"; deviceId: string;
  action: "revoke"; idempotencyKey: string; correlationId: string;
}
export type DesktopRelayHeaders = {
  token: string; deviceId: string; generation: number;
  audience: "desktop-relay"; protocolVersion: "1.0";
};
export type ParseResult<T> = { ok: true; value: T } | {
  ok: false; reason: "invalid-envelope" | "protocol-version-mismatch"; correlationId: string;
};

const patterns = {
  claim: /^clm_[A-Za-z0-9]{8,64}$/, device: /^dev_[A-Za-z0-9]{8,64}$/,
  session: /^ses_[A-Za-z0-9]{8,64}$/, correlation: /^cor_[A-Za-z0-9]{8,64}$/,
  idempotency: /^idem_[A-Za-z0-9_-]{16,80}$/,
  display: /^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,79}$/,
  version: /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]{1,32})?$/,
  fingerprint: /^[a-f0-9]{64}$/, code: /^[A-Z]{4}-[A-Z]{4}$/,
  token: /^[A-Za-z0-9_-]{43}$/, generation: /^[1-9][0-9]{0,15}$/,
};
const fallbackCorrelation = "cor_invalid000";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && expected.every((key, index) => actual[index] === key);
};
const matches = (value: unknown, pattern: RegExp): boolean =>
  typeof value === "string" && pattern.test(value);

@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopRequestParser {
  constructor(@Inject(ConnectDesktopPolicy) private readonly policy: ConnectDesktopPolicy) {}

  claimCreate(body: unknown): ParseResult<DesktopClaimCreateInput> {
    const keys = ["kind", "protocolVersion", "claimId", "deviceId", "actorRole", "displayName",
      "platform", "architecture", "desktopVersion", "keyFingerprint", "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !exact(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== "1.0") return this.protocol(body);
    const valid = body.kind === "desktop.claim.create.request" && body.actorRole === "desktop_device"
      && matches(body.claimId, patterns.claim) && matches(body.deviceId, patterns.device)
      && matches(body.displayName, patterns.display)
      && ["macos", "linux", "windows"].includes(String(body.platform))
      && ["x64", "arm64"].includes(String(body.architecture))
      && (body.platform !== "windows" || body.architecture === "x64")
      && matches(body.desktopVersion, patterns.version)
      && matches(body.keyFingerprint, patterns.fingerprint)
      && matches(body.idempotencyKey, patterns.idempotency)
      && matches(body.correlationId, patterns.correlation);
    return valid ? { ok: true, value: body as unknown as DesktopClaimCreateInput } : this.invalid(body);
  }

  decision(body: unknown, claimId: unknown): ParseResult<DesktopClaimDecisionInput> {
    const keys = ["kind", "protocolVersion", "claimId", "sessionId", "actorRole", "decision",
      "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !exact(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== "1.0") return this.protocol(body);
    const valid = body.kind === "desktop.claim.decision.request" && body.actorRole === "browser_session"
      && body.claimId === claimId && matches(claimId, patterns.claim)
      && matches(body.sessionId, patterns.session)
      && (body.decision === "accept" || body.decision === "deny")
      && matches(body.idempotencyKey, patterns.idempotency)
      && matches(body.correlationId, patterns.correlation);
    return valid ? { ok: true, value: body as unknown as DesktopClaimDecisionInput } : this.invalid(body);
  }

  rename(body: unknown, deviceId: unknown): ParseResult<DesktopRenameInput> {
    return this.ownerMutation(body, deviceId, "rename") as ParseResult<DesktopRenameInput>;
  }
  revoke(body: unknown, deviceId: unknown): ParseResult<DesktopRevokeInput> {
    return this.ownerMutation(body, deviceId, "revoke") as ParseResult<DesktopRevokeInput>;
  }
  correlation(req: Request): string {
    const value = typeof req.query.correlationId === "string" ? req.query.correlationId : null;
    return value && patterns.correlation.test(value) ? value : fallbackCorrelation;
  }
  bootstrapToken(req: Request): string | null {
    const value = req.headers[this.policy.bootstrapHeader];
    return typeof value === "string" && patterns.token.test(value) ? value : null;
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
    return matches(value.sessionId, patterns.session) && matches(value.correlationId, patterns.correlation)
      ? { ok: true, value: { sessionId: value.sessionId as string, correlationId: value.correlationId as string } }
      : this.invalid(value);
  }

  /** Fail closed unless the raw request contains each relay header exactly once. */
  relayHeaders(req: Request): DesktopRelayHeaders | null {
    const raw = req.rawHeaders;
    const one = (name: string): string | null => {
      const values: string[] = [];
      for (let index = 0; index < raw.length; index += 2) {
        if (raw[index]?.toLowerCase() === name) values.push(raw[index + 1] ?? "");
      }
      return values.length === 1 && !values[0]!.includes(",") ? values[0]! : null;
    };
    const authorization = one("authorization");
    const deviceId = one("x-kazi-device-id");
    const generation = one("x-kazi-credential-generation");
    const audience = one("x-kazi-audience");
    const protocolVersion = one("x-kazi-protocol-version");
    if (!authorization?.startsWith("Bearer ") || !patterns.token.test(authorization.slice(7))
      || !deviceId || !patterns.device.test(deviceId) || !generation || !patterns.generation.test(generation)
      || audience !== "desktop-relay" || protocolVersion !== "1.0") return null;
    const parsedGeneration = Number(generation);
    if (!Number.isSafeInteger(parsedGeneration)) return null;
    return { token: authorization.slice(7), deviceId, generation: parsedGeneration,
      audience: "desktop-relay", protocolVersion: "1.0" };
  }

  private ownerMutation(body: unknown, deviceId: unknown, action: "rename" | "revoke"):
    ParseResult<DesktopRenameInput | DesktopRevokeInput> {
    const keys = ["kind", "protocolVersion", "deviceId",
      ...(action === "rename" ? ["displayName"] : ["action"]), "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !exact(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== "1.0") return this.protocol(body);
    const common = body.deviceId === deviceId && matches(deviceId, patterns.device)
      && matches(body.idempotencyKey, patterns.idempotency) && matches(body.correlationId, patterns.correlation);
    if (!common) return this.invalid(body);
    if (action === "rename") {
      if (body.kind !== "desktop.rename.request" || !matches(body.displayName, patterns.display)) return this.invalid(body);
      return { ok: true, value: body as unknown as DesktopRenameInput };
    }
    if (body.kind !== "desktop.action.request" || body.action !== "revoke") return this.invalid(body);
    return { ok: true, value: body as unknown as DesktopRevokeInput };
  }
  private invalid(value: unknown): ParseResult<never> {
    return { ok: false, reason: "invalid-envelope", correlationId: this.extractCorrelation(value) };
  }
  private protocol(value: unknown): ParseResult<never> {
    return { ok: false, reason: "protocol-version-mismatch", correlationId: this.extractCorrelation(value) };
  }
  private extractCorrelation(value: unknown): string {
    return isRecord(value) && matches(value.correlationId, patterns.correlation)
      ? value.correlationId as string : fallbackCorrelation;
  }
}
