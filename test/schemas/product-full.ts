/**
 * Independent integration fixture contract, not a production-schema snapshot.
 *
 * The account/session/identity, executor, desktop, OAuth, workspace and grant
 * definitions follow the independently authored fixtures in connect-auth.ts,
 * executor-registry.ts, connect-desktop.ts, oauth.ts, remote-workspace.ts and
 * remote-tools.ts and their repository row/query contracts. Shared tables are
 * declared once. Account email is indexed, not unique: account identity is the
 * username/provider subject, and integration flows may reuse an email address.
 *
 * This deliberately contains no migration loading or Proper execution.
 * Migration correctness belongs to the separate migration-test lane.
 * Plain schema data only; callers own their SQLStack fixture and application.
 */
import path from "node:path";

export const PRODUCT_ROOT = path.resolve(__dirname, "../..");

export function productFullSchema(): { version: number; dialect: string; sql: string[] } {
  return {
    version: 1,
    dialect: "postgres",
    sql: [`
    CREATE TABLE connect_accounts (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX idx_connect_accounts_email ON connect_accounts(email);
    CREATE TABLE connect_browser_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
      session_token_hash TEXT NOT NULL UNIQUE,
      csrf_token_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','revoked')),
      created_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      idle_expires_at TIMESTAMPTZ NOT NULL,
      absolute_expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    );
    CREATE TABLE connect_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE (provider, provider_subject)
    );

    CREATE TABLE connect_executors (
      executor_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL UNIQUE,
      owner_user_id TEXT REFERENCES connect_accounts(user_id),
      display_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      architecture TEXT NOT NULL,
      executor_version TEXT NOT NULL,
      key_fingerprint TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','active','revoked')),
      credential_generation INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      claimed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE connect_executor_claims (
      claim_id TEXT PRIMARY KEY,
      executor_id TEXT NOT NULL UNIQUE REFERENCES connect_executors(executor_id),
      bootstrap_token_hash TEXT NOT NULL,
      short_code_hash TEXT NOT NULL UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE,
      envelope_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','denied')),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      decided_at TIMESTAMPTZ,
      decided_by_user_id TEXT REFERENCES connect_accounts(user_id),
      decision_idempotency_key TEXT
    );
    CREATE TABLE connect_executor_credentials (
      credential_id TEXT PRIMARY KEY,
      executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id),
      generation INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
      created_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      UNIQUE (executor_id, generation)
    );
    CREATE TABLE connect_executor_audit_events (
      audit_event_id TEXT PRIMARY KEY,
      executor_id TEXT NOT NULL,
      claim_id TEXT,
      actor_user_id TEXT,
      event_kind TEXT NOT NULL,
      credential_generation INTEGER NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      correlation_id TEXT NOT NULL
    );
    CREATE TABLE connect_website_deployment_identity (
      singleton_key SMALLINT PRIMARY KEY CHECK (singleton_key = 1),
      website_deployment_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE connect_desktop_devices (
      device_id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES connect_accounts(user_id),
      display_name TEXT NOT NULL,
      platform TEXT NOT NULL CHECK (platform IN ('macos','linux','windows')),
      architecture TEXT NOT NULL CHECK (architecture IN ('x64','arm64')),
      desktop_version TEXT NOT NULL,
      key_fingerprint TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','active','revoked')),
      credential_generation INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      claimed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE connect_desktop_claims (
      claim_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL UNIQUE REFERENCES connect_desktop_devices(device_id),
      bootstrap_token_hash TEXT NOT NULL,
      short_code_hash TEXT NOT NULL UNIQUE,
      idempotency_key TEXT NOT NULL UNIQUE,
      envelope_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','denied')),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      decided_at TIMESTAMPTZ,
      decided_by_user_id TEXT REFERENCES connect_accounts(user_id),
      decision_idempotency_key TEXT
    );
    CREATE TABLE connect_desktop_credentials (
      credential_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES connect_desktop_devices(device_id),
      generation INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      audience TEXT NOT NULL DEFAULT 'desktop-relay' CHECK (audience = 'desktop-relay'),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      UNIQUE (device_id, generation)
    );
    CREATE TABLE connect_desktop_audit_events (
      audit_event_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      claim_id TEXT,
      actor_user_id TEXT,
      event_kind TEXT NOT NULL,
      credential_generation INTEGER NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      correlation_id TEXT NOT NULL
    );

    CREATE TABLE oauth_clients (
      client_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      client_name TEXT,
      redirect_uris JSONB NOT NULL,
      metadata JSONB,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE oauth_clients ADD CHECK (client_id ~ '^oac_[0-9a-f]{32}$');
    ALTER TABLE oauth_clients ADD CHECK (kind IN ('cimd','dcr'));
    ALTER TABLE oauth_clients ADD CHECK (status IN ('active','disabled'));
    CREATE INDEX idx_oauth_clients_client_name ON oauth_clients(client_name);
    CREATE TABLE oauth_connections (
      connection_id TEXT PRIMARY KEY CHECK (connection_id ~ '^ocn_[0-9a-f]{32}$'),
      user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
      client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
      approved_scope TEXT NOT NULL CHECK (approved_scope IN ('read','read_write')),
      allow_shell BOOLEAN NOT NULL,
      allow_web BOOLEAN NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','revoked')),
      created_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    );
    CREATE INDEX idx_oauth_connections_user ON oauth_connections(user_id, status);
    CREATE TABLE oauth_codes (
      code_hash TEXT PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
      connection_id TEXT NOT NULL REFERENCES oauth_connections(connection_id),
      client_id TEXT NOT NULL REFERENCES oauth_clients(client_id),
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL CHECK (code_challenge_method = 'S256'),
      resource TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ
    );
    CREATE TABLE oauth_tokens (
      token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
      connection_id TEXT NOT NULL REFERENCES oauth_connections(connection_id),
      kind TEXT NOT NULL CHECK (kind IN ('access','refresh')),
      status TEXT NOT NULL CHECK (status IN ('active','revoked')),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      rotated_from TEXT CHECK (rotated_from IS NULL OR rotated_from ~ '^[0-9a-f]{64}$')
    );
    CREATE INDEX idx_oauth_tokens_connection ON oauth_tokens(connection_id, status);

    CREATE TABLE remote_workspaces (
      remote_workspace_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
      executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id),
      local_workspace_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (executor_id, local_workspace_id)
    );

    CREATE TABLE remote_tool_grants (
      grant_id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES connect_accounts(user_id),
      executor_id TEXT NOT NULL REFERENCES connect_executors(executor_id),
      workspace_id TEXT NOT NULL,
      scopes TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','revoked','expired')),
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
`],
  };
}
