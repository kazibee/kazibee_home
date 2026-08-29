-- Final statement is a SELECT over CTEs so the driver returns rows as an
-- array: the query runner only applies the @Single row shape to SELECT/CTE
-- results, and a bare INSERT ... RETURNING comes back as a write result.
WITH rotated AS (
  UPDATE oauth_tokens
  SET status = 'revoked', revoked_at = :created_at
  WHERE token_hash = :old_token_hash
    AND kind = 'refresh'
    AND status = 'active'
    AND expires_at > now()
  RETURNING connection_id
),
inserted AS (
  INSERT INTO oauth_tokens (
    token_hash, connection_id, kind, status, created_at, expires_at, revoked_at, rotated_from
  )
  SELECT
    :token_hash, connection_id, 'refresh', 'active', :created_at, :expires_at, NULL,
    :old_token_hash
  FROM rotated
  RETURNING
    token_hash, connection_id, kind, status, created_at, expires_at, revoked_at, rotated_from
)
SELECT * FROM inserted;
