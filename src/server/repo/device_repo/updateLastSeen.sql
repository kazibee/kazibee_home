UPDATE devices SET last_seen_at = datetime('now') WHERE device_id = :device_id;
