CREATE TABLE connect_desktop_credentials (
  credential_id TEXT PRIMARY KEY CHECK (credential_id ~ '^cred_[A-Za-z0-9]{8,64}$'),
  device_id TEXT NOT NULL REFERENCES connect_desktop_devices(device_id) ON DELETE CASCADE,
  generation INTEGER NOT NULL CHECK (generation >= 1), token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  audience TEXT NOT NULL DEFAULT 'desktop-relay' CHECK (audience = 'desktop-relay'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
  UNIQUE (device_id, generation), CHECK (expires_at > created_at),
  CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL))
);
CREATE INDEX idx_connect_desktop_credentials_device_status ON connect_desktop_credentials(device_id, status, generation);
