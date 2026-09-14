/**
 * OAuth connections end to end through the original-config application.
 *
 * Migration from the legacy getTestApp helper: the case owns a FRESH
 * SQLStack fixture built from independently authored schema (no migrated template,
 * no process-global SqlStackDB registration, no DATABASE_URL or KAZI_*
 * process.env mutation, no resetContainer) and two per-case root testApps
 * over the same fixture URL:
 *
 * - the main site root (original noego.config.yml), selecting exactly the
 *   modules the flow drives: connect auth + executor claims, the OAuth
 *   consent surface and the remote-tools MCP/connection surface;
 * - the MCP satellite root (apps/mcp/noego.config.yml), replacing the former
 *   bare `createContainer()` + `registerAppSqlStack` service root: the
 *   satellite-only registration/token endpoints stay service-level, resolved
 *   from that satellite's own root over the same database.
 *
 * Deployment bindings (origins, dev coordinator origin, database URL) reach
 * each root through its replaced Env value only. The dev coordinator is a
 * plain local HTTP stub of the external executor endpoint; the browser cookie
 * jar the old supertest agent carried is replayed explicitly as the owner's
 * `cookie` header.
 */
import http from "node:http";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { testApp, type AppTestBuilder } from "@noego/app";
import { resourceCase } from "@noego/testing";
import { testPostgres } from "sqlstack/testing";
import { PRODUCT_ROOT, productFullSchema } from "../../schemas/product-full";
import Env from "../../../src/server/services/env";
import OAuthClientService from "../../../src/server/services/oauth_client_service";
import OAuthFlowService from "../../../src/server/services/oauth_flow_service";

const CONFIG = path.join(PRODUCT_ROOT, "noego.config.yml");
const MCP_CONFIG = path.join(PRODUCT_ROOT, "apps/mcp/noego.config.yml");
type App = Awaited<ReturnType<AppTestBuilder["build"]>>;
type Body = Record<string, any>;

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
const WEBSITE_ORIGIN = "https://web-test.kazibee.example.com";

/** Replaced Env value carrying this case's deployment bindings (plain data). */
const loadedEnv = (bindings: Record<string, string>) => () => {
  const value = new Env();
  value.load(bindings);
  return value;
};

function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const viaApi = headers.getSetCookie?.();
  if (viaApi && viaApi.length > 0) return viaApi;
  const single = headers.get("set-cookie");
  return single ? single.split(/,(?=\s*[A-Za-z0-9_]+=)/).map((value) => value.trim()) : [];
}

function cookieValue(cookies: string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.slice(name.length + 1).split(";")[0];
}

const json = (response: Response) => response.json() as Promise<Body>;

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

async function seedOwnedExecutor(app: App) {
  const created = await app.request({
    method: "POST",
    path: "/v1/connect/executors/claims",
    headers: { "x-kazi-bootstrap-token": bootstrapToken },
    body: claim,
  });
  const createdBody = await json(created);
  expect(created.status, JSON.stringify(createdBody)).toBe(201);

  const signup = await app.request({
    method: "POST", path: "/v1/connect/auth/signup", body: {
      kind: "auth.signup.request", protocolVersion: "1.0",
      email: "shavyg2@gmail.com",
      username: "oauth.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_oauth_signup_owner_1", correlationId: "cor_oauthsignup",
    },
  });
  const signupBody = await json(signup);
  expect(signup.status, JSON.stringify(signupBody)).toBe(201);
  const login = await app.request({
    method: "POST", path: "/v1/connect/auth/login", body: {
      kind: "auth.login.request", protocolVersion: "1.0",
      username: "oauth.owner", password: "correct horse battery staple",
      idempotencyKey: "idem_oauth_login_owner_1", correlationId: "cor_oauthlogin1",
    },
  });
  const loginBody = await json(login);
  expect(login.status, JSON.stringify(loginBody)).toBe(200);
  const cookies = setCookies(login);
  const csrf = cookieValue(cookies, "kazi_connect_csrf");
  const sessionId = loginBody.sessionId as string;
  // The browser session the old supertest agent replayed on every request.
  const cookie = `kazi_connect_session=${cookieValue(cookies, "kazi_connect_session")}; kazi_connect_csrf=${csrf}`;

  const decision = await app.request({
    method: "POST",
    path: `/v1/connect/executors/claims/${claim.claimId}/decision`,
    headers: { cookie, "x-csrf-token": csrf },
    body: {
      kind: "executor.claim.decision.request", protocolVersion: "1.0",
      claimId: claim.claimId, sessionId,
      actorRole: "browser_session", decision: "accept",
      idempotencyKey: "idem_oauth_accept_claim_1", correlationId: "cor_oauthaccept",
    },
  });
  const decisionBody = await json(decision);
  expect(decision.status, JSON.stringify(decisionBody)).toBe(200);
  return { csrf, sessionId, cookie };
}

describe("OAuth connections end to end", () => {
  it("runs register -> consent -> code -> token -> MCP call -> revoke", resourceCase(async (scope) => {
    const fixture = await testPostgres(productFullSchema(), { sourceDir: PRODUCT_ROOT }).build();
    const coordinator = await startCoordinatorStub();
    scope.own({ dispose: () => coordinator.close() }, "coordinator-stub");
    const bindings = {
      DATABASE_URL: fixture.url,
      KAZI_MCP_ORIGIN: MCP_ORIGIN,
      KAZI_WEBSITE_ORIGIN: WEBSITE_ORIGIN,
      KAZIBEE_DEV_COORDINATOR_ORIGIN: coordinator.origin,
    };
    const app = await testApp(CONFIG)
      .select({ server: { module: ["connectAuth", "connectExecutors", "oauthAuthorization", "remoteTools"] } })
      .function(Env, loadedEnv(bindings))
      .build();
    // Satellite service calls own a root with the same test database.
    const satellite = await testApp(MCP_CONFIG)
      .select({ server: { module: ["oauth", "mcp"] } })
      .function(Env, loadedEnv(bindings))
      .build();

    const owner = await seedOwnedExecutor(app);
    const asOwner = (headers: Record<string, string> = {}) => ({ cookie: owner.cookie, ...headers });
    const mcp = (id: number, method: string, params: Record<string, unknown>, accessToken: string) =>
      app.request({
        method: "POST",
        path: "/v1/remote-tools/mcp",
        headers: asOwner({ authorization: `Bearer ${accessToken}` }),
        body: { jsonrpc: "2.0", id, method, params },
      });

    // Dynamic client registration (satellite endpoint; service-level here).
    const clients = await satellite.get<OAuthClientService>(OAuthClientService);
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
    const shell = await app.request({
      method: "GET", path: "/oauth/authorize", query: oauthParams, headers: asOwner(),
    });
    const shellText = await shell.text();
    expect(shell.status, shellText.slice(0, 200)).toBe(200);
    expect(shellText).toContain("Authorize access");

    // A tampered redirect URI never reaches the consent shell.
    const badRedirect = await app.request({
      method: "GET", path: "/oauth/authorize", headers: asOwner(),
      query: { ...oauthParams, redirect_uri: "https://evil.example.com/cb" },
    });
    expect(badRedirect.status).toBe(400);
    await badRedirect.body?.cancel();

    // Consent context lists the machine with live presence + workspaces.
    const context = await app.request({
      method: "GET", path: "/oauth/consent/context", headers: asOwner(),
      query: { ...oauthParams, sessionId: owner.sessionId },
    });
    const contextBody = await json(context);
    expect(context.status, JSON.stringify(contextBody)).toBe(200);
    expect(contextBody.executors).toHaveLength(1);
    expect(contextBody.executors[0].presence).toBe("online");
    expect(contextBody.executors[0].workspaces[0].workspace_id).toBe(WORKSPACE_ID);
    expect(contextBody.requested_shell).toBe(true);
    expect(contextBody.requested_web).toBe(true);

    // Approve creates the owner-scoped connection and one-minute code.
    const approve = await app.request({
      method: "POST", path: "/oauth/consent/approve",
      headers: asOwner({ "x-csrf-token": owner.csrf }),
      body: {
        ...oauthParams,
        sessionId: owner.sessionId,
        approved_scope: "kazibee:read kazibee:write kazibee:shell kazibee:web",
      },
    });
    const approveBody = await json(approve);
    expect(approve.status, JSON.stringify(approveBody)).toBe(200);
    const redirect = new URL(approveBody.redirect_to as string);
    expect(redirect.origin + redirect.pathname).toBe(REDIRECT_URI);
    expect(redirect.searchParams.get("state")).toBe("st_12345");
    expect(redirect.searchParams.get("iss")).toBe(MCP_ORIGIN);
    const code = redirect.searchParams.get("code")!;
    expect(code.length).toBeGreaterThan(20);

    // Token exchange with the PKCE verifier (satellite endpoint; service-level).
    const flow = await satellite.get<OAuthFlowService>(OAuthFlowService);
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

    // The access token drives an unbound MCP call end to end.
    const call = await mcp(1, "tools/call", { name: "read", arguments: { path: "readme.md" } }, tokens.access_token);
    const callBody = await json(call);
    expect(call.status, JSON.stringify(callBody)).toBe(200);
    expect(callBody.result.isError).toBe(false);
    expect(callBody.result.structuredContent.content).toBe("# OAuth demo");
    const dispatchedPayload = (coordinator.dispatched.at(-1) as { payload: { scopes: string[]; workspaceId: string } }).payload;
    expect(dispatchedPayload.scopes).toEqual(["workspace.read", "workspace.write", "shell.execute", "web.read", "browser.fetch"]);
    expect(dispatchedPayload.workspaceId).toBe("*");

    // Workspace identity is server-minted: list_workspaces returns rws_ ids,
    // and addressing by that id dispatches with the machine-local id.
    const wsList = await mcp(5, "tools/call", { name: "list_workspaces", arguments: {} }, tokens.access_token);
    const wsListBody = await json(wsList);
    expect(wsList.status).toBe(200);
    const remoteWorkspace = wsListBody.result.structuredContent.workspaces[0] as { workspaceId: string; name: string };
    expect(remoteWorkspace.workspaceId).toMatch(/^rws_[a-f0-9]{32}$/);

    const remoteRead = await mcp(6, "tools/call", {
      name: "read", arguments: { workspaceId: remoteWorkspace.workspaceId, path: "readme.md" },
    }, tokens.access_token);
    const remoteReadBody = await json(remoteRead);
    expect(remoteRead.status).toBe(200);
    expect(remoteReadBody.result.isError).toBe(false);
    const remoteDispatch = (coordinator.dispatched.at(-1) as { payload: { arguments: { workspaceId: string } } }).payload;
    expect(remoteDispatch.arguments.workspaceId).toBe(WORKSPACE_ID);

    // A second listing returns the same remote id (stable identity).
    const wsList2 = await mcp(7, "tools/call", { name: "list_workspaces", arguments: {} }, tokens.access_token);
    const wsList2Body = await json(wsList2);
    expect(wsList2Body.result.structuredContent.workspaces[0].workspaceId).toBe(remoteWorkspace.workspaceId);

    // Gateway tools: the connection lists its machines with live presence,
    // and tools/list advertises list_machines alongside the executor set.
    const machines = await mcp(3, "tools/call", { name: "list_machines", arguments: {} }, tokens.access_token);
    const machinesBody = await json(machines);
    expect(machines.status).toBe(200);
    expect(machinesBody.result.structuredContent.machines).toHaveLength(1);
    expect(machinesBody.result.structuredContent.machines[0].machineId).toBe(claim.executorId);
    expect(machinesBody.result.structuredContent.machines[0].presence).toBe("online");

    const toolList = await mcp(4, "tools/list", {}, tokens.access_token);
    const toolListBody = await json(toolList);
    expect(toolList.status).toBe(200);
    expect((toolListBody.result.tools as Array<{ name: string }>).map((t) => t.name)).toContain("list_machines");

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
    const listed = await app.request({
      method: "GET", path: "/v1/remote-tools/connections",
      query: { sessionId: owner.sessionId }, headers: asOwner(),
    });
    const listedBody = await json(listed);
    expect(listed.status).toBe(200);
    expect(listedBody.connections).toHaveLength(1);
    const connectionId = listedBody.connections[0].connectionId as string;
    expect(listedBody.connections[0].members[0].executorId).toBe(claim.executorId);

    const revoked = await app.request({
      method: "POST",
      path: `/v1/remote-tools/connections/${connectionId}/revoke`,
      headers: asOwner({ "x-csrf-token": owner.csrf }),
      query: { sessionId: owner.sessionId },
      body: {},
    });
    expect(revoked.status).toBe(200);
    await revoked.body?.cancel();

    const dead = await mcp(2, "ping", {}, tokens.access_token);
    expect(dead.status).toBe(401);
    expect(dead.headers.get("www-authenticate")).toContain("oauth-protected-resource");
    await dead.body?.cancel();
  }));
});
