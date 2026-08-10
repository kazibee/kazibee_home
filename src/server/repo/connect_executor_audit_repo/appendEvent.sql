INSERT INTO connect_executor_audit_events (
  audit_event_id, executor_id, claim_id, actor_user_id, event_kind,
  credential_generation, occurred_at, correlation_id
) VALUES (
  :audit_event_id, :executor_id, :claim_id, :actor_user_id, :event_kind,
  :credential_generation, :occurred_at, :correlation_id
);
