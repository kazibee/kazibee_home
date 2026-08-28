import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export interface RemoteToolGrant {
  grant_id: string;
  owner_user_id: string;
  executor_id: string;
  workspace_id: string;
  /** JSON-encoded string array of scope names. */
  scopes: string;
  token_hash: string;
  state: "active" | "revoked" | "expired";
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

@QueryBinder()
@Component()
export default class RemoteToolGrantRepo {
  @Query()
  createGrant(_params: {
    grant_id: string;
    owner_user_id: string;
    executor_id: string;
    workspace_id: string;
    scopes: string;
    token_hash: string;
    created_at: string;
    expires_at: string | null;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByTokenHash(_params: { token_hash: string }): Promise<RemoteToolGrant | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  listByOwner(_params: { owner_user_id: string }): Promise<RemoteToolGrant[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeGrant(_params: { grant_id: string; owner_user_id: string; revoked_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  touchLastUsed(_params: { grant_id: string; last_used_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
