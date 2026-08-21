CREATE TABLE connect_accounts (
  user_id TEXT PRIMARY KEY CHECK (user_id ~ '^usr_[A-Za-z0-9]{8,64}$'),
  username TEXT NOT NULL UNIQUE CHECK (username = lower(trim(username))) CHECK (length(username) BETWEEN 3 AND 64) CHECK (username ~ '^[a-z0-9][a-z0-9._-]*$'),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  email_verified_at TIMESTAMPTZ,
  password_hash TEXT CHECK (password_hash IS NULL OR (length(password_hash) = 60 AND password_hash ~ '^\$2')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX idx_connect_accounts_username ON connect_accounts(username);
