CREATE TABLE connect_desktop_claims (
  claim_id TEXT PRIMARY KEY CHECK (claim_id ~ '^clm_[A-Za-z0-9]{8,64}$'),
  device_id TEXT NOT NULL UNIQUE REFERENCES connect_desktop_devices(device_id) ON DELETE CASCADE,
  bootstrap_token_hash TEXT NOT NULL CHECK (bootstrap_token_hash ~ '^[a-f0-9]{64}$'),
  short_code_hash TEXT NOT NULL UNIQUE CHECK (short_code_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (idempotency_key ~ '^idem_.{16,80}$'),
  envelope_hash TEXT NOT NULL CHECK (envelope_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL, decided_at TIMESTAMPTZ,
  decided_by_user_id TEXT REFERENCES connect_accounts(user_id) ON DELETE RESTRICT, decision_idempotency_key TEXT,
  CHECK (expires_at > created_at),
  CHECK ((status = 'pending' AND decided_at IS NULL AND decided_by_user_id IS NULL AND decision_idempotency_key IS NULL) OR (status IN ('accepted', 'denied') AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL AND decision_idempotency_key IS NOT NULL))
);
CREATE INDEX idx_connect_desktop_claims_status_expiry ON connect_desktop_claims(status, expires_at);
