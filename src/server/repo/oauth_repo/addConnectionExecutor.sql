INSERT INTO oauth_connection_executors (
  connection_id, executor_id, workspace_id, scope, added_at
)
VALUES (
  :connection_id, :executor_id, :workspace_id, :scope, :added_at
);
