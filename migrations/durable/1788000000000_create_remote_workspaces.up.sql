-- Server-minted workspace identity. Executors mint workspace ids locally and
-- only report them; nothing enforces global uniqueness of those. The MCP
-- surface therefore never exposes local ids: each (executor, local id) pair
-- gets one server-side remote id, unique by construction, owned by the
-- machine's owner. Routing resolves the remote id straight to its machine.
CREATE TABLE remote_workspaces (
  remote_workspace_id TEXT PRIMARY KEY CHECK (remote_workspace_id ~ '^rws_[a-f0-9]{32}$'),
  user_id TEXT NOT NULL REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  local_workspace_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (executor_id, local_workspace_id)
);

CREATE INDEX remote_workspaces_user_idx ON remote_workspaces (user_id);
