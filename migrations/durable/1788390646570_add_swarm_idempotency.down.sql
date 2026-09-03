DROP INDEX IF EXISTS swarms_owner_idempotency_key_idx;

ALTER TABLE swarms
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS client_swarm_id;
