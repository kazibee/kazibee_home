UPDATE connect_desktop_devices
SET state = 'revoked', credential_generation = credential_generation + 1, updated_at = :updated_at
WHERE device_id = :device_id AND owner_user_id = :owner_user_id AND state = 'active';
