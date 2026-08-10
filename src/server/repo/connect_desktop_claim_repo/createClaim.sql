INSERT INTO connect_desktop_claims (
  claim_id, device_id, bootstrap_token_hash, short_code_hash,
  idempotency_key, envelope_hash, created_at, expires_at
) VALUES (
  :claim_id, :device_id, :bootstrap_token_hash, :short_code_hash,
  :idempotency_key, :envelope_hash, :created_at, :expires_at
);
