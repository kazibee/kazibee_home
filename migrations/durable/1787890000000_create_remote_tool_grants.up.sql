CREATE TABLE remote_tool_grants (
  grant_id TEXT PRIMARY KEY CHECK (grant_id ~ '^rtg_[A-Za-z0-9]{8,64}$'),
  owner_user_id TEXT NOT NULL,
  executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL CHECK (workspace_id ~ '^wrk_[A-Za-z0-9]{8,64}$'),
  scopes TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CHECK ((state = 'active' AND revoked_at IS NULL) OR state <> 'active')
);
CREATE INDEX idx_remote_tool_grants_owner ON remote_tool_grants(owner_user_id, state);
CREATE INDEX idx_remote_tool_grants_executor ON remote_tool_grants(executor_id, state);
