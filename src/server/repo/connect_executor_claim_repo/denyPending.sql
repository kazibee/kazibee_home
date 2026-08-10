UPDATE connect_executor_claims
SET status = 'denied', decided_at = :decided_at,
    decided_by_user_id = :decided_by_user_id, decision_idempotency_key = :decision_idempotency_key
WHERE claim_id = :claim_id AND status = 'pending' AND expires_at > :decided_at;
