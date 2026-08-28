SELECT user_id, username, email, email_verified_at, password_hash, status, created_at, updated_at
FROM connect_accounts
WHERE user_id = :user_id;
