CREATE TABLE IF NOT EXISTS relay_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_relay_messages_device ON relay_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_relay_messages_undelivered ON relay_messages(device_id, delivered_at);
