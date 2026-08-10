-- Write your up migration here
CREATE TABLE IF NOT EXISTS connect_desktop_claims (
  claim_id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  bootstrap_token_hash TEXT NOT NULL,
  short_code_hash TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  envelope_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by_user_id TEXT,
  decision_idempotency_key TEXT,
  FOREIGN KEY (device_id) REFERENCES connect_desktop_devices(device_id) ON DELETE CASCADE,
  FOREIGN KEY (decided_by_user_id) REFERENCES connect_accounts(user_id) ON DELETE RESTRICT,
  CHECK (claim_id GLOB 'clm_*' AND length(claim_id) BETWEEN 12 AND 68 AND substr(claim_id, 5) NOT GLOB '*[^A-Za-z0-9]*'),
  CHECK (length(bootstrap_token_hash) = 64 AND bootstrap_token_hash NOT GLOB '*[^a-f0-9]*'),
  CHECK (length(short_code_hash) = 64 AND short_code_hash NOT GLOB '*[^a-f0-9]*'),
  CHECK (length(envelope_hash) = 64 AND envelope_hash NOT GLOB '*[^a-f0-9]*'),
  CHECK (idempotency_key GLOB 'idem_*' AND length(idempotency_key) BETWEEN 21 AND 85),
  CHECK (status IN ('pending', 'accepted', 'denied')),
  CHECK (expires_at > created_at),
  CHECK ((status = 'pending' AND decided_at IS NULL AND decided_by_user_id IS NULL AND decision_idempotency_key IS NULL)
      OR (status IN ('accepted', 'denied') AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL AND decision_idempotency_key IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_connect_desktop_claims_status_expiry
  ON connect_desktop_claims(status, expires_at);
