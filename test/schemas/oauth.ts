/**
 * Independently authored fixture contract for the OAuth provider repository.
 * Columns follow the row types and the SQL under src/server/repo/oauth_repo:
 *  - connect_accounts: the owner rows referenced by oauth_connections.user_id
 *    (same declared subset as test/schemas/connect-auth.ts).
 *  - oauth_clients: createClient binds redirect_uris/metadata as JSON text and
 *    CASTs to JSONB; findClientById reads them back as JSON values, and
 *    listConnectionsByUser / revokeSuperseded* join on client_id and match
 *    client_name (nullable).
 *  - oauth_connections: findActiveConnectionById, revokeConnection,
 *    updateConnectionCapabilities and revokeSupersededConnections filter on
 *    status = 'active'; listConnectionsByUser orders by created_at DESC, so
 *    created_at is TIMESTAMPTZ (not text); allow_shell/allow_web are BOOLEAN.
 *  - oauth_codes: consumeCode is UPDATE ... WHERE consumed_at IS NULL AND
 *    expires_at > now() RETURNING *, so expires_at is TIMESTAMPTZ.
 *  - oauth_tokens: findActiveTokenWithConnection / rotateRefreshToken compare
 *    expires_at > now(); rotateRefreshToken inserts rotated_from = old hash.
 * Id/hash CHECKs mirror the id builders the tests use (oac_/ocn_ + 32 hex,
 * 64 lowercase hex hashes). This is not a production migration snapshot and
 * does not claim complete production schema equivalence.
 */
export const oauthSchema = {
  version: 1,
  dialect: "postgres",
  // Structured seed targets keep SQLStack .data validation authoritative.
  tables: {
    "connect_accounts": {
      "columns": {
        "user_id": {
          "type": "text",
          "primary": true
        },
        "username": {
          "type": "text",
          "nullable": false,
          "unique": true
        },
        "email": {
          "type": "text",
          "nullable": false
        },
        "email_verified_at": {
          "type": "timestamptz",
          "nullable": true
        },
        "password_hash": {
          "type": "text",
          "nullable": true
        },
        "status": {
          "type": "text",
          "nullable": false,
          "default": "'active'"
        },
        "created_at": {
          "type": "timestamptz",
          "nullable": false
        },
        "updated_at": {
          "type": "timestamptz",
          "nullable": false
        }
      }
    },
    "oauth_clients": {
      "columns": {
        "client_id": {
          "type": "text",
          "primary": true
        },
        "kind": {
          "type": "text",
          "nullable": false
        },
        "client_name": {
          "type": "text",
          "nullable": true
        },
        "redirect_uris": {
          "type": "jsonb",
          "nullable": false
        },
        "metadata": {
          "type": "jsonb",
          "nullable": true
        },
        "status": {
          "type": "text",
          "nullable": false
        },
        "created_at": {
          "type": "timestamptz",
          "nullable": false
        },
        "updated_at": {
          "type": "timestamptz",
          "nullable": false
        }
      }
    }
  },
  sql: [`
    ALTER TABLE connect_accounts ADD CHECK (status IN ('active','disabled'));
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
  `],
};
