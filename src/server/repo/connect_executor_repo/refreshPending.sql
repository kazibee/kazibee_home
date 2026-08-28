UPDATE connect_executors
SET device_id = :device_id,
    display_name = :display_name,
    platform = :platform,
    architecture = :architecture,
    executor_version = :executor_version,
    key_fingerprint = :key_fingerprint,
    updated_at = :updated_at,
    last_seen_at = :last_seen_at
WHERE executor_id = :executor_id
  AND state = 'pending';
