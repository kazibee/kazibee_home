UPDATE sessions SET last_heartbeat_at = datetime('now') WHERE session_id = :session_id;
