CREATE TABLE connect_executors (
  executor_id TEXT PRIMARY KEY CHECK (executor_id ~ '^exe_[A-Za-z0-9]{8,64}$'),
  device_id TEXT NOT NULL UNIQUE CHECK (device_id ~ '^dev_[A-Za-z0-9]{8,64}$'),
  owner_user_id TEXT REFERENCES connect_accounts(user_id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  platform TEXT NOT NULL CHECK (platform IN ('macos', 'linux', 'windows')),
  architecture TEXT NOT NULL CHECK (architecture IN ('x64', 'arm64')),
  executor_version TEXT NOT NULL, key_fingerprint TEXT NOT NULL CHECK (key_fingerprint ~ '^[a-f0-9]{64}$'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'active', 'revoked')),
  credential_generation INTEGER NOT NULL DEFAULT 0 CHECK (credential_generation >= 0),
  created_at TIMESTAMPTZ NOT NULL, claimed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL, last_seen_at TIMESTAMPTZ NOT NULL,
  CHECK (platform != 'windows' OR architecture = 'x64'),
  CHECK ((state = 'pending' AND owner_user_id IS NULL AND credential_generation = 0 AND claimed_at IS NULL) OR (state IN ('active', 'revoked') AND owner_user_id IS NOT NULL AND credential_generation >= 1 AND claimed_at IS NOT NULL))
);
CREATE INDEX idx_connect_executors_owner_state ON connect_executors(owner_user_id, state, created_at);
