UPDATE connect_browser_sessions
SET status = 'revoked', revoked_at = COALESCE(revoked_at, :revoked_at)
WHERE session_id = :session_id AND status = 'active';
