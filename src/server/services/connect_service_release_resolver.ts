import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import DownloadService from "./download_service";

const logger = getLogger("kazibee:connect-service-release-resolver");

/** Closed request bounds. */
const MAX_RESOLVE_BODY_BYTES = 4 * 1024;
const MAX_RANGE_LENGTH = 32;

/** Closed index/policy bounds — reads beyond these fail closed to no-candidate. */
const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_POLICY_BYTES = 256 * 1024;
const MAX_INDEX_RELEASES = 500;

/** Ratified cross-repo contract: release CI writes the resolver index LAST at
 *  `service/latest/index.json`; operators (never release CI, never the website
 *  runtime) write the owner-protected revocation policy at
 *  `service/policy/revocations.json`, bootstrapped as
 *  `{"schemaVersion":1,"revoked":[]}` — an absent policy fails closed.
 *  Index sha256/size describe the tar.gz transport archive (the object the
 *  presigned URL serves), not the embedded bundle digest. These constants and
 *  the two parse adapters below are the only places that know the format. */
const INDEX_VERSION_SEGMENT = "latest";
const INDEX_ITEM = "index.json";
const REVOCATIONS_ITEM = "revocations.json";

const RANGE_PATTERN = /^\^?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_ID_PATTERN = /^rel_[A-Za-z0-9]{8,64}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ARTIFACT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

/** Uniform closed failure — malformed index/policy, revoked, incomplete,
 *  incompatible, and plain not-found are indistinguishable to callers. */
const SAFE_NOT_FOUND = "No compatible service release";

export const RESOLVER_PLATFORMS = ["darwin"] as const;
export const RESOLVER_ARCHITECTURES = ["arm64", "x64"] as const;
export type ResolverPlatform = (typeof RESOLVER_PLATFORMS)[number];
export type ResolverArchitecture = (typeof RESOLVER_ARCHITECTURES)[number];

export interface ServiceReleaseResolveRequest {
  range: string;
  platform: ResolverPlatform;
  architecture: ResolverArchitecture;
}

/** One untrusted candidate hint. Transport metadata only — Desktop performs
 *  all Apple and sealed-bundle verification; this is never a trust root. */
export interface ServiceReleaseCandidate {
  releaseId: string;
  version: string;
  size: number;
  sha256: string;
  revoked: false;
  url: string;
}

export interface ResolverIndexRelease {
  releaseId: string;
  version: string;
  platform: string;
  architecture: string;
  artifact: string;
  size: number;
  sha256: string;
}

export interface RevocationEntry {
  releaseId?: string;
  version?: string;
  platform?: string;
  architecture?: string;
}

/** Closed request parsing: exactly {range, platform, architecture}, byte-capped. */
export function parseServiceReleaseResolveRequest(body: unknown):
  | { ok: true; value: ServiceReleaseResolveRequest }
  | { ok: false } {
  let encoded: string | undefined;
  try {
    encoded = JSON.stringify(body);
  } catch {
    return { ok: false };
  }
  if (encoded === undefined || Buffer.byteLength(encoded, "utf8") > MAX_RESOLVE_BODY_BYTES) {
    return { ok: false };
  }
  if (!isObject(body) || Object.keys(body).length !== 3) {
    return { ok: false };
  }
  const { range, platform, architecture } = body;
  if (typeof range !== "string" || range.length > MAX_RANGE_LENGTH || !RANGE_PATTERN.test(range)) {
    return { ok: false };
  }
  if (typeof platform !== "string" || !(RESOLVER_PLATFORMS as readonly string[]).includes(platform)) {
    return { ok: false };
  }
  if (typeof architecture !== "string" || !(RESOLVER_ARCHITECTURES as readonly string[]).includes(architecture)) {
    return { ok: false };
  }
  return {
    ok: true,
    value: {
      range,
      platform: platform as ResolverPlatform,
      architecture: architecture as ResolverArchitecture,
    },
  };
}

/** Closed range grammar: exact "X.Y.Z" or caret "^X.Y.Z" (standard caret semantics,
 *  including 0.x rules). Anything else does not match any version. */
export function rangeSatisfied(range: string, version: string): boolean {
  const match = RANGE_PATTERN.exec(range);
  const candidate = parseVersion(version);
  if (!match || !candidate) {
    return false;
  }
  const base = { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
  if (!range.startsWith("^")) {
    return compareParsed(candidate, base) === 0;
  }
  if (compareParsed(candidate, base) < 0) {
    return false;
  }
  if (base.major > 0) {
    return candidate.major === base.major;
  }
  if (base.minor > 0) {
    return candidate.major === 0 && candidate.minor === base.minor;
  }
  return compareParsed(candidate, base) === 0;
}

/** Index adapter (draft schema, pending ratification):
 *  { schemaVersion: 1, releases: [{ releaseId, version, platform, architecture,
 *    artifact, size, sha256 }] }.
 *  Unknown schemaVersion or malformed envelope fails closed (null); entries
 *  that fail strict field validation are ignored so producers can add new
 *  platforms without breaking deployed consumers. */
export function parseResolverIndex(text: string): ResolverIndexRelease[] | null {
  if (Buffer.byteLength(text, "utf8") > MAX_INDEX_BYTES) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.releases)
    || parsed.releases.length > MAX_INDEX_RELEASES) {
    return null;
  }
  const releases: ResolverIndexRelease[] = [];
  for (const entry of parsed.releases) {
    const release = indexRelease(entry);
    if (release) {
      releases.push(release);
    }
  }
  return releases;
}

/** Revocation policy adapter (draft schema, pending ratification):
 *  { schemaVersion: 1, revoked: [{ releaseId } | { version, platform?,
 *    architecture? }] } — extra annotation fields (reason, revokedAt) are
 *  ignored. Any malformed entry poisons the whole policy (null) so a broken
 *  edit can never silently un-revoke a release. */
export function parseRevocations(text: string): RevocationEntry[] | null {
  if (Buffer.byteLength(text, "utf8") > MAX_POLICY_BYTES) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.revoked)) {
    return null;
  }
  const entries: RevocationEntry[] = [];
  for (const raw of parsed.revoked) {
    if (!isObject(raw)) {
      return null;
    }
    const entry: RevocationEntry = {};
    if (raw.releaseId !== undefined) {
      if (typeof raw.releaseId !== "string" || !RELEASE_ID_PATTERN.test(raw.releaseId)) {
        return null;
      }
      entry.releaseId = raw.releaseId;
    }
    if (raw.version !== undefined) {
      if (typeof raw.version !== "string" || !VERSION_PATTERN.test(raw.version)) {
        return null;
      }
      entry.version = raw.version;
    }
    if (raw.platform !== undefined) {
      if (typeof raw.platform !== "string") {
        return null;
      }
      entry.platform = raw.platform;
    }
    if (raw.architecture !== undefined) {
      if (typeof raw.architecture !== "string") {
        return null;
      }
      entry.architecture = raw.architecture;
    }
    if (!entry.releaseId && !entry.version) {
      return null;
    }
    entries.push(entry);
  }
  return entries;
}

@Component()
export default class ConnectServiceReleaseResolver {
  private readonly expiresIn = this.readExpiresIn();

  constructor(@Inject(DownloadService) private downloads: DownloadService) {}

  /** Highest fully published, non-revoked release matching {range, platform,
   *  architecture}. Every failure mode resolves to the same closed
   *  NotFoundError — no artifact details are disclosed. */
  async resolve(request: ServiceReleaseResolveRequest): Promise<ServiceReleaseCandidate> {
    const releases = await this.readIndex();
    const revocations = await this.readRevocations();

    const candidates = releases
      .map((release) => ({ release, parsed: parseVersion(release.version) }))
      .filter((candidate): candidate is { release: ResolverIndexRelease; parsed: ParsedVersion } =>
        candidate.parsed !== null
        && candidate.release.platform === request.platform
        && candidate.release.architecture === request.architecture
        && rangeSatisfied(request.range, candidate.release.version)
        && !revocations.some((entry) => revocationMatches(entry, candidate.release)))
      .sort((a, b) => compareParsed(b.parsed, a.parsed));

    for (const { release } of candidates) {
      try {
        const { url } = await this.downloads.createDownload(
          "service",
          `v${release.version}`,
          release.artifact,
          { expiresIn: this.expiresIn },
        );
        logger.info("Resolved service release", {
          architecture: request.architecture,
          platform: request.platform,
          range: request.range,
          releaseId: release.releaseId,
          version: release.version,
        });
        return {
          releaseId: release.releaseId,
          version: release.version,
          size: release.size,
          sha256: release.sha256,
          revoked: false,
          url,
        };
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ValidationError) {
          logger.warn("Skipping incompletely published service release", {
            releaseId: release.releaseId,
            version: release.version,
          });
          continue;
        }
        throw error;
      }
    }

    throw new NotFoundError(SAFE_NOT_FOUND);
  }

  private async readIndex(): Promise<ResolverIndexRelease[]> {
    let text: string;
    try {
      text = await this.downloads.readItemText("service", INDEX_VERSION_SEGMENT, INDEX_ITEM);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError(SAFE_NOT_FOUND);
      }
      throw error;
    }
    const releases = parseResolverIndex(text);
    if (!releases) {
      logger.error("Service resolver index failed closed parsing", { item: INDEX_ITEM });
      throw new NotFoundError(SAFE_NOT_FOUND);
    }
    return releases;
  }

  private async readRevocations(): Promise<RevocationEntry[]> {
    let text: string;
    try {
      text = await this.downloads.readPolicyText("service", REVOCATIONS_ITEM);
    } catch (error) {
      if (error instanceof NotFoundError) {
        // Ratified: an absent policy object FAILS CLOSED — absence-as-empty would
        // let an accidental deletion silently un-revoke every release. Operators
        // must publish {"schemaVersion":1,"revoked":[]} as a first-release step.
        logger.error("Service revocation policy object is absent — failing closed", {
          item: REVOCATIONS_ITEM,
        });
        throw new NotFoundError(SAFE_NOT_FOUND);
      }
      throw error;
    }
    const entries = parseRevocations(text);
    if (!entries) {
      logger.error("Service revocation policy failed closed parsing", { item: REVOCATIONS_ITEM });
      throw new NotFoundError(SAFE_NOT_FOUND);
    }
    return entries;
  }

  private readExpiresIn(): number {
    const raw = process.env.KAZIBEE_SERVICE_RESOLVE_EXPIRES_SECONDS ?? "300";
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 3600) {
      return parsed;
    }
    return 300;
  }
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(value: string): ParsedVersion | null {
  const match = VERSION_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareParsed(a: ParsedVersion, b: ParsedVersion): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function indexRelease(entry: unknown): ResolverIndexRelease | null {
  if (!isObject(entry)) {
    return null;
  }
  const { releaseId, version, platform, architecture, artifact, size, sha256 } = entry;
  if (typeof releaseId !== "string" || !RELEASE_ID_PATTERN.test(releaseId)) {
    return null;
  }
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    return null;
  }
  if (typeof platform !== "string" || typeof architecture !== "string") {
    return null;
  }
  if (typeof artifact !== "string" || !ARTIFACT_PATTERN.test(artifact)) {
    return null;
  }
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size <= 0) {
    return null;
  }
  if (typeof sha256 !== "string" || !SHA256_PATTERN.test(sha256)) {
    return null;
  }
  return { releaseId, version, platform, architecture, artifact, size, sha256 };
}

function revocationMatches(entry: RevocationEntry, release: ResolverIndexRelease): boolean {
  if (entry.releaseId) {
    return entry.releaseId === release.releaseId;
  }
  return entry.version === release.version
    && (entry.platform === undefined || entry.platform === release.platform)
    && (entry.architecture === undefined || entry.architecture === release.architecture);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
