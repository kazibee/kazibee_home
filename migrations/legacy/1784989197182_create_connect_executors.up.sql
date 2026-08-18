CREATE TABLE IF NOT EXISTS connect_executors (
  executor_id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  owner_user_id TEXT,
  display_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  architecture TEXT NOT NULL,
  executor_version TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  credential_generation INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  claimed_at TEXT,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES connect_accounts(user_id) ON DELETE RESTRICT,
  CHECK (executor_id GLOB 'exe_*' AND length(executor_id) BETWEEN 12 AND 68 AND substr(executor_id, 5) NOT GLOB '*[^A-Za-z0-9]*'),
  CHECK (device_id GLOB 'dev_*' AND length(device_id) BETWEEN 12 AND 68 AND substr(device_id, 5) NOT GLOB '*[^A-Za-z0-9]*'),
  CHECK (length(display_name) BETWEEN 1 AND 80),
  CHECK (platform IN ('macos', 'linux', 'windows')),
  CHECK (architecture IN ('x64', 'arm64')),
  CHECK (platform != 'windows' OR architecture = 'x64'),
  CHECK (length(key_fingerprint) = 64 AND key_fingerprint NOT GLOB '*[^a-f0-9]*'),
  CHECK (state IN ('pending', 'active', 'revoked')),
  CHECK (credential_generation >= 0),
  CHECK ((state = 'pending' AND owner_user_id IS NULL AND credential_generation = 0 AND claimed_at IS NULL)
      OR (state IN ('active', 'revoked') AND owner_user_id IS NOT NULL AND credential_generation >= 1 AND claimed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_connect_executors_owner_state
  ON connect_executors(owner_user_id, state, created_at);
