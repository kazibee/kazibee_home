import { executorRegistrySchema } from './executor-registry';

/** Plain grant schema from RemoteToolGrantRepo row/INSERT contracts, not migrations. */
export const remoteToolGrantSchema = {
  version: 1,
  dialect: 'postgres',
  sql: [...executorRegistrySchema.sql, `
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
