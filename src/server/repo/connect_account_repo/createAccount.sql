INSERT INTO connect_accounts (
  user_id, username, email, email_verified_at, password_hash, status, created_at, updated_at
)
VALUES (
  :user_id, :username, :email, :email_verified_at, :password_hash, :status, :created_at, :updated_at
);
