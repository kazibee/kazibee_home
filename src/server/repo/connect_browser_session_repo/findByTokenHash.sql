SELECT session_id, user_id, session_token_hash, csrf_token_hash, status,
       created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at
FROM connect_browser_sessions
WHERE session_token_hash = :session_token_hash;
