/**
 * Direct unit coverage for the small helpers of the OAuth module:
 * scope-string mapping (oauth_scopes) and resource-tag checks
 * (oauth_flow_service.tokenMatchesResource) are pure exports exercised
 * directly; the body/param coercion helpers of the two OAuth controllers
 * (fields()/recordString()) are exercised through the real production
 * controllers resolved from root testApp — OAuthController over the original
 * MCP satellite configuration (apps/mcp/noego.config.yml, `oauth` module) and
 * OAuthAuthorizeController over the original Website configuration
 * (`oauthAuthorization` module). No server, no database; the flow / client /
 * authorize / actor-resolver boundaries are controlled through singular
 * method replacements on their actual tokens. resourceCase owns environment
 * cleanup.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import {
  connectionScopeToOAuthScope,
  grantScopeAllows,
} from "../../../src/server/services/oauth_scopes";
import OAuthFlowService, { tokenMatchesResource } from "../../../src/server/services/oauth_flow_service";
import OAuthClientService from "../../../src/server/services/oauth_client_service";
import OAuthAuthorizeService from "../../../src/server/services/oauth_authorize_service";
import ConnectExecutorActorResolver from "../../../src/server/services/connect_executor_actor_resolver";
import OAuthController from "../../../src/server/controller/oauth.controller";
import OAuthAuthorizeController from "../../../src/server/controller/oauth_authorize.controller";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const MCP_CONFIG = path.resolve(__dirname, "../../../apps/mcp/noego.config.yml");
const TOKEN_SELECT = { server: { module: ["oauth"] } } as const;
const AUTHORIZE_SELECT = { server: { module: ["oauthAuthorization"] } } as const;

/** Chainable response fake capturing the terminal payload. */
function fakeRes() {
  const out: { status?: number; json?: unknown; headers: Record<string, string> } = {
    headers: {},
  };
  const res = {
    status(code: number) { out.status = code; return res; },
    setHeader(name: string, value: string) { out.headers[name] = value; return res; },
    json(value: unknown) { out.json = value; return res; },
    send(value: unknown) { out.json = value; return res; },
    end() { return res; },
  };
  return { res, out };
}

describe("oauth_scopes remaining helpers", () => {
  it("connectionScopeToOAuthScope maps both member scopes onto wire strings", () => {
    expect(connectionScopeToOAuthScope("read")).toBe("kazibee:read");
    expect(connectionScopeToOAuthScope("read_write")).toBe("kazibee:read kazibee:write");
  });

  it("grantScopeAllows covers every family short-circuit arm", () => {
    const full = { access: "read_write", shell: true, web: true } as const;
    const none = { access: "read", shell: false, web: false } as const;
    // Everything within a full grant, including matching families.
    expect(grantScopeAllows(full, full)).toBe(true);
    expect(grantScopeAllows(full, none)).toBe(true);
    // An empty grant allows only an empty desire.
    expect(grantScopeAllows(none, none)).toBe(true);
    expect(grantScopeAllows(none, { ...none, web: true })).toBe(false);
    expect(grantScopeAllows(none, { ...none, shell: true })).toBe(false);
  });
});

describe("oauth_flow_service.tokenMatchesResource", () => {
  it("rejects malformed tokens and empty resources before any tag check", () => {
    expect(tokenMatchesResource("too short", "https://mcp-dev.kazibee.com/mcp")).toBe(false);
    expect(tokenMatchesResource("A".repeat(48), "")).toBe(false);
    // Well-shaped but bound to a different audience.
    expect(tokenMatchesResource("A".repeat(48), "https://mcp-dev.kazibee.com/mcp")).toBe(false);
  });
});

describe("OAuthController.fields() body coercion arms", () => {
  // Flow / client boundaries: singular method controls on the actual tokens.
  const boundaries = () => testStub()
    .method(OAuthFlowService, "exchangeCode",
      control.returns(Promise.resolve({ ok: false as const, error: "invalid_grant" as const })))
    .method(OAuthFlowService, "refresh",
      control.returns(Promise.resolve({ ok: false as const, error: "invalid_grant" as const })))
    .method(OAuthClientService, "registerClient",
      control.returns(Promise.resolve({ ok: false as const, error: "invalid_client_metadata" as const })));

  it("parses a URLSearchParams body", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(MCP_CONFIG).select(TOKEN_SELECT).use(boundaries()).build());
    const controller = await env.dinner.controller(OAuthController);
    const { res, out } = fakeRes();
    await controller.token({
      req: { body: new URLSearchParams({ grant_type: "bogus" }) },
      res,
    } as never);
    expect(out.status).toBe(400);
    expect(out.json).toEqual({ error: "unsupported_grant_type" });
  }));

  it("parses a raw urlencoded string body", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(MCP_CONFIG).select(TOKEN_SELECT).use(boundaries()).build());
    const controller = await env.dinner.controller(OAuthController);
    const { res, out } = fakeRes();
    await controller.token({ req: { body: "grant_type=bogus" }, res } as never);
    expect(out.status).toBe(400);
    expect(out.json).toEqual({ error: "unsupported_grant_type" });
  }));

  it("treats an array or missing body as empty fields (invalid_request)", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(MCP_CONFIG).select(TOKEN_SELECT).use(boundaries()).build());
    const controller = await env.dinner.controller(OAuthController);
    for (const body of [["grant_type=bogus"], undefined]) {
      const { res, out } = fakeRes();
      await controller.token({ req: { body }, res } as never);
      expect(out.status).toBe(400);
      expect(out.json).toEqual({ error: "invalid_request" });
    }
  }));

  it("register echoes the submitted metadata when the stored record has none", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(MCP_CONFIG).select(TOKEN_SELECT)
      .use(boundaries())
      .method(OAuthClientService, "registerClient", control.returns(Promise.resolve({
        ok: true as const,
        client: { client_id: "oac_x", metadata: null },
      })))
      .build());
    const c = await env.dinner.controller(OAuthController);
    const { res, out } = fakeRes();
    await c.register({
      req: { body: { client_name: "N", redirect_uris: ["https://x.example/cb"] } },
      res,
    } as never);
    expect(out.status).toBe(201);
    expect(out.json).toEqual({
      client_name: "N",
      redirect_uris: ["https://x.example/cb"],
      client_id: "oac_x",
    });
  }));
});

describe("OAuthAuthorizeController body coercion arms", () => {
  it("a non-object body yields an empty sessionId and approved scope", resourceCase(async (scope) => {
    const seen: { approvedScope?: unknown } = {};
    const env = scope.environment(await testApp(CONFIG).select(AUTHORIZE_SELECT)
      .method(OAuthAuthorizeService, "approve", control.watch(() => async (
        _userId: string,
        _params: unknown,
        approvedScope: unknown,
      ) => {
        seen.approvedScope = approvedScope;
        return { ok: false as const, error: "invalid_request" as const, message: "nope" };
      }))
      .method(ConnectExecutorActorResolver, "browser", control.watch(() => async (_req: unknown, sessionId: string) => {
        expect(sessionId).toBe("");
        return { ok: true as const, actor: { userId: "usr_1" } };
      }))
      .build());
    const controller = await env.dinner.controller(OAuthAuthorizeController);
    const { res, out } = fakeRes();
    await controller.approve({ req: { body: "raw-string-body" }, res } as never);
    expect(seen.approvedScope).toBe("");
    expect(out.status).toBe(400);
    expect(out.json).toEqual({ error: "invalid_request", message: "nope" });
  }));

  it("an unauthenticated deny with no body is a 401 without touching the service", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(AUTHORIZE_SELECT)
      .method(OAuthAuthorizeService, "deny", control.throws(new Error("must not be called")))
      .method(ConnectExecutorActorResolver, "browser",
        control.returns(Promise.resolve({ ok: false as const, reason: "unauthorized" as const })))
      .build());
    const controller = await env.dinner.controller(OAuthAuthorizeController);
    const { res, out } = fakeRes();
    await controller.deny({ req: {}, res } as never);
    expect(out.status).toBe(401);
    expect(out.json).toEqual({ error: true, message: "Not signed in" });
  }));
});
