CREATE TABLE relay_conversations (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  conversation_id TEXT NOT NULL,
  title TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (device_id, conversation_id)
);
CREATE INDEX idx_relay_conversations_device ON relay_conversations(device_id);
CREATE INDEX idx_relay_conversations_device_convo ON relay_conversations(device_id, conversation_id);
