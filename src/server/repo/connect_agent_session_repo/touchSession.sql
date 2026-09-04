UPDATE connect_agent_sessions
SET last_seen_at = :last_seen_at,
    idle_expires_at = :idle_expires_at
WHERE session_id = :session_id
  AND revoked_at IS NULL;
