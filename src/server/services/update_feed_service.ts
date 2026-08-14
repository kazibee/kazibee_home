import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { NotFoundError } from "../errors/domain_errors";
import DownloadService, { type DownloadItem } from "./download_service";

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

  async createFeed(arch: UpdateArch): Promise<UpdateFeed> {
    logger.info("Building update feed", { arch, expiresIn: this.expiresIn });

    const { versions } = await this.downloadService.listVersions("app");
    const release = versions.find(({ version }) => version !== "latest");
    if (!release) {
      logger.info("No app releases available for update feed", { arch });
      throw new NotFoundError("No app releases available");
    }

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
