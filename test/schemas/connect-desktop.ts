/**
 * Independently authored fixture contract for connect desktop behavior.
 * Columns follow the repository row types and INSERT/UPDATE/SELECT queries
 * under src/server/repo/connect_desktop_{device,claim,credential,audit}_repo
 * plus the connect_accounts / connect_website_deployment_identity rows the
 * accept path touches (owner FK, deployment-id singleton). Explicit keys and
 * defaults support the tested ownership, one-claim-per-device, idempotency,
 * credential-fencing and audience invariants:
 *  - connect_desktop_devices: createDevice omits owner/state/generation/claimed_at,
 *    so those default to NULL / 'pending' / 0 / NULL.
 *  - connect_desktop_claims: createClaim omits status and decision columns;
 *    idempotency_key and device_id are unique so a drifted re-create conflicts.
 *  - connect_desktop_credentials: createCredential omits audience/status/revoked_at,
 *    so audience defaults to 'desktop-relay' and status to 'active'; expires_at
 *    is required by the accept path; (device_id, generation) is unique.
 *  - connect_website_deployment_identity: createIfMissing relies on
 *    ON CONFLICT (singleton_key).
 * This is not a production migration snapshot and does not claim complete
 * production schema equivalence.
 */
export const connectDesktopSchema = {
  version: 1,
  dialect: "postgres",
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
    CREATE TABLE connect_website_deployment_identity (
      singleton_key SMALLINT PRIMARY KEY CHECK (singleton_key = 1),
      website_deployment_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `],
};
