import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { getContainer } from "@noego/app";
import type { TestAppResult } from "../../helpers/test-app";
import {
  cleanupTestApp,
  getPersistentTestApp,
  getTestApp,
  restartPersistentTestApp,
} from "../../helpers/test-app";
import { TraceProbe } from "../../helpers/trace-probe";
import {
  CONNECT_BCRYPT_COST,
  CONNECT_SESSION_ABSOLUTE_MS,
} from "../../../src/server/services/connect_auth_policy";
import ConnectAuthPolicy from "../../../src/server/services/connect_auth_policy";
import TraceAdapter from "../../../src/server/observability/trace_adapter";

const signupEnvelope = {
  kind: "auth.signup.request",
  protocolVersion: "1.0",
  username: "  Alice.Example  ",
  password: "correct horse battery staple",
  idempotencyKey: "idem_signup_auth_00000001",
  correlationId: "cor_signup001",
};

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} test cookie`);
  return cookie.slice(name.length + 1).split(";")[0];
}

function expectConnectError(
  response: { status: number; body: Record<string, unknown> },
  status: number,
  code: "invalid-envelope" | "protocol-version-mismatch" | "revoked",
): void {
  expect(response.status, JSON.stringify(response.body)).toBe(status);
  expect(Object.keys(response.body).sort()).toEqual(
    ["kind", "protocolVersion", "code", "message", "retryable", "correlationId"].sort(),
  );
  expect(response.body).toMatchObject({
    kind: "error",
    protocolVersion: "1.0",
    code,
    retryable: false,
  });
  expect(response.body.message).toEqual(expect.any(String));
  expect(response.body.correlationId).toMatch(/^cor_[A-Za-z0-9]{8,64}$/);
}

async function signupAndAssert(testApp: TestAppResult) {
  const response = await testApp.agent.post("/v1/connect/auth/signup").send(signupEnvelope);
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  expect(response.body.username).toBe("alice.example");
  return response;
}

async function loginAndAssert(
  testApp: TestAppResult,
  suffix: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await testApp.agent.post("/v1/connect/auth/login").send({
    ...signupEnvelope,
    kind: "auth.login.request",
    idempotencyKey: `idem_login_assert_${suffix}`,
    correlationId: `cor_assert${suffix}`,
    ...overrides,
  });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  expect(response.body).toMatchObject({
    kind: "auth.login.response",
    protocolVersion: "1.0",
    actorRole: "browser_session",
  });
  expect(response.body.sessionId).toMatch(/^ses_[A-Za-z0-9]{8,64}$/);
  expect(response.headers["set-cookie"]).toBeDefined();
  return response;
}

describe("Connect auth HTTP boundary", () => {
  let testApp: TestAppResult;

  beforeEach(async () => {
    testApp = await getTestApp();
  });

  afterEach(async () => {
    await cleanupTestApp(testApp);
  });

  it("signs up, normalizes, hashes, logs in, verifies, and logs out", async () => {
    const signup = await testApp.agent.post("/v1/connect/auth/signup").send(signupEnvelope);
    expect(signup.status).toBe(201);
    expect(signup.body).toMatchObject({
      kind: "auth.signup.response",
      protocolVersion: "1.0",
      username: "alice.example",
      correlationId: "cor_signup001",
    });
    expect(signup.body).not.toHaveProperty("password");

    const accountRows = await testApp.database.query(
      "SELECT user_id, username, password_hash FROM connect_accounts WHERE username = ?",
      ["alice.example"],
    );
    expect(Array.isArray(accountRows)).toBe(true);
    if (!Array.isArray(accountRows)) throw new Error("Expected account rows");
    const account = accountRows[0] as {
      user_id: string;
      username: string;
      password_hash: string;
    };
    expect(account.password_hash).not.toContain(signupEnvelope.password);
    expect(await bcrypt.compare(signupEnvelope.password, account.password_hash)).toBe(true);
    expect(Number(account.password_hash.split("$")[2])).toBe(CONNECT_BCRYPT_COST);

    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      ...signupEnvelope,
      kind: "auth.login.request",
      username: "ALICE.EXAMPLE",
      idempotencyKey: "idem_login_auth_000000001",
      correlationId: "cor_login0001",
    });
    expect(login.status).toBe(200);
    expect(login.body.userId).toBe(account.user_id);
    const setCookies = login.headers["set-cookie"] as unknown as string[];
    expect(setCookies.some((cookie) =>
      /^kazi_connect_session=.*; Path=\/; HttpOnly; SameSite=(?:Strict|strict)$/.test(cookie),
    )).toBe(true);
    expect(setCookies.some((cookie) =>
      /^kazi_connect_csrf=.*; Path=\/; SameSite=(?:Strict|strict)$/.test(cookie),
    )).toBe(true);

    const sessionRows = await testApp.database.query(
      "SELECT * FROM connect_browser_sessions WHERE session_id = ?",
      [login.body.sessionId],
    );
    if (!Array.isArray(sessionRows)) throw new Error("Expected session rows");
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

    const current = await testApp.agent.get("/v1/connect/auth/session").query({
      kind: "auth.session.request",
      protocolVersion: "1.0",
      sessionId: login.body.sessionId,
      actorRole: "browser_session",
      correlationId: "cor_session01",
    });
    expect(current.status).toBe(200);
    expect(current.body.sessionId).toBe(login.body.sessionId);

    const csrf = cookieValue(setCookies, "kazi_connect_csrf");
    const logout = await testApp.agent
      .post("/v1/connect/auth/logout")
      .set("x-csrf-token", csrf)
      .send({
        kind: "auth.logout.request",
        protocolVersion: "1.0",
        sessionId: login.body.sessionId,
        actorRole: "browser_session",
        idempotencyKey: "idem_logout_auth_0000001",
        correlationId: "cor_logout001",
      });
    expect(logout.status).toBe(200);
    expect(logout.body.ended).toBe(true);

    const afterLogout = await testApp.agent.get("/v1/connect/auth/session").query({
      kind: "auth.session.request",
      protocolVersion: "1.0",
      sessionId: login.body.sessionId,
      actorRole: "browser_session",
      correlationId: "cor_session02",
    });
    expect(afterLogout.status).toBe(401);
  });

  it("rejects duplicate usernames, malformed envelopes, and protocol mismatches", async () => {
    await signupAndAssert(testApp);
    const duplicate = await testApp.agent.post("/v1/connect/auth/signup").send({
      ...signupEnvelope,
      username: "ALICE.EXAMPLE",
      idempotencyKey: "idem_signup_auth_00000002",
      correlationId: "cor_signup002",
    });
    expectConnectError(duplicate, 409, "invalid-envelope");

    const extra = await testApp.agent.post("/v1/connect/auth/signup").send({
      ...signupEnvelope,
      username: "other.person",
      idempotencyKey: "idem_signup_auth_00000003",
      correlationId: "cor_signup003",
      unexpected: true,
    });
    expectConnectError(extra, 400, "invalid-envelope");

    const mismatch = await testApp.agent.post("/v1/connect/auth/login").send({
      ...signupEnvelope,
      kind: "auth.login.request",
      protocolVersion: "2.0",
      idempotencyKey: "idem_login_auth_000000002",
      correlationId: "cor_login0002",
    });
    expectConnectError(mismatch, 409, "protocol-version-mismatch");
  });

  it("maps pre-controller validation failures without leaking framework details or raw input", async () => {
    const secret = "boundary-secret-must-not-leak";
    const cases = [
      {
        name: "extra field",
        request: () => testApp.agent.post("/v1/connect/auth/signup").send({
          ...signupEnvelope,
          correlationId: "cor_boundary01",
          unexpected: secret,
        }),
        status: 400,
        code: "invalid-envelope" as const,
        correlationId: "cor_boundary01",
      },
      {
        name: "missing field",
        request: () => testApp.agent.post("/v1/connect/auth/signup").send({
          kind: "auth.signup.request",
          protocolVersion: "1.0",
          username: "boundary.user",
          password: secret,
          correlationId: "cor_boundary02",
        }),
        status: 400,
        code: "invalid-envelope" as const,
        correlationId: "cor_boundary02",
      },
      {
        name: "wrong type",
        request: () => testApp.agent.post("/v1/connect/auth/signup").send({
          ...signupEnvelope,
          username: { raw: secret },
          correlationId: "cor_boundary03",
        }),
        status: 400,
        code: "invalid-envelope" as const,
        correlationId: "cor_boundary03",
      },
      {
        name: "malformed correlation",
        request: () => testApp.agent.post("/v1/connect/auth/signup").send({
          ...signupEnvelope,
          correlationId: `bad_${secret}`,
          unexpected: true,
        }),
        status: 400,
        code: "invalid-envelope" as const,
        correlationId: "cor_invalid000",
      },
      {
        name: "body protocol mismatch",
        request: () => testApp.agent.post("/v1/connect/auth/login").send({
          ...signupEnvelope,
          kind: "auth.login.request",
          protocolVersion: "9.9",
          correlationId: "cor_boundary04",
        }),
        status: 409,
        code: "protocol-version-mismatch" as const,
        correlationId: "cor_boundary04",
      },
      {
        name: "query protocol mismatch",
        request: () => testApp.agent.get("/v1/connect/auth/session").query({
          kind: "auth.session.request",
          protocolVersion: "9.9",
          sessionId: "ses_boundary0001",
          actorRole: "browser_session",
          correlationId: "cor_boundary05",
        }),
        status: 409,
        code: "protocol-version-mismatch" as const,
        correlationId: "cor_boundary05",
      },
    ];

    for (const testCase of cases) {
      const response = await testCase.request();
      expectConnectError(response, testCase.status, testCase.code);
      expect(response.body.correlationId, testCase.name).toBe(testCase.correlationId);
      const serialized = JSON.stringify(response.body);
      for (const forbidden of [
        secret,
        "validation_schema",
        "requirements",
        "statusCode",
        "path",
        "method",
        "unexpected",
      ]) {
        expect(serialized, `${testCase.name} leaked ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it("does not enumerate accounts and requires double-submit CSRF", async () => {
    await signupAndAssert(testApp);
    const unknown = await testApp.agent.post("/v1/connect/auth/login").send({
      ...signupEnvelope,
      kind: "auth.login.request",
      username: "unknown.person",
      idempotencyKey: "idem_login_auth_000000003",
      correlationId: "cor_login0003",
    });
    const wrong = await testApp.agent.post("/v1/connect/auth/login").send({
      ...signupEnvelope,
      kind: "auth.login.request",
      password: "this password is wrong",
      idempotencyKey: "idem_login_auth_000000004",
      correlationId: "cor_login0004",
    });
    expectConnectError(unknown, 401, "invalid-envelope");
    expectConnectError(wrong, 401, "invalid-envelope");
    expect(unknown.body.message).toBe(wrong.body.message);

    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      ...signupEnvelope,
      kind: "auth.login.request",
      idempotencyKey: "idem_login_auth_000000005",
      correlationId: "cor_login0005",
    });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    const withoutCsrf = await testApp.agent.post("/v1/connect/auth/logout").send({
      kind: "auth.logout.request",
      protocolVersion: "1.0",
      sessionId: login.body.sessionId,
      actorRole: "browser_session",
      idempotencyKey: "idem_logout_auth_0000002",
      correlationId: "cor_logout002",
    });
    expectConnectError(withoutCsrf, 403, "invalid-envelope");
  });

  it("supports concurrent independent persisted sessions", async () => {
    await signupAndAssert(testApp);
    const first = await loginAndAssert(testApp, "00000001");
    const second = await loginAndAssert(testApp, "00000002");
    expect(first.body.sessionId).not.toBe(second.body.sessionId);
    const rows = await testApp.database.query(
      "SELECT session_id FROM connect_browser_sessions WHERE user_id = ? AND status = 'active'",
      [first.body.userId],
    );
    expect(Array.isArray(rows) && rows.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects revoked, disabled-account, idle-expired, and absolute-expired authority", async () => {
    await signupAndAssert(testApp);
    const login = async (suffix: string) => loginAndAssert(testApp, suffix);
    const verify = async (sessionId: string, suffix: string) =>
      testApp.agent.get("/v1/connect/auth/session").query({
        kind: "auth.session.request",
        protocolVersion: "1.0",
        sessionId,
        actorRole: "browser_session",
        correlationId: `cor_verify${suffix}`,
      });

    const revoked = await login("0000000000000001");
    await testApp.database.query(
      "UPDATE connect_browser_sessions SET status = 'revoked', revoked_at = ? WHERE session_id = ?",
      [new Date().toISOString(), revoked.body.sessionId],
    );
    expectConnectError(await verify(revoked.body.sessionId, "0001"), 401, "revoked");

    const disabled = await login("0000000000000002");
    await testApp.database.query(
      "UPDATE connect_accounts SET status = 'disabled' WHERE user_id = ?",
      [disabled.body.userId],
    );
    expectConnectError(await verify(disabled.body.sessionId, "0002"), 401, "revoked");
    await testApp.database.query(
      "UPDATE connect_accounts SET status = 'active' WHERE user_id = ?",
      [disabled.body.userId],
    );

    const idle = await login("0000000000000003");
    await testApp.database.query(
      "UPDATE connect_browser_sessions SET idle_expires_at = ? WHERE session_id = ?",
      ["2020-01-01T00:00:00.000Z", idle.body.sessionId],
    );
    expectConnectError(await verify(idle.body.sessionId, "0003"), 401, "revoked");

    const absolute = await login("0000000000000004");
    await testApp.database.query(
      `UPDATE connect_browser_sessions
       SET idle_expires_at = ?, absolute_expires_at = ?
       WHERE session_id = ?`,
      [
        "2020-01-01T00:00:00.000Z",
        "2020-01-01T00:00:00.000Z",
        absolute.body.sessionId,
      ],
    );
    expectConnectError(await verify(absolute.body.sessionId, "0004"), 401, "revoked");
  });

  it("rejects wrong and cross-session rotated CSRF tokens", async () => {
    await signupAndAssert(testApp);
    const first = await loginAndAssert(testApp, "00000003");
    const firstCookies = first.headers["set-cookie"] as unknown as string[];
    const firstCsrf = cookieValue(firstCookies, "kazi_connect_csrf");
    const second = await loginAndAssert(testApp, "00000004");
    const envelope = {
      kind: "auth.logout.request",
      protocolVersion: "1.0",
      sessionId: second.body.sessionId,
      actorRole: "browser_session",
      idempotencyKey: "idem_logout_csrf_0000001",
      correlationId: "cor_csrf0003",
    };
    const wrong = await testApp.agent
      .post("/v1/connect/auth/logout")
      .set("x-csrf-token", "x".repeat(43))
      .send(envelope);
    expectConnectError(wrong, 403, "invalid-envelope");
    const rotated = await testApp.agent
      .post("/v1/connect/auth/logout")
      .set("x-csrf-token", firstCsrf)
      .send(envelope);
    expectConnectError(rotated, 403, "invalid-envelope");
  });

  it("persists authentication across a fresh app and reopened SQLite connection", async () => {
    await cleanupTestApp(testApp);
    testApp = await getPersistentTestApp();
    await signupAndAssert(testApp);
    const login = await loginAndAssert(testApp, "00000005");
    const sessionId = String(login.body.sessionId);
    const sessionToken = cookieValue(
      login.headers["set-cookie"] as unknown as string[],
      "kazi_connect_session",
    );

    testApp = await restartPersistentTestApp(testApp);
    const current = await testApp.agent
      .get("/v1/connect/auth/session")
      .set("Cookie", `kazi_connect_session=${sessionToken}`)
      .query({
        kind: "auth.session.request",
        protocolVersion: "1.0",
        sessionId,
        actorRole: "browser_session",
        correlationId: "cor_restart01",
      });
    expect(current.status, JSON.stringify(current.body)).toBe(200);
    expect(current.body.sessionId).toBe(sessionId);
    const rows = await testApp.database.query(
      "SELECT session_id, status FROM connect_browser_sessions WHERE session_id = ?",
      [sessionId],
    );
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ session_id: sessionId, status: "active" }),
    ]));
  });

  it("reuses singleton policy and trace state without leaking auth secrets", async () => {
    const trace = new TraceProbe();
    trace.start();
    const logCalls: unknown[] = [];
    const spies = (["log", "info", "warn", "error"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logCalls.push(args);
      }),
    );
    try {
      const container = getContainer();
      const policyBefore = await container.instance(ConnectAuthPolicy);
      const traceBefore = await container.instance(TraceAdapter);
      const signup = await signupAndAssert(testApp);
      const login = await loginAndAssert(testApp, "00000006");
      const policyAfter = await container.instance(ConnectAuthPolicy);
      const traceAfter = await container.instance(TraceAdapter);
      expect(policyAfter).toBe(policyBefore);
      expect(traceAfter).toBe(traceBefore);

      const setCookies = login.headers["set-cookie"] as unknown as string[];
      const sessionToken = cookieValue(setCookies, "kazi_connect_session");
      const csrfToken = cookieValue(setCookies, "kazi_connect_csrf");
      const rows = await testApp.database.query(
        `SELECT a.username, a.password_hash, s.session_token_hash, s.csrf_token_hash
         FROM connect_accounts a JOIN connect_browser_sessions s ON s.user_id = a.user_id`,
      );
      expect(Array.isArray(rows) && rows.length).toBe(1);
      const persisted = JSON.stringify(rows);
      const traces = JSON.stringify(trace.query());
      const bodies = JSON.stringify([signup.body, login.body]);
      const logs = JSON.stringify(logCalls);
      for (const captured of [persisted, traces, bodies, logs]) {
        expect(captured).not.toContain(signupEnvelope.password);
        expect(captured).not.toContain(sessionToken);
        expect(captured).not.toContain(csrfToken);
        expect(captured).not.toContain(`kazi_connect_session=${sessionToken}`);
        expect(captured).not.toContain(`kazi_connect_csrf=${csrfToken}`);
      }
      expect(persisted).toContain(
        createHash("sha256").update(sessionToken).digest("hex"),
      );
      expect(persisted).toContain(
        createHash("sha256").update(csrfToken).digest("hex"),
      );
      expect(persisted).not.toContain('"session_token"');
      expect(persisted).not.toContain('"csrf_token"');
    } finally {
      trace.stop();
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});
