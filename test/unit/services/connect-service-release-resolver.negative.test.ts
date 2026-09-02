/**
 * Remaining resolver failure branches: non-semantic dependency errors that
 * exhaust the bounded retry (presign and policy legs), non-Error throwables,
 * the expires-in fallback, and the controller's ValidationError mapping.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import type DownloadService from "../../../src/server/services/download_service";
import ConnectServiceReleaseResolver from "../../../src/server/services/connect_service_release_resolver";
import ConnectServiceReleaseController from "../../../src/server/controller/connect_service_release.controller";
import type ConnectServiceReleaseLogic from "../../../src/server/logic/connect_service_release.logic";
import { ValidationError } from "../../../src/server/errors/domain_errors";

const SHA = "a".repeat(64);
const REQUEST = { range: "^1.2.1", platform: "darwin", architecture: "arm64" } as const;
const EMPTY_POLICY = JSON.stringify({ schemaVersion: 1, revoked: [] });

function indexText(): string {
  return JSON.stringify({
    schemaVersion: 1,
    releases: [{
      releaseId: "rel_aaaaaaaa", version: "1.2.1", platform: "darwin", architecture: "arm64",
      artifact: "kazi-connect-1.2.1-darwin-arm64.tar.gz", size: 1000, sha256: SHA,
    }],
  });
}

function stubService(overrides: Partial<Record<"readItemText" | "readPolicyText" | "createDownload", unknown>>) {
  const base = {
    readItemText: vi.fn(async () => indexText()),
    readPolicyText: vi.fn(async () => EMPTY_POLICY),
    createDownload: vi.fn(async () => ({ key: "k", url: "https://signed.example/a.tar.gz" })),
    ...overrides,
  };
  return { service: base as unknown as DownloadService, ...base };
}

describe("resolver dependency failures that exhaust the retry", () => {
  afterEach(() => {
    delete process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS;
  });

  it("rethrows a persistent presign infrastructure failure (never a closed 404)", async () => {
    const createDownload = vi.fn().mockRejectedValue(new Error("s3 exploded"));
    const { service } = stubService({ createDownload });

    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toThrow("s3 exploded");
    expect(createDownload).toHaveBeenCalledTimes(2);
  });

  it("rethrows a persistent policy-read infrastructure failure", async () => {
    const readPolicyText = vi.fn().mockRejectedValue(new Error("socket hang up"));
    const { service } = stubService({ readPolicyText });

    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toThrow("socket hang up");
    expect(readPolicyText).toHaveBeenCalledTimes(2);
  });

  it("propagates a non-Error throwable and still retries it", async () => {
    const readItemText = vi.fn().mockRejectedValue("wire severed");
    const { service } = stubService({ readItemText });

    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toBe("wire severed");
    expect(readItemText).toHaveBeenCalledTimes(2);
  });

  it("falls back to a 300s presign expiry for an out-of-range configuration", async () => {
    process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS = "0";
    const { service, createDownload } = stubService({});
    await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(createDownload).toHaveBeenCalledWith(
      "service", "v1.2.1", "kazi-connect-1.2.1-darwin-arm64.tar.gz", { expiresIn: 300 },
    );
  });
});

describe("ConnectServiceReleaseController ValidationError mapping", () => {
  it("maps a logic ValidationError onto the closed 400", async () => {
    const resolve = vi.fn(async () => {
      throw new ValidationError("bad artifact reference");
    });
    const controller = new ConnectServiceReleaseController(
      { resolve } as unknown as ConnectServiceReleaseLogic,
    );
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { this.body = payload; return this; },
    };
    await controller.resolve({
      req: { body: { ...REQUEST } } as unknown as Request,
      res: res as typeof res & Response,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: true, code: "invalid-request" });
  });
});
