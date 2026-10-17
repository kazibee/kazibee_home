import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

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
@Component({ scope: LoadAs.Singleton })
export default class RemoteToolGrantRepo {
  @Query()
  async createGrant(_params: {
    grant_id: string;
    owner_user_id: string;
    executor_id: string;
    workspace_id: string;
    scopes: string;
    token_hash: string;
    created_at: string;
    expires_at: string | null;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByTokenHash(_params: { token_hash: string }) {
    return Trust.tryAsync(
      () => run<RemoteToolGrant | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async listByOwner(_params: { owner_user_id: string }) {
    return Trust.tryAsync(
      () => run<RemoteToolGrant[]>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async revokeGrant(_params: { grant_id: string; owner_user_id: string; revoked_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Query()
  async touchLastUsed(_params: { grant_id: string; last_used_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
