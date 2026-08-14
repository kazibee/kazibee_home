import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import DownloadService, { type DownloadItem, type VersionDownloads } from "./download_service";

const logger = getLogger("kazibee:update-feed-service");

export type UpdateArch = "arm64" | "x64";

export const UPDATE_ARCHES: readonly UpdateArch[] = ["arm64", "x64"];

export interface UpdateFeed {
  currentRelease: string;
  releases: UpdateRelease[];
}

export interface UpdateRelease {
  version: string;
  updateTo: {
    version: string;
    name: string;
    url: string;
    pub_date: string;
    notes: string;
  };
}

@Component()
export default class UpdateFeedService {
  private readonly expiresIn = this.readExpiresIn();

  constructor(@Inject(DownloadService) private downloadService: DownloadService) {}

  /** Squirrel.Mac JSON feed: newest published macOS release for the arch. */
  async createFeed(arch: UpdateArch): Promise<UpdateFeed> {
    logger.info("Building update feed", { arch, expiresIn: this.expiresIn, platform: "darwin" });

    const release = await this.newestRelease();
    const archive = this.findMacArchive(release.downloads, arch);
    if (!archive) {
      logger.info("No macOS archive for update feed", {
        arch,
        items: release.downloads.map(({ name }) => name),
        version: release.version,
      });
      throw new NotFoundError(`No macOS ${arch} archive for ${release.version}`);
    }

    const { url } = await this.downloadService.createDownload("app", release.version, archive.name, {
      expiresIn: this.expiresIn,
    });

    const version = release.version.replace(/^v/, "");
    logger.info("Built update feed", {
      arch,
      expiresIn: this.expiresIn,
      item: archive.name,
      platform: "darwin",
      version,
    });

    return {
      currentRelease: version,
      releases: [
        {
          version,
          updateTo: {
            version,
            name: `Kazibee ${version}`,
            url,
            pub_date: archive.lastModified ?? new Date().toISOString(),
            notes: "",
          },
        },
      ],
    };
  }

  /** Squirrel.Windows RELEASES manifest of the newest published release,
   *  served verbatim — the client resolves the listed nupkg filenames
   *  relative to the same feed base URL. */
  async createWindowsReleases(arch: UpdateArch): Promise<string> {
    logger.info("Building Windows RELEASES manifest", { arch, platform: "win32" });

    const release = await this.newestRelease();
    const hasManifest = release.downloads.some(({ name }) => name === "RELEASES");
    if (!hasManifest) {
      logger.info("No Windows RELEASES manifest for release", {
        arch,
        items: release.downloads.map(({ name }) => name),
        version: release.version,
      });
      throw new NotFoundError(`No Windows RELEASES manifest for ${release.version}`);
    }

    const text = await this.downloadService.readItemText("app", release.version, "RELEASES");
    logger.info("Built Windows RELEASES manifest", {
      arch,
      length: text.length,
      platform: "win32",
      version: release.version,
    });
    return text;
  }

  /** Presigned URL for a Squirrel.Windows package referenced by RELEASES. */
  async createWindowsPackageDownload(arch: UpdateArch, file: string): Promise<string> {
    if (!file.toLowerCase().endsWith(".nupkg")) {
      throw new ValidationError("Invalid update package name");
    }

    const { versions } = await this.downloadService.listVersions("app");
    const release = versions.find(
      ({ version, downloads }) => version !== "latest" && downloads.some(({ name }) => name === file),
    );
    if (!release) {
      logger.info("Windows update package not found", { arch, file, platform: "win32" });
      throw new NotFoundError("Update package not found");
    }

    const { url } = await this.downloadService.createDownload("app", release.version, file, {
      expiresIn: this.expiresIn,
    });
    logger.info("Created Windows update package URL", {
      arch,
      expiresIn: this.expiresIn,
      file,
      platform: "win32",
      version: release.version,
    });
    return url;
  }

  private async newestRelease(): Promise<VersionDownloads> {
    const { versions } = await this.downloadService.listVersions("app");
    const release = versions.find(({ version }) => version !== "latest");
    if (!release) {
      logger.info("No app releases available for update feed", {});
      throw new NotFoundError("No app releases available");
    }
    return release;
  }

  private findMacArchive(downloads: DownloadItem[], arch: UpdateArch): DownloadItem | null {
    const archTokens = arch === "x64" ? ["x64", "amd64"] : ["arm64"];
    return (
      downloads.find(({ name }) => {
        const lowered = name.toLowerCase();
        const isZip = lowered.endsWith(".zip");
        const isMac = lowered.includes("mac") || lowered.includes("darwin");
        return isZip && isMac && archTokens.some((token) => lowered.includes(token));
      }) ?? null
    );
  }

  private readExpiresIn(): number {
    const raw = process.env.KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS ?? "3600";
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    return 3600;
  }
}

export function normalizeUpdateArch(value: string | undefined): UpdateArch | null {
  if (value === "arm64" || value === "aarch64") {
    return "arm64";
  }
  if (value === "x64" || value === "amd64" || value === "x86_64") {
    return "x64";
  }
  return null;
}
