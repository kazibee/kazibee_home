CREATE TABLE connect_agent_handoffs (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX connect_agent_handoffs_expiry_idx ON connect_agent_handoffs (expires_at);

CREATE TABLE connect_agent_sessions (
  session_id TEXT PRIMARY KEY,
  session_token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  idle_expires_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX connect_agent_sessions_token_idx ON connect_agent_sessions (session_token_hash);
