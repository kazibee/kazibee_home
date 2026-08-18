-- Write your up migration here
CREATE TABLE IF NOT EXISTS connect_desktop_audit_events (
  audit_event_id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  claim_id TEXT,
  actor_user_id TEXT,
  event_kind TEXT NOT NULL,
  credential_generation INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  FOREIGN KEY (device_id) REFERENCES connect_desktop_devices(device_id) ON DELETE CASCADE,
  FOREIGN KEY (claim_id) REFERENCES connect_desktop_claims(claim_id) ON DELETE SET NULL,
  FOREIGN KEY (actor_user_id) REFERENCES connect_accounts(user_id) ON DELETE RESTRICT,
  CHECK (audit_event_id GLOB 'aud_*' AND length(audit_event_id) BETWEEN 12 AND 68 AND substr(audit_event_id, 5) NOT GLOB '*[^A-Za-z0-9]*'),
  CHECK (event_kind IN ('claim.created', 'claim.accepted', 'claim.denied', 'desktop.renamed', 'desktop.revoked')),
  CHECK (credential_generation >= 0),
  CHECK (correlation_id GLOB 'cor_*' AND length(correlation_id) BETWEEN 12 AND 68)
);
CREATE INDEX IF NOT EXISTS idx_connect_desktop_audit_device_time
  ON connect_desktop_audit_events(device_id, occurred_at);
