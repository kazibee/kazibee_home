INSERT INTO connect_executors (
  executor_id, device_id, display_name, platform, architecture,
  executor_version, key_fingerprint, created_at, updated_at, last_seen_at
) VALUES (
  :executor_id, :device_id, :display_name, :platform, :architecture,
  :executor_version, :key_fingerprint, :created_at, :updated_at, :last_seen_at
);
