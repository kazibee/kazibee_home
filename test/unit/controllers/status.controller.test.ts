/**
 * StatusController direct method behavior, driven against the production
 * controller resolved from root testApp over the original configuration
 * (../../../noego.config.yml). The logic boundary is replaced through
 * singular .method controls; hand-built CompatRequest/CompatResponse fakes
 * are handed straight to the controller methods. resourceCase owns
 * environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { test as control, resourceCase } from "@noego/testing";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import StatusController from "../../../src/server/controller/status.controller";
import StatusLogic from "../../../src/server/logic/status.logic";
import { GUEST_ACTOR } from "../../../src/server/types/actor";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as typeof res & Response;
}

describe("StatusController", () => {
  it("builds an authenticated actor from req.user for getStatus", resourceCase(async () => {
    const status = { ok: true };
    const env = await testApp(CONFIG).select({ server: { module: ["status"] } })
      .method(StatusLogic, "getStatus", control.returns(status))
      .build();
    const controller = await env.dinner.controller(StatusController);
    const res = fakeResponse();
    const req = { user: { id: 7, email: "owner@example.com", role: "owner" } } as unknown as Request;

    await controller.getStatus({ req, res });

    const getStatus = control.inspect(env, StatusLogic, "getStatus");
    expect(getStatus.count).toBe(1);
    const [actor] = getStatus.calls[0].args as unknown[];
    expect(actor).toMatchObject({ id: 7, email: "owner@example.com", isSystem: false });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(status);
  }));

  it("uses the guest actor and returns the database status for anonymous requests", resourceCase(async () => {
    const dbStatus = { database: "up" };
    const env = await testApp(CONFIG).select({ server: { module: ["status"] } })
      .method(StatusLogic, "getDatabaseStatus", control.returns(Promise.resolve(dbStatus)))
      .build();
    const controller = await env.dinner.controller(StatusController);
    const res = fakeResponse();

    await controller.getDatabaseStatus({ req: {} as unknown as Request, res });

    const getDatabaseStatus = control.inspect(env, StatusLogic, "getDatabaseStatus");
    expect(getDatabaseStatus.calls.map((call) => call.args)).toEqual([[GUEST_ACTOR]]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(dbStatus);
  }));
});
