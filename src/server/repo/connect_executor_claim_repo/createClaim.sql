INSERT INTO connect_executor_claims (
  claim_id, executor_id, bootstrap_token_hash, short_code_hash,
  idempotency_key, envelope_hash, created_at, expires_at
) VALUES (
  :claim_id, :executor_id, :bootstrap_token_hash, :short_code_hash,
  :idempotency_key, :envelope_hash, :created_at, :expires_at
);
