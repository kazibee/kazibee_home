SELECT user_id, username, password_hash, status, created_at
FROM connect_accounts
WHERE user_id = :user_id;
