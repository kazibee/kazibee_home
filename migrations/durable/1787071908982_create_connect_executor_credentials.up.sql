CREATE TABLE connect_executor_credentials (
  credential_id TEXT PRIMARY KEY CHECK (credential_id ~ '^cred_[A-Za-z0-9]{8,64}$'),
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  generation INTEGER NOT NULL CHECK (generation >= 1), token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
  UNIQUE (executor_id, generation),
  CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL))
);
CREATE INDEX idx_connect_executor_credentials_executor_status ON connect_executor_credentials(executor_id, status, generation);
