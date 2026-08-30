/**
 * Remote tool grants against REAL SQL.
 *
 * Ported from test/integration/api/remote-tools.test.ts (the legacy booted
 * server suite). Real IoC graph (testDinner over the production
 * remote-tools.yaml source), real repos, real production migration DDL on
 * an isolated testPostgres database — no listening server, no coordinator.
 *
 * Preserved REAL-SQL claims: minting a grant persists exactly one hashed
 * row (raw token never stored, never listed), scope-closure violations mint
 * nothing, and revocation cuts off the MCP bearer surface. The MCP
 * dispatch/bearer/scope mechanics are pinned in the unit tier
 * (remote_tools.testdinner*.test.ts, remote_tool_dispatch_service.test.ts).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { Database } from "sqlstack";
import RemoteToolsController from "../../src/server/controller/remote_tools.controller";
import {
  buildProductionDatabase,
  registerProductionSql,
} from "../helpers/production-schema";

// Force the "no coordinator routing" branch regardless of the shell env.
delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
delete process.env.EXECUTOR_COORDINATOR;

const remoteToolsSource = parseYaml(
  readFileSync(path.resolve(__dirname, "../../src/server/openapi/connect/remote-tools.yaml"), "utf8"),
) as Record<string, unknown>;

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const USER_ID = "usr_rtoolowner1";
const SESSION_ID = "ses_rtoolsess01";
const SESSION_TOKEN = Buffer.alloc(32, 11).toString("base64url");
const CSRF_TOKEN = Buffer.alloc(32, 12).toString("base64url");
const EXECUTOR_ID = "exe_rtoolexec01";
const WORKSPACE_ID = "wrk_0123456789abcdef0123456789abcdef";
const FUTURE = "2999-01-01T00:00:00.000Z";
const NOW = "2026-01-01T00:00:00.000Z";

let built: TestPostgresDatabase;
let database: Database;
let env: Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;

const rows = (sql: string, params: unknown[] = []) =>
  built.query(sql, params) as Promise<Record<string, unknown>[]>;

const ownerHeaders = {
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  "x-csrf-token": CSRF_TOKEN,
};

const mintGrant = (scopes: string[]) =>
  env.dinner.request({
    method: "POST",
    path: "/v1/remote-tools/grants",
    query: { sessionId: SESSION_ID },
    headers: ownerHeaders,
    body: { executorId: EXECUTOR_ID, workspaceId: WORKSPACE_ID, scopes },
  });

const mcp = (token: string | null, body: Record<string, unknown>) =>
  env.dinner.request({
    method: "POST",
    path: "/v1/remote-tools/mcp",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
  });

beforeAll(async () => {
  built = await buildProductionDatabase();
  database = await registerProductionSql(built, "db-remote-tool-grants");
  env = await testDinner(remoteToolsSource)
    .select({ module: "remoteTools" })
    .controllers({ "remote_tools.controller": RemoteToolsController })
    .hooks({})
    .build();
});

beforeEach(async () => {
  await rows(
    `TRUNCATE remote_tool_grants, connect_executors, connect_browser_sessions,
       connect_accounts CASCADE`,
  );
  await rows(
    `INSERT INTO connect_accounts (user_id, username, email, status, created_at, updated_at)
     VALUES ($1, 'rtool.owner', 'rtool.owner@example.com', 'active', now(), now())`,
    [USER_ID],
  );
  await rows(
    `INSERT INTO connect_browser_sessions (
       session_id, user_id, session_token_hash, csrf_token_hash, status,
       created_at, last_seen_at, idle_expires_at, absolute_expires_at)
     VALUES ($1, $2, $3, $4, 'active', now(), now(), $5, $5)`,
    [SESSION_ID, USER_ID, sha256(SESSION_TOKEN), sha256(CSRF_TOKEN), FUTURE],
  );
  await rows(
    `INSERT INTO connect_executors (
       executor_id, device_id, owner_user_id, display_name, platform, architecture,
       executor_version, key_fingerprint, state, credential_generation,
       created_at, claimed_at, updated_at, last_seen_at)
     VALUES ($1, 'dev_rtooldev001', $2, 'Remote tools executor', 'macos', 'arm64',
       '0.1.0', $3, 'active', 1, $4, $4, $4, $4)`,
    [EXECUTOR_ID, USER_ID, "e".repeat(64), NOW],
  );
});

afterAll(async () => {
  await env?.dispose();
  await database?.close();
  await built?.dispose();
});

describe("Remote tool grants against real SQL", () => {
  it("mints a grant once, enforces scope dependencies, and lists without tokens", async () => {
    const invalid = await mintGrant(["workspace.write"]);
    expect(invalid.status).toBe(400);
    expect(await rows("SELECT count(*)::int AS n FROM remote_tool_grants")).toEqual([{ n: 0 }]);

    const created = await mintGrant(["workspace.read"]);
    const createdBody = await created.json() as Record<string, unknown>;
    expect(created.status, JSON.stringify(createdBody)).toBe(201);
    const token = String(createdBody.token);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Exactly one persisted row, carrying only the hash of the raw token.
    const grantRows = await rows("SELECT * FROM remote_tool_grants");
    expect(grantRows).toHaveLength(1);
    expect(grantRows[0]).toMatchObject({
      owner_user_id: USER_ID,
      executor_id: EXECUTOR_ID,
      workspace_id: WORKSPACE_ID,
      token_hash: sha256(token),
      state: "active",
    });
    expect(JSON.stringify(grantRows)).not.toContain(token);

    const listed = await env.dinner.request({
      method: "GET",
      path: "/v1/remote-tools/grants",
      query: { sessionId: SESSION_ID },
      headers: { cookie: ownerHeaders.cookie },
    });
    const listedBody = await listed.json() as { grants: unknown[] };
    expect(listed.status, JSON.stringify(listedBody)).toBe(200);
    expect(listedBody.grants).toHaveLength(1);
    expect(JSON.stringify(listedBody)).not.toContain(token);
  });

  it("revocation cuts off the MCP surface", async () => {
    const created = await mintGrant(["workspace.read"]);
    const createdBody = await created.json() as Record<string, unknown>;
    expect(created.status, JSON.stringify(createdBody)).toBe(201);
    const token = String(createdBody.token);
    const grantId = String(createdBody.grantId);

    const before = await mcp(token, { jsonrpc: "2.0", id: 1, method: "ping" });
    expect(before.status, JSON.stringify(await before.json())).toBe(200);

    const revoked = await env.dinner.request({
      method: "POST",
      path: `/v1/remote-tools/grants/${grantId}/revoke`,
      query: { sessionId: SESSION_ID },
      headers: ownerHeaders,
      body: {},
    });
    expect(revoked.status, JSON.stringify(await revoked.json())).toBe(200);
    expect(await rows(
      "SELECT state FROM remote_tool_grants WHERE grant_id = $1",
      [grantId],
    )).toEqual([{ state: "revoked" }]);

    const after = await mcp(token, { jsonrpc: "2.0", id: 2, method: "ping" });
    expect(after.status).toBe(401);
  });
});
