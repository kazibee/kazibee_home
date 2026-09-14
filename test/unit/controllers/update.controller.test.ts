/**
 * UpdateController direct method behavior, driven against the production
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
import UpdateController from "../../../src/server/controller/update.controller";
import UpdateLogic from "../../../src/server/logic/update.logic";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    redirectedTo: undefined as string | undefined,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
    redirect(code: number, url: string) {
      this.statusCode = code;
      this.redirectedTo = url;
      return this;
    },
  };
  return res as typeof res & Response;
}

function requestFor(arch: string | undefined) {
  return { params: { arch } } as unknown as Request;
}

describe("UpdateController.releasesFeed", () => {
  it("returns the feed for a valid arch", resourceCase(async () => {
    const feed = { currentRelease: "1.4.2", releases: [] };
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } })
      .method(UpdateLogic, "createFeed", control.returns(Promise.resolve(feed)))
      .build();
    const controller = await env.dinner.controller(UpdateController);
    const res = fakeResponse();

    await controller.releasesFeed({ req: requestFor("arm64"), res });

    expect(control.inspect(env, UpdateLogic, "createFeed").calls.map((call) => call.args)).toEqual([["arm64"]]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(feed);
  }));

  it("returns 400 for an invalid arch", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } })
      .method(UpdateLogic, "createFeed", control.never())
      .build();
    const controller = await env.dinner.controller(UpdateController);
    const res = fakeResponse();

    await controller.releasesFeed({ req: requestFor("ia32"), res });

    await env.verify();
    expect(res.statusCode).toBe(400);
  }));

  it("maps NotFoundError to 404", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } })
      .method(UpdateLogic, "createFeed", control.throws(new NotFoundError("No app releases available")))
      .build();
    const controller = await env.dinner.controller(UpdateController);
    const res = fakeResponse();

    await controller.releasesFeed({ req: requestFor("arm64"), res });

    expect(res.statusCode).toBe(404);
  }));
});

describe("UpdateController.windowsReleases", () => {
  it("returns 400 for an invalid arch without touching the logic layer", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } })
      .method(UpdateLogic, "createWindowsReleases", control.never())
      .build();
    const controller = await env.dinner.controller(UpdateController);
    const res = fakeResponse();

    await controller.windowsReleases({ req: requestFor("ia32"), res });

    await env.verify();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: true });
  }));
});

describe("UpdateController.windowsPackage", () => {
  it("returns 400 for an invalid arch without touching the logic layer", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } })
      .method(UpdateLogic, "createWindowsPackageDownload", control.never())
      .build();
    const controller = await env.dinner.controller(UpdateController);
    const res = fakeResponse();

    await controller.windowsPackage({
      req: { params: { arch: "ia32", file: "Kazibee-full.nupkg" } } as unknown as Request,
      res,
    });

    await env.verify();
    expect(res.statusCode).toBe(400);
  }));

  it("defaults a missing file param to an empty string and redirects on success", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["updates"] } })
      .method(UpdateLogic, "createWindowsPackageDownload", control.returns(Promise.resolve("https://signed.example/pkg.nupkg")))
      .build();
    const controller = await env.dinner.controller(UpdateController);
    const res = fakeResponse();

    await controller.windowsPackage({ req: requestFor("x64"), res });

    expect(control.inspect(env, UpdateLogic, "createWindowsPackageDownload").calls.map((call) => call.args)).toEqual([["x64", ""]]);
    expect(res.statusCode).toBe(302);
    expect(res.redirectedTo).toBe("https://signed.example/pkg.nupkg");
  }));
});
