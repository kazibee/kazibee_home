INSERT INTO connect_agent_handoffs (
  token_hash, user_id, executor_id, created_at, expires_at
) VALUES (
  :token_hash, :user_id, :executor_id, :created_at, :expires_at
);
