INSERT INTO oauth_codes (
  code_hash, connection_id, client_id, redirect_uri, code_challenge,
  code_challenge_method, resource, created_at, expires_at, consumed_at
)
VALUES (
  :code_hash, :connection_id, :client_id, :redirect_uri, :code_challenge,
  :code_challenge_method, :resource, :created_at, :expires_at, :consumed_at
);
