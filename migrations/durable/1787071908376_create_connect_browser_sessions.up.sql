CREATE TABLE connect_browser_sessions (
  session_id TEXT PRIMARY KEY CHECK (session_id ~ '^ses_[A-Za-z0-9]{8,64}$'),
  user_id TEXT NOT NULL REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE CHECK (session_token_hash ~ '^[a-f0-9]{64}$'),
  csrf_token_hash TEXT NOT NULL CHECK (csrf_token_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL, last_seen_at TIMESTAMPTZ NOT NULL,
  idle_expires_at TIMESTAMPTZ NOT NULL, absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL)),
  CHECK (idle_expires_at <= absolute_expires_at), CHECK (last_seen_at >= created_at)
);
CREATE UNIQUE INDEX idx_connect_browser_sessions_token_hash ON connect_browser_sessions(session_token_hash);
CREATE INDEX idx_connect_browser_sessions_user_status ON connect_browser_sessions(user_id, status);
CREATE INDEX idx_connect_browser_sessions_expiry ON connect_browser_sessions(status, idle_expires_at, absolute_expires_at);
