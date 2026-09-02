/**
 * Remaining negative HTTP branches of ConnectDesktopController, driven with a
 * directly constructed controller (real parser + policy, fake actor resolver
 * and logic) and a captured fake response — no server, no database.
 */
import { describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectDesktopController from "../../../src/server/controller/connect_desktop.controller";
import ConnectDesktopRequestParser from "../../../src/server/services/connect_desktop_request_parser";
import ConnectDesktopPolicy from "../../../src/server/services/connect_desktop_policy";
import type ConnectDesktopLogic from "../../../src/server/logic/connect_desktop.logic";
import type ConnectDesktopActorResolver from "../../../src/server/services/connect_desktop_actor_resolver";
import type { ConnectDesktopActor } from "../../../src/server/services/connect_desktop_actor_resolver";

const SESSION_ID = "ses_fixed0001";
const CORRELATION = "cor_abcdefgh";
const DEVICE_ID = "dev_abcdefgh";
const CLAIM_ID = "clm_abcdefgh";
const IDEM = "idem_aaaaaaaaaaaaaaaa";
const browserQuery = { sessionId: SESSION_ID, correlationId: CORRELATION };
const browserActor: ConnectDesktopActor = {
  role: "browser_session", userId: "usr_owner001", sessionId: SESSION_ID,
};

const renameBody = {
  kind: "desktop.rename.request", protocolVersion: "1.0", deviceId: DEVICE_ID,
  displayName: "Renamed", idempotencyKey: IDEM, correlationId: CORRELATION,
};
const revokeBody = {
  kind: "desktop.action.request", protocolVersion: "1.0", deviceId: DEVICE_ID,
  action: "revoke", idempotencyKey: IDEM, correlationId: CORRELATION,
};

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  return res as typeof res & Response;
}

function requestFor(parts: Partial<Record<"body" | "query" | "params" | "headers", unknown>>) {
  return { body: {}, query: {}, params: {}, headers: {}, ...parts } as unknown as Request;
}

function controllerWith(options: {
  logic?: Record<string, unknown>;
  browser?: (...args: unknown[]) => Promise<unknown>;
} = {}) {
  const parser = new ConnectDesktopRequestParser(new ConnectDesktopPolicy());
  const actors = { browser: options.browser ?? vi.fn(async () => ({ ok: true, actor: browserActor })) };
  return new ConnectDesktopController(
    (options.logic ?? {}) as unknown as ConnectDesktopLogic,
    parser,
    actors as unknown as ConnectDesktopActorResolver,
  );
}

describe("claimStatus envelope validation", () => {
  it("rejects a malformed claimId path with a 400 and the query correlation id", async () => {
    const res = fakeResponse();
    await controllerWith().claimStatus({
      req: requestFor({ params: { claimId: "nope" }, query: { correlationId: CORRELATION } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: CORRELATION });
  });
});

describe("reviewClaim envelope and lookup validation", () => {
  it("rejects a malformed browser query before touching the lookup", async () => {
    const res = fakeResponse();
    await controllerWith().reviewClaim({
      req: requestFor({ params: { lookup: CLAIM_ID }, query: { sessionId: SESSION_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
  });

  it("rejects an unparseable lookup with a 400 carrying the query correlation id", async () => {
    const res = fakeResponse();
    await controllerWith().reviewClaim({
      req: requestFor({ params: { lookup: "not-a-claim-or-code" }, query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: CORRELATION });
  });
});

describe("list auth failure", () => {
  it("maps an unauthorized session onto a uniform 401", async () => {
    const res = fakeResponse();
    await controllerWith({ browser: vi.fn(async () => ({ ok: false, reason: "unauthorized" })) }).list({
      req: requestFor({ query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: "revoked", correlationId: CORRELATION });
  });
});

describe("detail negative branches", () => {
  it("rejects a malformed browser query with a 400", async () => {
    const res = fakeResponse();
    await controllerWith().detail({
      req: requestFor({ params: { deviceId: DEVICE_ID }, query: { sessionId: SESSION_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
  });

  it("maps an auth failure onto a 401 before the logic runs", async () => {
    const detail = vi.fn();
    const res = fakeResponse();
    await controllerWith({
      logic: { detail },
      browser: vi.fn(async () => ({ ok: false, reason: "unauthorized" })),
    }).detail({ req: requestFor({ params: { deviceId: DEVICE_ID }, query: browserQuery }), res });
    expect(res.statusCode).toBe(401);
    expect(detail).not.toHaveBeenCalled();
  });

  it("treats a missing deviceId path segment as an empty lookup", async () => {
    const detail = vi.fn(async () => ({ outcome: "not-found" }));
    const res = fakeResponse();
    await controllerWith({ logic: { detail } }).detail({
      req: requestFor({ params: {}, query: browserQuery }), res,
    });
    expect(detail).toHaveBeenCalledWith(browserActor, "");
    expect(res.statusCode).toBe(404);
  });
});

describe("rename negative branches", () => {
  it("rejects a malformed body with a 400 before the query is read", async () => {
    const res = fakeResponse();
    await controllerWith().rename({
      req: requestFor({ body: { nonsense: true }, params: { deviceId: DEVICE_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
  });

  it("rejects a valid body with a malformed browser query", async () => {
    const res = fakeResponse();
    await controllerWith().rename({
      req: requestFor({
        body: renameBody, params: { deviceId: DEVICE_ID }, query: { sessionId: SESSION_ID },
      }), res,
    });
    expect(res.statusCode).toBe(400);
  });

  it("maps a csrf auth failure onto a 403", async () => {
    const res = fakeResponse();
    await controllerWith({ browser: vi.fn(async () => ({ ok: false, reason: "csrf" })) }).rename({
      req: requestFor({ body: renameBody, params: { deviceId: DEVICE_ID }, query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ code: "invalid-envelope", message: "CSRF validation failed" });
  });
});

describe("revoke negative branches", () => {
  it("rejects a malformed body with a 400 before the query is read", async () => {
    const res = fakeResponse();
    await controllerWith().revoke({
      req: requestFor({ body: { nonsense: true }, params: { deviceId: DEVICE_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
  });

  it("rejects a valid body with a malformed browser query", async () => {
    const res = fakeResponse();
    await controllerWith().revoke({
      req: requestFor({
        body: revokeBody, params: { deviceId: DEVICE_ID }, query: { sessionId: SESSION_ID },
      }), res,
    });
    expect(res.statusCode).toBe(400);
  });

  it("maps an unauthorized session onto a 401 before the logic runs", async () => {
    const revoke = vi.fn();
    const res = fakeResponse();
    await controllerWith({
      logic: { revoke },
      browser: vi.fn(async () => ({ ok: false, reason: "unauthorized" })),
    }).revoke({
      req: requestFor({ body: revokeBody, params: { deviceId: DEVICE_ID }, query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(401);
    expect(revoke).not.toHaveBeenCalled();
  });
});
