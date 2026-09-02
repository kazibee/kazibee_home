import { describe, expect, it } from "vitest";
import {
  parseResolverIndex,
  parseRevocations,
  parseServiceReleaseResolveRequest,
} from "../../../src/server/services/connect_service_release_resolver";

/** Remaining parser rejection branches for the release resolver adapters. */

const validIndexEntry = {
  releaseId: "rel_0123456789abcdef0123456789abcdef",
  version: "1.2.3",
  platform: "darwin",
  architecture: "arm64",
  artifact: "kazibee-service-1.2.3-darwin-arm64.tar.gz",
  size: 1024,
  sha256: "a".repeat(64),
};

function index(entries: unknown[]): string {
  return JSON.stringify({ schemaVersion: 1, releases: entries });
}

describe("parseServiceReleaseResolveRequest edge cases", () => {
  it("rejects a body that cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(parseServiceReleaseResolveRequest(circular)).toEqual({ ok: false });
  });

  it("rejects undefined (unserializable to a JSON document)", () => {
    expect(parseServiceReleaseResolveRequest(undefined)).toEqual({ ok: false });
  });
});

describe("parseResolverIndex entry validation", () => {
  it("ignores non-object entries", () => {
    expect(parseResolverIndex(index([null, "x", validIndexEntry]))).toHaveLength(1);
  });

  it("ignores entries with a malformed releaseId", () => {
    expect(parseResolverIndex(index([{ ...validIndexEntry, releaseId: "nope" }]))).toEqual([]);
  });

  it("ignores entries with a malformed version", () => {
    expect(parseResolverIndex(index([{ ...validIndexEntry, version: "1.2" }]))).toEqual([]);
  });

  it("ignores entries with non-string platform or architecture", () => {
    expect(parseResolverIndex(index([{ ...validIndexEntry, platform: 7 }]))).toEqual([]);
    expect(parseResolverIndex(index([{ ...validIndexEntry, architecture: null }]))).toEqual([]);
  });

  it("ignores entries with a malformed artifact path", () => {
    expect(parseResolverIndex(index([{ ...validIndexEntry, artifact: "../escape" }]))).toEqual([]);
  });

  it("ignores entries with a non-positive or unsafe size", () => {
    expect(parseResolverIndex(index([{ ...validIndexEntry, size: 0 }]))).toEqual([]);
    expect(parseResolverIndex(index([{ ...validIndexEntry, size: 1.5 }]))).toEqual([]);
    expect(parseResolverIndex(index([{ ...validIndexEntry, size: "big" }]))).toEqual([]);
  });

  it("ignores entries with a malformed sha256", () => {
    expect(parseResolverIndex(index([{ ...validIndexEntry, sha256: "zz" }]))).toEqual([]);
    expect(parseResolverIndex(index([{ ...validIndexEntry, sha256: 42 }]))).toEqual([]);
  });

  it("fails closed on unparseable json and oversized documents", () => {
    expect(parseResolverIndex("{broken")).toBeNull();
    expect(parseResolverIndex("x".repeat(6 * 1024 * 1024))).toBeNull();
  });
});

describe("parseRevocations entry validation", () => {
  function policy(revoked: unknown[]): string {
    return JSON.stringify({ schemaVersion: 1, revoked });
  }

  it("fails closed on unparseable json", () => {
    expect(parseRevocations("{broken")).toBeNull();
  });

  it("fails closed on an oversized policy", () => {
    expect(parseRevocations("x".repeat(6 * 1024 * 1024))).toBeNull();
  });

  it("fails closed on a wrong envelope", () => {
    expect(parseRevocations(JSON.stringify({ schemaVersion: 2, revoked: [] }))).toBeNull();
    expect(parseRevocations(JSON.stringify({ schemaVersion: 1, revoked: {} }))).toBeNull();
  });

  it("fails closed on a non-object entry", () => {
    expect(parseRevocations(policy(["rel_x"]))).toBeNull();
  });

  it("fails closed on a malformed releaseId", () => {
    expect(parseRevocations(policy([{ releaseId: "nope" }]))).toBeNull();
    expect(parseRevocations(policy([{ releaseId: 9 }]))).toBeNull();
  });

  it("fails closed on a malformed version", () => {
    expect(parseRevocations(policy([{ version: "1.2" }]))).toBeNull();
    expect(parseRevocations(policy([{ version: 9 }]))).toBeNull();
  });

  it("fails closed on non-string platform or architecture", () => {
    expect(parseRevocations(policy([{ version: "1.2.3", platform: 4 }]))).toBeNull();
    expect(parseRevocations(policy([{ version: "1.2.3", architecture: 4 }]))).toBeNull();
  });

  it("fails closed on an entry with neither releaseId nor version", () => {
    expect(parseRevocations(policy([{ platform: "darwin" }]))).toBeNull();
  });

  it("accepts a mixed valid policy", () => {
    expect(parseRevocations(policy([
      { releaseId: "rel_0123456789abcdef0123456789abcdef" },
      { version: "1.2.3", platform: "darwin", architecture: "arm64" },
    ]))).toHaveLength(2);
  });
});
