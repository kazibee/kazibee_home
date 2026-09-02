import { Component } from "@noego/ioc";
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
  upsertRemoteWorkspace(_params: {
    remote_workspace_id: string;
    user_id: string;
    executor_id: string;
    local_workspace_id: string;
    display_name: string;
    now: string;
  }): Promise<RemoteWorkspaceRow | null> {
    return run();
  }

  @Single
  @Query()
  findRemoteWorkspace(_params: {
    remote_workspace_id: string;
  }): Promise<RemoteWorkspaceRow | null> {
    return run();
  }
}
