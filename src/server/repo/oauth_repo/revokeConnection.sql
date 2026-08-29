UPDATE oauth_connections
SET status = 'revoked', revoked_at = :revoked_at
WHERE connection_id = :connection_id
  AND status = 'active';
