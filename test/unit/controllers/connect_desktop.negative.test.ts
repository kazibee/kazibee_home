/**
 * Remaining negative HTTP branches of ConnectDesktopController, driven
 * directly against the production controller resolved from root testApp over
 * the original configuration (../../../noego.config.yml): the real parser and
 * policy run; the browser actor resolution and logic boundary are replaced
 * through singular .method controls. Hand-built CompatRequest/CompatResponse
 * fakes are handed straight to the controller methods — no server, no
 * database. resourceCase owns environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { test as control, testStub, resourceCase } from "@noego/testing";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectDesktopController from "../../../src/server/controller/connect_desktop.controller";
import ConnectDesktopLogic from "../../../src/server/logic/connect_desktop.logic";
import ConnectDesktopActorResolver from "../../../src/server/services/connect_desktop_actor_resolver";
import type { ActorResolution, ConnectDesktopActor } from "../../../src/server/services/connect_desktop_actor_resolver";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

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

// Browser actor resolution replacement description (immutable), not an
// application constructor: the resolution is fixed per case.
const actors = (resolution: ActorResolution = { ok: true, actor: browserActor }) => testStub()
  .method(ConnectDesktopActorResolver, "browser", control.returns(Promise.resolve(resolution)));
const unauthorized: ActorResolution = { ok: false, reason: "unauthorized" };
const csrf: ActorResolution = { ok: false, reason: "csrf" };

const build = (resolution?: ActorResolution) =>
  testApp(CONFIG).select({ server: { module: ["connectDesktops"] } }).use(actors(resolution));

describe("claimStatus envelope validation", () => {
  it("rejects a malformed claimId path with a 400 and the query correlation id", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.claimStatus({
      req: requestFor({ params: { claimId: "nope" }, query: { correlationId: CORRELATION } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: CORRELATION });
  }));
});

describe("reviewClaim envelope and lookup validation", () => {
  it("rejects a malformed browser query before touching the lookup", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.reviewClaim({
      req: requestFor({ params: { lookup: CLAIM_ID }, query: { sessionId: SESSION_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
  }));

  it("rejects an unparseable lookup with a 400 carrying the query correlation id", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.reviewClaim({
      req: requestFor({ params: { lookup: "not-a-claim-or-code" }, query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: CORRELATION });
  }));
});

describe("list auth failure", () => {
  it("maps an unauthorized session onto a uniform 401", resourceCase(async () => {
    const env = await build(unauthorized).build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.list({ req: requestFor({ query: browserQuery }), res });
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: "revoked", correlationId: CORRELATION });
  }));
});

describe("detail negative branches", () => {
  it("rejects a malformed browser query with a 400", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.detail({
      req: requestFor({ params: { deviceId: DEVICE_ID }, query: { sessionId: SESSION_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
  }));

  it("maps an auth failure onto a 401 before the logic runs", resourceCase(async () => {
    const env = await build(unauthorized)
      .method(ConnectDesktopLogic, "detail", control.never())
      .build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.detail({ req: requestFor({ params: { deviceId: DEVICE_ID }, query: browserQuery }), res });
    expect(res.statusCode).toBe(401);
    await env.verify();
  }));

  it("treats a missing deviceId path segment as an empty lookup", resourceCase(async () => {
    const env = await build()
      .method(ConnectDesktopLogic, "detail", control.returns(Promise.resolve({ outcome: "not-found" })))
      .build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.detail({
      req: requestFor({ params: {}, query: browserQuery }), res,
    });
    expect(control.inspect(env, ConnectDesktopLogic, "detail").calls.map((call) => call.args))
      .toEqual([[browserActor, ""]]);
    expect(res.statusCode).toBe(404);
  }));
});

describe("rename negative branches", () => {
  it("rejects a malformed body with a 400 before the query is read", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.rename({
      req: requestFor({ body: { nonsense: true }, params: { deviceId: DEVICE_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
  }));

  it("rejects a valid body with a malformed browser query", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.rename({
      req: requestFor({
        body: renameBody, params: { deviceId: DEVICE_ID }, query: { sessionId: SESSION_ID },
      }), res,
    });
    expect(res.statusCode).toBe(400);
  }));

  it("maps a csrf auth failure onto a 403", resourceCase(async () => {
    const env = await build(csrf).build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.rename({
      req: requestFor({ body: renameBody, params: { deviceId: DEVICE_ID }, query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ code: "invalid-envelope", message: "CSRF validation failed" });
  }));
});

describe("revoke negative branches", () => {
  it("rejects a malformed body with a 400 before the query is read", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.revoke({
      req: requestFor({ body: { nonsense: true }, params: { deviceId: DEVICE_ID } }), res,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid-envelope", correlationId: "cor_invalid000" });
  }));

  it("rejects a valid body with a malformed browser query", resourceCase(async () => {
    const env = await build().build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.revoke({
      req: requestFor({
        body: revokeBody, params: { deviceId: DEVICE_ID }, query: { sessionId: SESSION_ID },
      }), res,
    });
    expect(res.statusCode).toBe(400);
  }));

  it("maps an unauthorized session onto a 401 before the logic runs", resourceCase(async () => {
    const env = await build(unauthorized)
      .method(ConnectDesktopLogic, "revoke", control.never())
      .build();
    const controller = await env.dinner.controller(ConnectDesktopController);
    const res = fakeResponse();
    await controller.revoke({
      req: requestFor({ body: revokeBody, params: { deviceId: DEVICE_ID }, query: browserQuery }), res,
    });
    expect(res.statusCode).toBe(401);
    await env.verify();
  }));
});
