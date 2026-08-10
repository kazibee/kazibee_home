UPDATE connect_desktop_devices
SET owner_user_id = :owner_user_id, state = 'active', credential_generation = 1,
    claimed_at = :claimed_at, updated_at = :claimed_at
WHERE device_id = :device_id AND state = 'pending' AND owner_user_id IS NULL
  AND credential_generation = 0;
