import { Component, Inject } from "@noego/ioc";
import ConnectAccountRepo from "../repo/connect_account_repo";
import ConnectBrowserSessionRepo from "../repo/connect_browser_session_repo";
import TraceAdapter, { type TracePort } from "../observability/trace_adapter";
import ConnectAuthPolicy from "./connect_auth_policy";
import {
  ConnectClock,
  ConnectCredentials,
  ConnectIdGenerator,
  ConnectPasswordHasher,
  WebsiteLoggerAdapter,
  type WebsiteLoggerPort,
} from "./connect_auth_primitives";
import type {
  LoginInput,
  LogoutInput,
  SessionInput,
  SignupInput,
} from "./connect_auth_request_parser";
import ConnectSessionAuthService from "./connect_session_auth_service";

export type SignupResult =
  | { outcome: "created"; userId: string; username: string }
  | { outcome: "duplicate" }
  | { outcome: "failed" };

export interface LoginSession {
  userId: string;
  sessionId: string;
  sessionToken: string;
  csrfToken: string;
  expiresAt: string;
}

export type LoginResult =
  | { outcome: "created"; session: LoginSession }
  | { outcome: "invalid-credentials" }
  | { outcome: "failed" };

export type SessionResult =
  | { outcome: "authenticated"; userId: string; sessionId: string; expiresAt: string }
  | { outcome: "unauthorized" }
  | { outcome: "failed" };

export type LogoutResult =
  | { outcome: "ended"; sessionId: string }
  | { outcome: "unauthorized" }
  | { outcome: "csrf" }
  | { outcome: "failed" };

@Component()
export default class ConnectAuthService {
  private readonly logger: WebsiteLoggerPort;
  private readonly trace: TracePort;

  constructor(
    @Inject(ConnectAccountRepo) private readonly accountRepo: ConnectAccountRepo,
    @Inject(ConnectBrowserSessionRepo) private readonly sessionRepo: ConnectBrowserSessionRepo,
    @Inject(ConnectSessionAuthService) private readonly sessionAuth: ConnectSessionAuthService,
    @Inject(ConnectPasswordHasher) private readonly passwords: ConnectPasswordHasher,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectIdGenerator) private readonly ids: ConnectIdGenerator,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy,
    @Inject(WebsiteLoggerAdapter) loggers: WebsiteLoggerAdapter,
    @Inject(TraceAdapter) traces: TraceAdapter,
  ) {
    this.logger = loggers.forSource("connect-auth");
    this.trace = traces.forSource("ConnectAuthService");
  }

  async signup(input: SignupInput): Promise<SignupResult> {
    this.started("signup", input.correlationId);
    const userId = this.ids.userId();
    try {
      const passwordHash = await this.passwords.hash(input.password);
      await this.accountRepo.createAccount({
        user_id: userId,
        username: input.username,
        password_hash: passwordHash,
        status: "active",
        created_at: this.clock.now().toISOString(),
      });
      this.completed("signup", input.correlationId, { userId, outcome: "created", count: 1 });
      return { outcome: "created", userId, username: input.username };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        this.skipped("signup", input.correlationId, "duplicate");
        return { outcome: "duplicate" };
      }
      this.failed("signup", input.correlationId, error);
      return { outcome: "failed" };
    }
  }

  async login(input: LoginInput): Promise<LoginResult> {
    this.started("login", input.correlationId);
    try {
      const account = await this.accountRepo.findByUsername({ username: input.username });
      const validPassword = account
        ? await this.passwords.verify(input.password, account.password_hash)
        : await this.passwords.verifyCanary(input.password);
      if (!account || !validPassword || account.status !== "active") {
        this.skipped("login", input.correlationId, "invalid-credentials");
        return { outcome: "invalid-credentials" };
      }
      const now = this.clock.now();
      const sessionId = this.ids.sessionId();
      const sessionToken = this.credentials.randomToken();
      const csrfToken = this.credentials.randomToken();
      const absoluteExpiry = new Date(now.getTime() + this.policy.absoluteSessionMs);
      const idleExpiry = new Date(now.getTime() + this.policy.idleSessionMs);
      await this.sessionRepo.createSession({
        session_id: sessionId,
        user_id: account.user_id,
        session_token_hash: this.credentials.hashToken(sessionToken),
        csrf_token_hash: this.credentials.hashToken(csrfToken),
        status: "active",
        created_at: now.toISOString(),
        last_seen_at: now.toISOString(),
        idle_expires_at: idleExpiry.toISOString(),
        absolute_expires_at: absoluteExpiry.toISOString(),
      });
      this.completed("login", input.correlationId, {
        userId: account.user_id,
        sessionId,
        outcome: "created",
        count: 1,
      });
      return {
        outcome: "created",
        session: {
          userId: account.user_id,
          sessionId,
          sessionToken,
          csrfToken,
          expiresAt: absoluteExpiry.toISOString(),
        },
      };
    } catch (error) {
      this.failed("login", input.correlationId, error);
      return { outcome: "failed" };
    }
  }

  async session(input: SessionInput, sessionToken: string | null): Promise<SessionResult> {
    this.started("session", input.correlationId);
    try {
      const authenticated = await this.sessionAuth.authenticate(sessionToken);
      if (!authenticated.ok || authenticated.value.session.session_id !== input.sessionId) {
        this.skipped("session", input.correlationId, "unauthorized");
        return { outcome: "unauthorized" };
      }
      const { account, session } = authenticated.value;
      this.completed("session", input.correlationId, {
        userId: account.user_id,
        sessionId: session.session_id,
        outcome: "authenticated",
        count: 1,
      });
      return {
        outcome: "authenticated",
        userId: account.user_id,
        sessionId: session.session_id,
        expiresAt: session.absolute_expires_at,
      };
    } catch (error) {
      this.failed("session", input.correlationId, error);
      return { outcome: "failed" };
    }
  }

  async logout(
    input: LogoutInput,
    sessionToken: string | null,
    csrfCookie: string | null,
    csrfHeader: string | null,
  ): Promise<LogoutResult> {
    this.started("logout", input.correlationId);
    try {
      const authenticated = await this.sessionAuth.authorizeLogout(
        sessionToken,
        csrfCookie,
        csrfHeader,
      );
      if (!authenticated.ok) {
        this.skipped("logout", input.correlationId, authenticated.reason);
        return { outcome: authenticated.reason };
      }
      const session = authenticated.value.session;
      if (session.session_id !== input.sessionId) {
        this.skipped("logout", input.correlationId, "unauthorized");
        return { outcome: "unauthorized" };
      }
      await this.sessionRepo.revokeSession({
        session_id: session.session_id,
        revoked_at: this.clock.now().toISOString(),
      });
      this.completed("logout", input.correlationId, {
        userId: session.user_id,
        sessionId: session.session_id,
        outcome: "ended",
        count: session.status === "active" ? 1 : 0,
      });
      return { outcome: "ended", sessionId: session.session_id };
    } catch (error) {
      this.failed("logout", input.correlationId, error);
      return { outcome: "failed" };
    }
  }

  private started(action: string, correlationId: string): void {
    const context = { route: `/v1/connect/auth/${action}`, action, outcome: "started", correlationId };
    this.logger.info("connect.auth.started", context);
    this.trace.info("started", context);
  }

  private completed(
    action: string,
    correlationId: string,
    context: Record<string, unknown>,
  ): void {
    const safe = { route: `/v1/connect/auth/${action}`, action, correlationId, ...context };
    this.logger.info("connect.auth.completed", safe);
    this.trace.info("completed", safe);
  }

  private skipped(action: string, correlationId: string, outcome: string): void {
    const context = { route: `/v1/connect/auth/${action}`, action, outcome, correlationId, count: 0 };
    this.logger.warn("connect.auth.skipped", context);
    this.trace.warn("skipped", context);
  }

  private failed(action: string, correlationId: string, error: unknown): void {
    const context = {
      route: `/v1/connect/auth/${action}`,
      action,
      outcome: "failed",
      correlationId,
      errorType: error instanceof Error ? error.name : "unknown",
    };
    this.logger.error("connect.auth.failed", context);
    this.trace.error("failed", context);
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Error
      && error.message.toLowerCase().includes("unique constraint failed");
  }
}
