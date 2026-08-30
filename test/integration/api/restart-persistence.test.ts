/**
 * Boot-composition claims that genuinely need serve(): a fresh app process
 * over a reopened database connection, and the served container's singleton
 * reuse. Moved verbatim from the retired connect-auth.test.ts,
 * connect-desktops.test.ts, and connect-executors.test.ts integration
 * suites; every claim that stops below serve() now lives in the unit or db
 * tiers.
 */
import request from "supertest";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getContainer } from "@noego/app";
import type { TestAppResult } from "../../helpers/test-app";
import {
  cleanupTestApp,
  getPersistentTestApp,
  getTestApp,
  restartPersistentTestApp,
} from "../../helpers/test-app";
import { TraceProbe } from "../../helpers/trace-probe";
import ConnectAuthPolicy from "../../../src/server/services/connect_auth_policy";
import TraceAdapter from "../../../src/server/observability/trace_adapter";

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

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0];
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
  const response = await testApp.agent.post("/v1/connect/auth/login").send(loginEnvelope({
    idempotencyKey: `idem_login_assert_${suffix}`,
    correlationId: `cor_assert${suffix}`,
    ...overrides,
  }));
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

async function authenticate(testApp: TestAppResult, suffix: string) {
  const agent = request.agent(testApp.server);
  const username = `desktop.${suffix}`;
  const accountPassword = `desktop ${suffix} secret phrase`;
  const signup = await agent.post("/v1/connect/auth/signup").send({
    kind: "auth.signup.request", protocolVersion: "1.0", username, email: "shavyg2@gmail.com",
    password: accountPassword, idempotencyKey: `idem_desktop_signup_${suffix}_0001`,
    correlationId: `cor_signup${suffix}0001`,
  });
  expect(signup.status, JSON.stringify(signup.body)).toBe(201);
  const login = await agent.post("/v1/connect/auth/login").send({
    kind: "auth.login.request", protocolVersion: "1.0", username,
    password: accountPassword, idempotencyKey: `idem_desktop_login_${suffix}_00001`,
    correlationId: `cor_login${suffix}00001`,
  });
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  const cookies = login.headers["set-cookie"] as unknown as string[];
  return {
    agent,
    userId: String(login.body.userId),
    sessionId: String(login.body.sessionId),
    sessionToken: cookieValue(cookies, "kazi_connect_session"),
    csrf: cookieValue(cookies, "kazi_connect_csrf"),
    password: accountPassword,
  };
}

async function persistedState(testApp: TestAppResult, tables: string[]): Promise<string> {
  return JSON.stringify(await Promise.all(
    tables.map((table) => testApp.database.query(`SELECT * FROM ${table}`)),
  ));
}

describe("Boot composition and file-backed restart persistence", () => {
  let testApp: TestAppResult;

  beforeEach(async () => {
    testApp = await getTestApp();
  });

  afterEach(async () => {
    await cleanupTestApp(testApp);
  });

  it("persists authentication across a fresh app and reopened connection", async () => {
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
      "SELECT session_id, status FROM connect_browser_sessions WHERE session_id = $1",
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

  it("preserves pending then accepted desktop credential state across file-backed restarts", async () => {
    await cleanupTestApp(testApp);
    testApp = await getPersistentTestApp();
    const restartToken = Buffer.alloc(32, 63).toString("base64url");
    const restartClaim = {
      kind: "desktop.claim.create.request", protocolVersion: "1.0",
      claimId: "clm_desktoprestart1", deviceId: "dev_desktoprestart1",
      actorRole: "desktop_device", displayName: "HTTP Desktop",
      platform: "linux", architecture: "x64", desktopVersion: "1.0.4",
      keyFingerprint: "d".repeat(64),
      idempotencyKey: "idem_desktop_claim_restart1_0001",
      correlationId: "cor_claimrestart10001",
    };
    const challenge = await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", restartToken).send(restartClaim);
    expect(challenge.status, JSON.stringify(challenge.body)).toBe(201);
    const owner = await authenticate(testApp, "restart");
    const browserCookies = [
      `kazi_connect_session=${owner.sessionToken}`,
      `kazi_connect_csrf=${owner.csrf}`,
    ];

    testApp = await restartPersistentTestApp(testApp);
    const pending = await request(testApp.server)
      .get(`/v1/connect/desktops/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartpending" });
    expect(pending.status, JSON.stringify(pending.body)).toBe(200);
    expect(pending.body.status).toBe("pending");

    const accepted = await request(testApp.server)
      .post(`/v1/connect/desktops/claims/${restartClaim.claimId}/decision`)
      .set("Cookie", browserCookies).set("x-csrf-token", owner.csrf).send({
        kind: "desktop.claim.decision.request", protocolVersion: "1.0",
        claimId: restartClaim.claimId, sessionId: owner.sessionId,
        actorRole: "browser_session", decision: "accept",
        idempotencyKey: "idem_desktop_restart_accept_01",
        correlationId: "cor_restartaccept",
      });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);

    testApp = await restartPersistentTestApp(testApp);
    const status = await request(testApp.server)
      .get(`/v1/connect/desktops/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartaccepted" });
    expect(status.status, JSON.stringify(status.body)).toBe(200);
    expect(status.body).toMatchObject({
      status: "accepted", deviceId: restartClaim.deviceId,
      credentialAudience: "desktop-relay", credentialGeneration: 1,
      websiteAccountId: owner.userId,
    });
    expect(await testApp.database.query(
      `SELECT owner_user_id, state, credential_generation
       FROM connect_desktop_devices WHERE device_id = $1`,
      [restartClaim.deviceId],
    )).toEqual([{ owner_user_id: owner.userId, state: "active", credential_generation: 1 }]);
    expect(await testApp.database.query(
      `SELECT generation, token_hash, audience, status
       FROM connect_desktop_credentials WHERE device_id = $1`,
      [restartClaim.deviceId],
    )).toEqual([{
      generation: 1,
      token_hash: createHash("sha256").update(restartToken).digest("hex"),
      audience: "desktop-relay",
      status: "active",
    }]);
    const persisted = await persistedState(testApp, [
      "connect_accounts",
      "connect_browser_sessions",
      "connect_desktop_devices",
      "connect_desktop_claims",
      "connect_desktop_credentials",
      "connect_desktop_audit_events",
    ]);
    for (const secret of [
      restartToken, owner.password, owner.sessionToken, owner.csrf,
      String(challenge.body.shortCode),
    ]) expect(persisted).not.toContain(secret);
  });

  it("keeps a pending challenge and accepted executor owner credential state across two file-backed restarts", async () => {
    await cleanupTestApp(testApp);
    testApp = await getPersistentTestApp();

    const restartToken = Buffer.alloc(32, 47).toString("base64url");
    const restartPassword = "restart owner secret phrase";
    const restartClaim = {
      kind: "executor.claim.create.request",
      protocolVersion: "1.0",
      claimId: "clm_httprestart01",
      executorId: "exe_httprestart01",
      deviceId: "dev_httprestart01",
      actorRole: "executor_device",
      displayName: "Restarted HTTP executor",
      platform: "linux",
      architecture: "x64",
      executorVersion: "1.0.1",
      keyFingerprint: "c".repeat(64),
      idempotencyKey: "idem_http_restart_claim_0001",
      correlationId: "cor_restartclaim1",
    };
    const challenge = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", restartToken)
      .send(restartClaim);
    expect(challenge.status, JSON.stringify(challenge.body)).toBe(201);
    const shortCode = String(challenge.body.shortCode);

    const signup = await testApp.agent.post("/v1/connect/auth/signup").send({
      kind: "auth.signup.request",
      email: "shavyg2@gmail.com",
      protocolVersion: "1.0",
      username: "restart.owner",
      password: restartPassword,
      idempotencyKey: "idem_http_restart_signup_001",
      correlationId: "cor_restartsignup",
    });
    expect(signup.status, JSON.stringify(signup.body)).toBe(201);
    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      kind: "auth.login.request",
      protocolVersion: "1.0",
      username: "restart.owner",
      password: restartPassword,
      idempotencyKey: "idem_http_restart_login_0001",
      correlationId: "cor_restartlogin1",
    });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    const cookies = login.headers["set-cookie"] as unknown as string[];
    const sessionToken = cookieValue(cookies, "kazi_connect_session");
    const csrf = cookieValue(cookies, "kazi_connect_csrf");
    const sessionId = String(login.body.sessionId);
    const userId = String(login.body.userId);
    const browserCookies = [
      `kazi_connect_session=${sessionToken}`,
      `kazi_connect_csrf=${csrf}`,
    ];

    testApp = await restartPersistentTestApp(testApp);
    const pendingStatus = await request(testApp.server)
      .get(`/v1/connect/executors/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartstatus1" });
    expect(pendingStatus.status, JSON.stringify(pendingStatus.body)).toBe(200);
    expect(pendingStatus.body.status).toBe("pending");
    for (const lookup of [restartClaim.claimId, shortCode]) {
      const review = await request(testApp.server)
        .get(`/v1/connect/executors/claims/review/${lookup}`)
        .set("Cookie", browserCookies)
        .query({ sessionId, correlationId: "cor_restartreview" });
      expect(review.status, JSON.stringify(review.body)).toBe(200);
      expect(review.body).toMatchObject({
        claimId: restartClaim.claimId,
        status: "pending",
        keyFingerprint: restartClaim.keyFingerprint,
      });
    }

    const accepted = await request(testApp.server)
      .post(`/v1/connect/executors/claims/${restartClaim.claimId}/decision`)
      .set("Cookie", browserCookies)
      .set("x-csrf-token", csrf)
      .send({
        kind: "executor.claim.decision.request",
        protocolVersion: "1.0",
        claimId: restartClaim.claimId,
        sessionId,
        actorRole: "browser_session",
        decision: "accept",
        idempotencyKey: "idem_http_restart_accept_001",
        correlationId: "cor_restartaccept",
      });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    expect(accepted.body.status).toBe("accepted");
    const websiteDeploymentId = String(accepted.body.websiteDeploymentId);
    expect(websiteDeploymentId).toMatch(/^wdp_[A-Za-z0-9]{32}$/);

    testApp = await restartPersistentTestApp(testApp);
    const acceptedStatus = await request(testApp.server)
      .get(`/v1/connect/executors/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartstatus2" });
    expect(acceptedStatus.status, JSON.stringify(acceptedStatus.body)).toBe(200);
    expect(acceptedStatus.body).toMatchObject({
      status: "accepted",
      websiteDeploymentId,
    });
    const detail = await request(testApp.server)
      .get(`/v1/connect/executors/${restartClaim.executorId}`)
      .set("Cookie", browserCookies)
      .query({ sessionId, correlationId: "cor_restartdetail1" });
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);
    expect(detail.body.executor).toMatchObject({
      executorId: restartClaim.executorId,
      displayName: restartClaim.displayName,
      state: "active",
    });

    const ownerState = await testApp.database.query(
      `SELECT device_id, owner_user_id, state, credential_generation
       FROM connect_executors WHERE executor_id = $1`,
      [restartClaim.executorId],
    );
    expect(ownerState).toEqual([{
      device_id: restartClaim.deviceId,
      owner_user_id: userId,
      state: "active",
      credential_generation: 1,
    }]);
    const credentials = await testApp.database.query(
      `SELECT executor_id, generation, token_hash, status
       FROM connect_executor_credentials
       WHERE executor_id = $1`,
      [restartClaim.executorId],
    );
    expect(credentials).toEqual([{
      executor_id: restartClaim.executorId,
      generation: 1,
      token_hash: createHash("sha256").update(restartToken).digest("hex"),
      status: "active",
    }]);

    const persisted = await persistedState(testApp, [
      "connect_accounts",
      "connect_browser_sessions",
      "connect_executors",
      "connect_executor_claims",
      "connect_executor_credentials",
      "connect_executor_audit_events",
    ]);
    for (const rawSecret of [
      restartToken,
      restartPassword,
      sessionToken,
      csrf,
      shortCode,
    ]) {
      expect(persisted).not.toContain(rawSecret);
    }
  });
});
