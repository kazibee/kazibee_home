SELECT * FROM connect_desktop_devices
WHERE owner_user_id = :owner_user_id
ORDER BY created_at DESC, device_id
LIMIT :limit;
