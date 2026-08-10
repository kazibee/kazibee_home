INSERT INTO connect_desktop_devices (
  device_id, display_name, platform, architecture,
  desktop_version, key_fingerprint, created_at, updated_at, last_seen_at
) VALUES (
  :device_id, :display_name, :platform, :architecture,
  :desktop_version, :key_fingerprint, :created_at, :updated_at, :last_seen_at
);
