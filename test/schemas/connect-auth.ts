/**
 * Independently authored fixture contract for connect auth behavior.
 * Columns follow the repository row types and queries under
 * src/server/repo/connect_{account,browser_session,identity}_repo:
 *  - connect_accounts: createAccount, find methods and setPassword columns; username is
 *    unique so a duplicate signup surfaces the 23505 → 409 duplicate outcome;
 *    email lookups follow repository predicates; this fixture makes no global email-uniqueness claim.
 *  - connect_browser_sessions: createSession/findByTokenHash/touch/revoke columns.
 *  - connect_identities: linkGoogle.sql INSERT ... ON CONFLICT (provider,
 *    provider_subject) DO UPDATE requires a primary key on id, a unique
 *    (provider, provider_subject) pair, and a user FK.
 * This is not a production migration snapshot and does not claim complete
 * production schema equivalence.
 */
export const connectAuthSchema = {
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
  `],
};
