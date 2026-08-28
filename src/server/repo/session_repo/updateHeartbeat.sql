UPDATE sessions SET last_heartbeat_at = CURRENT_TIMESTAMP WHERE session_id = :session_id;
