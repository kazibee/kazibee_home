import { Component, LoadAs } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export type ConnectExecutorState = "pending" | "active" | "revoked";
export interface ConnectExecutor {
  executor_id: string;
  device_id: string;
  owner_user_id: string | null;
  display_name: string;
  platform: "macos" | "linux" | "windows";
  architecture: "x64" | "arm64";
  executor_version: string;
  key_fingerprint: string;
  state: ConnectExecutorState;
  credential_generation: number;
  created_at: string;
  claimed_at: string | null;
  updated_at: string;
  last_seen_at: string;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorRepo {
  @Query()
  createExecutor(_params: Omit<ConnectExecutor, "owner_user_id" | "claimed_at" | "credential_generation" | "state">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  refreshPending(_params: Omit<ConnectExecutor, "owner_user_id" | "claimed_at" | "credential_generation" | "state" | "created_at">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByExecutorId(_params: { executor_id: string }): Promise<ConnectExecutor | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  listByOwner(_params: { owner_user_id: string; limit: number }): Promise<ConnectExecutor[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  acceptOwner(_params: { executor_id: string; owner_user_id: string; claimed_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  renameOwned(_params: { executor_id: string; owner_user_id: string; display_name: string; updated_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeOwned(_params: { executor_id: string; owner_user_id: string; updated_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  updatePresence(_params: {
    executor_id: string; device_id: string; credential_generation: number; last_seen_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
