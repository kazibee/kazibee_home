-- Recreate devices table with new schema for relay v2.
-- SQLite does not support ALTER COLUMN, so we recreate the table.

CREATE TABLE IF NOT EXISTS devices_v2 (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  auth_token_hash TEXT,
  pairing_code TEXT UNIQUE,
  pairing_expires_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO devices_v2 (device_id, user_id, device_name, device_type, auth_token_hash, pairing_code, pairing_expires_at, last_seen_at, created_at)
SELECT device_id, device_id, name, 'desktop', device_secret, pairing_code, pairing_expires_at, last_seen_at, created_at
FROM devices;

DROP TABLE IF EXISTS devices;
ALTER TABLE devices_v2 RENAME TO devices;

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_pairing_code ON devices(pairing_code);
