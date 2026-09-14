/**
 * Boot-composition claims that genuinely need serve(): a fresh app process
 * over a reopened database connection, and the served container's singleton
 * reuse. Moved verbatim from the retired connect-auth.test.ts,
 * connect-desktops.test.ts, and connect-executors.test.ts integration
 * suites; every claim that stops below serve() now lives in the unit or db
 * tiers.
 *
 * Migration from the legacy getTestApp/getPersistentTestApp helpers:
 *
 * - The three restart cases keep the REAL native Serve host on purpose: they
 *   assert that a fresh served generation over a reopened connection to the
 *   same database still honours previously persisted state. A restart is
 *   `server.close()` (which retires that generation's root) followed by a new
 *   `serve()` over the same fixture URL, supplied only through serve's
 *   authoritative `env` — no DATABASE_URL mutation, no process-global
 *   SqlStackDB registration, no resetContainer.
 * - The singleton-reuse case is a root-composition claim, not a lifecycle
 *   claim, so it is a canonical per-case `testApp(original config)` root over
 *   the same kind of fixture; identity is read from that root instead of the
 *   deprecated process-global container.
 *
 * Every case owns its fixture (independently authored schema) and
 * its served/built product; resourceCase disposes them in reverse order.
 */
import request from "supertest";
import type { Server } from "node:http";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { serve, testApp } from "@noego/app";
import { resourceCase } from "@noego/testing";
import { testPostgres, type TestPostgresDatabase } from "sqlstack/testing";
import { TraceProbe } from "../../helpers/trace-probe";
import { PRODUCT_ROOT, productFullSchema } from "../../schemas/product-full";
import { nativeArtifactDirectory } from "../../helpers/native-artifacts";
import Env from "../../../src/server/services/env";
import ConnectAuthPolicy from "../../../src/server/services/connect_auth_policy";
import TraceAdapter from "../../../src/server/observability/trace_adapter";

const CONFIG = path.join(PRODUCT_ROOT, "noego.config.yml");

type Agent = ReturnType<typeof request.agent>;

/** Serve options for one native boot over one fixture URL (plain data). */
const serveOptions = (databaseUrl: string, artifactDirectory: string) => ({
  artifactDirectory,
  cwd: PRODUCT_ROOT,
  configPath: CONFIG,
  port: 0,
  env: { NODE_ENV: "test", DATABASE_URL: databaseUrl },
});

function closeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

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

function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const viaApi = headers.getSetCookie?.();
  if (viaApi && viaApi.length > 0) return viaApi;
  const single = headers.get("set-cookie");
  return single ? single.split(/,(?=\s*[A-Za-z0-9_]+=)/).map((value) => value.trim()) : [];
}

async function signupAndAssert(agent: Agent) {
  const response = await agent.post("/v1/connect/auth/signup").send(signupEnvelope);
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  expect(response.body.username).toBe("alice.example");
  return response;
}

async function loginAndAssert(
  agent: Agent,
  suffix: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await agent.post("/v1/connect/auth/login").send(loginEnvelope({
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

async function authenticate(server: Server, suffix: string) {
  const agent = request.agent(server);
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

async function persistedState(fixture: TestPostgresDatabase, tables: string[]): Promise<string> {
  return JSON.stringify(await Promise.all(
    tables.map((table) => fixture.query(`SELECT * FROM ${table}`, [])),
  ));
}

describe("Boot composition and file-backed restart persistence", () => {
  it("persists authentication across a fresh app and reopened connection", resourceCase(async (scope) => {
    const fixture = await testPostgres(productFullSchema(), { sourceDir: PRODUCT_ROOT }).build();
    const artifactDirectory = await nativeArtifactDirectory(scope);
    let server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    scope.own({ dispose: () => closeServer(server) }, "served-product");
    const agent = request.agent(server);
    await signupAndAssert(agent);
    const login = await loginAndAssert(agent, "00000005");
    const sessionId = String(login.body.sessionId);
    const sessionToken = cookieValue(
      login.headers["set-cookie"] as unknown as string[],
      "kazi_connect_session",
    );

    // Restart: the served generation closes (retiring its root and owned
    // connection), then a fresh generation reopens the same database.
    await closeServer(server);
    server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    const current = await request.agent(server)
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
    const rows = await fixture.query(
      "SELECT session_id, status FROM connect_browser_sessions WHERE session_id = $1",
      [sessionId],
    );
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ session_id: sessionId, status: "active" }),
    ]));
  }));

  it("reuses singleton policy and trace state without leaking auth secrets", resourceCase(async () => {
    const fixture = await testPostgres(productFullSchema(), { sourceDir: PRODUCT_ROOT }).build();
    const app = await testApp(CONFIG).select({ server: { module: ["connectAuth"] } })
      .function(Env, () => {
        const value = new Env();
        value.load({ DATABASE_URL: fixture.url });
        return value;
      }).build();
    const trace = new TraceProbe();
    trace.start();
    const logCalls: unknown[] = [];
    const spies = (["log", "info", "warn", "error"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logCalls.push(args);
      }),
    );
    try {
      const policyBefore = await app.get<ConnectAuthPolicy>(ConnectAuthPolicy);
      const traceBefore = await app.get<TraceAdapter>(TraceAdapter);
      const signup = await app.request({
        method: "POST", path: "/v1/connect/auth/signup", body: signupEnvelope,
      });
      const signupBody = await signup.json() as Record<string, unknown>;
      expect(signup.status, JSON.stringify(signupBody)).toBe(201);
      expect(signupBody.username).toBe("alice.example");
      const login = await app.request({
        method: "POST", path: "/v1/connect/auth/login", body: loginEnvelope({
          idempotencyKey: "idem_login_assert_00000006",
          correlationId: "cor_assert00000006",
        }),
      });
      const loginBody = await login.json() as Record<string, unknown>;
      expect(login.status, JSON.stringify(loginBody)).toBe(200);
      expect(loginBody).toMatchObject({
        kind: "auth.login.response",
        protocolVersion: "1.0",
        actorRole: "browser_session",
      });
      expect(loginBody.sessionId).toMatch(/^ses_[A-Za-z0-9]{8,64}$/);
      expect(login.headers.get("set-cookie")).not.toBeNull();
      const policyAfter = await app.get<ConnectAuthPolicy>(ConnectAuthPolicy);
      const traceAfter = await app.get<TraceAdapter>(TraceAdapter);
      expect(policyAfter).toBe(policyBefore);
      expect(traceAfter).toBe(traceBefore);

      const cookies = setCookies(login);
      const sessionToken = cookieValue(cookies, "kazi_connect_session");
      const csrfToken = cookieValue(cookies, "kazi_connect_csrf");
      const rows = await fixture.query(
        `SELECT a.username, a.password_hash, s.session_token_hash, s.csrf_token_hash
         FROM connect_accounts a JOIN connect_browser_sessions s ON s.user_id = a.user_id`, [],
      );
      expect(Array.isArray(rows) && rows.length).toBe(1);
      const persisted = JSON.stringify(rows);
      const traces = JSON.stringify(trace.query());
      const bodies = JSON.stringify([signupBody, loginBody]);
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
  }));

  it("preserves pending then accepted desktop credential state across file-backed restarts", resourceCase(async (scope) => {
    const fixture = await testPostgres(productFullSchema(), { sourceDir: PRODUCT_ROOT }).build();
    const artifactDirectory = await nativeArtifactDirectory(scope);
    let server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    scope.own({ dispose: () => closeServer(server) }, "served-product");
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
    const challenge = await request.agent(server).post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", restartToken).send(restartClaim);
    expect(challenge.status, JSON.stringify(challenge.body)).toBe(201);
    const owner = await authenticate(server, "restart");
    const browserCookies = [
      `kazi_connect_session=${owner.sessionToken}`,
      `kazi_connect_csrf=${owner.csrf}`,
    ];

    await closeServer(server);
    server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    const pending = await request(server)
      .get(`/v1/connect/desktops/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartpending" });
    expect(pending.status, JSON.stringify(pending.body)).toBe(200);
    expect(pending.body.status).toBe("pending");

    const accepted = await request(server)
      .post(`/v1/connect/desktops/claims/${restartClaim.claimId}/decision`)
      .set("Cookie", browserCookies).set("x-csrf-token", owner.csrf).send({
        kind: "desktop.claim.decision.request", protocolVersion: "1.0",
        claimId: restartClaim.claimId, sessionId: owner.sessionId,
        actorRole: "browser_session", decision: "accept",
        idempotencyKey: "idem_desktop_restart_accept_01",
        correlationId: "cor_restartaccept",
      });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);

    await closeServer(server);
    server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    const status = await request(server)
      .get(`/v1/connect/desktops/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartaccepted" });
    expect(status.status, JSON.stringify(status.body)).toBe(200);
    expect(status.body).toMatchObject({
      status: "accepted", deviceId: restartClaim.deviceId,
      credentialAudience: "desktop-relay", credentialGeneration: 1,
      websiteAccountId: owner.userId,
    });
    expect(await fixture.query(
      `SELECT owner_user_id, state, credential_generation
       FROM connect_desktop_devices WHERE device_id = $1`,
      [restartClaim.deviceId],
    )).toEqual([{ owner_user_id: owner.userId, state: "active", credential_generation: 1 }]);
    expect(await fixture.query(
      `SELECT generation, token_hash, audience, status
       FROM connect_desktop_credentials WHERE device_id = $1`,
      [restartClaim.deviceId],
    )).toEqual([{
      generation: 1,
      token_hash: createHash("sha256").update(restartToken).digest("hex"),
      audience: "desktop-relay",
      status: "active",
    }]);
    const persisted = await persistedState(fixture, [
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
  }));

  it("keeps a pending challenge and accepted executor owner credential state across two file-backed restarts", resourceCase(async (scope) => {
    const fixture = await testPostgres(productFullSchema(), { sourceDir: PRODUCT_ROOT }).build();
    const artifactDirectory = await nativeArtifactDirectory(scope);
    let server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    scope.own({ dispose: () => closeServer(server) }, "served-product");
    const agent = request.agent(server);

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
    const challenge = await agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", restartToken)
      .send(restartClaim);
    expect(challenge.status, JSON.stringify(challenge.body)).toBe(201);
    const shortCode = String(challenge.body.shortCode);

    const signup = await agent.post("/v1/connect/auth/signup").send({
      kind: "auth.signup.request",
      email: "shavyg2@gmail.com",
      protocolVersion: "1.0",
      username: "restart.owner",
      password: restartPassword,
      idempotencyKey: "idem_http_restart_signup_001",
      correlationId: "cor_restartsignup",
    });
    expect(signup.status, JSON.stringify(signup.body)).toBe(201);
    const login = await agent.post("/v1/connect/auth/login").send({
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

    await closeServer(server);
    server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    const pendingStatus = await request(server)
      .get(`/v1/connect/executors/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartstatus1" });
    expect(pendingStatus.status, JSON.stringify(pendingStatus.body)).toBe(200);
    expect(pendingStatus.body.status).toBe("pending");
    for (const lookup of [restartClaim.claimId, shortCode]) {
      const review = await request(server)
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

    const accepted = await request(server)
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

    await closeServer(server);
    server = await serve(serveOptions(fixture.url, artifactDirectory)) as Server;
    server.unref();
    const acceptedStatus = await request(server)
      .get(`/v1/connect/executors/claims/${restartClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", restartToken)
      .query({ correlationId: "cor_restartstatus2" });
    expect(acceptedStatus.status, JSON.stringify(acceptedStatus.body)).toBe(200);
    expect(acceptedStatus.body).toMatchObject({
      status: "accepted",
      websiteDeploymentId,
    });
    const detail = await request(server)
      .get(`/v1/connect/executors/${restartClaim.executorId}`)
      .set("Cookie", browserCookies)
      .query({ sessionId, correlationId: "cor_restartdetail1" });
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);
    expect(detail.body.executor).toMatchObject({
      executorId: restartClaim.executorId,
      displayName: restartClaim.displayName,
      state: "active",
    });

    const ownerState = await fixture.query(
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
    const credentials = await fixture.query(
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

    const persisted = await persistedState(fixture, [
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
  }));
});
