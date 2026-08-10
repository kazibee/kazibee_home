UPDATE connect_desktop_devices
SET display_name = :display_name, updated_at = :updated_at
WHERE device_id = :device_id AND owner_user_id = :owner_user_id AND state = 'active';
