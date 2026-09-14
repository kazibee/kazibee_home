/**
 * Independently authored fixture contract for executor registry behavior.
 * Columns follow the repository row types and INSERT/SELECT queries under
 * src/server/repo/connect_{account,browser_session,executor*,website_deployment_identity}_repo.
 * Explicit keys/defaults support the tested ownership, one-claim-per-executor,
 * idempotency and credential-fencing invariants. This is not a production
 * migration snapshot and does not claim complete production schema equivalence.
 */
export const executorRegistrySchema = {
  version: 1,
  dialect: 'postgres',
  sql: [`
    CREATE TABLE connect_accounts (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      email_verified_at TIMESTAMPTZ,
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
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
    CREATE TABLE connect_website_deployment_identity (
      singleton_key SMALLINT PRIMARY KEY CHECK (singleton_key = 1),
      website_deployment_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `],
};
