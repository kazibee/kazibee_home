/**
 * ConnectServiceReleaseController direct method behavior, driven against the
 * production controller resolved from root testApp over the original
 * configuration (../../../noego.config.yml). The logic boundary is replaced
 * through singular .method controls; hand-built CompatRequest/CompatResponse
 * fakes are handed straight to the controller method. resourceCase owns
 * environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { test as control, resourceCase } from "@noego/testing";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectServiceReleaseController from "../../../src/server/controller/connect_service_release.controller";
import ConnectServiceReleaseLogic from "../../../src/server/logic/connect_service_release.logic";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

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

function requestFor(body: unknown) {
  return { body } as unknown as Request;
}

const VALID_BODY = { range: "^1.2.1", platform: "darwin", architecture: "arm64" };

describe("ConnectServiceReleaseController.resolve", () => {
  it("returns the candidate for a valid public request", resourceCase(async () => {
    const candidate = {
      releaseId: "rel_aaaaaaaa",
      version: "1.3.2",
      size: 1000,
      sha256: "a".repeat(64),
      revoked: false,
      url: "https://signed.example/v1.3.2/kazi-connect.tar.gz",
    };
    const env = await testApp(CONFIG).select({ server: { module: ["connectServiceReleases"] } })
      .method(ConnectServiceReleaseLogic, "resolve", control.returns(Promise.resolve(candidate)))
      .build();
    const controller = await env.dinner.controller(ConnectServiceReleaseController);
    const res = fakeResponse();

    await controller.resolve({ req: requestFor(VALID_BODY), res });

    expect(control.inspect(env, ConnectServiceReleaseLogic, "resolve").calls.map((call) => call.args)).toEqual([[VALID_BODY]]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(candidate);
  }));

  it("rejects malformed bodies with a closed 400 and never calls logic", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectServiceReleases"] } })
      .method(ConnectServiceReleaseLogic, "resolve", control.never())
      .build();
    const bodies = [
      { ...VALID_BODY, extra: true },
      { range: ">=1.0.0", platform: "darwin", architecture: "arm64" },
      { range: "^1.2.1", platform: "linux", architecture: "arm64" },
      { range: "^1.2.1", platform: "darwin", architecture: "ia32" },
      undefined,
      "not-an-object",
    ];

    for (const body of bodies) {
      const controller = await env.dinner.controller(ConnectServiceReleaseController);
      const res = fakeResponse();
      await controller.resolve({ req: requestFor(body), res });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: true, code: "invalid-request" });
    }
    await env.verify();
  }));

  it("maps the closed not-found to 404 with no artifact details", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectServiceReleases"] } })
      .method(ConnectServiceReleaseLogic, "resolve", control.throws(new NotFoundError("No compatible service release")))
      .build();
    const controller = await env.dinner.controller(ConnectServiceReleaseController);
    const res = fakeResponse();

    await controller.resolve({ req: requestFor(VALID_BODY), res });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: true, code: "no-compatible-release" });
  }));

  it("maps unexpected errors to a closed 500", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectServiceReleases"] } })
      .method(ConnectServiceReleaseLogic, "resolve", control.throws(new Error("s3 exploded")))
      .build();
    const controller = await env.dinner.controller(ConnectServiceReleaseController);
    const res = fakeResponse();

    await controller.resolve({ req: requestFor(VALID_BODY), res });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: true, code: "internal-error" });
  }));
});
