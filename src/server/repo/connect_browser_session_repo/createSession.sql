INSERT INTO connect_browser_sessions (
  session_id, user_id, session_token_hash, csrf_token_hash, status,
  created_at, last_seen_at, idle_expires_at, absolute_expires_at
) VALUES (
  :session_id, :user_id, :session_token_hash, :csrf_token_hash, :status,
  :created_at, :last_seen_at, :idle_expires_at, :absolute_expires_at
);
