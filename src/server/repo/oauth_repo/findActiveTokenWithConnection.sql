SELECT
  token.token_hash,
  token.connection_id,
  token.kind,
  token.status,
  token.created_at,
  token.expires_at,
  token.revoked_at,
  token.rotated_from,
  connection.user_id,
  connection.client_id,
  connection.approved_scope,
  connection.status AS connection_status,
  connection.created_at AS connection_created_at,
  connection.revoked_at AS connection_revoked_at
FROM oauth_tokens AS token
JOIN oauth_connections AS connection ON connection.connection_id = token.connection_id
WHERE token.token_hash = :token_hash
  AND token.status = 'active'
  AND token.expires_at > now()
  AND connection.status = 'active'
LIMIT 1;
