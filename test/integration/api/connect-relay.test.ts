import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupTestApp,
  getPersistentTestApp,
  restartPersistentTestApp,
  type TestAppResult,
} from "../../helpers/test-app";
import { TraceProbe } from "../../helpers/trace-probe";

const token = Buffer.alloc(32, 61).toString("base64url");
const executorId = "exe_relayhttp01";
const deviceId = "dev_relayhttp01";
const ownerPassword = "relay owner correct secret phrase";

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0]!;
}

function relayHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "x-kazi-executor-id": executorId,
    "x-kazi-device-id": deviceId,
    "x-kazi-credential-generation": "1",
    "x-kazi-audience": "executor-relay",
    "x-kazi-protocol-version": "1.0",
    ...overrides,
  };
}

async function enroll(testApp: TestAppResult) {
  const claim = {
    kind: "executor.claim.create.request",
    protocolVersion: "1.0",
    claimId: "clm_relayhttp01",
    executorId,
    deviceId,
    actorRole: "executor_device",
    displayName: "Relay HTTP executor",
    platform: "linux",
    architecture: "x64",
    executorVersion: "1.0.1",
    keyFingerprint: "e".repeat(64),
    idempotencyKey: "idem_relay_http_claim_0001",
    correlationId: "cor_relayclaim01",
  };
  const created = await testApp.agent.post("/v1/connect/executors/claims")
    .set("x-kazi-bootstrap-token", token).send(claim);
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  expect((await testApp.agent.post("/v1/connect/auth/signup").send({
    kind: "auth.signup.request",
    protocolVersion: "1.0",
    username: "relay.owner",
    password: ownerPassword,
    idempotencyKey: "idem_relay_owner_signup_01",
    correlationId: "cor_relaysignup01",
  })).status).toBe(201);
  const login = await testApp.agent.post("/v1/connect/auth/login").send({
    kind: "auth.login.request",
    protocolVersion: "1.0",
    username: "relay.owner",
    password: ownerPassword,
    idempotencyKey: "idem_relay_owner_login_001",
    correlationId: "cor_relaylogin01",
  });
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  const cookies = login.headers["set-cookie"] as unknown as string[];
  const csrf = cookieValue(cookies, "kazi_connect_csrf");
  const sessionToken = cookieValue(cookies, "kazi_connect_session");
  const accepted = await testApp.agent
    .post(`/v1/connect/executors/claims/${claim.claimId}/decision`)
    .set("x-csrf-token", csrf)
    .send({
      kind: "executor.claim.decision.request",
      protocolVersion: "1.0",
      claimId: claim.claimId,
      sessionId: login.body.sessionId,
      actorRole: "browser_session",
      decision: "accept",
      idempotencyKey: "idem_relay_accept_claim_01",
      correlationId: "cor_relayaccept01",
    });
  expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
  return {
    sessionId: String(login.body.sessionId),
    csrf,
    sessionToken,
    cookie: `kazi_connect_session=${sessionToken}; kazi_connect_csrf=${csrf}`,
  };
}

interface SseClient {
  status: number;
  headers: IncomingHttpHeaders;
  next(): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

function openSse(testApp: TestAppResult): Promise<SseClient> {
  const address = testApp.server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port: address.port,
      path: "/v1/connect/relay/events",
      method: "GET",
      headers: relayHeaders(),
    });
    req.once("error", reject);
    req.once("response", (res: IncomingMessage) => {
      let buffer = "";
      const frames: Record<string, unknown>[] = [];
      const waiters: Array<{
        resolve(value: Record<string, unknown>): void;
        reject(error: Error): void;
      }> = [];
      const fail = (error: Error) => {
        while (waiters.length > 0) waiters.shift()!.reject(error);
      };
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        buffer += chunk;
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = event.split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6))
            .join("\n");
          if (data) {
            const frame = JSON.parse(data) as Record<string, unknown>;
            const waiter = waiters.shift();
            if (waiter) waiter.resolve(frame);
            else frames.push(frame);
          }
          boundary = buffer.indexOf("\n\n");
        }
      });
      res.once("error", fail);
      res.once("end", () => fail(new Error("SSE stream ended before the next frame")));
      const closed = new Promise<void>((resolveClosed) => {
        if (res.destroyed) resolveClosed();
        else res.once("close", resolveClosed);
      });
      resolve({
        status: res.statusCode ?? 0,
        headers: res.headers,
        next: () => {
          const frame = frames.shift();
          if (frame) return Promise.resolve(frame);
          return new Promise<Record<string, unknown>>((resolveFrame, rejectFrame) => {
            waiters.push({ resolve: resolveFrame, reject: rejectFrame });
          });
        },
        close: async () => {
          if (res.destroyed) return;
          res.destroy();
          req.destroy();
          await closed;
        },
      });
    });
    req.end();
  });
}

function rawRequest(
  testApp: TestAppResult,
  input: {
    name: string;
    method?: "GET" | "POST";
    path?: string;
    headers: readonly string[];
    body?: string;
  },
): Promise<{
  status: number;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}> {
  const address = testApp.server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (message: string, cause?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      req.destroy();
      reject(new Error(`[raw relay request: ${input.name}] ${message}`, { cause }));
    };
    const req = http.request({
      host: "127.0.0.1",
      port: address.port,
      path: input.path ?? "/v1/connect/relay",
      method: input.method ?? "POST",
      // Supplying Node's raw header-array form disables its automatic Host header.
      // Keep this HTTP/1.1 request valid so it reaches Express/Dinner and exercises
      // the intended duplicate-header rejection rather than Node's Host guard,
      // which emits its own empty 400 before the application request handler.
      headers: ["host", `127.0.0.1:${address.port}`, ...input.headers],
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
      });
      res.once("aborted", () => fail("response aborted before its canonical JSON envelope"));
      res.once("error", (error) => fail("response stream failed", error));
      res.once("close", () => {
        if (!res.complete) fail("response closed before its canonical JSON envelope completed");
      });
      res.once("end", () => {
        if (settled) return;
        if (!body) {
          fail(`received an empty ${res.statusCode ?? 0} response`);
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch (error) {
          fail(`received non-JSON response body: ${body.slice(0, 160)}`, error);
          return;
        }
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          fail("received a non-object JSON response");
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: parsed as Record<string, unknown>,
        });
      });
    });
    req.once("error", (error) => fail("request failed", error));
    const timeout = setTimeout(() => {
      fail("did not close with a canonical JSON envelope within 5 seconds");
    }, 5_000);
    timeout.unref();
    req.end(input.method === "GET" ? undefined : input.body ?? JSON.stringify({
        kind: "channel.hello",
        protocolVersion: "1.0",
        executorId,
        deviceId,
        actorRole: "executor_device",
        correlationId: "cor_rawrelay001",
      }));
  });
}

function expectCanonicalRelayError(
  name: string,
  response: {
    status: number;
    headers: IncomingHttpHeaders;
    body: Record<string, unknown>;
  },
  expected: { status: number; code: string; correlationId?: string },
): void {
  expect(response.status, `${name}: ${JSON.stringify(response.body)}`).toBe(expected.status);
  expect(response.headers["x-kazi-protocol-version"], `${name}: missing protocol header`)
    .toBe("1.0");
  expect(Object.keys(response.body).sort(), `${name}: non-canonical error fields`).toEqual([
    "code", "correlationId", "kind", "message", "protocolVersion", "retryable",
  ]);
  expect(response.body, name).toMatchObject({
    kind: "error",
    protocolVersion: "1.0",
    code: expected.code,
    retryable: false,
    ...(expected.correlationId ? { correlationId: expected.correlationId } : {}),
  });
  expect(Buffer.byteLength(JSON.stringify(response.body)), `${name}: unbounded error envelope`)
    .toBeLessThanOrEqual(512);
}

async function sqliteDump(testApp: TestAppResult): Promise<string> {
  const rows = await testApp.database.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  ) as Array<{ name: string }>;
  const dump: Record<string, unknown> = {};
  for (const { name } of rows) {
    if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error("Unsafe SQLite table name");
    dump[name] = await testApp.database.query(`SELECT * FROM ${name}`);
  }
  return JSON.stringify(dump);
}

describe("Connect relay real stitched HTTP/SSE", () => {
  let testApp: TestAppResult;
  let streams: SseClient[];

  beforeEach(async () => {
    streams = [];
    testApp = await getPersistentTestApp();
  });

  afterEach(async () => {
    for (const stream of streams) await stream.close();
    await cleanupTestApp(testApp);
  });

  it("acks the exact SSE channel, projects heartbeat presence, fences takeover, and stays transient", async () => {
    const owner = await enroll(testApp);
    const hello = {
      kind: "channel.hello",
      protocolVersion: "1.0",
      executorId,
      deviceId,
      actorRole: "executor_device",
      correlationId: "cor_relayhello01",
    };
    const helloResponse = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders()).send(hello);
    expect(helloResponse.status, JSON.stringify(helloResponse.body)).toBe(200);

    const first = await openSse(testApp);
    streams.push(first);
    expect(first.status).toBe(200);
    expect(first.headers["content-type"]).toBe("text/event-stream");
    expect(first.headers["x-kazi-protocol-version"]).toBe("1.0");
    expect(await first.next()).toEqual({
      kind: "channel.ack",
      protocolVersion: "1.0",
      executorId,
      acknowledgedKind: "channel.hello",
      correlationId: "cor_relayhello01",
    });

    const heartbeat = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders()).send({
        kind: "channel.heartbeat",
        protocolVersion: "1.0",
        executorId,
        deviceId,
        actorRole: "executor_device",
        state: "idle",
        sentAt: "2026-07-25T14:00:00.000Z",
        correlationId: "cor_relayheart01",
      });
    expect(heartbeat.status).toBe(200);
    expect(heartbeat.body.acknowledgedKind).toBe("channel.heartbeat");

    const list = await testApp.agent.get("/v1/connect/executors")
      .query({ sessionId: owner.sessionId, correlationId: "cor_relaylist001" });
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    expect(list.body.executors).toEqual([
      expect.objectContaining({ executorId, online: true, presence: "online" }),
    ]);
    const detail = await testApp.agent.get(`/v1/connect/executors/${executorId}`)
      .query({ sessionId: owner.sessionId, correlationId: "cor_relaydetail01" });
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);
    expect(detail.body.executor).toEqual(
      expect.objectContaining({ online: true, presence: "online" }),
    );

    const revokedFrame = first.next();
    const second = await openSse(testApp);
    streams.push(second);
    expect((await revokedFrame)).toEqual({
      kind: "channel.revoked",
      protocolVersion: "1.0",
      executorId,
      code: "revoked",
      correlationId: "cor_channeltakeover",
    });
    await first.close();
    const afterStaleClose = await testApp.agent.get("/v1/connect/executors")
      .query({ sessionId: owner.sessionId, correlationId: "cor_relaylist002" });
    expect(afterStaleClose.body.executors[0]).toEqual(
      expect.objectContaining({ online: true, presence: "online" }),
    );

    const trace = new TraceProbe();
    trace.start();
    const beforeCanary = await sqliteDump(testApp);
    const canary = "CANARY_RELAY_PAYLOAD_MUST_NOT_PERSIST_7d16";
    const transient = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders()).send({
        kind: "executor.event",
        protocolVersion: "1.0",
        eventId: "evt_relaycanary01",
        correlationId: "cor_relaycanary01",
        executorId,
        threadId: "thr_relaycanary01",
        sequence: 1,
        occurredAt: "2026-07-25T14:01:00.000Z",
        data: { eventType: "thread.message", text: canary },
      });
    expect(transient.status).toBe(204);
    await trace.flush();
    const afterCanary = await sqliteDump(testApp);
    expect(afterCanary).toBe(beforeCanary);
    expect(afterCanary).not.toContain(canary);
    expect(JSON.stringify(trace.query())).not.toContain(canary);
    trace.stop();

    await second.close();
    const disconnected = await testApp.agent.get("/v1/connect/executors")
      .query({ sessionId: owner.sessionId, correlationId: "cor_relaylist003" });
    expect(disconnected.body.executors[0]).toEqual(
      expect.objectContaining({ online: true, presence: "online" }),
    );

    testApp = await restartPersistentTestApp(testApp);
    const afterRestart = await request(testApp.server).get("/v1/connect/executors")
      .set("Cookie", owner.cookie)
      .query({ sessionId: owner.sessionId, correlationId: "cor_relaylist004" });
    expect(afterRestart.status, JSON.stringify(afterRestart.body)).toBe(200);
    expect(afterRestart.body.executors[0]).toEqual(
      expect.objectContaining({ online: false, presence: "offline" }),
    );
  });

  it("rejects bad auth context and frames with safe envelopes and fences last_seen", async () => {
    const owner = await enroll(testApp);
    const validFrame = {
      kind: "channel.heartbeat",
      protocolVersion: "1.0",
      executorId,
      deviceId,
      actorRole: "executor_device",
      state: "idle",
      sentAt: "2026-07-25T14:02:00.000Z",
      correlationId: "cor_relayvalid001",
    };
    const initialRows = await testApp.database.query(
      "SELECT last_seen_at FROM connect_executors WHERE executor_id = ?",
      [executorId],
    );

    const badHeaders = [
      { authorization: `Bearer ${Buffer.alloc(32, 62).toString("base64url")}` },
      { "x-kazi-executor-id": "exe_wrongrelay01" },
      { "x-kazi-device-id": "dev_wrongrelay01" },
      { "x-kazi-credential-generation": "2" },
      { "x-kazi-audience": "browser-relay" },
    ];
    for (const overrides of badHeaders) {
      const name = `wrong relay auth header ${Object.keys(overrides)[0]}`;
      const rejected = await testApp.agent.post("/v1/connect/relay")
        .set(relayHeaders(overrides)).send(validFrame);
      expectCanonicalRelayError(name, rejected, {
        status: 401, code: "revoked",
      });
      expect(rejected.body.message, name).toBe("Authentication failed");
    }
    const protocol = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders({ "x-kazi-protocol-version": "9.9" })).send(validFrame);
    expectCanonicalRelayError("wrong protocol header", protocol, {
      status: 409, code: "protocol-version-mismatch",
    });

    const rejectedSse = await rawRequest(testApp, {
      name: "SSE wrong audience header",
      method: "GET",
      path: "/v1/connect/relay/events",
      headers: Object.entries(relayHeaders({ "x-kazi-audience": "browser-relay" })).flat(),
    });
    expectCanonicalRelayError("SSE wrong audience header", rejectedSse, {
      status: 401, code: "revoked",
    });

    const malformed = await rawRequest(testApp, {
      name: "malformed JSON body",
      headers: [
        "content-type", "application/json",
        ...Object.entries(relayHeaders()).flat(),
      ],
      body: "{",
    });
    expect(malformed.body).toEqual({
      kind: "error",
      protocolVersion: "1.0",
      code: "invalid-envelope",
      message: "Invalid request envelope",
      retryable: false,
      correlationId: "cor_invalid000",
    });
    expectCanonicalRelayError("malformed JSON body", malformed, {
      status: 400, code: "invalid-envelope", correlationId: "cor_invalid000",
    });
    const unknown = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders()).send({
        kind: "unknown.operation",
        protocolVersion: "1.0",
        correlationId: "cor_relayunknown1",
      });
    expectCanonicalRelayError("unknown relay frame", unknown, {
      status: 400, code: "invalid-envelope", correlationId: "cor_relayunknown1",
    });
    const oversized = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders()).send({
        ...validFrame,
        correlationId: "cor_relayoversize",
        padding: "x".repeat(256 * 1024),
      });
    expect(oversized.headers["x-kazi-protocol-version"]).toBe("1.0");
    expectCanonicalRelayError("oversized relay frame", oversized, {
      status: 413, code: "invalid-envelope", correlationId: "cor_relayoversize",
    });

    const rowsAfterRejections = await testApp.database.query(
      "SELECT last_seen_at FROM connect_executors WHERE executor_id = ?",
      [executorId],
    );
    expect(rowsAfterRejections).toEqual(initialRows);

    const revoked = await testApp.agent
      .post(`/v1/connect/executors/${executorId}/revoke`)
      .set("x-csrf-token", owner.csrf)
      .query({ sessionId: owner.sessionId, correlationId: "cor_relayrevoke01" })
      .send({
        kind: "executor.action.request",
        protocolVersion: "1.0",
        executorId,
        action: "revoke",
        idempotencyKey: "idem_relay_revoke_exec_01",
        correlationId: "cor_relayrevoke01",
      });
    expect(revoked.status).toBe(200);
    const revokedToken = await testApp.agent.post("/v1/connect/relay")
      .set(relayHeaders()).send(validFrame);
    expectCanonicalRelayError("revoked relay token", revokedToken, {
      status: 401, code: "revoked",
    });
  });
});
