/** Pure release-version ordering and channel eligibility; no application. */
import { describe, expect, it } from "vitest";
import {
  compareReleaseVersionsDesc,
  isPrereleaseVersion,
  isVersionOnChannel,
  parseReleaseVersion,
} from "../../../src/server/services/release_version";

describe("compareReleaseVersionsDesc", () => {
  it("orders newest first with a final release above its own candidates", () => {
    const sorted = [
      "v0.9.2-rc20260920-2",
      "v0.9.1",
      "v0.9.2",
      "v0.10.0-rc20261001-1",
      "v0.9.2-rc20260920-10",
      "v0.9.2-rc20260919-3",
    ].sort(compareReleaseVersionsDesc);

    expect(sorted).toEqual([
      "v0.10.0-rc20261001-1",
      "v0.9.2",
      "v0.9.2-rc20260920-10",
      "v0.9.2-rc20260920-2",
      "v0.9.2-rc20260919-3",
      "v0.9.1",
    ]);
  });

  it("sorts unparseable names after every real version", () => {
    expect(["nightly", "v1.0.0"].sort(compareReleaseVersionsDesc)).toEqual(["v1.0.0", "nightly"]);
  });
});

describe("channel eligibility", () => {
  it("recognises pre-release versions", () => {
    expect(isPrereleaseVersion("v0.9.2-rc20260920-1")).toBe(true);
    expect(isPrereleaseVersion("v0.9.2")).toBe(false);
    expect(isPrereleaseVersion("latest")).toBe(false);
    expect(parseReleaseVersion("v0.9.2-rc20260920-1")).toEqual({ core: [0, 9, 2], prerelease: "rc20260920-1" });
  });

  it("keeps candidates off stable and allows everything on beta", () => {
    expect(isVersionOnChannel("v0.9.2-rc20260920-1", "stable")).toBe(false);
    expect(isVersionOnChannel("v0.9.2-rc20260920-1", "beta")).toBe(true);
    expect(isVersionOnChannel("v0.9.2", "stable")).toBe(true);
    expect(isVersionOnChannel("v0.9.2", "beta")).toBe(true);
  });
});
