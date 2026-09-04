INSERT INTO connect_agent_sessions (
  session_id, session_token_hash, user_id, executor_id,
  created_at, last_seen_at, idle_expires_at, expires_at
) VALUES (
  :session_id, :session_token_hash, :user_id, :executor_id,
  :created_at, :last_seen_at, :idle_expires_at, :expires_at
);
