import { Component, LoadAs } from "@noego/ioc";
import { Query, QueryBinder, Single, run } from "sqlstack";

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
    return run();
  }

  @Query()
  refreshPending(_params: Omit<ConnectExecutor, "owner_user_id" | "claimed_at" | "credential_generation" | "state" | "created_at">): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findByExecutorId(_params: { executor_id: string }): Promise<ConnectExecutor | null> {
    return run();
  }

  @Query()
  listByOwner(_params: { owner_user_id: string; limit: number }): Promise<ConnectExecutor[]> {
    return run();
  }

  @Query()
  acceptOwner(_params: { executor_id: string; owner_user_id: string; claimed_at: string }): Promise<void> {
    return run();
  }

  @Query()
  renameOwned(_params: { executor_id: string; owner_user_id: string; display_name: string; updated_at: string }): Promise<void> {
    return run();
  }

  @Query()
  revokeOwned(_params: { executor_id: string; owner_user_id: string; updated_at: string }): Promise<void> {
    return run();
  }

  @Query()
  updatePresence(_params: {
    executor_id: string; device_id: string; credential_generation: number; last_seen_at: string;
  }): Promise<void> {
    return run();
  }
}
