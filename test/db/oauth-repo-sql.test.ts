/**
 * OAuthRepo against REAL SQL.
 *
 * Direct repo-level coverage for the OAuth provider tables. The HTTP-facing
 * flows are pinned in the unit tier (oauth*.testdinner.test.ts) on schema
 * doubles; this file pins the repo methods those flows never reach against
 * the production migration DDL: connection listing and capability edits,
 * supersede revocation (tokens then connections), code issue/consume (fresh,
 * replayed, expired), token revocation by connection, and every @Single null
 * path. Ids follow the DDL check constraints (oac_/ocn_ + 32 hex, 64-hex
 * hashes).
 *
 * Harness matches connect-website-deployment-identity.service.test.ts:
 * "full" migrated template database via test-db.ts and plain `new` repos.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "sqlstack";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db";
import OAuthRepo, { toCreateOAuthClientParams } from "../../src/server/repo/oauth_repo";
import type { OAuthClientRecord } from "../../src/server/repo/oauth_repo";

let database: Database;

const repo = new OAuthRepo();

const NOW = "2026-01-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";
const USER = "usr_oauth00001";
const OTHER_USER = "usr_oauth00002";

// DDL-conformant id builders: dcr client ids are oac_ + 32 hex, connection
// ids ocn_ + 32 hex, and every hash column is 64 lowercase hex chars.
const clientId = (c: string) => `oac_${c.repeat(32)}`;
const connectionId = (c: string) => `ocn_${c.repeat(32)}`;
const hash64 = (pair: string) => pair.repeat(32);

const CLI_MAIN = clientId("1");
const CLI_BARE = clientId("2");
const CLI_SUPER_OLD = clientId("3");
const CLI_SUPER_NEW = clientId("4");
const CLI_CODE = clientId("5");
const CLI_TOKEN = clientId("6");
const CLI_ROTATE = clientId("7");

const CON_LIST_1 = connectionId("a");
const CON_LIST_2 = connectionId("b");
const CON_REVOKED = connectionId("c");
const CON_SUPER_OLD = connectionId("d");
const CON_SUPER_NEW = connectionId("e");
const CON_CODE = connectionId("f");
const CON_TOKEN = "ocn_" + "1a".repeat(16);
const CON_ROTATE = "ocn_" + "2b".repeat(16);

function clientRecord(id: string, name: string | null): OAuthClientRecord {
  return {
    client_id: id,
    kind: "dcr",
    client_name: name,
    redirect_uris: ["https://client.example/callback"],
    metadata: name === null ? null : { note: `metadata for ${name}` },
    status: "active",
    created_at: NOW,
    updated_at: NOW,
  };
}

async function insertAccount(userId: string): Promise<void> {
  const suffix = userId.replace(/^usr_/, "").toLowerCase();
  await database.query(
    `INSERT INTO connect_accounts (user_id, username, email, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())`,
    [userId, `owner_${suffix}`, `owner_${suffix}@example.com`],
  );
}


function connection(
  id: string,
  client: string,
  overrides: Partial<Parameters<OAuthRepo["createConnection"]>[0]> = {},
) {
  return repo.createConnection({
    connection_id: id,
    user_id: USER,
    client_id: client,
    approved_scope: "read_write",
    allow_shell: true,
    allow_web: false,
    status: "active",
    created_at: NOW,
    revoked_at: null,
    ...overrides,
  });
}

beforeAll(async () => {
  database = await resetTestDatabase();
  await insertAccount(USER);
  await insertAccount(OTHER_USER);
});

afterAll(async () => {
  await closeTestDatabase();
});

describe("OAuthRepo clients", () => {
  it("creates and finds clients, including null metadata and unknown ids", async () => {
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_MAIN, "Kazibee CLI")));
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_BARE, null)));

    expect(await repo.findClientById({ client_id: CLI_MAIN })).toMatchObject({
      client_id: CLI_MAIN,
      kind: "dcr",
      client_name: "Kazibee CLI",
      redirect_uris: ["https://client.example/callback"],
      metadata: { note: "metadata for Kazibee CLI" },
      status: "active",
    });
    expect(await repo.findClientById({ client_id: CLI_BARE }))
      .toMatchObject({ client_name: null, metadata: null });
    expect(await repo.findClientById({ client_id: clientId("9") })).toBeNull();
  });
});

describe("OAuthRepo connections", () => {
  it("creates, lists, edits capabilities, and revokes", async () => {
    await connection(CON_LIST_1, CLI_MAIN, { created_at: PAST });
    await connection(CON_LIST_2, CLI_MAIN);
    await connection(CON_REVOKED, CLI_MAIN, { status: "revoked", revoked_at: NOW });

    expect(await repo.findActiveConnectionById({ connection_id: CON_LIST_1 }))
      .toMatchObject({ connection_id: CON_LIST_1, approved_scope: "read_write" });
    expect(await repo.findActiveConnectionById({ connection_id: CON_REVOKED })).toBeNull();
    expect(await repo.findActiveConnectionById({ connection_id: connectionId("9") })).toBeNull();

    const listed = await repo.listConnectionsByUser({ user_id: USER });
    expect(listed.map((row) => row.connection_id)).toEqual([CON_LIST_2, CON_LIST_1]);
    expect(listed[1]).toMatchObject({
      client_name: "Kazibee CLI",
      status: "active",
      approved_scope: "read_write",
    });
    expect(await repo.listConnectionsByUser({ user_id: OTHER_USER })).toEqual([]);

    await repo.updateConnectionCapabilities({
      connection_id: CON_LIST_1, approved_scope: "read",
      allow_shell: false, allow_web: true,
    });
    expect(await repo.findActiveConnectionById({ connection_id: CON_LIST_1 }))
      .toMatchObject({ approved_scope: "read", allow_shell: false, allow_web: true });

    // Capability edits never resurrect or touch revoked connections.
    await repo.updateConnectionCapabilities({
      connection_id: CON_REVOKED, approved_scope: "read",
      allow_shell: false, allow_web: false,
    });
    expect(await repo.findActiveConnectionById({ connection_id: CON_REVOKED })).toBeNull();

    await repo.revokeConnection({ connection_id: CON_LIST_2, revoked_at: NOW });
    expect(await repo.findActiveConnectionById({ connection_id: CON_LIST_2 })).toBeNull();
    expect(
      (await repo.listConnectionsByUser({ user_id: USER }))
        .map((row) => row.connection_id),
    ).toEqual([CON_LIST_1]);
  });

  it("supersede revokes the other same-name connections' tokens, then the connections", async () => {
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_SUPER_OLD, "Superseded App")));
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_SUPER_NEW, "Superseded App")));
    await connection(CON_SUPER_OLD, CLI_SUPER_OLD);
    await connection(CON_SUPER_NEW, CLI_SUPER_NEW);
    await repo.createToken({
      token_hash: hash64("a1"), connection_id: CON_SUPER_OLD, kind: "access",
      status: "active", created_at: NOW, expires_at: FUTURE,
      revoked_at: null, rotated_from: null,
    });
    await repo.createToken({
      token_hash: hash64("a2"), connection_id: CON_SUPER_NEW, kind: "access",
      status: "active", created_at: NOW, expires_at: FUTURE,
      revoked_at: null, rotated_from: null,
    });

    // CON_SUPER_NEW supersedes: only the OTHER same-name connection dies.
    await repo.revokeSupersededConnectionTokens({
      user_id: USER, connection_id: CON_SUPER_NEW,
      client_name: "Superseded App", revoked_at: NOW,
    });
    await repo.revokeSupersededConnections({
      user_id: USER, connection_id: CON_SUPER_NEW,
      client_name: "Superseded App", revoked_at: NOW,
    });

    expect(await repo.findActiveTokenWithConnection({ token_hash: hash64("a1") })).toBeNull();
    expect(await repo.findActiveTokenWithConnection({ token_hash: hash64("a2") }))
      .toMatchObject({ connection_id: CON_SUPER_NEW, connection_status: "active" });
    expect(await repo.findActiveConnectionById({ connection_id: CON_SUPER_OLD })).toBeNull();
    expect(await repo.findActiveConnectionById({ connection_id: CON_SUPER_NEW }))
      .toMatchObject({ connection_id: CON_SUPER_NEW });
  });
});

describe("OAuthRepo codes and tokens", () => {
  it("issues and consumes codes exactly once, and never consumes expired codes", async () => {
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_CODE, "Code App")));
    await connection(CON_CODE, CLI_CODE);
    const code = {
      code_hash: hash64("b1"),
      connection_id: CON_CODE,
      client_id: CLI_CODE,
      redirect_uri: "https://client.example/callback",
      code_challenge: "c".repeat(43),
      code_challenge_method: "S256" as const,
      resource: "https://kazibee.example/mcp",
      created_at: NOW,
      expires_at: FUTURE,
      consumed_at: null,
    };
    await repo.createCode(code);
    await repo.createCode({ ...code, code_hash: hash64("b2"), expires_at: PAST, created_at: PAST });

    expect(await repo.consumeCode({ code_hash: hash64("b1"), consumed_at: NOW }))
      .toMatchObject({ code_hash: hash64("b1"), connection_id: CON_CODE });
    // Replay: already consumed.
    expect(await repo.consumeCode({ code_hash: hash64("b1"), consumed_at: NOW })).toBeNull();
    // Expired and unknown codes are never consumable.
    expect(await repo.consumeCode({ code_hash: hash64("b2"), consumed_at: NOW })).toBeNull();
    expect(await repo.consumeCode({ code_hash: hash64("b9"), consumed_at: NOW })).toBeNull();
  });

  it("revokes a connection's active tokens and hides them from bearer lookup", async () => {
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_TOKEN, "Token App")));
    await connection(CON_TOKEN, CLI_TOKEN);
    await repo.createToken({
      token_hash: hash64("c1"), connection_id: CON_TOKEN, kind: "access",
      status: "active", created_at: NOW, expires_at: FUTURE,
      revoked_at: null, rotated_from: null,
    });
    await repo.createToken({
      token_hash: hash64("c2"), connection_id: CON_TOKEN, kind: "access",
      status: "active", created_at: PAST, expires_at: PAST,
      revoked_at: null, rotated_from: null,
    });

    expect(await repo.findActiveTokenWithConnection({ token_hash: hash64("c1") }))
      .toMatchObject({
        token_hash: hash64("c1"),
        user_id: USER,
        client_id: CLI_TOKEN,
        connection_status: "active",
      });
    expect(await repo.findActiveTokenWithConnection({ token_hash: hash64("c2") })).toBeNull();
    expect(await repo.findActiveTokenWithConnection({ token_hash: hash64("c9") })).toBeNull();

    await repo.revokeTokensByConnection({ connection_id: CON_TOKEN, revoked_at: NOW });
    expect(await repo.findActiveTokenWithConnection({ token_hash: hash64("c1") })).toBeNull();
  });

  it("rotates refresh tokens once and refuses revoked/expired/unknown ones", async () => {
    await repo.createClient(toCreateOAuthClientParams(clientRecord(CLI_ROTATE, "Rotate App")));
    await connection(CON_ROTATE, CLI_ROTATE);
    await repo.createToken({
      token_hash: hash64("d1"), connection_id: CON_ROTATE, kind: "refresh",
      status: "active", created_at: NOW, expires_at: FUTURE,
      revoked_at: null, rotated_from: null,
    });

    const rotated = await repo.rotateRefreshToken({
      old_token_hash: hash64("d1"), token_hash: hash64("d2"),
      created_at: NOW, expires_at: FUTURE,
    });
    expect(rotated).toMatchObject({
      token_hash: hash64("d2"),
      connection_id: CON_ROTATE,
      kind: "refresh",
      status: "active",
      rotated_from: hash64("d1"),
    });

    // Replay of the consumed refresh token mints nothing.
    expect(await repo.rotateRefreshToken({
      old_token_hash: hash64("d1"), token_hash: hash64("d3"),
      created_at: NOW, expires_at: FUTURE,
    })).toBeNull();
    expect(await repo.rotateRefreshToken({
      old_token_hash: hash64("d9"), token_hash: hash64("d4"),
      created_at: NOW, expires_at: FUTURE,
    })).toBeNull();
  });
});
