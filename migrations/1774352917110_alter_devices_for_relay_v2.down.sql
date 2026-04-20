DROP INDEX IF EXISTS idx_devices_user_id;
DROP INDEX IF EXISTS idx_devices_pairing_code;

CREATE TABLE IF NOT EXISTS devices_old (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL UNIQUE,
  device_secret TEXT NOT NULL,
  name TEXT,
  pairing_code TEXT UNIQUE,
  pairing_expires_at TEXT,
  paired_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO devices_old (device_id, device_secret, name, pairing_code, pairing_expires_at, last_seen_at, created_at)
SELECT device_id, COALESCE(auth_token_hash, ''), device_name, pairing_code, pairing_expires_at, last_seen_at, created_at
FROM devices;

DROP TABLE IF EXISTS devices;
ALTER TABLE devices_old RENAME TO devices;

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_pairing_code ON devices(pairing_code);
