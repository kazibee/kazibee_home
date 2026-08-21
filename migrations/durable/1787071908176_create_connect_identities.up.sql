CREATE TABLE connect_identities (
  id TEXT PRIMARY KEY CHECK (id ~ '^idn_[A-Za-z0-9]{8,64}$'),
  user_id TEXT NOT NULL REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  provider_subject TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (provider, provider_subject)
);
