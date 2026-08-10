import request from "supertest";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TestAppResult } from "../../helpers/test-app";
import {
  cleanupTestApp,
  getPersistentTestApp,
  getTestApp,
  restartPersistentTestApp,
} from "../../helpers/test-app";

const bootstrapToken = Buffer.alloc(32, 17).toString("base64url");
const claim = {
  kind: "executor.claim.create.request",
  protocolVersion: "1.0",
  claimId: "clm_httpclaim01",
  executorId: "exe_httpexec001",
  deviceId: "dev_httpdevice1",
  actorRole: "executor_device",
  displayName: "HTTP executor",
  platform: "linux",
  architecture: "x64",
  executorVersion: "1.0.1",
  keyFingerprint: "c".repeat(64),
  idempotencyKey: "idem_http_claim_create_0001",
  correlationId: "cor_httpclaim01",
};

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0];
}

async function persistedConnectState(testApp: TestAppResult): Promise<string> {
  const tables = [
    "connect_accounts",
    "connect_browser_sessions",
    "connect_executors",
    "connect_executor_claims",
    "connect_executor_credentials",
    "connect_executor_audit_events",
  ];
  const values = await Promise.all(
    tables.map((table) => testApp.database.query(`SELECT * FROM ${table}`)),
  );
  return JSON.stringify(values);
}

describe("Connect executor real HTTP registry", () => {
  let testApp: TestAppResult;

  beforeEach(async () => {
    testApp = await getTestApp();
  });

  afterEach(async () => {
    await cleanupTestApp(testApp);
  });

  it("covers create/retry/mismatch, review, accept, owner controls, fencing, and revoked-session rejection", async () => {
    const created = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .send(claim);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
    expect(JSON.stringify(created.body)).not.toContain(bootstrapToken);

    const retried = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .send({ ...claim, correlationId: "cor_httpclaim02" });
    expect(retried.status, JSON.stringify(retried.body)).toBe(200);
    expect(retried.body.shortCode).toBe(created.body.shortCode);

    const mismatch = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .send({ ...claim, keyFingerprint: "d".repeat(64), correlationId: "cor_httpclaim03" });
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.code).toBe("idempotency-conflict");

    expect((await testApp.agent
      .get(`/v1/connect/executors/claims/${claim.claimId}/status`)
      .set("x-kazi-bootstrap-token", Buffer.alloc(32, 18).toString("base64url"))
      .query({ correlationId: "cor_httpstatus1" })).status).toBe(401);

    await testApp.agent.post("/v1/connect/auth/signup").send({
      kind: "auth.signup.request", protocolVersion: "1.0",
      username: "executor.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_http_signup_owner_01", correlationId: "cor_httpsignup1",
    });
    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      kind: "auth.login.request", protocolVersion: "1.0",
      username: "executor.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_http_login_owner_001", correlationId: "cor_httplogin01",
    });
    expect(login.status).toBe(200);
    const cookies = login.headers["set-cookie"] as unknown as string[];
    const sessionCookie = cookieValue(cookies, "kazi_connect_session");
    const csrf = cookieValue(cookies, "kazi_connect_csrf");
    const ownerQuery = { sessionId: login.body.sessionId, correlationId: "cor_httpreview1" };

    for (const lookup of [claim.claimId, created.body.shortCode]) {
      const review = await testApp.agent
        .get(`/v1/connect/executors/claims/review/${lookup}`)
        .query(ownerQuery);
      expect(review.status, JSON.stringify(review.body)).toBe(200);
      expect(review.body).toMatchObject({
        claimId: claim.claimId, status: "pending", keyFingerprint: claim.keyFingerprint,
      });
      expect(JSON.stringify(review.body)).not.toContain(bootstrapToken);
    }

    const decision = await testApp.agent
      .post(`/v1/connect/executors/claims/${claim.claimId}/decision`)
      .set("x-csrf-token", csrf)
      .send({
        kind: "executor.claim.decision.request", protocolVersion: "1.0",
        claimId: claim.claimId, sessionId: login.body.sessionId,
        actorRole: "browser_session", decision: "accept",
        idempotencyKey: "idem_http_accept_claim_01", correlationId: "cor_httpaccept1",
      });
    expect(decision.status, JSON.stringify(decision.body)).toBe(200);
    expect(decision.body.status).toBe("accepted");
    expect(decision.body.websiteDeploymentId).toMatch(/^wdp_[A-Za-z0-9]{32}$/);

    const acceptedStatus = await testApp.agent
      .get(`/v1/connect/executors/claims/${claim.claimId}/status`)
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .query({ correlationId: "cor_httpstatus2" });
    expect(acceptedStatus.body).toMatchObject({
      status: "accepted",
      websiteDeploymentId: decision.body.websiteDeploymentId,
    });

    const renamed = await testApp.agent
      .post(`/v1/connect/executors/${claim.executorId}/rename`)
      .set("x-csrf-token", csrf)
      .query({ sessionId: login.body.sessionId, correlationId: "cor_httprename1" })
      .send({
        kind: "executor.rename.request", protocolVersion: "1.0",
        executorId: claim.executorId, displayName: "Renamed HTTP executor",
        idempotencyKey: "idem_http_rename_exec_001", correlationId: "cor_httprename1",
      });
    expect(renamed.status, JSON.stringify(renamed.body)).toBe(200);
    expect(renamed.body.executor.displayName).toBe("Renamed HTTP executor");

    const logout = await testApp.agent.post("/v1/connect/auth/logout")
      .set("x-csrf-token", csrf)
      .send({
        kind: "auth.logout.request", protocolVersion: "1.0",
        sessionId: login.body.sessionId, actorRole: "browser_session",
        idempotencyKey: "idem_http_logout_owner_01", correlationId: "cor_httplogout1",
      });
    expect(logout.status).toBe(200);

    const rejected = await request(testApp.server)
      .post(`/v1/connect/executors/${claim.executorId}/revoke`)
      .set("Cookie", [
        `kazi_connect_session=${sessionCookie}`,
        `kazi_connect_csrf=${csrf}`,
      ])
      .set("x-csrf-token", csrf)
      .query({ sessionId: login.body.sessionId, correlationId: "cor_httprevoked1" })
      .send({
        kind: "executor.action.request", protocolVersion: "1.0",
        executorId: claim.executorId, action: "revoke",
        idempotencyKey: "idem_http_revoke_exec_001", correlationId: "cor_httprevoked1",
      });
    expect(rejected.status, JSON.stringify(rejected.body)).toBe(401);
    expect(rejected.body.code).toBe("revoked");

    const relogin = await testApp.agent.post("/v1/connect/auth/login").send({
      kind: "auth.login.request", protocolVersion: "1.0",
      username: "executor.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_http_login_owner_002", correlationId: "cor_httplogin02",
    });
    const nextCookies = relogin.headers["set-cookie"] as unknown as string[];
    const nextCsrf = cookieValue(nextCookies, "kazi_connect_csrf");
    const revoked = await testApp.agent
      .post(`/v1/connect/executors/${claim.executorId}/revoke`)
      .set("x-csrf-token", nextCsrf)
      .query({ sessionId: relogin.body.sessionId, correlationId: "cor_httprevoked2" })
      .send({
        kind: "executor.action.request", protocolVersion: "1.0",
        executorId: claim.executorId, action: "revoke",
        idempotencyKey: "idem_http_revoke_exec_002", correlationId: "cor_httprevoked2",
      });
    expect(revoked.status, JSON.stringify(revoked.body)).toBe(200);
    expect(revoked.body.state).toBe("revoked");
    expect((await testApp.agent
      .get(`/v1/connect/executors/claims/${claim.claimId}/status`)
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .query({ correlationId: "cor_httpstatus3" })).status).toBe(401);
  });

  it("atomically selects one owner when two authenticated accounts race to accept the same claim", async () => {
    const raceToken = Buffer.alloc(32, 31).toString("base64url");
    const raceClaim = {
      ...claim,
      claimId: "clm_httpclaimrace1",
      executorId: "exe_httpexecRace1",
      deviceId: "dev_httpdeviceRace1",
      displayName: "Raced HTTP executor",
      idempotencyKey: "idem_http_claim_race_create_01",
      correlationId: "cor_racecreate01",
    };
    const challenge = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", raceToken)
      .send(raceClaim);
    expect(challenge.status, JSON.stringify(challenge.body)).toBe(201);

    const racers = [
      {
        agent: request.agent(testApp.server),
        username: "race.owner.one",
        password: "race owner one secret phrase",
        suffix: "one",
      },
      {
        agent: request.agent(testApp.server),
        username: "race.owner.two",
        password: "race owner two secret phrase",
        suffix: "two",
      },
    ];
    const authenticated = [];
    for (const racer of racers) {
      const signup = await racer.agent.post("/v1/connect/auth/signup").send({
        kind: "auth.signup.request",
        protocolVersion: "1.0",
        username: racer.username,
        password: racer.password,
        idempotencyKey: `idem_http_race_signup_${racer.suffix}_01`,
        correlationId: `cor_racesignup${racer.suffix}`,
      });
      expect(signup.status, JSON.stringify(signup.body)).toBe(201);
      const login = await racer.agent.post("/v1/connect/auth/login").send({
        kind: "auth.login.request",
        protocolVersion: "1.0",
        username: racer.username,
        password: racer.password,
        idempotencyKey: `idem_http_race_login_${racer.suffix}_001`,
        correlationId: `cor_racelogin${racer.suffix}`,
      });
      expect(login.status, JSON.stringify(login.body)).toBe(200);
      authenticated.push({
        ...racer,
        userId: String(login.body.userId),
        sessionId: String(login.body.sessionId),
        sessionToken: cookieValue(
          login.headers["set-cookie"] as unknown as string[],
          "kazi_connect_session",
        ),
        csrf: cookieValue(
          login.headers["set-cookie"] as unknown as string[],
          "kazi_connect_csrf",
        ),
      });
    }

    const decisions = authenticated.map((racer, index) => ({
      racer,
      body: {
        kind: "executor.claim.decision.request",
        protocolVersion: "1.0",
        claimId: raceClaim.claimId,
        sessionId: racer.sessionId,
        actorRole: "browser_session",
        decision: "accept",
        idempotencyKey: `idem_http_race_accept_${index + 1}_001`,
        correlationId: `cor_raceaccept0${index + 1}`,
      },
    }));
    const responses = await Promise.all(decisions.map(({ racer, body }) =>
      racer.agent
        .post(`/v1/connect/executors/claims/${raceClaim.claimId}/decision`)
        .set("x-csrf-token", racer.csrf)
        .send(body),
    ));

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const winnerIndex = responses.findIndex((response) => response.status === 200);
    const loserIndex = 1 - winnerIndex;
    expect(responses[winnerIndex].body).toMatchObject({
      kind: "executor.claim.decision.response",
      claimId: raceClaim.claimId,
      status: "accepted",
    });
    expect(responses[loserIndex].body).toMatchObject({
      kind: "error",
      protocolVersion: "1.0",
      code: "revoked",
      retryable: false,
    });
    expect(JSON.stringify(responses[loserIndex].body)).not.toContain(raceToken);

    const winner = authenticated[winnerIndex];
    const loser = authenticated[loserIndex];
    const winnerDecision = decisions[winnerIndex].body;
    const retry = await winner.agent
      .post(`/v1/connect/executors/claims/${raceClaim.claimId}/decision`)
      .set("x-csrf-token", winner.csrf)
      .send(winnerDecision);
    expect(retry.status, JSON.stringify(retry.body)).toBe(200);
    expect(retry.body.status).toBe("accepted");

    const executorRows = await testApp.database.query(
      `SELECT owner_user_id, state, credential_generation
       FROM connect_executors WHERE executor_id = ?`,
      [raceClaim.executorId],
    );
    expect(executorRows).toEqual([{
      owner_user_id: winner.userId,
      state: "active",
      credential_generation: 1,
    }]);
    const credentialRows = await testApp.database.query(
      `SELECT executor_id, generation, token_hash, status
       FROM connect_executor_credentials WHERE executor_id = ?`,
      [raceClaim.executorId],
    );
    expect(credentialRows).toEqual([{
      executor_id: raceClaim.executorId,
      generation: 1,
      token_hash: createHash("sha256").update(raceToken).digest("hex"),
      status: "active",
    }]);
    const acceptedAuditRows = await testApp.database.query(
      `SELECT actor_user_id, credential_generation
       FROM connect_executor_audit_events
       WHERE executor_id = ? AND event_kind = 'claim.accepted'`,
      [raceClaim.executorId],
    );
    expect(acceptedAuditRows).toEqual([{
      actor_user_id: winner.userId,
      credential_generation: 1,
    }]);

    const winnerList = await winner.agent.get("/v1/connect/executors").query({
      sessionId: winner.sessionId,
      correlationId: "cor_racewinnerlist",
    });
    expect(winnerList.status, JSON.stringify(winnerList.body)).toBe(200);
    expect(winnerList.body.executors).toEqual([
      expect.objectContaining({ executorId: raceClaim.executorId, state: "active" }),
    ]);
    const loserList = await loser.agent.get("/v1/connect/executors").query({
      sessionId: loser.sessionId,
      correlationId: "cor_raceloserlist1",
    });
    expect(loserList.status, JSON.stringify(loserList.body)).toBe(200);
    expect(loserList.body.executors).toEqual([]);

    const persisted = await persistedConnectState(testApp);
    for (const rawSecret of [
      raceToken,
      String(challenge.body.shortCode),
      ...authenticated.flatMap((racer) => [
        racer.password,
        racer.sessionToken,
        racer.csrf,
      ]),
    ]) {
      expect(persisted).not.toContain(rawSecret);
    }
  });

  it("keeps a pending challenge and accepted owner credential state across two file-backed restarts", async () => {
    await cleanupTestApp(testApp);
    testApp = await getPersistentTestApp();

    const restartToken = Buffer.alloc(32, 47).toString("base64url");
    const restartPassword = "restart owner secret phrase";
    const restartClaim = {
      ...claim,
      claimId: "clm_httprestart01",
      executorId: "exe_httprestart01",
      deviceId: "dev_httprestart01",
      displayName: "Restarted HTTP executor",
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
       FROM connect_executors WHERE executor_id = ?`,
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
       WHERE executor_id = ?`,
      [restartClaim.executorId],
    );
    expect(credentials).toEqual([{
      executor_id: restartClaim.executorId,
      generation: 1,
      token_hash: createHash("sha256").update(restartToken).digest("hex"),
      status: "active",
    }]);

    const persisted = await persistedConnectState(testApp);
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
