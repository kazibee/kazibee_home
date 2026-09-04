SELECT *
FROM connect_agent_sessions
WHERE session_token_hash = :session_token_hash
LIMIT 1;
