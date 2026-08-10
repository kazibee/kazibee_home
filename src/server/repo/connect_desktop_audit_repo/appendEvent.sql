INSERT INTO connect_desktop_audit_events (
  audit_event_id, device_id, claim_id, actor_user_id, event_kind,
  credential_generation, occurred_at, correlation_id
) VALUES (
  :audit_event_id, :device_id, :claim_id, :actor_user_id, :event_kind,
  :credential_generation, :occurred_at, :correlation_id
);
