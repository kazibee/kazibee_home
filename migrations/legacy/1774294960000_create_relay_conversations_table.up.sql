CREATE TABLE IF NOT EXISTS relay_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  conversation_id TEXT NOT NULL,
  title TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(device_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_relay_conversations_device ON relay_conversations(device_id);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_device_convo ON relay_conversations(device_id, conversation_id);
