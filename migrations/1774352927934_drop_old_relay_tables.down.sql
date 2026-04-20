CREATE TABLE IF NOT EXISTS mobile_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_token ON mobile_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_device ON mobile_sessions(device_id);

CREATE TABLE IF NOT EXISTS relay_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_relay_messages_device ON relay_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_relay_messages_undelivered ON relay_messages(device_id, delivered_at);

CREATE TABLE IF NOT EXISTS relay_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  conversation_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_relay_events_device_seq ON relay_events(device_id, conversation_id, seq);
CREATE INDEX IF NOT EXISTS idx_relay_events_device_global ON relay_events(device_id, seq);

CREATE TABLE IF NOT EXISTS relay_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  conversation_id TEXT NOT NULL,
  title TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(device_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_device ON relay_conversations(device_id);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_device_convo ON relay_conversations(device_id, conversation_id);
