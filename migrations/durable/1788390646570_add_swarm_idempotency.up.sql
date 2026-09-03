ALTER TABLE swarms
  ADD COLUMN client_swarm_id TEXT NULL,
  ADD COLUMN idempotency_key TEXT NULL;

CREATE UNIQUE INDEX swarms_owner_idempotency_key_idx
  ON swarms (owner_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
