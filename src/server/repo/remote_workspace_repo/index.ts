import { Component } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface RemoteWorkspaceRow {
  remote_workspace_id: string;
  user_id: string;
  executor_id: string;
  local_workspace_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

@QueryBinder()
@Component()
export default class RemoteWorkspaceRepo {
  @Single
  @Query()
  async upsertRemoteWorkspace(_params: {
    remote_workspace_id: string;
    user_id: string;
    executor_id: string;
    local_workspace_id: string;
    display_name: string;
    now: string;
  }) {
    return Trust.tryAsync(
      () => run<RemoteWorkspaceRow | null>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findRemoteWorkspace(_params: {
    remote_workspace_id: string;
  }) {
    return Trust.tryAsync(
      () => run<RemoteWorkspaceRow | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }
}
