import { Component, Inject, LoadAs } from "@noego/ioc";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectAuthPolicy from "./connect_auth_policy";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "invalid-envelope" | "protocol-version-mismatch"; correlationId: string };

export interface SignupInput {
  kind: "auth.signup.request";
  protocolVersion: "1.0";
  username: string;
  email: string;
  password: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface LoginInput extends Omit<SignupInput, "kind" | "email" | "username"> {
  kind: "auth.login.request";
  identifier: string;
}

export interface SessionInput {
  kind: "auth.session.request";
  protocolVersion: "1.0";
  sessionId: string;
  actorRole: "browser_session";
  correlationId: string;
}

export interface LogoutInput extends Omit<SessionInput, "kind"> {
  kind: "auth.logout.request";
  idempotencyKey: string;
}

export interface GoogleInput {
  kind: "auth.google.request";
  protocolVersion: "1.0";
  credential: string;
  idempotencyKey: string;
  correlationId: string;
}

const CORRELATION_PATTERN = /^cor_[A-Za-z0-9]{8,64}$/;
const IDEMPOTENCY_PATTERN = /^idem_[A-Za-z0-9_-]{16,80}$/;
const SESSION_PATTERN = /^ses_[A-Za-z0-9]{8,64}$/;
const FALLBACK_CORRELATION_ID = "cor_invalid000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && [...keys].sort().every((key, index) => key === actual[index]);
}

function stringField(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === "string" ? value[key] : null;
}

@Component({ scope: LoadAs.Singleton })
export default class ConnectAuthRequestParser {
  constructor(@Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy) {}

  signup(body: unknown): ParseResult<SignupInput> {
    const parsed = this.signupCredentials(body);
    return parsed.ok ? { ok: true, value: { ...parsed.value, kind: "auth.signup.request" } } : parsed;
  }

  login(body: unknown): ParseResult<LoginInput> {
    const parsed = this.loginCredentials(body);
    return parsed.ok ? { ok: true, value: { ...parsed.value, kind: "auth.login.request" } } : parsed;
  }

  google(body: unknown): ParseResult<GoogleInput> {
    const keys = ["kind", "protocolVersion", "credential", "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !hasExactKeys(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== this.policy.protocolVersion) return this.protocol(body);
    const credential = stringField(body, "credential");
    const idempotencyKey = stringField(body, "idempotencyKey");
    const correlationId = stringField(body, "correlationId");
    if (
      body.kind !== "auth.google.request"
      || !credential || credential.length > 8192
      || !idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey)
      || !correlationId || !CORRELATION_PATTERN.test(correlationId)
    ) return this.invalid(body);
    return {
      ok: true,
      value: { kind: "auth.google.request", protocolVersion: "1.0", credential, idempotencyKey, correlationId },
    };
  }

  session(req: Request): ParseResult<SessionInput> {
    return this.sessionEnvelope(this.requestEnvelope(req), "auth.session.request", false);
  }

  logout(req: Request): ParseResult<LogoutInput> {
    return this.sessionEnvelope(this.requestEnvelope(req), "auth.logout.request", true);
  }

  sessionCookie(req: Request): string | null {
    const cookies: unknown = req.cookies;
    if (!isRecord(cookies)) return null;
    return stringField(cookies, this.policy.sessionCookieName);
  }

  csrfCookie(req: Request): string | null {
    const cookies: unknown = req.cookies;
    if (!isRecord(cookies)) return null;
    return stringField(cookies, this.policy.csrfCookieName);
  }

  csrfHeader(req: Request): string | null {
    const value = req.headers["x-csrf-token"];
    return typeof value === "string" ? value : null;
  }

  private signupCredentials(body: unknown): ParseResult<Omit<SignupInput, "kind">> {
    const keys = ["kind", "protocolVersion", "username", "email", "password", "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !hasExactKeys(body, keys)) return this.invalid(body);
    const correlationId = stringField(body, "correlationId");
    const protocolVersion = stringField(body, "protocolVersion");
    if (protocolVersion !== this.policy.protocolVersion) return this.protocol(body);
    const rawUsername = stringField(body, "username");
    const password = stringField(body, "password");
    const idempotencyKey = stringField(body, "idempotencyKey");
    if (
      body.kind !== "auth.signup.request" || !correlationId || !CORRELATION_PATTERN.test(correlationId)
      || !rawUsername || !password || !idempotencyKey
      || rawUsername.length > this.policy.rawUsernameMaxLength
      || !IDEMPOTENCY_PATTERN.test(idempotencyKey)
    ) return this.invalid(body);
    const username = this.policy.normalizeUsername(rawUsername);
    const email = this.policy.normalizeEmail(stringField(body, "email") ?? "");
    if (
      !this.policy.usernamePattern.test(username)
      || !this.policy.isAllowedEmail(email)
      || password.length < this.policy.passwordMinLength
      || password.length > this.policy.passwordMaxLength
    ) return this.invalid(body);
    return {
      ok: true,
      value: {
        protocolVersion: "1.0",
        username,
        email,
        password,
        idempotencyKey,
        correlationId,
      },
    };
  }

  private loginCredentials(body: unknown): ParseResult<Omit<LoginInput, "kind">> {
    const keys = ["kind", "protocolVersion", "username", "password", "idempotencyKey", "correlationId"];
    if (!isRecord(body) || !hasExactKeys(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== this.policy.protocolVersion) return this.protocol(body);
    const correlationId = stringField(body, "correlationId");
    const rawIdentifier = stringField(body, "username");
    const password = stringField(body, "password");
    const idempotencyKey = stringField(body, "idempotencyKey");
    if (
      body.kind !== "auth.login.request" || !correlationId || !CORRELATION_PATTERN.test(correlationId)
      || !rawIdentifier || !password || !idempotencyKey
      || rawIdentifier.length > this.policy.rawUsernameMaxLength
      || !IDEMPOTENCY_PATTERN.test(idempotencyKey)
      || password.length < this.policy.passwordMinLength
      || password.length > this.policy.passwordMaxLength
    ) return this.invalid(body);
    const identifier = rawIdentifier.includes("@")
      ? this.policy.normalizeEmail(rawIdentifier)
      : this.policy.normalizeUsername(rawIdentifier);
    if (!this.policy.isAllowedIdentifier(identifier)) return this.invalid(body);
    return { ok: true, value: { protocolVersion: "1.0", identifier, password, idempotencyKey, correlationId } };
  }

  private sessionEnvelope(
    body: unknown,
    kind: "auth.session.request",
    mutation: false,
  ): ParseResult<SessionInput>;
  private sessionEnvelope(
    body: unknown,
    kind: "auth.logout.request",
    mutation: true,
  ): ParseResult<LogoutInput>;
  private sessionEnvelope(
    body: unknown,
    kind: "auth.session.request" | "auth.logout.request",
    mutation: boolean,
  ): ParseResult<SessionInput> | ParseResult<LogoutInput> {
    const keys = [
      "kind", "protocolVersion", "sessionId", "actorRole", "correlationId",
      ...(mutation ? ["idempotencyKey"] : []),
    ];
    if (!isRecord(body) || !hasExactKeys(body, keys)) return this.invalid(body);
    if (body.protocolVersion !== this.policy.protocolVersion) return this.protocol(body);
    const sessionId = stringField(body, "sessionId");
    const correlationId = stringField(body, "correlationId");
    const idempotencyKey = mutation ? stringField(body, "idempotencyKey") : null;
    if (
      body.kind !== kind || body.actorRole !== "browser_session"
      || !sessionId || !SESSION_PATTERN.test(sessionId)
      || !correlationId || !CORRELATION_PATTERN.test(correlationId)
      || (mutation && (!idempotencyKey || !IDEMPOTENCY_PATTERN.test(idempotencyKey)))
    ) return this.invalid(body);
    const base: SessionInput = {
      kind: "auth.session.request",
      protocolVersion: "1.0",
      sessionId,
      actorRole: "browser_session",
      correlationId,
    };
    return mutation
      ? { ok: true, value: { ...base, kind: "auth.logout.request", idempotencyKey: idempotencyKey! } }
      : { ok: true, value: base };
  }

  private requestEnvelope(req: Request): unknown {
    if (isRecord(req.body) && Object.keys(req.body).length > 0) return req.body;
    return req.query;
  }

  private invalid(value: unknown): ParseResult<never> {
    return { ok: false, reason: "invalid-envelope", correlationId: this.correlation(value) };
  }

  private protocol(value: unknown): ParseResult<never> {
    return { ok: false, reason: "protocol-version-mismatch", correlationId: this.correlation(value) };
  }

  private correlation(value: unknown): string {
    if (!isRecord(value)) return FALLBACK_CORRELATION_ID;
    const correlationId = stringField(value, "correlationId");
    return correlationId && CORRELATION_PATTERN.test(correlationId)
      ? correlationId
      : FALLBACK_CORRELATION_ID;
  }
}
