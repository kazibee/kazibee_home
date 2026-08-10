import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export interface ConnectExecutorCredential {
  credential_id: string;
  executor_id: string;
  generation: number;
  token_hash: string;
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
}

@QueryBinder()
@Component()
export default class ConnectExecutorCredentialRepo {
  @Query()
  createCredential(_params: Omit<ConnectExecutorCredential, "status" | "revoked_at">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query() @Single
  findByTokenHash(_params: { token_hash: string }): Promise<ConnectExecutorCredential | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeForExecutor(_params: { executor_id: string; revoked_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
