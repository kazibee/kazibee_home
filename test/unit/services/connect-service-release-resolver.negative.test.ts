/**
 * Remaining resolver failure branches over the original-config root testApp
 * (connectServiceReleases module, no server, no database): non-semantic
 * dependency errors that exhaust the bounded retry (presign and policy legs),
 * non-Error throwables, the expires-in fallback, and the controller's
 * ValidationError mapping. The resolver and controller are the real
 * production instances resolved from the built root; the DownloadService and
 * logic boundaries are controlled through singular method replacements on
 * their actual tokens and observed through the watched histories. The
 * expires-in case sets process.env before the root is built (the resolver
 * reads it at construction). resourceCase owns environment cleanup.
 */
import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub, type MethodDescriptor } from "@noego/testing";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import DownloadService from "../../../src/server/services/download_service";
import ConnectServiceReleaseResolver from "../../../src/server/services/connect_service_release_resolver";
import ConnectServiceReleaseController from "../../../src/server/controller/connect_service_release.controller";
import ConnectServiceReleaseLogic from "../../../src/server/logic/connect_service_release.logic";
import { ValidationError } from "../../../src/server/errors/domain_errors";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["connectServiceReleases"] } } as const;

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

// DownloadService boundary: a reusable replacement description (singular
// method controls on the actual token) with per-case descriptor overrides —
// not an application constructor.
function downloads(overrides: Partial<Record<"readItemText" | "readPolicyText" | "createDownload", MethodDescriptor>>) {
  const methods = {
    readItemText: control.returns(Promise.resolve(indexText())),
    readPolicyText: control.returns(Promise.resolve(EMPTY_POLICY)),
    createDownload: control.returns(Promise.resolve({ key: "k", url: "https://signed.example/a.tar.gz" })),
    ...overrides,
  };
  return testStub()
    .method(DownloadService, "readItemText", methods.readItemText)
    .method(DownloadService, "readPolicyText", methods.readPolicyText)
    .method(DownloadService, "createDownload", methods.createDownload);
}

describe("resolver dependency failures that exhaust the retry", () => {
  afterEach(() => {
    delete process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS;
  });

  it("rethrows a persistent presign infrastructure failure (never a closed 404)", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .use(downloads({ createDownload: control.throws(new Error("s3 exploded")) }))
      .build());
    const resolver = await env.get<ConnectServiceReleaseResolver>(ConnectServiceReleaseResolver);

    await expect(resolver.resolve(REQUEST))
      .rejects.toThrow("s3 exploded");
    expect(control.inspect(env, DownloadService, "createDownload").count).toBe(2);
  }));

  it("rethrows a persistent policy-read infrastructure failure", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .use(downloads({ readPolicyText: control.throws(new Error("socket hang up")) }))
      .build());
    const resolver = await env.get<ConnectServiceReleaseResolver>(ConnectServiceReleaseResolver);

    await expect(resolver.resolve(REQUEST))
      .rejects.toThrow("socket hang up");
    expect(control.inspect(env, DownloadService, "readPolicyText").count).toBe(2);
  }));

  it("propagates a non-Error throwable and still retries it", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .use(downloads({ readItemText: control.throws("wire severed") }))
      .build());
    const resolver = await env.get<ConnectServiceReleaseResolver>(ConnectServiceReleaseResolver);

    await expect(resolver.resolve(REQUEST))
      .rejects.toBe("wire severed");
    expect(control.inspect(env, DownloadService, "readItemText").count).toBe(2);
  }));

  it("falls back to a 300s presign expiry for an out-of-range configuration", resourceCase(async (scope) => {
    process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS = "0";
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads({})).build());
    const resolver = await env.get<ConnectServiceReleaseResolver>(ConnectServiceReleaseResolver);
    await resolver.resolve(REQUEST);
    expect(control.inspect(env, DownloadService, "createDownload").calls.map((call) => call.args)).toContainEqual([
      "service", "v1.2.1", "kazi-connect-1.2.1-darwin-arm64.tar.gz", { expiresIn: 300 },
    ]);
  }));
});

describe("ConnectServiceReleaseController ValidationError mapping", () => {
  it("maps a logic ValidationError onto the closed 400", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectServiceReleaseLogic, "resolve", control.throws(new ValidationError("bad artifact reference")))
      .build());
    const controller = await env.dinner.controller(ConnectServiceReleaseController);
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
  }));
});
