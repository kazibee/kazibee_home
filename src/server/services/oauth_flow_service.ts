import { Component, Inject } from "@noego/ioc";
import { createHash } from "node:crypto";
import OAuthRepo, {
  type ActiveTokenWithConnection,
  type OAuthConnectionScope,
  type OAuthTokenRecord,
} from "../repo/oauth_repo";
import { ConnectClock, ConnectCredentials } from "./connect_auth_primitives";
import { grantScopeToOAuthScope, type OAuthGrantScope } from "./oauth_scopes";

export const ACCESS_TOKEN_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_MS = 30 * 24 * 60 * 60 * 1000;
export const CODE_MS = 60 * 1000;

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,}$/;
const RESOURCE_TAG_LENGTH = 16;

export type OAuthTokenError =
  | "invalid_grant"
  | "invalid_client"
  | "invalid_request";

export interface OAuthTokenSuccess {
  ok: true;
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface OAuthTokenFailure {
  ok: false;
  error: OAuthTokenError;
}

export type OAuthTokenResult = OAuthTokenSuccess | OAuthTokenFailure;

export interface CreateAuthorizationCodeInput {
  connectionId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  resource: string;
}

export interface ExchangeCodeInput {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  resource: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
  clientId: string;
  resource: string;
}

@Component()
export default class OAuthFlowService {
  constructor(
    @Inject(OAuthRepo) private readonly oauth: OAuthRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
  ) {}

  async createAuthorizationCode(
    input: CreateAuthorizationCodeInput,
  ): Promise<string> {
    if (input.codeChallengeMethod !== "S256") {
      throw new RangeError("Only the S256 PKCE method is supported");
    }
    const now = this.clock.now();
    const code = this.credentials.randomToken();
    await this.oauth.createCode({
      code_hash: this.credentials.hashToken(code),
      connection_id: input.connectionId,
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      resource: input.resource,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + CODE_MS).toISOString(),
      consumed_at: null,
    });
    return code;
  }

  async exchangeCode(input: ExchangeCodeInput): Promise<OAuthTokenResult> {
    if (
      !input.code
      || !input.codeVerifier
      || !input.clientId
      || !input.redirectUri
      || !input.resource
    ) {
      return failure("invalid_request");
    }

    const now = this.clock.now();
    const code = await this.oauth.consumeCode({
      code_hash: this.credentials.hashToken(input.code),
      consumed_at: now.toISOString(),
    });
    if (!code) return failure("invalid_grant");
    if (code.client_id !== input.clientId) return failure("invalid_client");
    if (
      code.redirect_uri !== input.redirectUri
      || code.resource !== input.resource
      || code.code_challenge_method !== "S256"
      || pkceChallenge(input.codeVerifier) !== code.code_challenge
    ) {
      return failure("invalid_grant");
    }

    const connection = await this.oauth.findActiveConnectionById({
      connection_id: code.connection_id,
    });
    if (!connection || connection.status !== "active") {
      return failure("invalid_grant");
    }
    if (connection.client_id !== input.clientId) {
      return failure("invalid_client");
    }

    return this.mintTokenPair(
      connection.connection_id,
      {
        access: connection.approved_scope,
        shell: connection.allow_shell,
        web: connection.allow_web,
      },
      input.resource,
      now,
    );
  }

  async refresh(input: RefreshTokenInput): Promise<OAuthTokenResult> {
    if (
      !input.refreshToken
      || !TOKEN_SHAPE.test(input.refreshToken)
      || !input.clientId
      || !input.resource
    ) {
      return failure("invalid_request");
    }
    if (!tokenMatchesResource(input.refreshToken, input.resource)) {
      return failure("invalid_grant");
    }

    const now = this.clock.now();
    const oldHash = this.credentials.hashToken(input.refreshToken);
    const token = await this.oauth.findActiveTokenWithConnection({
      token_hash: oldHash,
    });
    if (!activeRefreshToken(token, now)) {
      return failure("invalid_grant");
    }
    if (token.client_id !== input.clientId) {
      return failure("invalid_client");
    }

    const refreshToken = resourceBoundToken(
      this.credentials.randomToken(),
      input.resource,
    );
    const refreshExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_MS,
    ).toISOString();
    const rotated = await this.oauth.rotateRefreshToken({
      old_token_hash: oldHash,
      token_hash: this.credentials.hashToken(refreshToken),
      created_at: now.toISOString(),
      expires_at: refreshExpiresAt,
    });
    if (!rotated) return failure("invalid_grant");

    const accessToken = resourceBoundToken(
      this.credentials.randomToken(),
      input.resource,
    );
    await this.oauth.createToken(tokenRecord(
      accessToken,
      token.connection_id,
      "access",
      now,
      ACCESS_TOKEN_MS,
      this.credentials,
    ));

    return success(accessToken, refreshToken, {
      access: token.approved_scope,
      shell: token.allow_shell,
      web: token.allow_web,
    });
  }

  private async mintTokenPair(
    connectionId: string,
    scope: OAuthGrantScope,
    resource: string,
    now: Date,
  ): Promise<OAuthTokenSuccess> {
    const accessToken = resourceBoundToken(
      this.credentials.randomToken(),
      resource,
    );
    const refreshToken = resourceBoundToken(
      this.credentials.randomToken(),
      resource,
    );
    await this.oauth.createToken(tokenRecord(
      accessToken,
      connectionId,
      "access",
      now,
      ACCESS_TOKEN_MS,
      this.credentials,
    ));
    await this.oauth.createToken(tokenRecord(
      refreshToken,
      connectionId,
      "refresh",
      now,
      REFRESH_TOKEN_MS,
      this.credentials,
    ));
    return success(accessToken, refreshToken, scope);
  }
}

// The audience tag survives restarts without a second token lookup field. Because
// the repository hashes the complete token, changing this public tag still
// invalidates the token rather than permitting an audience substitution.
export function tokenMatchesResource(token: string, resource: string): boolean {
  if (!TOKEN_SHAPE.test(token) || !resource) return false;
  return token.endsWith(resourceTag(resource));
}

function resourceBoundToken(randomToken: string, resource: string): string {
  return `${randomToken}${resourceTag(resource)}`;
}

function resourceTag(resource: string): string {
  return createHash("sha256")
    .update(resource, "utf8")
    .digest("base64url")
    .slice(0, RESOURCE_TAG_LENGTH);
}

function pkceChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier, "utf8")
    .digest("base64url");
}

function activeRefreshToken(
  token: ActiveTokenWithConnection | null,
  now: Date,
): token is ActiveTokenWithConnection {
  return Boolean(
    token
    && token.kind === "refresh"
    && token.status === "active"
    && token.connection_status === "active"
    && new Date(token.expires_at).getTime() > now.getTime(),
  );
}

function tokenRecord(
  rawToken: string,
  connectionId: string,
  kind: "access" | "refresh",
  now: Date,
  lifetimeMs: number,
  credentials: ConnectCredentials,
): OAuthTokenRecord {
  return {
    token_hash: credentials.hashToken(rawToken),
    connection_id: connectionId,
    kind,
    status: "active",
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + lifetimeMs).toISOString(),
    revoked_at: null,
    rotated_from: null,
  };
}

function success(
  accessToken: string,
  refreshToken: string,
  scope: OAuthGrantScope,
): OAuthTokenSuccess {
  return {
    ok: true,
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_MS / 1000,
    refresh_token: refreshToken,
    scope: grantScopeToOAuthScope(scope),
  };
}

function failure(error: OAuthTokenError): OAuthTokenFailure {
  return { ok: false, error };
}
