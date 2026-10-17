import { Component, Inject } from "@noego/ioc";
import { Result } from "@noego/trust";
import ConnectAccountRepo, { type ConnectAccount } from "../repo/connect_account_repo";
import ConnectBrowserSessionRepo, {
  type ConnectBrowserSession,
} from "../repo/connect_browser_session_repo";
import ConnectAuthPolicy from "./connect_auth_policy";
import { ConnectClock, ConnectCredentials } from "./connect_auth_primitives";

export interface AuthenticatedConnectSession {
  account: ConnectAccount;
  session: ConnectBrowserSession;
}

/**
 * Browser-session authentication. Every method returns a trust Result: the
 * authenticated account and session, or a failure of kind `unauthorized`,
 * `csrf`, or the repositories' `query_failed` / `write_failed`. Callers decide
 * what each kind means for their response.
 */
@Component()
export default class ConnectSessionAuthService {
  constructor(
    @Inject(ConnectAccountRepo) private readonly accountRepo: ConnectAccountRepo,
    @Inject(ConnectBrowserSessionRepo) private readonly sessionRepo: ConnectBrowserSessionRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy,
  ) {}

  async authenticate(sessionToken: string | null) {
    const result = await this.load(sessionToken, false);
    if (!result.ok) return result;
    return this.refresh(result.value);
  }

  /**
   * Authorizes a state-changing request. Unlike authorizeLogout, this never
   * admits a revoked session: logout's allow-revoked behavior exists only to
   * make that one endpoint idempotent.
   */
  async authorizeMutation(
    sessionToken: string | null,
    csrfCookie: string | null,
    csrfHeader: string | null,
  ) {
    const result = await this.load(sessionToken, false);
    if (!result.ok) return result;
    if (!this.validCsrf(result.value.session, csrfCookie, csrfHeader)) {
      return Result.err({ kind: "csrf" });
    }
    return this.refresh(result.value);
  }

  private async refresh(value: AuthenticatedConnectSession) {
    const now = this.clock.now();
    const absolute = new Date(value.session.absolute_expires_at);
    const idleExpiry = new Date(
      Math.min(now.getTime() + this.policy.idleSessionMs, absolute.getTime()),
    ).toISOString();
    const touched = await this.sessionRepo.touchSession({
      session_id: value.session.session_id,
      last_seen_at: now.toISOString(),
      idle_expires_at: idleExpiry,
    });
    if (!touched.ok) return touched;
    return Result.ok({
      ...value,
      session: {
        ...value.session,
        last_seen_at: now.toISOString(),
        idle_expires_at: idleExpiry,
      },
    });
  }

  async authorizeLogout(
    sessionToken: string | null,
    csrfCookie: string | null,
    csrfHeader: string | null,
  ) {
    const result = await this.load(sessionToken, true);
    if (!result.ok) return result;
    if (!this.validCsrf(result.value.session, csrfCookie, csrfHeader)) {
      return Result.err({ kind: "csrf" });
    }
    return result;
  }

  private validCsrf(
    session: ConnectBrowserSession,
    csrfCookie: string | null,
    csrfHeader: string | null,
  ): boolean {
    return !!csrfCookie && !!csrfHeader
      && this.credentials.matchesHash(csrfCookie, session.csrf_token_hash)
      && this.credentials.matchesHash(csrfHeader, session.csrf_token_hash);
  }

  private async load(sessionToken: string | null, allowRevoked: boolean) {
    if (!sessionToken) return Result.err({ kind: "unauthorized" });
    const found = await this.sessionRepo.findByTokenHash({
      session_token_hash: this.credentials.hashToken(sessionToken),
    });
    if (!found.ok) return found;
    const session = found.value;
    if (!session || (!allowRevoked && session.status !== "active")) {
      return Result.err({ kind: "unauthorized" });
    }
    const now = this.clock.now().getTime();
    if (
      new Date(session.idle_expires_at).getTime() <= now
      || new Date(session.absolute_expires_at).getTime() <= now
    ) {
      if (session.status === "active") {
        const revoked = await this.sessionRepo.revokeSession({
          session_id: session.session_id,
          revoked_at: this.clock.now().toISOString(),
        });
        if (!revoked.ok) return revoked;
      }
      return Result.err({ kind: "unauthorized" });
    }
    const accountLookup = await this.accountRepo.findByUserId({ user_id: session.user_id });
    if (!accountLookup.ok) return accountLookup;
    const account = accountLookup.value;
    if (!account || account.status !== "active") {
      return Result.err({ kind: "unauthorized" });
    }
    return Result.ok({ account, session });
  }
}
