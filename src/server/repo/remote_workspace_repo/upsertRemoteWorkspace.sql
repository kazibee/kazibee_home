-- Final SELECT over a CTE so the driver returns rows as an array. The insert
-- takes the (executor, local) slot exactly once; later listings refresh the
-- display name and hand back the same remote id.
WITH upserted AS (
  INSERT INTO remote_workspaces (
    remote_workspace_id, user_id, executor_id, local_workspace_id,
    display_name, created_at, updated_at
  )
  VALUES (
    :remote_workspace_id, :user_id, :executor_id, :local_workspace_id,
    :display_name, :now, :now
  )
  ON CONFLICT (executor_id, local_workspace_id)
  DO UPDATE SET display_name = :display_name, updated_at = :now
  RETURNING *
)
SELECT * FROM upserted;
