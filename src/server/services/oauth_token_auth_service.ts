import { Component, Inject } from "@noego/ioc";
import OAuthRepo, {
  type ActiveTokenWithConnection,
  type OAuthConnectionScope,
} from "../repo/oauth_repo";
import { ConnectClock, ConnectCredentials } from "./connect_auth_primitives";
import { tokenMatchesResource } from "./oauth_flow_service";

export class InvalidOAuthTokenError extends Error {}

export interface OAuthConnectionMember {
  executor_id: string;
  workspace_id: string;
  scope: OAuthConnectionScope;
  display_name: string;
}

export interface OAuthPrincipal {
  user_id: string;
  client_id: string;
  connection_id: string;
  approved_scope: OAuthConnectionScope;
  allow_shell: boolean;
  allow_web: boolean;
  /** Ordered by added_at ASC — the deterministic routing order. */
  members: OAuthConnectionMember[];
}

const BEARER_PREFIX = /^Bearer\s+/i;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,}$/;

@Component()
export default class OAuthTokenAuthService {
  constructor(
    @Inject(OAuthRepo) private readonly oauth: OAuthRepo,
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

    // Membership resolves live at every call: adding or removing machines on
    // the connection takes effect without re-consent or token re-issue, and
    // an executor the user no longer owns drops out immediately.
    const rows = await this.oauth.listConnectionExecutors({
      connection_id: record.connection_id,
    });
    const members: OAuthConnectionMember[] = rows
      .filter((row) => row.executor_state === "active"
        && row.executor_owner_user_id === record.user_id)
      .map((row) => ({
        executor_id: row.executor_id,
        workspace_id: row.workspace_id,
        scope: capScope(row.scope, record.approved_scope),
        display_name: row.executor_display_name,
      }));

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

function capScope(
  member: OAuthConnectionScope,
  ceiling: OAuthConnectionScope,
): OAuthConnectionScope {
  return member === "read_write" && ceiling === "read_write"
    ? "read_write"
    : "read";
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
