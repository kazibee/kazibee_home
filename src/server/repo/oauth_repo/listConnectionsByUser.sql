SELECT
  connection.connection_id,
  connection.user_id,
  connection.client_id,
  connection.approved_scope,
  connection.allow_shell,
  connection.allow_web,
  connection.status,
  connection.created_at,
  connection.revoked_at,
  client.client_name,
  COUNT(member.executor_id)::int AS member_count
FROM oauth_connections AS connection
JOIN oauth_clients AS client ON client.client_id = connection.client_id
LEFT JOIN oauth_connection_executors AS member
  ON member.connection_id = connection.connection_id
WHERE connection.user_id = :user_id
GROUP BY connection.connection_id, client.client_name
ORDER BY connection.created_at DESC;
