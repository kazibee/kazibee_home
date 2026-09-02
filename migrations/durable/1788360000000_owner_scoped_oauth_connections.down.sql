-- Restores the per-connection machine membership table (empty). Rolling back
-- the schema does not restore old memberships; connections must be re-consented
-- under the pinned model.
CREATE TABLE oauth_connection_executors (
  connection_id TEXT NOT NULL REFERENCES oauth_connections(connection_id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('read', 'read_write')),
  added_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (connection_id, executor_id)
);

CREATE INDEX oauth_connection_executors_executor_idx
  ON oauth_connection_executors (executor_id);
