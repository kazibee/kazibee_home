UPDATE sessions SET status = 'closed', closed_at = datetime('now') WHERE session_id = :session_id;
