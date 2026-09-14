/**
 * Independently authored fixture contract for the remote workspace slot on
 * top of the executor registry tables. The remote_workspaces columns follow
 * src/server/repo/remote_workspace_repo (RemoteWorkspaceRow plus the
 * upsertRemoteWorkspace / findRemoteWorkspace SQL):
 *  - remote_workspace_id is the primary key returned by findRemoteWorkspace;
 *  - (executor_id, local_workspace_id) is unique because the upsert resolves
 *    ON CONFLICT on exactly that pair;
 *  - user_id / executor_id reference the owner account and the executor row.
 * This is not a production migration snapshot and does not claim complete
 * production schema equivalence.
 */
import { executorRegistrySchema } from "./executor-registry";

export const remoteWorkspaceSchema = {
  version: 1,
  dialect: "postgres",
  sql: [
    ...executorRegistrySchema.sql,
    `
    CREATE TABLE remote_workspaces (
      remote_workspace_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
      executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id),
      local_workspace_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (executor_id, local_workspace_id)
    );
  `,
  ],
};
