/**
 * Direct unit coverage for the small pure helpers of the OAuth module:
 * scope-string mapping (oauth_scopes), resource-tag checks
 * (oauth_flow_service.tokenMatchesResource), and the body/param coercion
 * helpers of the two OAuth controllers (fields()/recordString()/
 * bodySelections() non-object arms), exercised through plain controller
 * instances with hand-rolled fakes. No server, no database, no IoC.
 */
import { describe, it, expect } from "vitest";
import {
  connectionScopeToOAuthScope,
  grantScopeAllows,
} from "../../../src/server/services/oauth_scopes";
import { tokenMatchesResource } from "../../../src/server/services/oauth_flow_service";
import OAuthController from "../../../src/server/controller/oauth.controller";
import OAuthAuthorizeController from "../../../src/server/controller/oauth_authorize.controller";

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
    expect(tokenMatchesResource("too short", "https://mcp.kazibee.com/mcp")).toBe(false);
    expect(tokenMatchesResource("A".repeat(48), "")).toBe(false);
    // Well-shaped but bound to a different audience.
    expect(tokenMatchesResource("A".repeat(48), "https://mcp.kazibee.com/mcp")).toBe(false);
  });
});

describe("OAuthController.fields() body coercion arms", () => {
  const flow = {
    exchangeCode: async () => ({ ok: false as const, error: "invalid_grant" as const }),
    refresh: async () => ({ ok: false as const, error: "invalid_grant" as const }),
  };
  const clients = {
    registerClient: async () => ({ ok: false as const, error: "invalid_client_metadata" as const }),
  };
  const origins = { resource: "r", issuer: "i", authorizationEndpoint: "a" };
  const controller = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new OAuthController(flow as any, clients as any, origins as any);

  it("parses a URLSearchParams body", async () => {
    const { res, out } = fakeRes();
    await controller().token({
      req: { body: new URLSearchParams({ grant_type: "bogus" }) },
      res,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(out.status).toBe(400);
    expect(out.json).toEqual({ error: "unsupported_grant_type" });
  });

  it("parses a raw urlencoded string body", async () => {
    const { res, out } = fakeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await controller().token({ req: { body: "grant_type=bogus" }, res } as any);
    expect(out.status).toBe(400);
    expect(out.json).toEqual({ error: "unsupported_grant_type" });
  });

  it("treats an array or missing body as empty fields (invalid_request)", async () => {
    for (const body of [["grant_type=bogus"], undefined]) {
      const { res, out } = fakeRes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller().token({ req: { body }, res } as any);
      expect(out.status).toBe(400);
      expect(out.json).toEqual({ error: "invalid_request" });
    }
  });

  it("register echoes the submitted metadata when the stored record has none", async () => {
    const stubClients = {
      registerClient: async () => ({
        ok: true as const,
        client: { client_id: "oac_x", metadata: null },
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = new OAuthController(flow as any, stubClients as any, origins as any);
    const { res, out } = fakeRes();
    await c.register({
      req: { body: { client_name: "N", redirect_uris: ["https://x.example/cb"] } },
      res,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(out.status).toBe(201);
    expect(out.json).toEqual({
      client_name: "N",
      redirect_uris: ["https://x.example/cb"],
      client_id: "oac_x",
    });
  });
});

describe("OAuthAuthorizeController body coercion arms", () => {
  it("a non-object body yields an empty sessionId and empty selections", async () => {
    const seen: { selections?: unknown } = {};
    const oauth = {
      approve: async (
        _userId: string,
        _params: unknown,
        selections: unknown,
      ) => {
        seen.selections = selections;
        return { ok: false as const, error: "invalid_request" as const, message: "nope" };
      },
    };
    const actors = {
      browser: async (_req: unknown, sessionId: string) => {
        expect(sessionId).toBe("");
        return { ok: true as const, actor: { userId: "usr_1" } };
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new OAuthAuthorizeController(oauth as any, actors as any);
    const { res, out } = fakeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await controller.approve({ req: { body: "raw-string-body" }, res } as any);
    expect(seen.selections).toEqual([]);
    expect(out.status).toBe(400);
    expect(out.json).toEqual({ error: "invalid_request", message: "nope" });
  });

  it("an unauthenticated deny with no body is a 401 without touching the service", async () => {
    const oauth = { deny: async () => { throw new Error("must not be called"); } };
    const actors = {
      browser: async () => ({ ok: false as const, reason: "unauthorized" as const }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new OAuthAuthorizeController(oauth as any, actors as any);
    const { res, out } = fakeRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await controller.deny({ req: {}, res } as any);
    expect(out.status).toBe(401);
    expect(out.json).toEqual({ error: true, message: "Not signed in" });
  });
});
