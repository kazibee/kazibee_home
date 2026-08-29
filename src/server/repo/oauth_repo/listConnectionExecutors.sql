SELECT
  member.connection_id,
  member.executor_id,
  member.workspace_id,
  member.scope,
  member.added_at,
  executor.display_name AS executor_display_name,
  executor.state AS executor_state,
  executor.owner_user_id AS executor_owner_user_id
FROM oauth_connection_executors AS member
JOIN connect_executors AS executor ON executor.executor_id = member.executor_id
WHERE member.connection_id = :connection_id
ORDER BY member.added_at ASC, member.executor_id ASC;
