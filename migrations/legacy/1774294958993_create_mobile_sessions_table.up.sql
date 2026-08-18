CREATE TABLE IF NOT EXISTS mobile_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mobile_sessions_token ON mobile_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_device ON mobile_sessions(device_id);
