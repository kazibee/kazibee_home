SELECT * FROM sessions WHERE device_id = :device_id AND status = 'active' ORDER BY created_at DESC;
