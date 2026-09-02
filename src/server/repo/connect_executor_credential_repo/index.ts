import { Component, LoadAs } from "@noego/ioc";
import { Query, QueryBinder, Single, run } from "sqlstack";

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
@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorCredentialRepo {
  @Query()
  createCredential(_params: Omit<ConnectExecutorCredential, "status" | "revoked_at">): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findByTokenHash(_params: { token_hash: string }): Promise<ConnectExecutorCredential | null> {
    return run();
  }

  @Query()
  revokeForExecutor(_params: { executor_id: string; revoked_at: string }): Promise<void> {
    return run();
  }
}
