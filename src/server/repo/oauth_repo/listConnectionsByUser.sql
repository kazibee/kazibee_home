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
  client.client_name
FROM oauth_connections AS connection
JOIN oauth_clients AS client ON client.client_id = connection.client_id
WHERE connection.user_id = :user_id
  AND connection.status = 'active'
ORDER BY connection.created_at DESC;
