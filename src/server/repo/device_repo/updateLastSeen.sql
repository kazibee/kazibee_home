UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE device_id = :device_id;
