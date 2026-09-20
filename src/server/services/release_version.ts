/** Release version ordering for artifact folders named `v<major>.<minor>.<patch>`
 *  with an optional pre-release tag (`v0.9.2-rc20260920-1`).
 *
 *  A plain string comparison ranks `v0.9.2-rc20260920-1` above `v0.9.2`
 *  because the longer string sorts later. Semantic ordering is the opposite:
 *  a pre-release precedes its own base version, so the final release outranks
 *  every one of its candidates. */

export type UpdateChannel = "stable" | "beta";

export interface ParsedReleaseVersion {
  core: [number, number, number];
  prerelease: string | null;
}

const RELEASE_VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9.-]+))?(?:\+[A-Za-z0-9.-]+)?$/;

export function parseReleaseVersion(version: string): ParsedReleaseVersion | null {
  const match = RELEASE_VERSION_PATTERN.exec(version);
  if (!match) {
    return null;
  }
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ?? null,
  };
}

/** True for a version carrying a pre-release tag (a release candidate). */
export function isPrereleaseVersion(version: string): boolean {
  return parseReleaseVersion(version)?.prerelease != null;
}

/** Whether a version may be offered on a channel: stable never receives a
 *  pre-release; beta receives both kinds. */
export function isVersionOnChannel(version: string, channel: UpdateChannel): boolean {
  return channel === "beta" || !isPrereleaseVersion(version);
}

/** Newest-first comparator. Unparseable names sort after every parseable
 *  version and fall back to a numeric-aware string comparison among
 *  themselves, which preserves the historical ordering for them. */
export function compareReleaseVersionsDesc(a: string, b: string): number {
  const left = parseReleaseVersion(a);
  const right = parseReleaseVersion(b);
  if (!left || !right) {
    if (left) {
      return -1;
    }
    if (right) {
      return 1;
    }
    return b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" });
  }

  for (let index = 0; index < 3; index += 1) {
    const difference = right.core[index] - left.core[index];
    if (difference !== 0) {
      return difference;
    }
  }

  if (left.prerelease === right.prerelease) {
    return 0;
  }
  if (left.prerelease === null) {
    return -1;
  }
  if (right.prerelease === null) {
    return 1;
  }
  return right.prerelease.localeCompare(left.prerelease, undefined, { numeric: true, sensitivity: "base" });
}
