INSERT INTO connect_desktop_credentials (
  credential_id, device_id, generation, token_hash, created_at, expires_at
) VALUES (:credential_id, :device_id, :generation, :token_hash, :created_at, :expires_at);
