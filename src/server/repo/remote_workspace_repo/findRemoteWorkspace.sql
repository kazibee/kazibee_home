SELECT
  remote_workspace_id, user_id, executor_id, local_workspace_id,
  display_name, created_at, updated_at
FROM remote_workspaces
WHERE remote_workspace_id = :remote_workspace_id
LIMIT 1;
