SELECT
  connection_id, user_id, client_id, approved_scope, allow_shell, allow_web, status, created_at, revoked_at
FROM oauth_connections
WHERE connection_id = :connection_id
  AND status = 'active'
LIMIT 1;
