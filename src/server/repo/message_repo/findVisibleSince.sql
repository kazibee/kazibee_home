SELECT * FROM messages
WHERE message_id > :since_message_id
  AND (
    (target_kind = 'device' AND target_device_id = :device_id)
    OR (target_kind = 'user' AND target_user_id = :user_id)
  )
ORDER BY message_id ASC;
