import { Component, Inject } from "@noego/ioc";
import ConnectAccountRepo from "../repo/connect_account_repo";
import ConnectBrowserSessionRepo from "../repo/connect_browser_session_repo";
import ConnectIdentityRepo from "../repo/connect_identity_repo";
import type { RepoFailure } from "../repo/repo_failure";
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
  GoogleInput,
  LogoutInput,
  SessionInput,
  SignupInput,
} from "./connect_auth_request_parser";
import ConnectSessionAuthService from "./connect_session_auth_service";
import ConnectGoogleTokenVerifier from "./connect_google_token_verifier";

export type SignupResult =
  | { outcome: "created"; userId: string; username: string; email: string }
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

/**
 * Browser account flows. Repository failures are decided here into each
 * flow's `failed` outcome (a unique violation during signup is `duplicate`),
 * logged once, exactly as a thrown error in that flow is.
 */
@Component()
export default class ConnectAuthService {
  private readonly logger: WebsiteLoggerPort;
  private readonly trace: TracePort;

  constructor(
    @Inject(ConnectAccountRepo) private readonly accountRepo: ConnectAccountRepo,
    @Inject(ConnectBrowserSessionRepo) private readonly sessionRepo: ConnectBrowserSessionRepo,
    @Inject(ConnectIdentityRepo) private readonly identityRepo: ConnectIdentityRepo,
    @Inject(ConnectSessionAuthService) private readonly sessionAuth: ConnectSessionAuthService,
    @Inject(ConnectPasswordHasher) private readonly passwords: ConnectPasswordHasher,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectIdGenerator) private readonly ids: ConnectIdGenerator,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy,
    @Inject(ConnectGoogleTokenVerifier) private readonly googleTokens: ConnectGoogleTokenVerifier,
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
      const now = this.clock.now().toISOString();
      const passwordless = await this.accountRepo.findPasswordlessByEmail({ email: input.email });
      if (!passwordless.ok) return this.signupFailed(input, passwordless.error);
      const existing = passwordless.value;
      if (existing) {
        const linked = await this.accountRepo.setPassword({
          user_id: existing.user_id,
          username: input.username,
          password_hash: passwordHash,
          updated_at: now,
        });
        if (!linked.ok) return this.signupFailed(input, linked.error);
        this.completed("signup", input.correlationId, { userId: existing.user_id, outcome: "linked", count: 1 });
        return { outcome: "created", userId: existing.user_id, username: input.username, email: input.email };
      }
      const created = await this.accountRepo.createAccount({
        user_id: userId,
        username: input.username,
        email: input.email,
        email_verified_at: null,
        password_hash: passwordHash,
        status: "active",
        created_at: now,
        updated_at: now,
      });
      if (!created.ok) return this.signupFailed(input, created.error);
      this.completed("signup", input.correlationId, { userId, outcome: "created", count: 1 });
      return { outcome: "created", userId, username: input.username, email: input.email };
    } catch (error) {
      return this.signupError(input, error);
    }
  }

  async login(input: LoginInput): Promise<LoginResult> {
    this.started("login", input.correlationId);
    try {
      const lookup = input.identifier.includes("@")
        ? await this.accountRepo.findByEmail({ email: input.identifier })
        : await this.accountRepo.findByUsername({ username: input.identifier });
      if (!lookup.ok) return this.repoFailed("login", input.correlationId, lookup.error);
      const account = lookup.value;
      const validPassword = account
        && account.password_hash
        ? await this.passwords.verify(input.password, account.password_hash)
        : await this.passwords.verifyCanary(input.password);
      if (!account || !validPassword || account.status !== "active") {
        this.skipped("login", input.correlationId, "invalid-credentials");
        return { outcome: "invalid-credentials" };
      }
      return this.createSession(account, input.correlationId, "login");
    } catch (error) {
      this.failed("login", input.correlationId, error);
      return { outcome: "failed" };
    }
  }

  async google(input: GoogleInput): Promise<LoginResult> {
    this.started("google", input.correlationId);
    try {
      const identity = await this.googleTokens.verify(input.credential);
      const email = identity?.email ?? "";
      const subject = identity?.subject ?? "";
      if (!identity || !this.policy.isAllowedEmail(email)) {
        this.skipped("google", input.correlationId, "invalid-credentials");
        return { outcome: "invalid-credentials" };
      }

      const lookup = await this.accountRepo.findByEmail({ email });
      if (!lookup.ok) return this.repoFailed("google", input.correlationId, lookup.error);
      let account = lookup.value;
      if (!account) {
        const now = this.clock.now().toISOString();
        const userId = this.ids.userId();
        const created = await this.accountRepo.createAccount({
          user_id: userId,
          // Google does not supply a username; use the generated account ID
          // rather than assigning every new identity the same unique name.
          username: userId,
          email,
          email_verified_at: now,
          password_hash: null,
          status: "active",
          created_at: now,
          updated_at: now,
        });
        if (!created.ok) return this.repoFailed("google", input.correlationId, created.error);
        const persisted = await this.accountRepo.findByEmail({ email });
        if (!persisted.ok) return this.repoFailed("google", input.correlationId, persisted.error);
        account = persisted.value;
        if (!account) throw new Error("Google account was not persisted");
      }
      const linked = await this.identityRepo.linkGoogle({
        id: this.ids.identityId(),
        user_id: account.user_id,
        provider_subject: subject,
        email,
        created_at: this.clock.now().toISOString(),
      });
      if (!linked.ok) return this.repoFailed("google", input.correlationId, linked.error);
      return this.createSession(account, input.correlationId, "google");
    } catch (error) {
      this.failed("google", input.correlationId, error);
      return { outcome: "failed" };
    }
  }

  async session(input: SessionInput, sessionToken: string | null): Promise<SessionResult> {
    this.started("session", input.correlationId);
    try {
      const authenticated = await this.sessionAuth.authenticate(sessionToken);
      if (!authenticated.ok) {
        switch (authenticated.error.kind) {
          case "unauthorized":
            this.skipped("session", input.correlationId, "unauthorized");
            return { outcome: "unauthorized" };
          case "query_failed":
          case "write_failed":
            return this.repoFailed("session", input.correlationId, authenticated.error);
          default: {
            const unhandled: never = authenticated.error;
            return unhandled;
          }
        }
      }
      if (authenticated.value.session.session_id !== input.sessionId) {
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

  private async createSession(
    account: { user_id: string; status: "active" | "disabled" },
    correlationId: string,
    action: "login" | "google",
  ): Promise<LoginResult> {
    if (account.status !== "active") return { outcome: "invalid-credentials" };
    const now = this.clock.now();
    const sessionId = this.ids.sessionId();
    const sessionToken = this.credentials.randomToken();
    const csrfToken = this.credentials.randomToken();
    const absoluteExpiry = new Date(now.getTime() + this.policy.absoluteSessionMs);
    const idleExpiry = new Date(now.getTime() + this.policy.idleSessionMs);
    const created = await this.sessionRepo.createSession({
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
    if (!created.ok) return this.repoFailed(action, correlationId, created.error);
    this.completed(action, correlationId, { userId: account.user_id, sessionId, outcome: "created", count: 1 });
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
        switch (authenticated.error.kind) {
          case "unauthorized":
          case "csrf":
            this.skipped("logout", input.correlationId, authenticated.error.kind);
            return { outcome: authenticated.error.kind };
          case "query_failed":
          case "write_failed":
            return this.repoFailed("logout", input.correlationId, authenticated.error);
          default: {
            const unhandled: never = authenticated.error;
            return unhandled;
          }
        }
      }
      const session = authenticated.value.session;
      if (session.session_id !== input.sessionId) {
        this.skipped("logout", input.correlationId, "unauthorized");
        return { outcome: "unauthorized" };
      }
      const revoked = await this.sessionRepo.revokeSession({
        session_id: session.session_id,
        revoked_at: this.clock.now().toISOString(),
      });
      if (!revoked.ok) return this.repoFailed("logout", input.correlationId, revoked.error);
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

  /** A repository failure during signup: handled exactly like a thrown one. */
  private signupFailed(input: SignupInput, failure: RepoFailure) {
    return this.signupError(input, failure.cause);
  }

  /** A unique violation means the account exists (`duplicate`); anything else fails signup. */
  private signupError(input: SignupInput, error: unknown): SignupResult {
    if (this.isUniqueViolation(error)) {
      this.skipped("signup", input.correlationId, "duplicate");
      return { outcome: "duplicate" };
    }
    this.failed("signup", input.correlationId, error);
    return { outcome: "failed" };
  }

  /** A repository failure in an auth flow: logged once here, answered `failed`. */
  private repoFailed(action: string, correlationId: string, failure: RepoFailure) {
    this.failed(action, correlationId, failure.cause);
    return { outcome: "failed" as const };
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
      // Bounded diagnostic detail; DB errors carry table/constraint names,
      // not credentials. Cause chains (sqlstack wraps driver errors) are the
      // part that actually identifies the failing query.
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
      errorCause: error instanceof Error && error.cause instanceof Error
        ? `${error.cause.name}: ${error.cause.message.slice(0, 300)}`
        : undefined,
    };
    this.logger.error("connect.auth.failed", context);
    this.trace.error("failed", context);
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const code = (error as Error & { code?: string }).code;
    const message = error.message.toLowerCase();
    return code === "23505"
      || message.includes("unique constraint failed")
      || message.includes("duplicate key value violates unique constraint");
  }
}
