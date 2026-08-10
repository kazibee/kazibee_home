-- Write your up migration here
CREATE TABLE IF NOT EXISTS connect_browser_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  CHECK (
    session_id GLOB 'ses_*'
    AND length(session_id) BETWEEN 12 AND 68
    AND substr(session_id, 5) NOT GLOB '*[^A-Za-z0-9]*'
  ),
  CHECK (
    length(session_token_hash) = 64
    AND session_token_hash NOT GLOB '*[^a-f0-9]*'
  ),
  CHECK (
    length(csrf_token_hash) = 64
    AND csrf_token_hash NOT GLOB '*[^a-f0-9]*'
  ),
  CHECK (status IN ('active', 'revoked')),
  CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  ),
  CHECK (idle_expires_at <= absolute_expires_at),
  CHECK (last_seen_at >= created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_browser_sessions_token_hash
  ON connect_browser_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_connect_browser_sessions_user_status
  ON connect_browser_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_connect_browser_sessions_expiry
  ON connect_browser_sessions(status, idle_expires_at, absolute_expires_at);
