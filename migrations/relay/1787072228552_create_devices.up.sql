CREATE TABLE devices (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  auth_token_hash TEXT,
  pairing_code TEXT UNIQUE,
  pairing_expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_pairing_code ON devices(pairing_code);
