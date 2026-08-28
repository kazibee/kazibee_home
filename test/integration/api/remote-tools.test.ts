import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TestAppResult } from "../../helpers/test-app";
import { cleanupTestApp, getTestApp } from "../../helpers/test-app";

const bootstrapToken = Buffer.alloc(32, 21).toString("base64url");
const claim = {
  kind: "executor.claim.create.request",
  protocolVersion: "1.0",
  claimId: "clm_rtoolclaim1",
  executorId: "exe_rtoolexec01",
  deviceId: "dev_rtooldev001",
  actorRole: "executor_device",
  displayName: "Remote tools executor",
  platform: "macos",
  architecture: "arm64",
  executorVersion: "0.1.0",
  keyFingerprint: "e".repeat(64),
  idempotencyKey: "idem_rtool_claim_create_01",
  correlationId: "cor_rtoolclaim1",
};
const WORKSPACE_ID = "wrk_0123456789abcdef0123456789abcdef";

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0];
}

/**
 * Minimal coordinator stand-in speaking the /dispatch contract: answers
 * tool_help with a canned manifest and read with file content, echoing the
 * dispatched payload back so assertions can check what home actually sent.
 */
function startCoordinatorStub(): Promise<{
  origin: string;
  dispatched: Array<Record<string, unknown>>;
  close(): Promise<void>;
}> {
  const dispatched: Array<Record<string, unknown>> = [];
  const server = http.createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += String(chunk); });
    request.on("end", () => {
      const frame = JSON.parse(raw) as { payload: { operationId: string; toolName: string; scopes: string[] } };
      dispatched.push(frame as unknown as Record<string, unknown>);
      const { operationId, toolName } = frame.payload;
      const result = toolName === "tool_help"
        ? {
            status: "succeeded",
            payload: {
              ok: true,
              tools: [
                { name: "read", description: "Read a file.", requiredScopes: ["workspace.read"], inputSchema: { type: "object", required: ["path"], properties: { path: { type: "string" } } } },
                { name: "tool_help", description: "Describe tools.", requiredScopes: [], inputSchema: { type: "object" } },
              ],
            },
            effectState: "none",
          }
        : toolName === "read"
          ? { status: "succeeded", payload: { ok: true, path: "readme.md", content: "# Demo" }, effectState: "none" }
          : { status: "failed", error: { code: "TOOL_NOT_ALLOWED", message: `Unknown tool: ${toolName}` , retryable: false }, effectState: "none" };
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        kind: "command.result",
        protocolVersion: "1.1",
        operation: "remote_tool.call",
        operationId,
        result,
      }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as { port: number };
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        dispatched,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe("Remote tool grants and MCP endpoint", () => {
  let testApp: TestAppResult;
  let coordinator: Awaited<ReturnType<typeof startCoordinatorStub>>;

  beforeEach(async () => {
    testApp = await getTestApp();
    coordinator = await startCoordinatorStub();
    process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN = coordinator.origin;
  });

  afterEach(async () => {
    delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
    await coordinator.close();
    await cleanupTestApp(testApp);
  });

  async function seedOwnedExecutor() {
    const created = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .send(claim);
    expect(created.status, JSON.stringify(created.body)).toBe(201);

    await testApp.agent.post("/v1/connect/auth/signup").send({
      kind: "auth.signup.request", protocolVersion: "1.0",
      email: "shavyg2@gmail.com",
      username: "rtool.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_rtool_signup_owner_1", correlationId: "cor_rtoolsignup",
    });
    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      kind: "auth.login.request", protocolVersion: "1.0",
      username: "rtool.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_rtool_login_owner_01", correlationId: "cor_rtoollogin1",
    });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    const cookies = login.headers["set-cookie"] as unknown as string[];
    const csrf = cookieValue(cookies, "kazi_connect_csrf");
    const sessionId = login.body.sessionId as string;

    const decision = await testApp.agent
      .post(`/v1/connect/executors/claims/${claim.claimId}/decision`)
      .set("x-csrf-token", csrf)
      .send({
        kind: "executor.claim.decision.request", protocolVersion: "1.0",
        claimId: claim.claimId, sessionId,
        actorRole: "browser_session", decision: "accept",
        idempotencyKey: "idem_rtool_accept_claim_1", correlationId: "cor_rtoolaccept",
      });
    expect(decision.status, JSON.stringify(decision.body)).toBe(200);
    return { csrf, sessionId };
  }

  it("channel-auth verifies the promoted bootstrap credential and fails closed on mismatch", async () => {
    await seedOwnedExecutor();

    const valid = await testApp.agent.post("/v1/connect/executors/channel-auth").send({
      authorization: `Bearer ${bootstrapToken}`,
      executorId: claim.executorId, deviceId: claim.deviceId,
      generation: "1", audience: "executor-relay", protocolVersion: "1.1",
    });
    expect(valid.status, JSON.stringify(valid.body)).toBe(200);
    expect(valid.body.ok).toBe(true);

    for (const mutation of [
      { deviceId: "dev_other0000001" },
      { generation: "2" },
      { authorization: `Bearer ${Buffer.alloc(32, 9).toString("base64url")}` },
      { audience: "desktop-relay" },
    ]) {
      const denied = await testApp.agent.post("/v1/connect/executors/channel-auth").send({
        authorization: `Bearer ${bootstrapToken}`,
        executorId: claim.executorId, deviceId: claim.deviceId,
        generation: "1", audience: "executor-relay", protocolVersion: "1.1",
        ...mutation,
      });
      expect(denied.status, JSON.stringify(mutation)).toBe(401);
    }
  });

  it("mints a grant once, enforces scope dependencies, and lists without tokens", async () => {
    const { csrf, sessionId } = await seedOwnedExecutor();

    const invalid = await testApp.agent
      .post("/v1/remote-tools/grants")
      .set("x-csrf-token", csrf)
      .query({ sessionId })
      .send({ executorId: claim.executorId, workspaceId: WORKSPACE_ID, scopes: ["workspace.write"] });
    expect(invalid.status).toBe(400);

    const created = await testApp.agent
      .post("/v1/remote-tools/grants")
      .set("x-csrf-token", csrf)
      .query({ sessionId })
      .send({ executorId: claim.executorId, workspaceId: WORKSPACE_ID, scopes: ["workspace.read"] });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const listed = await testApp.agent
      .get("/v1/remote-tools/grants")
      .query({ sessionId });
    expect(listed.status).toBe(200);
    expect(listed.body.grants).toHaveLength(1);
    expect(JSON.stringify(listed.body)).not.toContain(created.body.token);
  });

  it("serves MCP initialize/list/call through dispatch and rejects bad bearers", async () => {
    const { csrf, sessionId } = await seedOwnedExecutor();
    const created = await testApp.agent
      .post("/v1/remote-tools/grants")
      .set("x-csrf-token", csrf)
      .query({ sessionId })
      .send({ executorId: claim.executorId, workspaceId: WORKSPACE_ID, scopes: ["workspace.read"] });
    const token = created.body.token as string;

    const unauthenticated = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(unauthenticated.status).toBe(401);

    const initialize = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect(initialize.status).toBe(200);
    expect(initialize.body.result.serverInfo.name).toBe("Kazibee Remote Tool Service");
    expect(initialize.body.result.protocolVersion).toBe("2025-06-18");

    const notification = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(notification.status).toBe(202);

    const list = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    expect(list.body.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["read", "tool_help"]);

    const call = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read", arguments: { path: "readme.md" } } });
    expect(call.status).toBe(200);
    expect(call.body.result.isError).toBe(false);
    expect(call.body.result.structuredContent.content).toBe("# Demo");

    // The dispatched frames must carry the grant's authority, not the client's.
    const readFrame = coordinator.dispatched.find(
      (frame) => (frame.payload as { toolName: string }).toolName === "read",
    ) as { executorId: string; payload: { scopes: string[]; workspaceId: string } };
    expect(readFrame.executorId).toBe(claim.executorId);
    expect(readFrame.payload.scopes).toEqual(["workspace.read"]);
    expect(readFrame.payload.workspaceId).toBe(WORKSPACE_ID);

    const unknown = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 4, method: "resources/list", params: {} });
    expect(unknown.body.error.code).toBe(-32601);
  });

  it("revocation cuts off the MCP surface", async () => {
    const { csrf, sessionId } = await seedOwnedExecutor();
    const created = await testApp.agent
      .post("/v1/remote-tools/grants")
      .set("x-csrf-token", csrf)
      .query({ sessionId })
      .send({ executorId: claim.executorId, workspaceId: WORKSPACE_ID, scopes: ["workspace.read"] });
    const token = created.body.token as string;
    const grantId = created.body.grantId as string;

    const before = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 1, method: "ping" });
    expect(before.status).toBe(200);

    const revoked = await testApp.agent
      .post(`/v1/remote-tools/grants/${grantId}/revoke`)
      .set("x-csrf-token", csrf)
      .query({ sessionId })
      .send({});
    expect(revoked.status).toBe(200);

    const after = await testApp.agent
      .post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 2, method: "ping" });
    expect(after.status).toBe(401);
  });
});
