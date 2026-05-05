import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Component } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { NotFoundError, ValidationError } from "../errors/domain_errors";

const logger = getLogger("kazibee:download-service");

export type DownloadKind = "cli" | "app";

export const DOWNLOAD_KINDS: readonly DownloadKind[] = ["cli", "app"];

export interface VersionsResult {
  versions: VersionDownloads[];
}

export interface VersionDownloads {
  version: string;
  downloads: DownloadItem[];
}

export interface DownloadItem {
  name: string;
  href: string;
  size: number;
  lastModified: string | null;
}

export interface DownloadResult {
  key: string;
  url: string;
}

@Component()
export default class DownloadService {
  private readonly bucket = process.env.KAZIBEE_DOWNLOAD_BUCKET ?? "kazibee";
  private readonly expiresIn = this.readExpiresIn();
  private readonly region = process.env.AWS_REGION ?? "ca-central-1";
  private readonly client = new S3Client({ region: this.region });
  private readonly prefixes: Record<DownloadKind, string> = {
    cli: this.normalizePrefix(process.env.KAZIBEE_CLI_PREFIX ?? "cli/"),
    app: this.normalizePrefix(process.env.KAZIBEE_APP_PREFIX ?? "app/"),
  };

  async listVersions(kind: DownloadKind): Promise<VersionsResult> {
    this.assertConfigured();
    const prefix = this.prefixes[kind];

    logger.info("Listing download versions from S3", {
      bucket: this.bucket,
      kind,
      prefix,
      region: this.region,
    });

    const downloadsByVersion = new Map<string, DownloadItem[]>();
    let continuationToken: string | undefined;

    do {
      const result = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      }));

      for (const object of result.Contents ?? []) {
        const parsed = this.downloadFromKey(prefix, object.Key);
        if (parsed) {
          const downloads = downloadsByVersion.get(parsed.version) ?? [];
          downloads.push({
            name: parsed.item,
            href: `/downloads/binary/${kind}/${encodeURIComponent(parsed.version)}/${encodeURIComponent(parsed.item)}`,
            size: object.Size ?? 0,
            lastModified: object.LastModified?.toISOString() ?? null,
          });
          downloadsByVersion.set(parsed.version, downloads);
        }
      }

      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    const response = {
      versions: [...downloadsByVersion.entries()]
        .sort(([a], [b]) => this.compareVersions(a, b))
        .map(([version, downloads]) => ({
          version,
          downloads: downloads.sort((a, b) => this.compareItems(a.name, b.name)),
        })),
    };

    logger.info("Listed download versions from S3", {
      bucket: this.bucket,
      kind,
      prefix,
      count: response.versions.length,
      versions: response.versions.map(({ version, downloads }) => ({
        version,
        downloadCount: downloads.length,
      })),
    });

    return response;
  }

  async createDownload(kind: DownloadKind, version: string, item: string): Promise<DownloadResult> {
    this.assertConfigured();
    this.validateVersion(version);
    this.validateItem(item);

    const key = `${this.prefixes[kind]}${version}/${item}`;

    logger.info("Creating download URL", {
      bucket: this.bucket,
      expiresIn: this.expiresIn,
      item,
      key,
      kind,
      version,
    });

    await this.assertObjectExists(key);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${item}"`,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: this.expiresIn });

    logger.info("Created download URL", {
      bucket: this.bucket,
      expiresIn: this.expiresIn,
      item,
      key,
      kind,
      version,
    });

    return { key, url };
  }

  private assertConfigured(): void {
    if (!this.bucket) {
      logger.error("Download bucket is not configured", {
        env: "KAZIBEE_DOWNLOAD_BUCKET",
        region: this.region,
      });
      throw new Error("Download bucket is not configured");
    }
  }

  private async assertObjectExists(key: string): Promise<void> {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (error) {
      if (this.isMissingObjectError(error)) {
        logger.info("Download object not found", {
          bucket: this.bucket,
          key,
        });
        throw new NotFoundError("Download item not found");
      }
      logger.error("Failed to check download object", {
        bucket: this.bucket,
        error,
        key,
      });
      throw error;
    }
  }

  private compareVersions(a: string, b: string): number {
    if (a === "latest") {
      return -1;
    }
    if (b === "latest") {
      return 1;
    }
    return b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" });
  }

  private compareItems(a: string, b: string): number {
    if (a === "SHA256SUMS") {
      return 1;
    }
    if (b === "SHA256SUMS") {
      return -1;
    }
    return a.localeCompare(b);
  }

  private downloadFromKey(prefix: string, key?: string): { version: string; item: string } | null {
    if (!key?.startsWith(prefix) || key.endsWith("/")) {
      return null;
    }

    const path = key.slice(prefix.length);
    const [version, item, ...extra] = path.split("/");
    if (!version || !item || extra.length > 0) {
      return null;
    }

    try {
      this.validateVersion(version);
      this.validateItem(item);
      return { version, item };
    } catch {
      return null;
    }
  }

  private isMissingObjectError(error: unknown): boolean {
    if (error instanceof S3ServiceException) {
      return error.$metadata.httpStatusCode === 404 || error.name === "NotFound" || error.name === "NoSuchKey";
    }
    return false;
  }

  private normalizePrefix(prefix: string): string {
    const trimmed = prefix.trim().replace(/^\/+/, "");
    if (!trimmed) {
      return "";
    }
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  }

  private readExpiresIn(): number {
    const raw = process.env.KAZIBEE_DOWNLOAD_EXPIRES_SECONDS ?? "600";
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    return 600;
  }

  private validateItem(item: string): void {
    if (!item || item.length > 200 || item.includes("/") || item.includes("\\") || item.includes("..")) {
      throw new ValidationError("Invalid download item");
    }
    if (!/^[A-Za-z0-9._-]+$/.test(item)) {
      throw new ValidationError("Invalid download item");
    }
  }

  private validateVersion(version: string): void {
    if (version === "latest") {
      return;
    }
    if (!/^v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version)) {
      throw new ValidationError("Invalid version");
    }
  }
}

export function isDownloadKind(value: string | undefined): value is DownloadKind {
  return value === "cli" || value === "app";
}
