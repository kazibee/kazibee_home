import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectAuthLogic from "../logic/connect_auth.logic";
import { GUEST_ACTOR } from "../types/actor";
import {
  ConnectAuthCookies,
  WebsiteLoggerAdapter,
  type WebsiteLoggerPort,
} from "../services/connect_auth_primitives";
import ConnectAuthRequestParser from "../services/connect_auth_request_parser";
import TraceAdapter, { type TracePort } from "../observability/trace_adapter";

@Component()
export default class ConnectAuthController {
  private readonly logger: WebsiteLoggerPort;
  private readonly trace: TracePort;

  constructor(
    @Inject(ConnectAuthLogic) private readonly logic: ConnectAuthLogic,
    @Inject(ConnectAuthRequestParser) private readonly parser: ConnectAuthRequestParser,
    @Inject(ConnectAuthCookies) private readonly cookies: ConnectAuthCookies,
    @Inject(WebsiteLoggerAdapter) loggers: WebsiteLoggerAdapter,
    @Inject(TraceAdapter) traces: TraceAdapter,
  ) {
    this.logger = loggers.forSource("connect-auth-controller");
    this.trace = traces.forSource("ConnectAuthController");
  }

  async signup({ req, res }: { req: Request; res: Response }) {
    this.routeStarted("signup");
    const input = this.parser.signup(req.body);
    if (!input.ok) return this.parseError(res, "signup", input.reason, input.correlationId);
    const result = await this.logic.signup(GUEST_ACTOR, input.value);
    if (result.outcome === "duplicate") {
      return this.error(res, 409, "invalid-envelope", "Account could not be created", input.value.correlationId);
    }
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.status(201).json({
      kind: "auth.signup.response",
      protocolVersion: "1.0",
      userId: result.userId,
      username: result.username,
      email: result.email,
      correlationId: input.value.correlationId,
    });
  }

  async login({ req, res }: { req: Request; res: Response }) {
    this.routeStarted("login");
    const input = this.parser.login(req.body);
    if (!input.ok) return this.parseError(res, "login", input.reason, input.correlationId);
    const result = await this.logic.login(GUEST_ACTOR, input.value);
    if (result.outcome === "invalid-credentials") {
      return this.error(res, 401, "invalid-envelope", "Invalid credentials", input.value.correlationId);
    }
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    this.cookies.set(res, result.session.sessionToken, result.session.csrfToken);
    return res.status(200).json({
      kind: "auth.login.response",
      protocolVersion: "1.0",
      userId: result.session.userId,
      sessionId: result.session.sessionId,
      actorRole: "browser_session",
      expiresAt: result.session.expiresAt,
      correlationId: input.value.correlationId,
    });
  }

  async google({ req, res }: { req: Request; res: Response }) {
    this.routeStarted("google");
    const input = this.parser.google(req.body);
    if (!input.ok) return this.parseError(res, "google", input.reason, input.correlationId);
    const result = await this.logic.google(GUEST_ACTOR, input.value);
    if (result.outcome === "invalid-credentials") {
      return this.error(res, 401, "invalid-envelope", "Invalid Google account", input.value.correlationId);
    }
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    this.cookies.set(res, result.session.sessionToken, result.session.csrfToken);
    return res.status(200).json({
      kind: "auth.login.response",
      protocolVersion: "1.0",
      userId: result.session.userId,
      sessionId: result.session.sessionId,
      actorRole: "browser_session",
      expiresAt: result.session.expiresAt,
      correlationId: input.value.correlationId,
    });
  }

  async session({ req, res }: { req: Request; res: Response }) {
    this.routeStarted("session");
    const input = this.parser.session(req);
    if (!input.ok) return this.parseError(res, "session", input.reason, input.correlationId);
    const result = await this.logic.session(
      GUEST_ACTOR,
      input.value,
      this.parser.sessionCookie(req),
    );
    if (result.outcome === "unauthorized") {
      return this.error(res, 401, "revoked", "Session is not active", input.value.correlationId);
    }
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.status(200).json({
      kind: "auth.session.response",
      protocolVersion: "1.0",
      userId: result.userId,
      sessionId: result.sessionId,
      actorRole: "browser_session",
      expiresAt: result.expiresAt,
      correlationId: input.value.correlationId,
    });
  }

  async logout({ req, res }: { req: Request; res: Response }) {
    this.routeStarted("logout");
    const input = this.parser.logout(req);
    if (!input.ok) return this.parseError(res, "logout", input.reason, input.correlationId);
    const result = await this.logic.logout(
      GUEST_ACTOR,
      input.value,
      this.parser.sessionCookie(req),
      this.parser.csrfCookie(req),
      this.parser.csrfHeader(req),
    );
    if (result.outcome === "csrf") {
      return this.error(res, 403, "invalid-envelope", "CSRF validation failed", input.value.correlationId);
    }
    if (result.outcome === "unauthorized") {
      this.cookies.clear(res);
      return this.error(res, 401, "revoked", "Session is not active", input.value.correlationId);
    }
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    this.cookies.clear(res);
    return res.status(200).json({
      kind: "auth.logout.response",
      protocolVersion: "1.0",
      sessionId: result.sessionId,
      ended: true,
      correlationId: input.value.correlationId,
    });
  }

  private parseError(
    res: Response,
    action: string,
    reason: "invalid-envelope" | "protocol-version-mismatch",
    correlationId: string,
  ): Response {
    const context = {
      route: `/v1/connect/auth/${action}`,
      action,
      outcome: reason,
      correlationId,
      count: 0,
    };
    this.logger.warn("connect.auth.skipped", context);
    this.trace.warn("skipped", context);
    return this.error(
      res,
      reason === "protocol-version-mismatch" ? 409 : 400,
      reason,
      reason === "protocol-version-mismatch" ? "Protocol version mismatch" : "Invalid request envelope",
      correlationId,
    );
  }

  private routeStarted(action: string): void {
    const context = {
      route: `/v1/connect/auth/${action}`,
      action,
      outcome: "started",
    };
    this.logger.info("connect.auth.started", context);
    this.trace.info("started", context);
  }

  private internal(res: Response, correlationId: string): Response {
    return this.error(res, 500, "invalid-envelope", "Internal server error", correlationId);
  }

  private error(
    res: Response,
    status: number,
    code: "invalid-envelope" | "protocol-version-mismatch" | "revoked",
    message: string,
    correlationId: string,
  ): Response {
    return res.status(status).json({
      kind: "error",
      protocolVersion: "1.0",
      code,
      message,
      retryable: false,
      correlationId,
    });
  }
}
