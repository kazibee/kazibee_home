CREATE TABLE relay_messages (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_relay_messages_device ON relay_messages(device_id);
CREATE INDEX idx_relay_messages_undelivered ON relay_messages(device_id, delivered_at);
