INSERT INTO devices (device_id, user_id, device_name, device_type, auth_token_hash, pairing_code, pairing_expires_at)
VALUES (:device_id, :user_id, :device_name, :device_type, :auth_token_hash, :pairing_code, :pairing_expires_at);
