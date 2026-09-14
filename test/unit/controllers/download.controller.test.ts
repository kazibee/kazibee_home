/**
 * DownloadController direct method behavior, driven against the production
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
import DownloadController from "../../../src/server/controller/download.controller";
import DownloadLogic from "../../../src/server/logic/download.logic";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    redirectedTo: undefined as string | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
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

function requestFor(params: Record<string, string | undefined>) {
  return { params } as unknown as Request;
}

describe("DownloadController.downloadItem", () => {
  it("returns 400 for an invalid download kind without touching the logic layer", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } })
      .method(DownloadLogic, "createDownload", control.never())
      .build();
    const controller = await env.dinner.controller(DownloadController);
    const res = fakeResponse();

    await controller.downloadItem({ req: requestFor({ kind: "service", version: "v1.0.0", item: "x.zip" }), res });

    await env.verify();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: true });
  }));

  it("defaults missing version and item to empty strings and redirects on success", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } })
      .method(DownloadLogic, "createDownload", control.returns(Promise.resolve({ key: "cli//", url: "https://signed.example/dl" })))
      .build();
    const controller = await env.dinner.controller(DownloadController);
    const res = fakeResponse();

    await controller.downloadItem({ req: requestFor({ kind: "cli" }), res });

    expect(control.inspect(env, DownloadLogic, "createDownload").calls.map((call) => call.args)).toEqual([["cli", "", ""]]);
    expect(res.statusCode).toBe(302);
    expect(res.redirectedTo).toBe("https://signed.example/dl");
  }));

  it("maps NotFoundError to 404", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } })
      .method(DownloadLogic, "createDownload", control.throws(new NotFoundError("Download item not found")))
      .build();
    const controller = await env.dinner.controller(DownloadController);
    const res = fakeResponse();

    await controller.downloadItem({ req: requestFor({ kind: "cli", version: "v1.0.0", item: "x.zip" }), res });

    expect(res.statusCode).toBe(404);
  }));
});

describe("DownloadController.listVersions", () => {
  it("returns 400 for an invalid download kind", resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } })
      .method(DownloadLogic, "listVersions", control.never())
      .build();
    const controller = await env.dinner.controller(DownloadController);
    const res = fakeResponse();

    await controller.listVersions({ req: requestFor({ kind: "nope" }), res });

    await env.verify();
    expect(res.statusCode).toBe(400);
  }));

  it("returns the versions listing for a valid kind", resourceCase(async () => {
    const listing = { versions: [] };
    const env = await testApp(CONFIG).select({ server: { module: ["downloads"] } })
      .method(DownloadLogic, "listVersions", control.returns(Promise.resolve(listing)))
      .build();
    const controller = await env.dinner.controller(DownloadController);
    const res = fakeResponse();

    await controller.listVersions({ req: requestFor({ kind: "app" }), res });

    expect(control.inspect(env, DownloadLogic, "listVersions").calls.map((call) => call.args)).toEqual([["app"]]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(listing);
  }));
});
