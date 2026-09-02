import { describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import UpdateController from "../../../src/server/controller/update.controller";
import type UpdateLogic from "../../../src/server/logic/update.logic";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

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
  it("returns the feed for a valid arch", async () => {
    const feed = { currentRelease: "1.4.2", releases: [] };
    const createFeed = vi.fn(async () => feed);
    const controller = new UpdateController({ createFeed } as unknown as UpdateLogic);
    const res = fakeResponse();

    await controller.releasesFeed({ req: requestFor("arm64"), res });

    expect(createFeed).toHaveBeenCalledWith("arm64");
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(feed);
  });

  it("returns 400 for an invalid arch", async () => {
    const createFeed = vi.fn();
    const controller = new UpdateController({ createFeed } as unknown as UpdateLogic);
    const res = fakeResponse();

    await controller.releasesFeed({ req: requestFor("ia32"), res });

    expect(createFeed).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("maps NotFoundError to 404", async () => {
    const createFeed = vi.fn(async () => {
      throw new NotFoundError("No app releases available");
    });
    const controller = new UpdateController({ createFeed } as unknown as UpdateLogic);
    const res = fakeResponse();

    await controller.releasesFeed({ req: requestFor("arm64"), res });

    expect(res.statusCode).toBe(404);
  });
});

describe("UpdateController.windowsReleases", () => {
  it("returns 400 for an invalid arch without touching the logic layer", async () => {
    const createWindowsReleases = vi.fn();
    const controller = new UpdateController({ createWindowsReleases } as unknown as UpdateLogic);
    const res = fakeResponse();

    await controller.windowsReleases({ req: requestFor("ia32"), res });

    expect(createWindowsReleases).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: true });
  });
});

describe("UpdateController.windowsPackage", () => {
  it("returns 400 for an invalid arch without touching the logic layer", async () => {
    const createWindowsPackageDownload = vi.fn();
    const controller = new UpdateController({ createWindowsPackageDownload } as unknown as UpdateLogic);
    const res = fakeResponse();

    await controller.windowsPackage({
      req: { params: { arch: "ia32", file: "Kazibee-full.nupkg" } } as unknown as Request,
      res,
    });

    expect(createWindowsPackageDownload).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("defaults a missing file param to an empty string and redirects on success", async () => {
    const createWindowsPackageDownload = vi.fn(async () => "https://signed.example/pkg.nupkg");
    const controller = new UpdateController({ createWindowsPackageDownload } as unknown as UpdateLogic);
    const res = fakeResponse();

    await controller.windowsPackage({ req: requestFor("x64"), res });

    expect(createWindowsPackageDownload).toHaveBeenCalledWith("x64", "");
    expect(res.statusCode).toBe(302);
    expect(res.redirectedTo).toBe("https://signed.example/pkg.nupkg");
  });
});
