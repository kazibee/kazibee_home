UPDATE oauth_connections
SET approved_scope = :approved_scope, allow_shell = :allow_shell, allow_web = :allow_web
WHERE connection_id = :connection_id
  AND status = 'active';
