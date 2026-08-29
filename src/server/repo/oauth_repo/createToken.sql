INSERT INTO oauth_tokens (
  token_hash, connection_id, kind, status, created_at, expires_at, revoked_at, rotated_from
)
VALUES (
  :token_hash, :connection_id, :kind, :status, :created_at, :expires_at, :revoked_at, :rotated_from
);
