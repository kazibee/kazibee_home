/**
 * Connect auth SQL/state-owned claims against REAL SQL through the original
 * application. Each case owns a fresh SQLStack PostgreSQL fixture from an
 * independently authored schema (test/schemas/connect-auth.ts) and its own
 * root testApp over the original configuration; no shared environment,
 * migrated template, TRUNCATE reset, or manual controller wiring.
 *
 * Preserved claims (real repos, real bcrypt hashing, real verifier):
 * signup→login→logout roundtrip with real hashing + rows; Google/password
 * identity linking onto the one allowed email account (only the outbound
 * Google tokeninfo HTTP boundary is replaced — audience/email-verified
 * validation and normalization still run in the real verifier);
 * duplicate-username rejection; concurrent independent persisted sessions;
 * revoked/disabled/idle-expired/absolute-expired authority; CSRF double-submit
 * (missing, wrong, and cross-session rotated tokens); and account
 * non-enumeration.
 */
import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import path from "node:path";
import { testApp } from "@noego/app";
import { test as control, resourceCase } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import Env from "../../src/server/services/env";
import ConnectGoogleTokenInfoClient from "../../src/server/services/connect_google_token_info_client";
import {
  CONNECT_BCRYPT_COST,
  CONNECT_SESSION_ABSOLUTE_MS,
} from "../../src/server/services/connect_auth_policy";
import { connectAuthSchema } from "../schemas/connect-auth";

const CONFIG = path.resolve(__dirname, "../../noego.config.yml");

const GOOGLE_CLIENT_ID = "kazibee-google-client";

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

/** Minimal request surface of a built root testApp environment. */
interface AuthEnv {
  request(input: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  }): Promise<Response>;
}

function setCookies(response: Response): string[] {
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
  response: Response,
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

const post = (
  env: AuthEnv,
  route: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) => env.request({ method: "POST", path: `/v1/connect/auth/${route}`, body, headers });

const sessionQuery = (sessionId: string, suffix: string) => ({
  kind: "auth.session.request",
  protocolVersion: "1.0",
  sessionId,
  actorRole: "browser_session",
  correlationId: `cor_session${suffix}`,
});

const getSession = (
  env: AuthEnv,
  sessionId: string,
  suffix: string,
  headers: Record<string, string> = {},
) => env.request({
  method: "GET",
  path: "/v1/connect/auth/session",
  query: sessionQuery(sessionId, suffix),
  headers,
});

async function signupAndAssert(env: AuthEnv) {
  const response = await post(env, "signup", signupEnvelope);
  const body = await response.json() as Record<string, unknown>;
  expect(response.status, JSON.stringify(body)).toBe(201);
  expect(body.username).toBe("alice.example");
  return body;
}

async function loginAndAssert(env: AuthEnv, suffix: string, overrides: Record<string, unknown> = {}) {
  const response = await post(env, "login", loginEnvelope({
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

describe("Connect auth SQL-owned behavior (real db, no server)", () => {
  it("signs up, normalizes, hashes, logs in, verifies, and logs out", resourceCase(async () => {
    const built = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;

    const signup = await post(env, "signup", signupEnvelope);
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

    const login = await post(env, "login", loginEnvelope({
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
    const current = await getSession(env, String(loginBody.sessionId), "01", {
      cookie: `kazi_connect_session=${sessionToken}`,
    });
    expect(current.status).toBe(200);
    expect((await current.json() as Record<string, unknown>).sessionId).toBe(loginBody.sessionId);

    const logout = await post(env, "logout", {
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

    const afterLogout = await getSession(env, String(loginBody.sessionId), "02", {
      cookie: `kazi_connect_session=${sessionToken}`,
    });
    expect(afterLogout.status).toBe(401);
    await afterLogout.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
  }));

  it("links Google and password sign-in to the one allowed email account", resourceCase(async () => {
    const built: TestPostgresDatabase = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    // Real ConnectGoogleTokenVerifier (audience, email_verified, normalization);
    // only its outbound tokeninfo HTTP boundary is replaced for this root.
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url, GOOGLE_CLIENT_ID });
        return value;
      })
      .method(ConnectGoogleTokenInfoClient, "request", control.watch(() => async (url: string) => {
        expect(url).toBe(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent("signed-google-id-token")}`,
        );
        return Response.json({
          aud: GOOGLE_CLIENT_ID,
          sub: "google-subject-shavyg2",
          email: "SHAVYG2@GMAIL.COM",
          email_verified: "true",
        });
      }))
      .build();

    const google = await post(env, "google", {
      kind: "auth.google.request",
      protocolVersion: "1.0",
      credential: "signed-google-id-token",
      idempotencyKey: "idem_google_auth_00000001",
      correlationId: "cor_google001",
    });
    const googleBody = await google.json() as Record<string, unknown>;
    expect(google.status, JSON.stringify(googleBody)).toBe(200);
    expect(control.inspect(env, ConnectGoogleTokenInfoClient, "request").calls).toHaveLength(1);

    const signup = await post(env, "signup", signupEnvelope);
    const signupBody = await signup.json() as Record<string, unknown>;
    expect(signup.status, JSON.stringify(signupBody)).toBe(201);
    expect(signupBody.userId).toBe(googleBody.userId);

    const passwordLogin = await post(env, "login", loginEnvelope({
      username: "shavyg2@gmail.com",
      idempotencyKey: "idem_login_google_00000001",
      correlationId: "cor_google002",
    }));
    const passwordBody = await passwordLogin.json() as Record<string, unknown>;
    expect(passwordLogin.status, JSON.stringify(passwordBody)).toBe(200);
    expect(passwordBody.userId).toBe(googleBody.userId);
  }));

  it("rejects duplicate usernames with the canonical error envelope", resourceCase(async () => {
    const built = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;
    await signupAndAssert(env);
    const duplicate = await post(env, "signup", {
      ...signupEnvelope,
      username: "ALICE.EXAMPLE",
      idempotencyKey: "idem_signup_auth_00000002",
      correlationId: "cor_signup002",
    });
    await expectConnectError(duplicate, 409, "invalid-envelope");
  }));

  it("does not enumerate accounts and requires double-submit CSRF", resourceCase(async () => {
    const built = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;
    await signupAndAssert(env);
    const unknown = await post(env, "login", loginEnvelope({
      username: "unknown.person",
      idempotencyKey: "idem_login_auth_000000003",
      correlationId: "cor_login0003",
    }));
    const wrong = await post(env, "login", loginEnvelope({
      password: "this password is wrong",
      idempotencyKey: "idem_login_auth_000000004",
      correlationId: "cor_login0004",
    }));
    const unknownBody = await expectConnectError(unknown, 401, "invalid-envelope");
    const wrongBody = await expectConnectError(wrong, 401, "invalid-envelope");
    expect(unknownBody.message).toBe(wrongBody.message);

    const login = await loginAndAssert(env, "00000005");
    const withoutCsrf = await post(env, "logout", {
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
  }));

  it("supports concurrent independent persisted sessions", resourceCase(async () => {
    const built = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;
    await signupAndAssert(env);
    const first = await loginAndAssert(env, "00000001");
    const second = await loginAndAssert(env, "00000002");
    expect(first.body.sessionId).not.toBe(second.body.sessionId);
    const active = await rows(
      "SELECT session_id FROM connect_browser_sessions WHERE user_id = $1 AND status = 'active'",
      [first.body.userId],
    );
    expect(active.length).toBeGreaterThanOrEqual(2);
  }));

  it("rejects revoked, disabled-account, idle-expired, and absolute-expired authority", resourceCase(async () => {
    const built = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;
    await signupAndAssert(env);
    const verify = (login: Awaited<ReturnType<typeof loginAndAssert>>, suffix: string) =>
      getSession(env, String(login.body.sessionId), suffix, {
        cookie: `kazi_connect_session=${login.sessionToken}`,
      });

    const revoked = await loginAndAssert(env, "0000000000000001");
    await rows(
      "UPDATE connect_browser_sessions SET status = 'revoked', revoked_at = $1 WHERE session_id = $2",
      [new Date().toISOString(), revoked.body.sessionId],
    );
    await expectConnectError(await verify(revoked, "0001"), 401, "revoked");

    const disabled = await loginAndAssert(env, "0000000000000002");
    await rows(
      "UPDATE connect_accounts SET status = 'disabled' WHERE user_id = $1",
      [disabled.body.userId],
    );
    await expectConnectError(await verify(disabled, "0002"), 401, "revoked");
    await rows(
      "UPDATE connect_accounts SET status = 'active' WHERE user_id = $1",
      [disabled.body.userId],
    );

    const idle = await loginAndAssert(env, "0000000000000003");
    await rows(
      "UPDATE connect_browser_sessions SET idle_expires_at = $1 WHERE session_id = $2",
      ["2020-01-01T00:00:00.000Z", idle.body.sessionId],
    );
    await expectConnectError(await verify(idle, "0003"), 401, "revoked");

    const absolute = await loginAndAssert(env, "0000000000000004");
    await rows(
      `UPDATE connect_browser_sessions
       SET idle_expires_at = $1, absolute_expires_at = $2
       WHERE session_id = $3`,
      ["2020-01-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z", absolute.body.sessionId],
    );
    await expectConnectError(await verify(absolute, "0004"), 401, "revoked");
  }));

  it("rejects wrong and cross-session rotated CSRF tokens", resourceCase(async () => {
    const built = await testPostgres(connectAuthSchema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: built.url });
        return value;
      }).build();
    const rows = (sql: string, params: unknown[] = []) =>
      built.query(sql, params) as Promise<Record<string, unknown>[]>;
    await signupAndAssert(env);
    const first = await loginAndAssert(env, "00000003");
    const second = await loginAndAssert(env, "00000004");
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
    const wrong = await post(env, "logout", envelope, {
      cookie: secondCookies,
      "x-csrf-token": "x".repeat(43),
    });
    await expectConnectError(wrong, 403, "invalid-envelope");
    const rotated = await post(env, "logout", envelope, {
      cookie: secondCookies,
      "x-csrf-token": first.csrf,
    });
    await expectConnectError(rotated, 403, "invalid-envelope");
  }));
});
