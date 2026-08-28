UPDATE sessions SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE session_id = :session_id;
