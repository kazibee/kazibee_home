import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
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
  async createCredential(_params: Omit<ConnectExecutorCredential, "status" | "revoked_at">) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByTokenHash(_params: { token_hash: string }) {
    return Trust.tryAsync(
      () => run<ConnectExecutorCredential | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async revokeForExecutor(_params: { executor_id: string; revoked_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
