CREATE TABLE connect_desktop_audit_events (
  audit_event_id TEXT PRIMARY KEY CHECK (audit_event_id ~ '^aud_[A-Za-z0-9]{8,64}$'),
  device_id TEXT NOT NULL REFERENCES connect_desktop_devices(device_id) ON DELETE CASCADE,
  claim_id TEXT REFERENCES connect_desktop_claims(claim_id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES connect_accounts(user_id) ON DELETE RESTRICT,
  event_kind TEXT NOT NULL CHECK (event_kind IN ('claim.created', 'claim.accepted', 'claim.denied', 'desktop.renamed', 'desktop.revoked')),
  credential_generation INTEGER NOT NULL CHECK (credential_generation >= 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  correlation_id TEXT NOT NULL CHECK (correlation_id ~ '^cor_.{8,64}$')
);
CREATE INDEX idx_connect_desktop_audit_device_time ON connect_desktop_audit_events(device_id, occurred_at);
