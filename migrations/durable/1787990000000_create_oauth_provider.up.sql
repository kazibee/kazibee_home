-- OAuth provider for MCP connections (ChatGPT/Codex web connectors).
-- A "connection" is the durable object an MCP client authenticates to;
-- executors are granted to it as memberships that can change over time.

CREATE TABLE oauth_clients (
  client_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('cimd', 'dcr')),
  client_name TEXT,
  redirect_uris JSONB NOT NULL CHECK (jsonb_typeof(redirect_uris) = 'array'),
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (
    (kind = 'cimd' AND client_id ~ '^https://.+')
    OR (kind = 'dcr' AND client_id ~ '^oac_[a-f0-9]{32}$')
  )
);

CREATE TABLE oauth_connections (
  connection_id TEXT PRIMARY KEY CHECK (connection_id ~ '^ocn_[a-f0-9]{32}$'),
  user_id TEXT NOT NULL REFERENCES connect_accounts(user_id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  -- Ceiling for every membership scope; reported in the token response.
  approved_scope TEXT NOT NULL CHECK (approved_scope IN ('read', 'read_write')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX oauth_connections_user_created_idx
  ON oauth_connections (user_id, created_at DESC);

CREATE TABLE oauth_connection_executors (
  connection_id TEXT NOT NULL REFERENCES oauth_connections(connection_id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('read', 'read_write')),
  added_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (connection_id, executor_id)
);

CREATE INDEX oauth_connection_executors_executor_idx
  ON oauth_connection_executors (executor_id);

CREATE TABLE oauth_codes (
  code_hash TEXT PRIMARY KEY CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  connection_id TEXT NOT NULL REFERENCES oauth_connections(connection_id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL CHECK (code_challenge_method IN ('S256')),
  resource TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE TABLE oauth_tokens (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  connection_id TEXT NOT NULL REFERENCES oauth_connections(connection_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  rotated_from TEXT CHECK (
    rotated_from IS NULL OR rotated_from ~ '^[a-f0-9]{64}$'
  )
);

CREATE INDEX oauth_tokens_connection_kind_idx ON oauth_tokens (connection_id, kind);
