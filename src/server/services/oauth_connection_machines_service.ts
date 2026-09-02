import { Component, Inject } from "@noego/ioc";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import type { OAuthConnectionScope } from "../repo/oauth_repo";

export interface OAuthConnectionMember {
  executor_id: string;
  /** Always '*': a connection reaches every workspace its machines expose. */
  workspace_id: string;
  scope: OAuthConnectionScope;
  display_name: string;
}

const OWNER_EXECUTOR_LIMIT = 100;

/**
 * The machines an OAuth connection can reach. A connection acts as the user,
 * so this is simply every active executor the user owns — resolved live, so a
 * machine linked after consent appears on the next call and a revoked one
 * disappears. Nothing about machines is stored on the connection.
 */
@Component()
export default class OAuthConnectionMachinesService {
  constructor(
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
  ) {}

  /** Oldest link first: the deterministic routing order for default picks. */
  async listForUser(
    userId: string,
    scope: OAuthConnectionScope,
  ): Promise<OAuthConnectionMember[]> {
    const owned = await this.executors.listByOwner({
      owner_user_id: userId,
      limit: OWNER_EXECUTOR_LIMIT,
    });
    return owned
      .filter((executor) => executor.state === "active")
      .sort((left, right) =>
        (left.claimed_at ?? left.created_at).localeCompare(right.claimed_at ?? right.created_at)
        || left.executor_id.localeCompare(right.executor_id))
      .map((executor) => ({
        executor_id: executor.executor_id,
        workspace_id: "*",
        scope,
        display_name: executor.display_name,
      }));
  }
}
