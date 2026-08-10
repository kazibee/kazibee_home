UPDATE connect_browser_sessions
SET last_seen_at = :last_seen_at, idle_expires_at = :idle_expires_at
WHERE session_id = :session_id AND status = 'active';
