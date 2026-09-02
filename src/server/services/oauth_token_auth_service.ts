import { Component, Inject } from "@noego/ioc";
import OAuthRepo, {
  type ActiveTokenWithConnection,
  type OAuthConnectionScope,
} from "../repo/oauth_repo";
import { ConnectClock, ConnectCredentials } from "./connect_auth_primitives";
import OAuthConnectionMachinesService, {
  type OAuthConnectionMember,
} from "./oauth_connection_machines_service";
import { tokenMatchesResource } from "./oauth_flow_service";

export class InvalidOAuthTokenError extends Error {}

export type { OAuthConnectionMember };

export interface OAuthPrincipal {
  user_id: string;
  client_id: string;
  connection_id: string;
  approved_scope: OAuthConnectionScope;
  allow_shell: boolean;
  allow_web: boolean;
  /**
   * Every active executor the connection's user owns, oldest link first — the
   * deterministic routing order. Resolved live on every call.
   */
  members: OAuthConnectionMember[];
}

const BEARER_PREFIX = /^Bearer\s+/i;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,}$/;

@Component()
export default class OAuthTokenAuthService {
  constructor(
    @Inject(OAuthRepo) private readonly oauth: OAuthRepo,
    @Inject(OAuthConnectionMachinesService)
    private readonly machines: OAuthConnectionMachinesService,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
  ) {}

  /** True when the bearer even has the shape of one of our OAuth tokens. */
  looksLikeOAuthToken(
    authorizationHeader: string | null | undefined,
    expectedResource: string,
  ): boolean {
    const token = (authorizationHeader ?? "").replace(BEARER_PREFIX, "").trim();
    return TOKEN_SHAPE.test(token) && tokenMatchesResource(token, expectedResource);
  }

  async authenticate(
    authorizationHeader: string | null | undefined,
    expectedResource: string,
  ): Promise<OAuthPrincipal> {
    const token = (authorizationHeader ?? "")
      .replace(BEARER_PREFIX, "")
      .trim();
    if (
      !TOKEN_SHAPE.test(token)
      || !tokenMatchesResource(token, expectedResource)
    ) {
      throw new InvalidOAuthTokenError("Invalid OAuth token");
    }

    const record = await this.oauth.findActiveTokenWithConnection({
      token_hash: this.credentials.hashToken(token),
    });
    if (!activeAccessToken(record, this.clock.now())) {
      throw new InvalidOAuthTokenError("Invalid OAuth token");
    }

    // The connection acts as the user: its machines are the user's executors,
    // resolved live so newly linked machines appear and revoked ones vanish
    // without re-consent or token re-issue.
    const members = await this.machines.listForUser(record.user_id, record.approved_scope);

    return {
      user_id: record.user_id,
      client_id: record.client_id,
      connection_id: record.connection_id,
      approved_scope: record.approved_scope,
      allow_shell: record.allow_shell,
      allow_web: record.allow_web,
      members,
    };
  }
}

function activeAccessToken(
  record: ActiveTokenWithConnection | null,
  now: Date,
): record is ActiveTokenWithConnection {
  return Boolean(
    record
    && record.kind === "access"
    && record.status === "active"
    && record.connection_status === "active"
    && new Date(record.expires_at).getTime() > now.getTime(),
  );
}
