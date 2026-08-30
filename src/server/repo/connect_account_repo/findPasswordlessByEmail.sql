SELECT user_id, username, email, email_verified_at, password_hash, status, created_at, updated_at
FROM connect_accounts
WHERE email = :email AND password_hash IS NULL
ORDER BY created_at ASC, user_id ASC
LIMIT 1;
