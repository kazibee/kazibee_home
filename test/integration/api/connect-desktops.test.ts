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

const token = Buffer.alloc(32, 61).toString("base64url");
const claim = {
  kind: "desktop.claim.create.request", protocolVersion: "1.0",
  claimId: "clm_desktophttp1", deviceId: "dev_desktophttp1", actorRole: "desktop_device",
  displayName: "HTTP Desktop", platform: "linux", architecture: "x64",
  desktopVersion: "1.0.4", keyFingerprint: "d".repeat(64),
  idempotencyKey: "idem_desktop_http_claim_001", correlationId: "cor_desktophttp1",
};
const password = "desktop owner secret phrase";

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0]!;
}

async function authenticate(
  testApp: TestAppResult,
  suffix: string,
  agent = request.agent(testApp.server),
) {
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

function variant(suffix: string, overrides: Record<string, unknown> = {}) {
  return {
    ...claim,
    claimId: `clm_desktop${suffix}`,
    deviceId: `dev_desktop${suffix}`,
    idempotencyKey: `idem_desktop_claim_${suffix}_0001`,
    correlationId: `cor_claim${suffix}0001`,
    ...overrides,
  };
}

async function persistedDesktopState(testApp: TestAppResult): Promise<string> {
  const tables = [
    "connect_accounts",
    "connect_browser_sessions",
    "connect_desktop_devices",
    "connect_desktop_claims",
    "connect_desktop_credentials",
    "connect_desktop_audit_events",
  ];
  return JSON.stringify(await Promise.all(
    tables.map((table) => testApp.database.query(`SELECT * FROM ${table}`)),
  ));
}

describe("Connect Desktop migrated real HTTP boundary", () => {
  let testApp: TestAppResult;
  beforeEach(async () => { testApp = await getTestApp(); });
  afterEach(async () => { await cleanupTestApp(testApp); });

  it("persists create/retry, code/link review, acceptance, ownership, revoke fencing, and redaction", async () => {
    const created = await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", token).send(claim);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body).toMatchObject({
      kind: "desktop.claim.challenge", claimId: claim.claimId,
      deviceId: claim.deviceId, actorRole: "claim_challenge",
    });
    expect(created.body.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
    expect(created.body.claimUrl).not.toContain(token);

    const retry = await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", token)
      .send({ ...claim, correlationId: "cor_desktophttp2" });
    expect(retry.status).toBe(200);
    expect(retry.body.shortCode).toBe(created.body.shortCode);
    expect((await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", token)
      .send({ ...claim, displayName: "Mismatch", correlationId: "cor_desktophttp3" })).status).toBe(409);

    await testApp.agent.post("/v1/connect/auth/signup").send({
      kind: "auth.signup.request", protocolVersion: "1.0", username: "desktop.owner", email: "shavyg2@gmail.com",
      password, idempotencyKey: "idem_desktop_signup_0001", correlationId: "cor_desktopsign1",
    });
    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      kind: "auth.login.request", protocolVersion: "1.0", username: "desktop.owner",
      password, idempotencyKey: "idem_desktop_login_00001", correlationId: "cor_desktoplogin",
    });
    expect(login.status).toBe(200);
    const csrf = cookieValue(login.headers["set-cookie"] as unknown as string[], "kazi_connect_csrf");
    const query = { sessionId: login.body.sessionId, correlationId: "cor_desktopreview" };
    for (const lookup of [claim.claimId, created.body.shortCode]) {
      const review = await testApp.agent
        .get(`/v1/connect/desktops/claims/review/${lookup}`).query(query);
      expect(review.status, JSON.stringify(review.body)).toBe(200);
      expect(review.body).toMatchObject({ claimId: claim.claimId, status: "pending",
        desktopVersion: claim.desktopVersion, keyFingerprint: claim.keyFingerprint });
    }

    const decisionBody = {
      kind: "desktop.claim.decision.request", protocolVersion: "1.0",
      claimId: claim.claimId, sessionId: login.body.sessionId, actorRole: "browser_session",
      decision: "accept", idempotencyKey: "idem_desktop_accept_0001", correlationId: "cor_desktopaccept",
    };
    expect((await testApp.agent.post(`/v1/connect/desktops/claims/${claim.claimId}/decision`)
      .send(decisionBody)).status).toBe(403);
    const accepted = await testApp.agent.post(`/v1/connect/desktops/claims/${claim.claimId}/decision`)
      .set("x-csrf-token", csrf).send(decisionBody);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    expect(accepted.body).toMatchObject({
      status: "accepted", deviceId: claim.deviceId, actorRole: "desktop_device",
      credentialAudience: "desktop-relay", credentialGeneration: 1,
      websiteAccountId: login.body.userId,
      websiteDeploymentId: expect.stringMatching(/^wdp_[A-Za-z0-9]{32}$/),
    });
    const acceptedReplay = await testApp.agent.post(`/v1/connect/desktops/claims/${claim.claimId}/decision`)
      .set("x-csrf-token", csrf).send(decisionBody);
    expect(acceptedReplay.status, JSON.stringify(acceptedReplay.body)).toBe(200);
    expect(acceptedReplay.body.websiteAccountId).toBe(login.body.userId);
    expect(acceptedReplay.body.websiteDeploymentId).toBe(accepted.body.websiteDeploymentId);

    const status = await testApp.agent.get(`/v1/connect/desktops/claims/${claim.claimId}/status`)
      .set("x-kazi-bootstrap-token", token).query({ correlationId: "cor_desktopstatus" });
    expect(status.body).toMatchObject({
      status: "accepted", deviceId: claim.deviceId,
      credentialAudience: "desktop-relay", credentialGeneration: 1,
      websiteAccountId: login.body.userId,
      websiteDeploymentId: accepted.body.websiteDeploymentId,
    });

    const executorToken = Buffer.alloc(32, 62).toString("base64url");
    const executorClaim = {
      kind: "executor.claim.create.request", protocolVersion: "1.0",
      claimId: "clm_crossdeploy01", executorId: "exe_crossdeploy01",
      deviceId: "dev_crossdeploy01", actorRole: "executor_device",
      displayName: "Cross deployment executor", platform: "linux", architecture: "x64",
      executorVersion: "1.0.0", keyFingerprint: "e".repeat(64),
      idempotencyKey: "idem_cross_deployment_claim_01",
      correlationId: "cor_crossdeploy01",
    };
    expect((await testApp.agent.post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", executorToken).send(executorClaim)).status).toBe(201);
    const executorAccepted = await testApp.agent
      .post(`/v1/connect/executors/claims/${executorClaim.claimId}/decision`)
      .set("x-csrf-token", csrf)
      .send({
        kind: "executor.claim.decision.request", protocolVersion: "1.0",
        claimId: executorClaim.claimId, sessionId: login.body.sessionId,
        actorRole: "browser_session", decision: "accept",
        idempotencyKey: "idem_cross_deployment_accept_1",
        correlationId: "cor_crossaccept01",
      });
    expect(executorAccepted.status, JSON.stringify(executorAccepted.body)).toBe(200);
    expect(executorAccepted.body.websiteDeploymentId).toBe(accepted.body.websiteDeploymentId);

    const clientRelayHeaders = {
      authorization: `Bearer ${token}`,
      "x-kazi-device-id": claim.deviceId,
      "x-kazi-credential-generation": "1",
      "x-kazi-audience": "desktop-relay",
      "x-kazi-protocol-version": "1.0",
    };
    const command = {
      kind: "command.post", protocolVersion: "1.0",
      commandId: "cmd_deployfence01", correlationId: "cor_deployfence01",
      idempotencyKey: "idem_deployment_fence_0001",
      websiteDeploymentId: accepted.body.websiteDeploymentId,
      executorId: executorClaim.executorId, deviceId: claim.deviceId,
      actorRole: "desktop_device", operation: "executor.status.read", payload: {},
    };
    const mismatchedCommand = await testApp.agent.post("/v1/connect/client-relay/commands")
      .set(clientRelayHeaders)
      .send({ ...command, websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff" });
    expect(mismatchedCommand.status, JSON.stringify(mismatchedCommand.body)).toBe(409);
    expect(mismatchedCommand.body).toMatchObject({
      kind: "error", code: "website-deployment-mismatch", retryable: false,
    });
    const missingDeployment = { ...command } as Record<string, unknown>;
    delete missingDeployment.websiteDeploymentId;
    expect((await testApp.agent.post("/v1/connect/client-relay/commands")
      .set(clientRelayHeaders).send(missingDeployment)).status).toBe(400);
    expect((await testApp.agent.post("/v1/connect/client-relay/commands")
      .set(clientRelayHeaders).send({ ...command, websiteDeploymentID: command.websiteDeploymentId }))
      .status).toBe(400);
    const creation = {
      ...command,
      operation: "conversation.create",
      payload: {
        clientCreationId: "ccr_integration_creation_01",
        title: "Review the current change",
        websiteDeploymentId: command.websiteDeploymentId,
        executorId: command.executorId,
        remoteWorkspaceId: "wrk_integration01",
      },
    };
    const nestedDeployment = await testApp.agent.post("/v1/connect/client-relay/commands")
      .set(clientRelayHeaders).send({
        ...creation,
        payload: {
          ...creation.payload,
          websiteDeploymentId: "wdp_ffffffffffffffffffffffffffffffff",
        },
      });
    expect(nestedDeployment.status, JSON.stringify(nestedDeployment.body)).toBe(409);
    expect(nestedDeployment.body.code).toBe("website-deployment-mismatch");
    const nestedExecutor = await testApp.agent.post("/v1/connect/client-relay/commands")
      .set(clientRelayHeaders).send({
        ...creation,
        payload: { ...creation.payload, executorId: "exe_foreignexec1" },
      });
    expect(nestedExecutor.status, JSON.stringify(nestedExecutor.body)).toBe(400);
    const wrongReceiptConversation = await testApp.agent
      .post("/v1/connect/client-relay/commands")
      .set(clientRelayHeaders).send({
        ...command,
        operation: "thread.cancel",
        payload: {
          conversationId: "thr_integration01",
          clientOperationId: "cop_integration_operation_01",
          expectedExecutionBinding: {
            conversationId: "thr_different001",
            kind: "remote",
            websiteDeploymentId: command.websiteDeploymentId,
            executorId: command.executorId,
            remoteWorkspaceId: "wrk_integration01",
          },
        },
      });
    expect(
      wrongReceiptConversation.status,
      JSON.stringify(wrongReceiptConversation.body),
    ).toBe(400);
    const detail = await testApp.agent.get(`/v1/connect/desktops/${claim.deviceId}`)
      .query({ sessionId: login.body.sessionId, correlationId: "cor_desktopdetail" });
    expect(detail.status).toBe(200);
    expect(detail.body.device).toMatchObject({ deviceId: claim.deviceId, state: "active" });

    const revoked = await testApp.agent.post(`/v1/connect/desktops/${claim.deviceId}/revoke`)
      .set("x-csrf-token", csrf)
      .query({ sessionId: login.body.sessionId, correlationId: "cor_desktoprevoke" })
      .send({
        kind: "desktop.action.request", protocolVersion: "1.0", deviceId: claim.deviceId,
        action: "revoke", idempotencyKey: "idem_desktop_revoke_0001",
        correlationId: "cor_desktoprevoke",
      });
    expect(revoked.status).toBe(200);
    expect((await testApp.agent.get("/v1/connect/client-relay/executors")
      .query({ correlationId: "cor_revokedlist1" })
      .set({
        authorization: `Bearer ${token}`,
        "x-kazi-device-id": claim.deviceId,
        "x-kazi-credential-generation": "1",
        "x-kazi-audience": "desktop-relay",
        "x-kazi-protocol-version": "1.0",
      })).status).toBe(401);
    expect((await testApp.agent.get(`/v1/connect/desktops/claims/${claim.claimId}/status`)
      .set("x-kazi-bootstrap-token", token)
      .query({ correlationId: "cor_desktopfenced" })).status).toBe(401);

    const rows = JSON.stringify(await Promise.all([
      testApp.database.query("SELECT * FROM connect_desktop_devices"),
      testApp.database.query("SELECT * FROM connect_desktop_claims"),
      testApp.database.query("SELECT * FROM connect_desktop_credentials"),
      testApp.database.query("SELECT * FROM connect_desktop_audit_events"),
    ]));
    for (const secret of [token, password, String(created.body.shortCode)]) {
      expect(rows).not.toContain(secret);
    }
    expect(rows).toContain("revoked");
    expect(rows).toContain('"credential_generation":2');
  });

  it("atomically selects exactly one owner when two authenticated accounts race", async () => {
    const raceToken = Buffer.alloc(32, 62).toString("base64url");
    const raceClaim = variant("race0001");
    const challenge = await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", raceToken).send(raceClaim);
    expect(challenge.status, JSON.stringify(challenge.body)).toBe(201);

    // Authenticate deterministically; only the claim decisions themselves race.
    const racers = [
      await authenticate(testApp, "raceone"),
      await authenticate(testApp, "racetwo"),
    ];
    const bodies = racers.map((racer, index) => ({
      kind: "desktop.claim.decision.request", protocolVersion: "1.0",
      claimId: raceClaim.claimId, sessionId: racer.sessionId, actorRole: "browser_session",
      decision: "accept", idempotencyKey: `idem_desktop_race_accept_${index + 1}_001`,
      correlationId: `cor_raceaccept${index + 1}`,
    }));
    const results = await Promise.all(racers.map((racer, index) =>
      racer.agent.post(`/v1/connect/desktops/claims/${raceClaim.claimId}/decision`)
        .set("x-csrf-token", racer.csrf).send(bodies[index]),
    ));
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const winnerIndex = results.findIndex((result) => result.status === 200);
    const loserIndex = 1 - winnerIndex;
    const winner = racers[winnerIndex]!;
    const loser = racers[loserIndex]!;

    expect(results[winnerIndex]!.body.websiteAccountId).toBe(winner.userId);
    expect(results[loserIndex]!.body.websiteAccountId).toBeUndefined();
    const replay = await winner.agent
      .post(`/v1/connect/desktops/claims/${raceClaim.claimId}/decision`)
      .set("x-csrf-token", winner.csrf).send(bodies[winnerIndex]);
    expect(replay.status, JSON.stringify(replay.body)).toBe(200);
    expect(replay.body.websiteAccountId).toBe(winner.userId);
    expect((await loser.agent.get(`/v1/connect/desktops/${raceClaim.deviceId}`)
      .query({ sessionId: loser.sessionId, correlationId: "cor_raceloseridor" })).status).toBe(404);

    expect(await testApp.database.query(
      `SELECT owner_user_id, state, credential_generation
       FROM connect_desktop_devices WHERE device_id = ?`,
      [raceClaim.deviceId],
    )).toEqual([{ owner_user_id: winner.userId, state: "active", credential_generation: 1 }]);
    expect(await testApp.database.query(
      `SELECT device_id, generation, token_hash, status
       FROM connect_desktop_credentials WHERE device_id = ?`,
      [raceClaim.deviceId],
    )).toEqual([{
      device_id: raceClaim.deviceId,
      generation: 1,
      token_hash: createHash("sha256").update(raceToken).digest("hex"),
      status: "active",
    }]);
    expect(await testApp.database.query(
      `SELECT actor_user_id FROM connect_desktop_audit_events
       WHERE device_id = ? AND event_kind = 'claim.accepted'`,
      [raceClaim.deviceId],
    )).toEqual([{ actor_user_id: winner.userId }]);

    const persisted = await persistedDesktopState(testApp);
    for (const secret of [
      raceToken, String(challenge.body.shortCode),
      ...racers.flatMap((racer) => [racer.password, racer.sessionToken, racer.csrf]),
    ]) expect(persisted).not.toContain(secret);
  });

  it("preserves pending then accepted credential state across file-backed restarts", async () => {
    await cleanupTestApp(testApp);
    testApp = await getPersistentTestApp();
    const restartToken = Buffer.alloc(32, 63).toString("base64url");
    const restartClaim = variant("restart1");
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
       FROM connect_desktop_devices WHERE device_id = ?`,
      [restartClaim.deviceId],
    )).toEqual([{ owner_user_id: owner.userId, state: "active", credential_generation: 1 }]);
    expect(await testApp.database.query(
      `SELECT generation, token_hash, audience, status
       FROM connect_desktop_credentials WHERE device_id = ?`,
      [restartClaim.deviceId],
    )).toEqual([{
      generation: 1,
      token_hash: createHash("sha256").update(restartToken).digest("hex"),
      audience: "desktop-relay",
      status: "active",
    }]);
    const persisted = await persistedDesktopState(testApp);
    for (const secret of [
      restartToken, owner.password, owner.sessionToken, owner.csrf,
      String(challenge.body.shortCode),
    ]) expect(persisted).not.toContain(secret);
  });

  it("denies or computes expiry without creating credentials or ownership", async () => {
    const owner = await authenticate(testApp, "negative");
    const deniedToken = Buffer.alloc(32, 64).toString("base64url");
    const deniedClaim = variant("denied01");
    expect((await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", deniedToken).send(deniedClaim)).status).toBe(201);
    const denied = await owner.agent
      .post(`/v1/connect/desktops/claims/${deniedClaim.claimId}/decision`)
      .set("x-csrf-token", owner.csrf).send({
        kind: "desktop.claim.decision.request", protocolVersion: "1.0",
        claimId: deniedClaim.claimId, sessionId: owner.sessionId,
        actorRole: "browser_session", decision: "deny",
        idempotencyKey: "idem_desktop_deny_claim_0001", correlationId: "cor_denyclaim0001",
      });
    expect(denied.status, JSON.stringify(denied.body)).toBe(200);
    expect(denied.body.status).toBe("denied");
    expect(denied.body.websiteAccountId).toBeUndefined();

    const expiredToken = Buffer.alloc(32, 65).toString("base64url");
    const expiredClaim = variant("expired1");
    expect((await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", expiredToken).send(expiredClaim)).status).toBe(201);
    await testApp.database.query(
      `UPDATE connect_desktop_claims
       SET created_at = '2000-01-01T00:00:00.000Z', expires_at = '2000-01-01T00:01:00.000Z'
       WHERE claim_id = ?`,
      [expiredClaim.claimId],
    );
    const computed = await testApp.agent
      .get(`/v1/connect/desktops/claims/${expiredClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", expiredToken)
      .query({ correlationId: "cor_expiredstatus1" });
    expect(computed.status, JSON.stringify(computed.body)).toBe(200);
    expect(computed.body.status).toBe("expired");
    expect(computed.body.websiteAccountId).toBeUndefined();
    const expiredDecision = await owner.agent
      .post(`/v1/connect/desktops/claims/${expiredClaim.claimId}/decision`)
      .set("x-csrf-token", owner.csrf).send({
        kind: "desktop.claim.decision.request", protocolVersion: "1.0",
        claimId: expiredClaim.claimId, sessionId: owner.sessionId,
        actorRole: "browser_session", decision: "accept",
        idempotencyKey: "idem_desktop_expired_accept_01",
        correlationId: "cor_expiredaccept1",
      });
    expect(expiredDecision.status).toBe(409);

    expect(await testApp.database.query(
      `SELECT device_id, owner_user_id, state, credential_generation
       FROM connect_desktop_devices WHERE device_id IN (?, ?) ORDER BY device_id`,
      [deniedClaim.deviceId, expiredClaim.deviceId],
    )).toEqual([
      { device_id: deniedClaim.deviceId, owner_user_id: null, state: "pending", credential_generation: 0 },
      { device_id: expiredClaim.deviceId, owner_user_id: null, state: "pending", credential_generation: 0 },
    ].sort((left, right) => left.device_id.localeCompare(right.device_id)));
    expect(await testApp.database.query(
      `SELECT device_id FROM connect_desktop_credentials WHERE device_id IN (?, ?)`,
      [deniedClaim.deviceId, expiredClaim.deviceId],
    )).toEqual([]);
  });

  it("fails closed rather than leaking a missing or foreign persisted owner", async () => {
    const owner = await authenticate(testApp, "ownercheck");
    const foreign = await authenticate(testApp, "foreigncheck");
    const ownerToken = Buffer.alloc(32, 69).toString("base64url");
    const ownerClaim = variant("ownercheck");
    expect((await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", ownerToken).send(ownerClaim)).status).toBe(201);
    const decision = {
      kind: "desktop.claim.decision.request", protocolVersion: "1.0",
      claimId: ownerClaim.claimId, sessionId: owner.sessionId, actorRole: "browser_session",
      decision: "accept", idempotencyKey: "idem_desktop_owner_check_001",
      correlationId: "cor_ownercheck0001",
    };
    const accepted = await owner.agent.post(`/v1/connect/desktops/claims/${ownerClaim.claimId}/decision`)
      .set("x-csrf-token", owner.csrf).send(decision);
    expect(accepted.body.websiteAccountId).toBe(owner.userId);

    // A mismatched persisted owner is an invariant failure, never another account's ID.
    await testApp.database.query(
      "UPDATE connect_desktop_devices SET owner_user_id = ? WHERE device_id = ?",
      [foreign.userId, ownerClaim.deviceId],
    );
    const foreignStatus = await testApp.agent.get(`/v1/connect/desktops/claims/${ownerClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", ownerToken).query({ correlationId: "cor_foreignowner01" });
    expect(foreignStatus.status).toBe(401);
    expect(foreignStatus.body.websiteAccountId).toBeUndefined();

    // Even corrupted missing ownership cannot produce an accepted response without the ID.
    await testApp.database.query("PRAGMA ignore_check_constraints = ON");
    await testApp.database.query(
      "UPDATE connect_desktop_devices SET owner_user_id = NULL WHERE device_id = ?",
      [ownerClaim.deviceId],
    );
    await testApp.database.query("PRAGMA ignore_check_constraints = OFF");
    const missingStatus = await testApp.agent.get(`/v1/connect/desktops/claims/${ownerClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", ownerToken).query({ correlationId: "cor_missingowner01" });
    expect(missingStatus.status).toBe(401);
    expect(missingStatus.body.websiteAccountId).toBeUndefined();
  });

  it("fails closed on bootstrap variants, CSRF/IDOR, conflicts, and expired credentials", async () => {
    const guardedToken = Buffer.alloc(32, 66).toString("base64url");
    const wrongToken = Buffer.alloc(32, 67).toString("base64url");
    const guardedClaim = variant("guarded1");
    const created = await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", guardedToken).send(guardedClaim);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect((await testApp.agent.post("/v1/connect/desktops/claims")
      .set("x-kazi-bootstrap-token", guardedToken)
      .send({ ...guardedClaim, correlationId: "cor_guardedretry1" })).status).toBe(200);
    for (const changed of [
      { keyFingerprint: "e".repeat(64), correlationId: "cor_guardedfinger1" },
      { correlationId: "cor_guardedtoken01" },
    ]) {
      const response = await testApp.agent.post("/v1/connect/desktops/claims")
        .set("x-kazi-bootstrap-token", "keyFingerprint" in changed ? guardedToken : wrongToken)
        .send({ ...guardedClaim, ...changed });
      expect(response.status, JSON.stringify(response.body)).toBe(409);
      expect(response.body.code).toBe("idempotency-conflict");
    }
    expect((await testApp.agent
      .get(`/v1/connect/desktops/claims/${guardedClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", wrongToken)
      .query({ correlationId: "cor_guardedwrong01" })).status).toBe(401);
    for (const header of [
      [guardedToken, guardedToken],
      `${guardedToken},${guardedToken}`,
    ]) {
      const response = await request(testApp.server)
        .get(`/v1/connect/desktops/claims/${guardedClaim.claimId}/status`)
        .set("x-kazi-bootstrap-token", header)
        .query({ correlationId: "cor_guardedheader1" });
      expect([400, 401]).toContain(response.status);
      expect(response.body).toMatchObject({ kind: "error", protocolVersion: "1.0" });
    }

    const owner = await authenticate(testApp, "guardowner");
    const intruder = await authenticate(testApp, "intruder");
    const decision = {
      kind: "desktop.claim.decision.request", protocolVersion: "1.0",
      claimId: guardedClaim.claimId, sessionId: owner.sessionId, actorRole: "browser_session",
      decision: "accept", idempotencyKey: "idem_desktop_guard_accept_001",
      correlationId: "cor_guardaccept01",
    };
    expect((await owner.agent
      .post(`/v1/connect/desktops/claims/${guardedClaim.claimId}/decision`)
      .send(decision)).status).toBe(403);
    expect((await intruder.agent
      .post(`/v1/connect/desktops/claims/${guardedClaim.claimId}/decision`)
      .set("x-csrf-token", intruder.csrf).send(decision)).status).toBe(401);
    expect((await owner.agent
      .post(`/v1/connect/desktops/claims/${guardedClaim.claimId}/decision`)
      .set("x-csrf-token", owner.csrf).send(decision)).status).toBe(200);
    expect((await intruder.agent.get(`/v1/connect/desktops/${guardedClaim.deviceId}`)
      .query({ sessionId: intruder.sessionId, correlationId: "cor_intruderdetail" })).status).toBe(404);

    // Seed one executor for each owner to prove the Desktop discovery route
    // derives ownership from the authenticated device rather than a browser cookie.
    const executorRows = [
      ["exe_guardowner01", "dev_guardexec001", owner.userId, "Owner executor"],
      ["exe_intruder001", "dev_intruderexec1", intruder.userId, "Intruder executor"],
    ];
    for (const [executorId, executorDeviceId, userId, displayName] of executorRows) {
      await testApp.database.query(
        `INSERT INTO connect_executors (
           executor_id, device_id, owner_user_id, display_name, platform, architecture,
           executor_version, key_fingerprint, state, credential_generation,
           created_at, claimed_at, updated_at, last_seen_at
         ) VALUES (?, ?, ?, ?, 'linux', 'x64', '1.0.5', ?, 'active', 1, ?, ?, ?, ?)`,
        [executorId, executorDeviceId, userId, displayName, "a".repeat(64),
          "2026-07-25T00:00:00.000Z", "2026-07-25T00:00:00.000Z",
          "2026-07-25T00:00:00.000Z", "2026-07-25T00:00:00.000Z"],
      );
    }
    const relayHeaders = {
      authorization: `Bearer ${guardedToken}`,
      "x-kazi-device-id": guardedClaim.deviceId,
      "x-kazi-credential-generation": "1",
      "x-kazi-audience": "desktop-relay",
      "x-kazi-protocol-version": "1.0",
    };
    const relayRequest = (overrides: Record<string, string | string[]> = {}) =>
      request(testApp.server).get("/v1/connect/client-relay/executors")
        .query({ correlationId: "cor_desktoplist1" })
        .set({ ...relayHeaders, ...overrides } as Record<string, string>);
    const discovery = await relayRequest();
    expect(discovery.status, JSON.stringify(discovery.body)).toBe(200);
    expect(discovery.body).toEqual({
      kind: "executor.list.response",
      protocolVersion: "1.0",
      executors: [{
        executorId: "exe_guardowner01",
        displayName: "Owner executor",
        state: "active",
        online: false,
        presence: "offline",
        protocolVersion: "1.0",
      }],
      correlationId: "cor_desktoplist1",
    });
    expect(JSON.stringify(discovery.body)).not.toContain("Intruder executor");
    const wrongRelayValues = {
      authorization: `Bearer ${wrongToken}`,
      "x-kazi-device-id": "dev_wrongdevice1",
      "x-kazi-credential-generation": "2",
      "x-kazi-audience": "executor-relay",
      "x-kazi-protocol-version": "1.1",
    };
    for (const name of Object.keys(relayHeaders) as Array<keyof typeof relayHeaders>) {
      expect((await relayRequest({ [name]: wrongRelayValues[name] })).status).toBe(401);
    }

    await testApp.database.query(
      `UPDATE connect_desktop_credentials
       SET created_at = '2000-01-01T00:00:00.000Z', expires_at = '2000-01-01T00:01:00.000Z'
       WHERE device_id = ?`,
      [guardedClaim.deviceId],
    );
    const expired = await testApp.agent
      .get(`/v1/connect/desktops/claims/${guardedClaim.claimId}/status`)
      .set("x-kazi-bootstrap-token", guardedToken)
      .query({ correlationId: "cor_guardexpired1" });
    expect(expired.status).toBe(401);
    expect((await relayRequest()).status).toBe(401);

    const persisted = await persistedDesktopState(testApp);
    for (const secret of [
      guardedToken, wrongToken, owner.password, intruder.password,
      owner.sessionToken, owner.csrf, intruder.sessionToken, intruder.csrf,
      String(created.body.shortCode),
    ]) expect(persisted).not.toContain(secret);
  });
});
