import { Component, Inject } from "@noego/ioc";
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

export type ConnectSessionAuthResult =
  | { ok: true; value: AuthenticatedConnectSession }
  | { ok: false; reason: "unauthorized" | "csrf" };

@Component()
export default class ConnectSessionAuthService {
  constructor(
    @Inject(ConnectAccountRepo) private readonly accountRepo: ConnectAccountRepo,
    @Inject(ConnectBrowserSessionRepo) private readonly sessionRepo: ConnectBrowserSessionRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy,
  ) {}

  async authenticate(sessionToken: string | null): Promise<ConnectSessionAuthResult> {
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
  ): Promise<ConnectSessionAuthResult> {
    const result = await this.load(sessionToken, false);
    if (!result.ok) return result;
    if (!this.validCsrf(result.value.session, csrfCookie, csrfHeader)) {
      return { ok: false, reason: "csrf" };
    }
    return this.refresh(result.value);
  }

  private async refresh(
    value: AuthenticatedConnectSession,
  ): Promise<ConnectSessionAuthResult> {
    const now = this.clock.now();
    const absolute = new Date(value.session.absolute_expires_at);
    const idleExpiry = new Date(
      Math.min(now.getTime() + this.policy.idleSessionMs, absolute.getTime()),
    ).toISOString();
    await this.sessionRepo.touchSession({
      session_id: value.session.session_id,
      last_seen_at: now.toISOString(),
      idle_expires_at: idleExpiry,
    });
    return {
      ok: true,
      value: {
        ...value,
        session: {
          ...value.session,
          last_seen_at: now.toISOString(),
          idle_expires_at: idleExpiry,
        },
      },
    };
  }

  async authorizeLogout(
    sessionToken: string | null,
    csrfCookie: string | null,
    csrfHeader: string | null,
  ): Promise<ConnectSessionAuthResult> {
    const result = await this.load(sessionToken, true);
    if (!result.ok) return result;
    if (!this.validCsrf(result.value.session, csrfCookie, csrfHeader)) {
      return { ok: false, reason: "csrf" };
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

  private async load(
    sessionToken: string | null,
    allowRevoked: boolean,
  ): Promise<ConnectSessionAuthResult> {
    if (!sessionToken) return { ok: false, reason: "unauthorized" };
    const session = await this.sessionRepo.findByTokenHash({
      session_token_hash: this.credentials.hashToken(sessionToken),
    });
    if (!session || (!allowRevoked && session.status !== "active")) {
      return { ok: false, reason: "unauthorized" };
    }
    const now = this.clock.now().getTime();
    if (
      new Date(session.idle_expires_at).getTime() <= now
      || new Date(session.absolute_expires_at).getTime() <= now
    ) {
      if (session.status === "active") {
        await this.sessionRepo.revokeSession({
          session_id: session.session_id,
          revoked_at: this.clock.now().toISOString(),
        });
      }
      return { ok: false, reason: "unauthorized" };
    }
    const account = await this.accountRepo.findByUserId({ user_id: session.user_id });
    if (!account || account.status !== "active") {
      return { ok: false, reason: "unauthorized" };
    }
    return { ok: true, value: { account, session } };
  }
}
