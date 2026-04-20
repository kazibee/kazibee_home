UPDATE devices SET pairing_code = NULL, pairing_expires_at = NULL WHERE device_id = :device_id;
