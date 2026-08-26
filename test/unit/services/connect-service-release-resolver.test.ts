import { afterEach, describe, expect, it, vi } from "vitest";
import type DownloadService from "../../../src/server/services/download_service";
import ConnectServiceReleaseResolver, {
  parseResolverIndex,
  parseRevocations,
  parseServiceReleaseResolveRequest,
  rangeSatisfied,
} from "../../../src/server/services/connect_service_release_resolver";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

const SHA = "a".repeat(64);

function release(overrides: Record<string, unknown> = {}) {
  return {
    releaseId: "rel_aaaaaaaa",
    version: "1.2.1",
    platform: "darwin",
    architecture: "arm64",
    artifact: "kazi-connect-1.2.1-darwin-arm64.tar.gz",
    size: 1000,
    sha256: SHA,
    ...overrides,
  };
}

function indexText(releases: unknown[]): string {
  return JSON.stringify({ schemaVersion: 1, releases });
}

/** `revocations` defaults to the ratified bootstrap empty policy; pass `null`
 *  to simulate an ABSENT policy object (which must fail closed). */
function stubDownloads(options: {
  index?: string;
  revocations?: string | null;
  missingArtifactVersions?: string[];
} = {}) {
  const readItemText = vi.fn(async () => {
    if (options.index === undefined) {
      throw new NotFoundError("Download item not found");
    }
    return options.index;
  });
  const readPolicyText = vi.fn(async () => {
    if (options.revocations === null) {
      throw new NotFoundError("Policy item not found");
    }
    return options.revocations ?? JSON.stringify({ schemaVersion: 1, revoked: [] });
  });
  const createDownload = vi.fn(async (kind: string, version: string, item: string) => {
    if (options.missingArtifactVersions?.includes(version)) {
      throw new NotFoundError("Download item not found");
    }
    return { key: `${kind}/${version}/${item}`, url: `https://signed.example/${version}/${item}` };
  });
  return {
    service: { readItemText, readPolicyText, createDownload } as unknown as DownloadService,
    readItemText,
    readPolicyText,
    createDownload,
  };
}

const REQUEST = { range: "^1.2.1", platform: "darwin", architecture: "arm64" } as const;

describe("ConnectServiceReleaseResolver.resolve", () => {
  afterEach(() => {
    delete process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS;
  });

  it("^1.2.1 selects the highest compatible 1.x (numeric order) and excludes 2.x and older", async () => {
    const { service, createDownload } = stubDownloads({
      index: indexText([
        release(),
        release({ releaseId: "rel_bbbbbbbb", version: "1.3.2", artifact: "kazi-connect-1.3.2-darwin-arm64.tar.gz" }),
        release({ releaseId: "rel_cccccccc", version: "1.3.10", artifact: "kazi-connect-1.3.10-darwin-arm64.tar.gz", size: 2000 }),
        release({ releaseId: "rel_dddddddd", version: "2.0.0", artifact: "kazi-connect-2.0.0-darwin-arm64.tar.gz" }),
        release({ releaseId: "rel_eeeeeeee", version: "1.2.0", artifact: "kazi-connect-1.2.0-darwin-arm64.tar.gz" }),
      ]),
    });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);

    expect(candidate).toEqual({
      releaseId: "rel_cccccccc",
      version: "1.3.10",
      size: 2000,
      sha256: SHA,
      revoked: false,
      url: "https://signed.example/v1.3.10/kazi-connect-1.3.10-darwin-arm64.tar.gz",
    });
    expect(createDownload).toHaveBeenCalledWith(
      "service", "v1.3.10", "kazi-connect-1.3.10-darwin-arm64.tar.gz", { expiresIn: 300 },
    );
    expect(createDownload).toHaveBeenCalledTimes(1);
  });

  it("skips a revoked highest release (by releaseId) and returns the next non-revoked", async () => {
    const { service } = stubDownloads({
      index: indexText([
        release(),
        release({ releaseId: "rel_bbbbbbbb", version: "1.3.2", artifact: "kazi-connect-1.3.2-darwin-arm64.tar.gz" }),
      ]),
      revocations: JSON.stringify({ schemaVersion: 1, revoked: [{ releaseId: "rel_bbbbbbbb", reason: "bad build" }] }),
    });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(candidate.version).toBe("1.2.1");
  });

  it("revokes by version scoped to platform and architecture", async () => {
    const { service } = stubDownloads({
      index: indexText([
        release(),
        release({ releaseId: "rel_bbbbbbbb", version: "1.3.2", artifact: "kazi-connect-1.3.2-darwin-arm64.tar.gz" }),
      ]),
      revocations: JSON.stringify({
        schemaVersion: 1,
        revoked: [{ version: "1.3.2", platform: "darwin", architecture: "arm64" }],
      }),
    });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(candidate.version).toBe("1.2.1");
  });

  it("falls back to the next release when the highest is incompletely published", async () => {
    const { service, createDownload } = stubDownloads({
      index: indexText([
        release(),
        release({ releaseId: "rel_bbbbbbbb", version: "1.3.2", artifact: "kazi-connect-1.3.2-darwin-arm64.tar.gz" }),
      ]),
      missingArtifactVersions: ["v1.3.2"],
    });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(candidate.version).toBe("1.2.1");
    expect(createDownload).toHaveBeenCalledTimes(2);
  });

  it("an exact range requires the exact version", async () => {
    const { service } = stubDownloads({
      index: indexText([
        release(),
        release({ releaseId: "rel_bbbbbbbb", version: "1.3.2", artifact: "kazi-connect-1.3.2-darwin-arm64.tar.gz" }),
      ]),
    });

    const resolver = new ConnectServiceReleaseResolver(service);
    const candidate = await resolver.resolve({ ...REQUEST, range: "1.2.1" });
    expect(candidate.version).toBe("1.2.1");
  });

  it("returns the closed not-found for wrong platform or architecture", async () => {
    const { service } = stubDownloads({ index: indexText([release()]) });
    await expect(
      new ConnectServiceReleaseResolver(service).resolve({ ...REQUEST, architecture: "x64" }),
    ).rejects.toThrow("No compatible service release");
  });

  it("fails closed with no details when the index is missing, malformed, or a wrong schema", async () => {
    for (const index of [undefined, "not json", JSON.stringify({ schemaVersion: 2, releases: [] })]) {
      const { service } = stubDownloads({ index });
      const rejection = expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST)).rejects;
      await rejection.toBeInstanceOf(NotFoundError);
    }
  });

  it("fails closed when the revocation policy is malformed", async () => {
    const { service } = stubDownloads({
      index: indexText([release()]),
      revocations: JSON.stringify({ schemaVersion: 1, revoked: [{ note: "no selector" }] }),
    });
    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toThrow("No compatible service release");
  });

  it("fails closed when the revocation policy object is absent", async () => {
    const { service } = stubDownloads({ index: indexText([release()]), revocations: null });
    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toThrow("No compatible service release");
  });

  it("resolves normally with the bootstrap empty policy published", async () => {
    const { service, readPolicyText } = stubDownloads({ index: indexText([release()]) });
    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(candidate.version).toBe("1.2.1");
    expect(readPolicyText).toHaveBeenCalledWith("service", "revocations.json");
  });

  it("ignores malformed index entries but keeps valid ones", async () => {
    const { service } = stubDownloads({
      index: indexText([
        { junk: true },
        release({ version: "not-a-version" }),
        release({ sha256: "short" }),
        release(),
      ]),
    });
    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(candidate.version).toBe("1.2.1");
  });

  it("honours KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS", async () => {
    process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS = "120";
    const { service, createDownload } = stubDownloads({ index: indexText([release()]) });
    await new ConnectServiceReleaseResolver(service).resolve(REQUEST);
    expect(createDownload).toHaveBeenCalledWith(
      "service", "v1.2.1", "kazi-connect-1.2.1-darwin-arm64.tar.gz", { expiresIn: 120 },
    );
  });
});

describe("rangeSatisfied", () => {
  it("applies caret semantics for major >= 1", () => {
    expect(rangeSatisfied("^1.2.1", "1.2.1")).toBe(true);
    expect(rangeSatisfied("^1.2.1", "1.3.10")).toBe(true);
    expect(rangeSatisfied("^1.2.1", "1.2.0")).toBe(false);
    expect(rangeSatisfied("^1.2.1", "2.0.0")).toBe(false);
    expect(rangeSatisfied("^1.2.1", "0.9.9")).toBe(false);
  });

  it("applies caret semantics for 0.x", () => {
    expect(rangeSatisfied("^0.2.3", "0.2.9")).toBe(true);
    expect(rangeSatisfied("^0.2.3", "0.3.0")).toBe(false);
    expect(rangeSatisfied("^0.0.3", "0.0.3")).toBe(true);
    expect(rangeSatisfied("^0.0.3", "0.0.4")).toBe(false);
  });

  it("treats a bare version as exact", () => {
    expect(rangeSatisfied("1.2.1", "1.2.1")).toBe(true);
    expect(rangeSatisfied("1.2.1", "1.2.2")).toBe(false);
  });

  it("matches nothing for out-of-grammar ranges or versions", () => {
    expect(rangeSatisfied(">=1.0.0", "1.2.1")).toBe(false);
    expect(rangeSatisfied("^1.2", "1.2.1")).toBe(false);
    expect(rangeSatisfied("^1.2.1-beta", "1.2.1")).toBe(false);
    expect(rangeSatisfied("^1.2.1", "1.2.1-beta")).toBe(false);
  });
});

describe("parseServiceReleaseResolveRequest", () => {
  const valid = { range: "^1.2.1", platform: "darwin", architecture: "arm64" };

  it("accepts exactly {range, platform, architecture}", () => {
    expect(parseServiceReleaseResolveRequest(valid)).toEqual({ ok: true, value: valid });
  });

  it("rejects extra fields, missing fields, and non-objects", () => {
    expect(parseServiceReleaseResolveRequest({ ...valid, extra: 1 }).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest({ range: "^1.2.1", platform: "darwin" }).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest(null).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest([valid]).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest("^1.2.1").ok).toBe(false);
  });

  it("rejects out-of-grammar ranges and unknown platform/architecture", () => {
    expect(parseServiceReleaseResolveRequest({ ...valid, range: ">=1.0.0" }).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest({ ...valid, range: "1.2" }).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest({ ...valid, platform: "linux" }).ok).toBe(false);
    expect(parseServiceReleaseResolveRequest({ ...valid, architecture: "ia32" }).ok).toBe(false);
  });

  it("rejects oversized bodies before field inspection", () => {
    const oversized = { range: "^1.2.1", platform: "darwin", architecture: "x".repeat(5000) };
    expect(parseServiceReleaseResolveRequest(oversized).ok).toBe(false);
  });
});

describe("index and revocation adapters", () => {
  it("caps the number of index releases", () => {
    const releases = Array.from({ length: 501 }, () => release());
    expect(parseResolverIndex(indexText(releases))).toBeNull();
  });

  it("fails closed on any malformed revocation entry", () => {
    expect(parseRevocations(JSON.stringify({ schemaVersion: 1, revoked: [{ version: "nope" }] }))).toBeNull();
    expect(parseRevocations(JSON.stringify({ schemaVersion: 1, revoked: ["rel_aaaaaaaa"] }))).toBeNull();
    expect(parseRevocations("not json")).toBeNull();
  });

  it("accepts revocation entries with annotation fields", () => {
    const parsed = parseRevocations(JSON.stringify({
      schemaVersion: 1,
      revoked: [{ releaseId: "rel_aaaaaaaa", reason: "compromised", revokedAt: "2026-08-26T00:00:00Z" }],
    }));
    expect(parsed).toEqual([{ releaseId: "rel_aaaaaaaa" }]);
  });
});

describe("dependency retry (transient S3/presign failures)", () => {
  const EMPTY_POLICY = JSON.stringify({ schemaVersion: 1, revoked: [] });

  function retryService(overrides: Partial<Record<"readItemText" | "readPolicyText" | "createDownload", unknown>>) {
    const base = {
      readItemText: vi.fn(async () => indexText([release()])),
      readPolicyText: vi.fn(async () => EMPTY_POLICY),
      createDownload: vi.fn(async () => ({ key: "k", url: "https://signed.example/a.tar.gz" })),
      ...overrides,
    };
    return { service: base as unknown as DownloadService, ...base };
  }

  it("retries a transient index-read failure once and succeeds", async () => {
    const readItemText = vi.fn()
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValue(indexText([release()]));
    const { service } = retryService({ readItemText });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);

    expect(candidate.version).toBe("1.2.1");
    expect(readItemText).toHaveBeenCalledTimes(2);
  });

  it("gives up after the bounded retry and stays fail-closed", async () => {
    const readItemText = vi.fn().mockRejectedValue(new Error("ETIMEDOUT"));
    const { service } = retryService({ readItemText });

    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toThrow("ETIMEDOUT");
    expect(readItemText).toHaveBeenCalledTimes(2);
  });

  it("retries a transient policy-read failure once and succeeds", async () => {
    const readPolicyText = vi.fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValue(EMPTY_POLICY);
    const { service } = retryService({ readPolicyText });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);

    expect(candidate.version).toBe("1.2.1");
    expect(readPolicyText).toHaveBeenCalledTimes(2);
  });

  it("retries a transient presign failure once and succeeds", async () => {
    const createDownload = vi.fn()
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValue({ key: "k", url: "https://signed.example/a.tar.gz" });
    const { service } = retryService({ createDownload });

    const candidate = await new ConnectServiceReleaseResolver(service).resolve(REQUEST);

    expect(candidate.url).toBe("https://signed.example/a.tar.gz");
    expect(createDownload).toHaveBeenCalledTimes(2);
  });

  it("does not retry semantic not-found results (absent policy fails closed on one attempt)", async () => {
    const readPolicyText = vi.fn().mockRejectedValue(new NotFoundError("Policy item not found"));
    const { service } = retryService({ readPolicyText });

    await expect(new ConnectServiceReleaseResolver(service).resolve(REQUEST))
      .rejects.toThrow("No compatible service release");
    expect(readPolicyText).toHaveBeenCalledTimes(1);
  });
});
