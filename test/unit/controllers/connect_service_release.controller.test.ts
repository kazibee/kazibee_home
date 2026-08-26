import { describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectServiceReleaseController from "../../../src/server/controller/connect_service_release.controller";
import type ConnectServiceReleaseLogic from "../../../src/server/logic/connect_service_release.logic";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

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

function controllerWith(resolve: (...args: unknown[]) => Promise<unknown>) {
  return new ConnectServiceReleaseController({ resolve } as unknown as ConnectServiceReleaseLogic);
}

const VALID_BODY = { range: "^1.2.1", platform: "darwin", architecture: "arm64" };

describe("ConnectServiceReleaseController.resolve", () => {
  it("returns the candidate for a valid public request", async () => {
    const candidate = {
      releaseId: "rel_aaaaaaaa",
      version: "1.3.2",
      size: 1000,
      sha256: "a".repeat(64),
      revoked: false,
      url: "https://signed.example/v1.3.2/kazi-connect.tar.gz",
    };
    const resolve = vi.fn(async () => candidate);
    const res = fakeResponse();

    await controllerWith(resolve).resolve({ req: requestFor(VALID_BODY), res });

    expect(resolve).toHaveBeenCalledWith(VALID_BODY);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(candidate);
  });

  it("rejects malformed bodies with a closed 400 and never calls logic", async () => {
    const resolve = vi.fn();
    const bodies = [
      { ...VALID_BODY, extra: true },
      { range: ">=1.0.0", platform: "darwin", architecture: "arm64" },
      { range: "^1.2.1", platform: "linux", architecture: "arm64" },
      { range: "^1.2.1", platform: "darwin", architecture: "ia32" },
      undefined,
      "not-an-object",
    ];

    for (const body of bodies) {
      const res = fakeResponse();
      await controllerWith(resolve).resolve({ req: requestFor(body), res });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: true, code: "invalid-request" });
    }
    expect(resolve).not.toHaveBeenCalled();
  });

  it("maps the closed not-found to 404 with no artifact details", async () => {
    const resolve = vi.fn(async () => {
      throw new NotFoundError("No compatible service release");
    });
    const res = fakeResponse();

    await controllerWith(resolve).resolve({ req: requestFor(VALID_BODY), res });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: true, code: "no-compatible-release" });
  });

  it("maps unexpected errors to a closed 500", async () => {
    const resolve = vi.fn(async () => {
      throw new Error("s3 exploded");
    });
    const res = fakeResponse();

    await controllerWith(resolve).resolve({ req: requestFor(VALID_BODY), res });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: true, code: "internal-error" });
  });
});
