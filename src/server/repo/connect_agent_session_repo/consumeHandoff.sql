UPDATE connect_agent_handoffs
SET consumed_at = :consumed_at
WHERE token_hash = :token_hash
  AND consumed_at IS NULL
  AND expires_at > :consumed_at
RETURNING *;
