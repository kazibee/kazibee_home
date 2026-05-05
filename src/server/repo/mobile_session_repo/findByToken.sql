SELECT *
FROM mobile_sessions
WHERE session_token = :session_token
  AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > datetime('now'));
