-- Write your down migration here
DROP INDEX IF EXISTS idx_connect_browser_sessions_expiry;
DROP INDEX IF EXISTS idx_connect_browser_sessions_user_status;
DROP INDEX IF EXISTS idx_connect_browser_sessions_token_hash;
DROP TABLE IF EXISTS connect_browser_sessions;
