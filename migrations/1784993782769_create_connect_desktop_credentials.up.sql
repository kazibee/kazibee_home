-- Write your up migration here
CREATE TABLE IF NOT EXISTS connect_desktop_credentials (
  credential_id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  audience TEXT NOT NULL DEFAULT 'desktop-relay',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (device_id) REFERENCES connect_desktop_devices(device_id) ON DELETE CASCADE,
  UNIQUE (device_id, generation),
  CHECK (credential_id GLOB 'cred_*' AND length(credential_id) BETWEEN 13 AND 69 AND substr(credential_id, 6) NOT GLOB '*[^A-Za-z0-9]*'),
  CHECK (generation >= 1),
  CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^a-f0-9]*'),
  CHECK (audience = 'desktop-relay'),
  CHECK (expires_at > created_at),
  CHECK (status IN ('active', 'revoked')),
  CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_connect_desktop_credentials_device_status
  ON connect_desktop_credentials(device_id, status, generation);
