UPDATE connect_desktop_credentials
SET status = 'revoked', revoked_at = :revoked_at
WHERE device_id = :device_id AND status = 'active';
