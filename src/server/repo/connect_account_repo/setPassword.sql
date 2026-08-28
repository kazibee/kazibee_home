UPDATE connect_accounts
SET username = :username, password_hash = :password_hash, updated_at = :updated_at
WHERE user_id = :user_id AND password_hash IS NULL;
