UPDATE connect_executors
SET last_seen_at = :last_seen_at
WHERE executor_id = :executor_id
  AND device_id = :device_id
  AND credential_generation = :credential_generation
  AND state = 'active';
