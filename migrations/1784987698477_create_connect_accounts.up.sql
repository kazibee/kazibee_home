-- Write your up migration here
CREATE TABLE IF NOT EXISTS connect_accounts (
  user_id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  CHECK (
    user_id GLOB 'usr_*'
    AND length(user_id) BETWEEN 12 AND 68
    AND substr(user_id, 5) NOT GLOB '*[^A-Za-z0-9]*'
  ),
  CHECK (username = lower(trim(username))),
  CHECK (length(username) BETWEEN 3 AND 64),
  CHECK (substr(username, 1, 1) GLOB '[a-z0-9]'),
  CHECK (username NOT GLOB '*[^a-z0-9._-]*'),
  CHECK (length(password_hash) = 60 AND password_hash GLOB '$2*'),
  CHECK (status IN ('active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_accounts_username
  ON connect_accounts(username);
