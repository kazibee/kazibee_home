import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, run } from "sqlstack";

export type OAuthClientKind = "cimd" | "dcr";
export type OAuthClientStatus = "active" | "disabled";
export type OAuthConnectionScope = "read" | "read_write";
export type OAuthConnectionStatus = "active" | "revoked";
export type OAuthTokenKind = "access" | "refresh";
export type OAuthTokenStatus = "active" | "revoked";

export interface OAuthClientRecord {
  client_id: string;
  kind: OAuthClientKind;
  client_name: string | null;
  redirect_uris: string[];
  metadata: Record<string, unknown> | null;
  status: OAuthClientStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Insert shape for oauth_clients: the JSONB columns are bound as JSON text
 * and cast in SQL (see createClient.sql) because the query binder does not
 * serialize JS arrays/objects into Postgres literals.
 */
export interface CreateOAuthClientParams
  extends Omit<OAuthClientRecord, "redirect_uris" | "metadata"> {
  redirect_uris: string;
  metadata: string | null;
}

export function toCreateOAuthClientParams(
  record: OAuthClientRecord,
): CreateOAuthClientParams {
  return {
    ...record,
    redirect_uris: JSON.stringify(record.redirect_uris),
    metadata: record.metadata === null
      ? null
      : JSON.stringify(record.metadata),
  };
}

export interface OAuthConnectionRecord {
  connection_id: string;
  user_id: string;
  client_id: string;
  approved_scope: OAuthConnectionScope;
  /** Doc 06 scope families beyond workspace access. */
  allow_shell: boolean;
  allow_web: boolean;
  status: OAuthConnectionStatus;
  created_at: string;
  revoked_at: string | null;
}

export interface OAuthConnectionListRecord extends OAuthConnectionRecord {
  client_name: string | null;
}

export interface OAuthCodeRecord {
  code_hash: string;
  connection_id: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: "S256";
  resource: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

export interface OAuthTokenRecord {
  token_hash: string;
  connection_id: string;
  kind: OAuthTokenKind;
  status: OAuthTokenStatus;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  rotated_from: string | null;
}

export interface ActiveTokenWithConnection extends OAuthTokenRecord {
  user_id: string;
  client_id: string;
  approved_scope: OAuthConnectionScope;
  allow_shell: boolean;
  allow_web: boolean;
  connection_status: OAuthConnectionStatus;
  connection_created_at: string;
  connection_revoked_at: string | null;
}

export interface RotateRefreshTokenParams {
  old_token_hash: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
}

@QueryBinder()
@Component()
export default class OAuthRepo {
  @Query()
  createClient(_params: CreateOAuthClientParams): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findClientById(_params: { client_id: string }): Promise<OAuthClientRecord | null> {
    return run();
  }

  @Query()
  createConnection(_params: OAuthConnectionRecord): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findActiveConnectionById(_params: {
    connection_id: string;
  }): Promise<OAuthConnectionRecord | null> {
    return run();
  }

  @Query()
  revokeConnection(_params: { connection_id: string; revoked_at: string }): Promise<void> {
    return run();
  }

  @Query()
  listConnectionsByUser(_params: { user_id: string }): Promise<OAuthConnectionListRecord[]> {
    return run();
  }

  /** Owner-driven capability edit; no-op for revoked connections. */
  @Query()
  updateConnectionCapabilities(_params: {
    connection_id: string;
    approved_scope: OAuthConnectionScope;
    allow_shell: boolean;
    allow_web: boolean;
  }): Promise<void> {
    return run();
  }

  /**
   * Supersede: kills tokens of the user's OTHER active connections whose
   * client shares this display name (clients re-register per connect, so the
   * name is the durable identity). Call before revokeSupersededConnections.
   */
  @Query()
  revokeSupersededConnectionTokens(_params: {
    user_id: string;
    connection_id: string;
    client_name: string;
    revoked_at: string;
  }): Promise<void> {
    return run();
  }

  @Query()
  revokeSupersededConnections(_params: {
    user_id: string;
    connection_id: string;
    client_name: string;
    revoked_at: string;
  }): Promise<void> {
    return run();
  }

  @Query()
  createCode(_params: OAuthCodeRecord): Promise<void> {
    return run();
  }

  @Single
  @Query()
  consumeCode(_params: {
    code_hash: string;
    consumed_at: string;
  }): Promise<OAuthCodeRecord | null> {
    return run();
  }

  @Query()
  createToken(_params: OAuthTokenRecord): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findActiveTokenWithConnection(_params: {
    token_hash: string;
  }): Promise<ActiveTokenWithConnection | null> {
    return run();
  }

  @Query()
  revokeTokensByConnection(_params: {
    connection_id: string;
    revoked_at: string;
  }): Promise<void> {
    return run();
  }

  @Single
  @Query()
  rotateRefreshToken(
    _params: RotateRefreshTokenParams,
  ): Promise<OAuthTokenRecord | null> {
    return run();
  }
}
