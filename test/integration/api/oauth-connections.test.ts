import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getContainer } from "@noego/app/container";
import type { TestAppResult } from "../../helpers/test-app";
import { cleanupTestApp, getTestApp } from "../../helpers/test-app";
import OAuthClientService from "../../../src/server/services/oauth_client_service";
import OAuthFlowService from "../../../src/server/services/oauth_flow_service";

const bootstrapToken = Buffer.alloc(32, 23).toString("base64url");
const claim = {
  kind: "executor.claim.create.request",
  protocolVersion: "1.0",
  claimId: "clm_oauthclaim1",
  executorId: "exe_oauthexec01",
  deviceId: "dev_oauthdev001",
  actorRole: "executor_device",
  displayName: "OAuth executor",
  platform: "macos",
  architecture: "arm64",
  executorVersion: "0.1.0",
  keyFingerprint: "f".repeat(64),
  idempotencyKey: "idem_oauth_claim_create_1",
  correlationId: "cor_oauthclaim1",
};
const WORKSPACE_ID = "wrk_fedcba9876543210fedcba9876543210";
const MCP_ORIGIN = "https://mcp-test.kazibee.example.com";
const RESOURCE = `${MCP_ORIGIN}/mcp`;
const REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";

function cookieValue(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0];
}

function startCoordinatorStub(): Promise<{
  origin: string;
  dispatched: Array<Record<string, unknown>>;
  close(): Promise<void>;
}> {
  const dispatched: Array<Record<string, unknown>> = [];
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.method === "GET") {
      // Presence probe: online, one workspace.
      response.end(JSON.stringify({
        state: "online",
        workspaces: {
          projectionVersion: 1,
          workspaces: [{ workspaceId: WORKSPACE_ID, displayName: "demo", state: "enabled" }],
        },
      }));
      return;
    }
    let raw = "";
    request.on("data", (chunk) => { raw += String(chunk); });
    request.on("end", () => {
      const frame = JSON.parse(raw) as { payload: { operationId: string; toolName: string } };
      dispatched.push(frame as unknown as Record<string, unknown>);
      const { operationId, toolName } = frame.payload;
      const result = toolName === "read"
        ? { status: "succeeded", payload: { ok: true, path: "readme.md", content: "# OAuth demo" }, effectState: "none" }
        : toolName === "list_workspaces"
          ? { status: "succeeded", payload: { ok: true, workspaces: [{ workspaceId: WORKSPACE_ID, name: "demo" }] }, effectState: "none" }
          : { status: "succeeded", payload: { ok: true, tools: [] }, effectState: "none" };
      response.end(JSON.stringify({
        kind: "command.result", protocolVersion: "1.1",
        operation: "remote_tool.call", operationId, result,
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

describe("OAuth connections end to end", () => {
  let testApp: TestAppResult;
  let coordinator: Awaited<ReturnType<typeof startCoordinatorStub>>;

  beforeEach(async () => {
    process.env.KAZI_MCP_ORIGIN = MCP_ORIGIN;
    process.env.KAZI_WEBSITE_ORIGIN = "https://web-test.kazibee.example.com";
    testApp = await getTestApp();
    coordinator = await startCoordinatorStub();
    process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN = coordinator.origin;
  });

  afterEach(async () => {
    delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
    delete process.env.KAZI_MCP_ORIGIN;
    delete process.env.KAZI_WEBSITE_ORIGIN;
    await coordinator.close();
    await cleanupTestApp(testApp);
  });

  async function seedOwnedExecutor() {
    const created = await testApp.agent
      .post("/v1/connect/executors/claims")
      .set("x-kazi-bootstrap-token", bootstrapToken)
      .send(claim);
    expect(created.status, JSON.stringify(created.body)).toBe(201);

    const signup = await testApp.agent.post("/v1/connect/auth/signup").send({
      kind: "auth.signup.request", protocolVersion: "1.0",
      email: "shavyg2@gmail.com",
      username: "oauth.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_oauth_signup_owner_1", correlationId: "cor_oauthsignup",
    });
    expect(signup.status, JSON.stringify(signup.body)).toBe(201);
    const login = await testApp.agent.post("/v1/connect/auth/login").send({
      kind: "auth.login.request", protocolVersion: "1.0",
      username: "oauth.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_oauth_login_owner_1", correlationId: "cor_oauthlogin1",
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
        idempotencyKey: "idem_oauth_accept_claim_1", correlationId: "cor_oauthaccept",
      });
    expect(decision.status, JSON.stringify(decision.body)).toBe(200);
    return { csrf, sessionId };
  }

  it("runs register -> consent -> code -> token -> MCP call -> revoke", async () => {
    const { csrf, sessionId } = await seedOwnedExecutor();

    // Dynamic client registration (satellite endpoint; service-level here).
    const clients = getContainer().get(OAuthClientService) as OAuthClientService;
    const registered = await clients.registerClient({
      client_name: "ChatGPT",
      redirect_uris: [REDIRECT_URI],
    });
    expect(registered.ok).toBe(true);
    const clientId = registered.ok ? registered.client.client_id : "";

    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier, "utf8").digest("base64url");
    const oauthParams = {
      response_type: "code",
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      state: "st_12345",
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: "kazibee:read kazibee:write kazibee:shell kazibee:web",
      resource: RESOURCE,
    };

    // Authorize serves the consent shell for a valid request.
    const shell = await testApp.agent.get("/oauth/authorize").query(oauthParams);
    expect(shell.status, shell.text?.slice(0, 200)).toBe(200);
    expect(shell.text).toContain("Authorize access");

    // A tampered redirect URI never reaches the consent shell.
    const badRedirect = await testApp.agent.get("/oauth/authorize")
      .query({ ...oauthParams, redirect_uri: "https://evil.example.com/cb" });
    expect(badRedirect.status).toBe(400);

    // Consent context lists the machine with live presence + workspaces.
    const context = await testApp.agent.get("/oauth/consent/context")
      .query({ ...oauthParams, sessionId });
    expect(context.status, JSON.stringify(context.body)).toBe(200);
    expect(context.body.executors).toHaveLength(1);
    expect(context.body.executors[0].presence).toBe("online");
    expect(context.body.executors[0].workspaces[0].workspace_id).toBe(WORKSPACE_ID);
    expect(context.body.requested_shell).toBe(true);
    expect(context.body.requested_web).toBe(true);

    // Approve creates the connection + membership + one-minute code.
    const approve = await testApp.agent.post("/oauth/consent/approve")
      .set("x-csrf-token", csrf)
      .send({
        ...oauthParams,
        sessionId,
        machines: [{ executor_id: claim.executorId, workspace_id: WORKSPACE_ID, scope: "read_write" }],
        approved_scope: "kazibee:read kazibee:write kazibee:shell kazibee:web",
      });
    expect(approve.status, JSON.stringify(approve.body)).toBe(200);
    const redirect = new URL(approve.body.redirect_to as string);
    expect(redirect.origin + redirect.pathname).toBe(REDIRECT_URI);
    expect(redirect.searchParams.get("state")).toBe("st_12345");
    expect(redirect.searchParams.get("iss")).toBe(MCP_ORIGIN);
    const code = redirect.searchParams.get("code")!;
    expect(code.length).toBeGreaterThan(20);

    // Token exchange with the PKCE verifier (satellite endpoint; service-level).
    const flow = getContainer().get(OAuthFlowService) as OAuthFlowService;
    const tokens = await flow.exchangeCode({
      code,
      codeVerifier: verifier,
      clientId,
      redirectUri: REDIRECT_URI,
      resource: RESOURCE,
    });
    expect(tokens.ok, JSON.stringify(tokens)).toBe(true);
    if (!tokens.ok) return;
    expect(tokens.scope).toBe("kazibee:read kazibee:write kazibee:shell kazibee:web");

    // Code replay dies.
    const replay = await flow.exchangeCode({
      code, codeVerifier: verifier, clientId, redirectUri: REDIRECT_URI, resource: RESOURCE,
    });
    expect(replay.ok).toBe(false);

    // The access token drives the MCP endpoint end to end.
    const call = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "read", arguments: { path: "readme.md" } },
      });
    expect(call.status, JSON.stringify(call.body)).toBe(200);
    expect(call.body.result.isError).toBe(false);
    expect(call.body.result.structuredContent.content).toBe("# OAuth demo");
    const dispatchedPayload = (coordinator.dispatched.at(-1) as { payload: { scopes: string[]; workspaceId: string } }).payload;
    expect(dispatchedPayload.scopes).toEqual(["workspace.read", "workspace.write", "shell.execute", "web.read", "browser.fetch"]);
    expect(dispatchedPayload.workspaceId).toBe(WORKSPACE_ID);

    // Workspace identity is server-minted: list_workspaces returns rws_ ids,
    // and addressing by that id dispatches with the machine-local id.
    const wsList = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_workspaces", arguments: {} } });
    expect(wsList.status).toBe(200);
    const remoteWorkspace = wsList.body.result.structuredContent.workspaces[0] as { workspaceId: string; name: string };
    expect(remoteWorkspace.workspaceId).toMatch(/^rws_[a-f0-9]{32}$/);

    const remoteRead = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({
        jsonrpc: "2.0", id: 6, method: "tools/call",
        params: { name: "read", arguments: { workspaceId: remoteWorkspace.workspaceId, path: "readme.md" } },
      });
    expect(remoteRead.status).toBe(200);
    expect(remoteRead.body.result.isError).toBe(false);
    const remoteDispatch = (coordinator.dispatched.at(-1) as { payload: { arguments: { workspaceId: string } } }).payload;
    expect(remoteDispatch.arguments.workspaceId).toBe(WORKSPACE_ID);

    // A second listing returns the same remote id (stable identity).
    const wsList2 = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "list_workspaces", arguments: {} } });
    expect(wsList2.body.result.structuredContent.workspaces[0].workspaceId).toBe(remoteWorkspace.workspaceId);

    // Gateway tools: the connection lists its machines with live presence,
    // and tools/list advertises list_machines alongside the executor set.
    const machines = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_machines", arguments: {} } });
    expect(machines.status).toBe(200);
    expect(machines.body.result.structuredContent.machines).toHaveLength(1);
    expect(machines.body.result.structuredContent.machines[0].machineId).toBe(claim.executorId);
    expect(machines.body.result.structuredContent.machines[0].presence).toBe("online");

    const toolList = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({ jsonrpc: "2.0", id: 4, method: "tools/list", params: {} });
    expect(toolList.status).toBe(200);
    expect((toolList.body.result.tools as Array<{ name: string }>).map((t) => t.name)).toContain("list_machines");

    // Refresh rotation works and the old refresh token dies.
    const refreshed = await flow.refresh({
      refreshToken: tokens.refresh_token, clientId, resource: RESOURCE,
    });
    expect(refreshed.ok).toBe(true);
    const reuse = await flow.refresh({
      refreshToken: tokens.refresh_token, clientId, resource: RESOURCE,
    });
    expect(reuse.ok).toBe(false);

    // Connection management: list, then revoke kills the token immediately.
    const listed = await testApp.agent.get("/v1/remote-tools/connections").query({ sessionId });
    expect(listed.status).toBe(200);
    expect(listed.body.connections).toHaveLength(1);
    const connectionId = listed.body.connections[0].connectionId as string;
    expect(listed.body.connections[0].members[0].executorId).toBe(claim.executorId);

    const revoked = await testApp.agent
      .post(`/v1/remote-tools/connections/${connectionId}/revoke`)
      .set("x-csrf-token", csrf)
      .query({ sessionId })
      .send({});
    expect(revoked.status).toBe(200);

    const dead = await testApp.agent.post("/v1/remote-tools/mcp")
      .set("authorization", `Bearer ${tokens.access_token}`)
      .send({ jsonrpc: "2.0", id: 2, method: "ping" });
    expect(dead.status).toBe(401);
    expect(dead.headers["www-authenticate"]).toContain("oauth-protected-resource");
  });
});
