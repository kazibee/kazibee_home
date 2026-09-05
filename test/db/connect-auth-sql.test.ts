/**
 * Connect auth SQL/state-owned claims against REAL SQL.
 *
 * Ported from test/integration/api/connect-auth.test.ts (the legacy booted
 * server suite). Real IoC graph (testDinner over the production auth.yaml
 * source), real repos, real bcrypt hashing, real production migration DDL
 * on an isolated testPostgres database — no listening server.
 *
 * Preserved claims: signup→login→logout roundtrip with real hashing + rows;
 * Google/password identity linking onto the one allowed email account;
 * duplicate-username rejection; concurrent independent persisted sessions;
 * revoked/disabled/idle-expired/absolute-expired authority; CSRF
 * double-submit (missing, wrong, and cross-session rotated tokens); and
 * account non-enumeration. The boot-composition claims (fresh-app restart
 * persistence, singleton reuse) stayed in the integration tier
 * (test/integration/api/restart-persistence.test.ts).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { Database } from "sqlstack";
import ConnectAuthController from "../../src/server/controller/connect_auth.controller";
import {
  CONNECT_BCRYPT_COST,
  CONNECT_SESSION_ABSOLUTE_MS,
} from "../../src/server/services/connect_auth_policy";
import {
  buildProductionDatabase,
  composeProductionSql,
} from "../helpers/production-schema";

const authSource = parseYaml(
  readFileSync(path.resolve(__dirname, "../../src/server/openapi/connect/auth.yaml"), "utf8"),
) as Record<string, unknown>;

const signupEnvelope = {
  kind: "auth.signup.request",
  protocolVersion: "1.0",
  username: "  Alice.Example  ",
  email: "shavyg2@gmail.com",
  password: "correct horse battery staple",
  idempotencyKey: "idem_signup_auth_00000001",
  correlationId: "cor_signup001",
};

function loginEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    kind: "auth.login.request",
    protocolVersion: "1.0",
    username: signupEnvelope.username,
    password: signupEnvelope.password,
    idempotencyKey: "idem_login_auth_default001",
    correlationId: "cor_login0000",
    ...overrides,
  };
}

type DinnerResponse = Awaited<
  ReturnType<Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>["dinner"]["request"]>
>;

function setCookies(response: DinnerResponse): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const viaApi = headers.getSetCookie?.();
  if (viaApi && viaApi.length > 0) return viaApi;
  const single = headers.get("set-cookie");
  return single ? single.split(/,(?=\s*[A-Za-z0-9_]+=)/) : [];
}

function cookieValue(cookies: string[], name: string): string {
  const cookie = cookies.map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie in ${JSON.stringify(cookies)}`);
  return cookie.slice(name.length + 1).split(";")[0];
}

async function expectConnectError(
  response: DinnerResponse,
  status: number,
  code: "invalid-envelope" | "protocol-version-mismatch" | "revoked",
): Promise<Record<string, unknown>> {
  const body = await response.json() as Record<string, unknown>;
  expect(response.status, JSON.stringify(body)).toBe(status);
  expect(Object.keys(body).sort()).toEqual(
    ["kind", "protocolVersion", "code", "message", "retryable", "correlationId"].sort(),
  );
  expect(body).toMatchObject({
    kind: "error",
    protocolVersion: "1.0",
    code,
    retryable: false,
  });
  expect(body.message).toEqual(expect.any(String));
  expect(body.correlationId).toMatch(/^cor_[A-Za-z0-9]{8,64}$/);
  return body;
}

let built: TestPostgresDatabase;
let database: Database;
let env: Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;

const rows = (sql: string, params: unknown[] = []) =>
  built.query(sql, params) as Promise<Record<string, unknown>[]>;

const post = (route: string, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  env.dinner.request({ method: "POST", path: `/v1/connect/auth/${route}`, body, headers });

const sessionQuery = (sessionId: string, suffix: string) => ({
  kind: "auth.session.request",
  protocolVersion: "1.0",
  sessionId,
  actorRole: "browser_session",
  correlationId: `cor_session${suffix}`,
});

const getSession = (sessionId: string, suffix: string, headers: Record<string, string> = {}) =>
  env.dinner.request({
    method: "GET",
    path: "/v1/connect/auth/session",
    query: sessionQuery(sessionId, suffix),
    headers,
  });

async function signupAndAssert() {
  const response = await post("signup", signupEnvelope);
  const body = await response.json() as Record<string, unknown>;
  expect(response.status, JSON.stringify(body)).toBe(201);
  expect(body.username).toBe("alice.example");
  return body;
}

async function loginAndAssert(suffix: string, overrides: Record<string, unknown> = {}) {
  const response = await post("login", loginEnvelope({
    idempotencyKey: `idem_login_assert_${suffix}`,
    correlationId: `cor_assert${suffix}`,
    ...overrides,
  }));
  const body = await response.json() as Record<string, unknown>;
  expect(response.status, JSON.stringify(body)).toBe(200);
  expect(body).toMatchObject({
    kind: "auth.login.response",
    protocolVersion: "1.0",
    actorRole: "browser_session",
  });
  expect(body.sessionId).toMatch(/^ses_[A-Za-z0-9]{8,64}$/);
  const cookies = setCookies(response);
  expect(cookies.length).toBeGreaterThan(0);
  return {
    body,
    cookies,
    sessionToken: cookieValue(cookies, "kazi_connect_session"),
    csrf: cookieValue(cookies, "kazi_connect_csrf"),
  };
}

beforeAll(async () => {
  built = await buildProductionDatabase();
  const sql = await composeProductionSql(built, "db-connect-auth");
  database = sql.database;
  env = await testDinner(authSource)
    .use(sql.module)
    .select({ module: "connectAuth" })
    .controllers({ "connect_auth.controller": ConnectAuthController })
    .hooks({})
    .build();
});

beforeEach(async () => {
  await rows("TRUNCATE connect_browser_sessions, connect_identities, connect_accounts CASCADE");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await env?.dispose();
  await database?.close();
  await built?.dispose();
});

describe("Connect auth SQL-owned behavior (real db, no server)", () => {
  it("signs up, normalizes, hashes, logs in, verifies, and logs out", async () => {
    const signup = await post("signup", signupEnvelope);
    const signupBody = await signup.json() as Record<string, unknown>;
    expect(signup.status, JSON.stringify(signupBody)).toBe(201);
    expect(signupBody).toMatchObject({
      kind: "auth.signup.response",
      protocolVersion: "1.0",
      username: "alice.example",
      correlationId: "cor_signup001",
    });
    expect(signupBody).not.toHaveProperty("password");

    const accountRows = await rows(
      "SELECT user_id, username, password_hash FROM connect_accounts WHERE username = $1",
      ["alice.example"],
    );
    const account = accountRows[0] as {
      user_id: string;
      username: string;
      password_hash: string;
    };
    expect(account.password_hash).not.toContain(signupEnvelope.password);
    expect(await bcrypt.compare(signupEnvelope.password, account.password_hash)).toBe(true);
    expect(Number(account.password_hash.split("$")[2])).toBe(CONNECT_BCRYPT_COST);

    const login = await post("login", loginEnvelope({
      username: "ALICE.EXAMPLE",
      idempotencyKey: "idem_login_auth_000000001",
      correlationId: "cor_login0001",
    }));
    const loginBody = await login.json() as Record<string, unknown>;
    expect(login.status, JSON.stringify(loginBody)).toBe(200);
    expect(loginBody.userId).toBe(account.user_id);
    const cookies = setCookies(login);
    expect(cookies.some((cookie) =>
      /^kazi_connect_session=.*; Path=\/; HttpOnly; SameSite=(?:Strict|strict)$/.test(cookie.trim()),
    )).toBe(true);
    expect(cookies.some((cookie) =>
      /^kazi_connect_csrf=.*; Path=\/; SameSite=(?:Strict|strict)$/.test(cookie.trim()),
    )).toBe(true);

    const sessionRows = await rows(
      "SELECT * FROM connect_browser_sessions WHERE session_id = $1",
      [loginBody.sessionId],
    );
    const persisted = sessionRows[0] as {
      session_token_hash: string;
      csrf_token_hash: string;
      created_at: string;
      absolute_expires_at: string;
    };
    expect(persisted.session_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.csrf_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      new Date(persisted.absolute_expires_at).getTime() - new Date(persisted.created_at).getTime(),
    ).toBe(CONNECT_SESSION_ABSOLUTE_MS);

    const sessionToken = cookieValue(cookies, "kazi_connect_session");
    const csrf = cookieValue(cookies, "kazi_connect_csrf");
    const current = await getSession(String(loginBody.sessionId), "01", {
      cookie: `kazi_connect_session=${sessionToken}`,
    });
    expect(current.status).toBe(200);
    expect((await current.json() as Record<string, unknown>).sessionId).toBe(loginBody.sessionId);

    const logout = await post("logout", {
      kind: "auth.logout.request",
      protocolVersion: "1.0",
      sessionId: loginBody.sessionId,
      actorRole: "browser_session",
      idempotencyKey: "idem_logout_auth_0000001",
      correlationId: "cor_logout001",
    }, {
      cookie: `kazi_connect_session=${sessionToken}; kazi_connect_csrf=${csrf}`,
      "x-csrf-token": csrf,
    });
    expect(logout.status).toBe(200);
    expect((await logout.json() as Record<string, unknown>).ended).toBe(true);

    const afterLogout = await getSession(String(loginBody.sessionId), "02", {
      cookie: `kazi_connect_session=${sessionToken}`,
    });
    expect(afterLogout.status).toBe(401);
  });

  it("links Google and password sign-in to the one allowed email account", async () => {
    process.env.GOOGLE_CLIENT_ID = "kazibee-google-client";
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://oauth2.googleapis.com/tokeninfo")) {
        return new Response(JSON.stringify({
          aud: "kazibee-google-client",
          sub: "google-subject-shavyg2",
          email: "SHAVYG2@GMAIL.COM",
          email_verified: "true",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return nativeFetch(input, init);
    }) as typeof fetch);
    try {
      const google = await post("google", {
        kind: "auth.google.request",
        protocolVersion: "1.0",
        credential: "signed-google-id-token",
        idempotencyKey: "idem_google_auth_00000001",
        correlationId: "cor_google001",
      });
      const googleBody = await google.json() as Record<string, unknown>;
      expect(google.status, JSON.stringify(googleBody)).toBe(200);

      const signup = await post("signup", signupEnvelope);
      const signupBody = await signup.json() as Record<string, unknown>;
      expect(signup.status, JSON.stringify(signupBody)).toBe(201);
      expect(signupBody.userId).toBe(googleBody.userId);

      const passwordLogin = await post("login", loginEnvelope({
        username: "shavyg2@gmail.com",
        idempotencyKey: "idem_login_google_00000001",
        correlationId: "cor_google002",
      }));
      const passwordBody = await passwordLogin.json() as Record<string, unknown>;
      expect(passwordLogin.status, JSON.stringify(passwordBody)).toBe(200);
      expect(passwordBody.userId).toBe(googleBody.userId);
    } finally {
      delete process.env.GOOGLE_CLIENT_ID;
    }
  });

  it("rejects duplicate usernames with the canonical error envelope", async () => {
    await signupAndAssert();
    const duplicate = await post("signup", {
      ...signupEnvelope,
      username: "ALICE.EXAMPLE",
      idempotencyKey: "idem_signup_auth_00000002",
      correlationId: "cor_signup002",
    });
    await expectConnectError(duplicate, 409, "invalid-envelope");
  });

  it("does not enumerate accounts and requires double-submit CSRF", async () => {
    await signupAndAssert();
    const unknown = await post("login", loginEnvelope({
      username: "unknown.person",
      idempotencyKey: "idem_login_auth_000000003",
      correlationId: "cor_login0003",
    }));
    const wrong = await post("login", loginEnvelope({
      password: "this password is wrong",
      idempotencyKey: "idem_login_auth_000000004",
      correlationId: "cor_login0004",
    }));
    const unknownBody = await expectConnectError(unknown, 401, "invalid-envelope");
    const wrongBody = await expectConnectError(wrong, 401, "invalid-envelope");
    expect(unknownBody.message).toBe(wrongBody.message);

    const login = await loginAndAssert("00000005");
    const withoutCsrf = await post("logout", {
      kind: "auth.logout.request",
      protocolVersion: "1.0",
      sessionId: login.body.sessionId,
      actorRole: "browser_session",
      idempotencyKey: "idem_logout_auth_0000002",
      correlationId: "cor_logout002",
    }, {
      cookie: `kazi_connect_session=${login.sessionToken}; kazi_connect_csrf=${login.csrf}`,
    });
    await expectConnectError(withoutCsrf, 403, "invalid-envelope");
  });

  it("supports concurrent independent persisted sessions", async () => {
    await signupAndAssert();
    const first = await loginAndAssert("00000001");
    const second = await loginAndAssert("00000002");
    expect(first.body.sessionId).not.toBe(second.body.sessionId);
    const active = await rows(
      "SELECT session_id FROM connect_browser_sessions WHERE user_id = $1 AND status = 'active'",
      [first.body.userId],
    );
    expect(active.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects revoked, disabled-account, idle-expired, and absolute-expired authority", async () => {
    await signupAndAssert();
    const verify = (login: Awaited<ReturnType<typeof loginAndAssert>>, suffix: string) =>
      getSession(String(login.body.sessionId), suffix, {
        cookie: `kazi_connect_session=${login.sessionToken}`,
      });

    const revoked = await loginAndAssert("0000000000000001");
    await rows(
      "UPDATE connect_browser_sessions SET status = 'revoked', revoked_at = $1 WHERE session_id = $2",
      [new Date().toISOString(), revoked.body.sessionId],
    );
    await expectConnectError(await verify(revoked, "0001"), 401, "revoked");

    const disabled = await loginAndAssert("0000000000000002");
    await rows(
      "UPDATE connect_accounts SET status = 'disabled' WHERE user_id = $1",
      [disabled.body.userId],
    );
    await expectConnectError(await verify(disabled, "0002"), 401, "revoked");
    await rows(
      "UPDATE connect_accounts SET status = 'active' WHERE user_id = $1",
      [disabled.body.userId],
    );

    const idle = await loginAndAssert("0000000000000003");
    await rows(
      "UPDATE connect_browser_sessions SET idle_expires_at = $1 WHERE session_id = $2",
      ["2020-01-01T00:00:00.000Z", idle.body.sessionId],
    );
    await expectConnectError(await verify(idle, "0003"), 401, "revoked");

    const absolute = await loginAndAssert("0000000000000004");
    await rows(
      `UPDATE connect_browser_sessions
       SET idle_expires_at = $1, absolute_expires_at = $2
       WHERE session_id = $3`,
      ["2020-01-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z", absolute.body.sessionId],
    );
    await expectConnectError(await verify(absolute, "0004"), 401, "revoked");
  });

  it("rejects wrong and cross-session rotated CSRF tokens", async () => {
    await signupAndAssert();
    const first = await loginAndAssert("00000003");
    const second = await loginAndAssert("00000004");
    const envelope = {
      kind: "auth.logout.request",
      protocolVersion: "1.0",
      sessionId: second.body.sessionId,
      actorRole: "browser_session",
      idempotencyKey: "idem_logout_csrf_0000001",
      correlationId: "cor_csrf0003",
    };
    const secondCookies =
      `kazi_connect_session=${second.sessionToken}; kazi_connect_csrf=${second.csrf}`;
    const wrong = await post("logout", envelope, {
      cookie: secondCookies,
      "x-csrf-token": "x".repeat(43),
    });
    await expectConnectError(wrong, 403, "invalid-envelope");
    const rotated = await post("logout", envelope, {
      cookie: secondCookies,
      "x-csrf-token": first.csrf,
    });
    await expectConnectError(rotated, 403, "invalid-envelope");
  });
});
