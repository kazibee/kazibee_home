import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

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
  member_count: number;
}

export interface OAuthConnectionExecutorRecord {
  connection_id: string;
  executor_id: string;
  workspace_id: string;
  scope: OAuthConnectionScope;
  added_at: string;
  executor_display_name: string;
  executor_state: "pending" | "active" | "revoked";
  executor_owner_user_id: string | null;
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
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findClientById(_params: { client_id: string }): Promise<OAuthClientRecord | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  createConnection(_params: OAuthConnectionRecord): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findActiveConnectionById(_params: {
    connection_id: string;
  }): Promise<OAuthConnectionRecord | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeConnection(_params: { connection_id: string; revoked_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  listConnectionsByUser(_params: { user_id: string }): Promise<OAuthConnectionListRecord[]> {
    throw new SqlStackError("Not implemented");
  }

  /** Owner-driven capability edit; no-op for revoked connections. */
  @Query()
  updateConnectionCapabilities(_params: {
    connection_id: string;
    approved_scope: OAuthConnectionScope;
    allow_shell: boolean;
    allow_web: boolean;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  /** Clamps member scopes after the connection's access drops to read. */
  @Query()
  demoteConnectionMemberScopes(_params: { connection_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
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
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeSupersededConnections(_params: {
    user_id: string;
    connection_id: string;
    client_name: string;
    revoked_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  addConnectionExecutor(_params: {
    connection_id: string;
    executor_id: string;
    workspace_id: string;
    scope: OAuthConnectionScope;
    added_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  removeConnectionExecutor(_params: {
    connection_id: string;
    executor_id: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  listConnectionExecutors(_params: {
    connection_id: string;
  }): Promise<OAuthConnectionExecutorRecord[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  createCode(_params: OAuthCodeRecord): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  consumeCode(_params: {
    code_hash: string;
    consumed_at: string;
  }): Promise<OAuthCodeRecord | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  createToken(_params: OAuthTokenRecord): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findActiveTokenWithConnection(_params: {
    token_hash: string;
  }): Promise<ActiveTokenWithConnection | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeTokensByConnection(_params: {
    connection_id: string;
    revoked_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  rotateRefreshToken(
    _params: RotateRefreshTokenParams,
  ): Promise<OAuthTokenRecord | null> {
    throw new SqlStackError("Not implemented");
  }
}
