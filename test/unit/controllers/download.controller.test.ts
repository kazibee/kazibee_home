import { describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import DownloadController from "../../../src/server/controller/download.controller";
import type DownloadLogic from "../../../src/server/logic/download.logic";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

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
  it("returns 400 for an invalid download kind without touching the logic layer", async () => {
    const createDownload = vi.fn();
    const controller = new DownloadController({ createDownload } as unknown as DownloadLogic);
    const res = fakeResponse();

    await controller.downloadItem({ req: requestFor({ kind: "service", version: "v1.0.0", item: "x.zip" }), res });

    expect(createDownload).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: true });
  });

  it("defaults missing version and item to empty strings and redirects on success", async () => {
    const createDownload = vi.fn(async () => ({ key: "cli//", url: "https://signed.example/dl" }));
    const controller = new DownloadController({ createDownload } as unknown as DownloadLogic);
    const res = fakeResponse();

    await controller.downloadItem({ req: requestFor({ kind: "cli" }), res });

    expect(createDownload).toHaveBeenCalledWith("cli", "", "");
    expect(res.statusCode).toBe(302);
    expect(res.redirectedTo).toBe("https://signed.example/dl");
  });

  it("maps NotFoundError to 404", async () => {
    const createDownload = vi.fn(async () => {
      throw new NotFoundError("Download item not found");
    });
    const controller = new DownloadController({ createDownload } as unknown as DownloadLogic);
    const res = fakeResponse();

    await controller.downloadItem({ req: requestFor({ kind: "cli", version: "v1.0.0", item: "x.zip" }), res });

    expect(res.statusCode).toBe(404);
  });
});

describe("DownloadController.listVersions", () => {
  it("returns 400 for an invalid download kind", async () => {
    const listVersions = vi.fn();
    const controller = new DownloadController({ listVersions } as unknown as DownloadLogic);
    const res = fakeResponse();

    await controller.listVersions({ req: requestFor({ kind: "nope" }), res });

    expect(listVersions).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("returns the versions listing for a valid kind", async () => {
    const listing = { versions: [] };
    const listVersions = vi.fn(async () => listing);
    const controller = new DownloadController({ listVersions } as unknown as DownloadLogic);
    const res = fakeResponse();

    await controller.listVersions({ req: requestFor({ kind: "app" }), res });

    expect(listVersions).toHaveBeenCalledWith("app");
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(listing);
  });
});
