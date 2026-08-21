CREATE TABLE messages (
  message_id SERIAL PRIMARY KEY,
  from_user_id TEXT,
  from_device_id TEXT,
  target_kind TEXT NOT NULL,
  target_user_id TEXT,
  target_device_id TEXT,
  type TEXT NOT NULL,
  request_id TEXT,
  correlation_id TEXT,
  payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_messages_target_device ON messages(target_device_id, message_id);
CREATE INDEX idx_messages_target_user ON messages(target_user_id, message_id);
CREATE INDEX idx_messages_request_id ON messages(from_device_id, request_id);
