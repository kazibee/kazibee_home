import { afterEach, describe, expect, it, vi } from "vitest";
import type DownloadService from "../../../src/server/services/download_service";
import type { VersionsResult } from "../../../src/server/services/download_service";
import UpdateFeedService, { normalizeUpdateArch } from "../../../src/server/services/update_feed_service";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

function stubDownloadService(versions: VersionsResult, url = "https://signed.example/download.zip") {
  const createDownload = vi.fn(async () => ({ key: "app/v1.4.2/Kazibee-mac-arm64.zip", url }));
  const listVersions = vi.fn(async () => versions);
  return {
    service: { createDownload, listVersions } as unknown as DownloadService,
    createDownload,
    listVersions,
  };
}

function versionsFixture(): VersionsResult {
  return {
    versions: [
      {
        version: "latest",
        downloads: [
          { name: "Kazibee-mac-arm64.zip", href: "#", size: 10, lastModified: "2026-08-10T00:00:00.000Z" },
        ],
      },
      {
        version: "v1.4.2",
        downloads: [
          { name: "Kazibee-1.4.2-arm64.dmg", href: "#", size: 30, lastModified: "2026-08-09T00:00:00.000Z" },
          { name: "Kazibee-mac-arm64.zip", href: "#", size: 20, lastModified: "2026-08-09T00:00:00.000Z" },
          { name: "Kazibee-mac-x64.zip", href: "#", size: 20, lastModified: "2026-08-09T00:00:00.000Z" },
        ],
      },
      {
        version: "v1.4.1",
        downloads: [
          { name: "Kazibee-mac-arm64.zip", href: "#", size: 20, lastModified: "2026-08-01T00:00:00.000Z" },
        ],
      },
    ],
  };
}

describe("UpdateFeedService", () => {
  afterEach(() => {
    delete process.env.KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS;
  });

  it("builds a Squirrel.Mac feed for the newest non-latest version (arm64)", async () => {
    const { service, createDownload } = stubDownloadService(versionsFixture());
    const feed = await new UpdateFeedService(service).createFeed("arm64");

    expect(feed.currentRelease).toBe("1.4.2");
    expect(feed.releases).toHaveLength(1);
    expect(feed.releases[0].version).toBe("1.4.2");
    expect(feed.releases[0].updateTo).toMatchObject({
      version: "1.4.2",
      name: "Kazibee 1.4.2",
      url: "https://signed.example/download.zip",
      pub_date: "2026-08-09T00:00:00.000Z",
      notes: "",
    });
    expect(createDownload).toHaveBeenCalledWith("app", "v1.4.2", "Kazibee-mac-arm64.zip", { expiresIn: 3600 });
  });

  it("selects the x64 archive for x64", async () => {
    const { service, createDownload } = stubDownloadService(versionsFixture());
    await new UpdateFeedService(service).createFeed("x64");

    expect(createDownload).toHaveBeenCalledWith("app", "v1.4.2", "Kazibee-mac-x64.zip", { expiresIn: 3600 });
  });

  it("throws NotFoundError when no versions exist", async () => {
    const { service } = stubDownloadService({ versions: [] });
    await expect(new UpdateFeedService(service).createFeed("arm64")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the newest version has no matching mac zip", async () => {
    const { service } = stubDownloadService({
      versions: [
        {
          version: "v1.4.2",
          downloads: [
            { name: "Kazibee-1.4.2-arm64.dmg", href: "#", size: 30, lastModified: null },
            { name: "Kazibee-win32-x64.msi", href: "#", size: 30, lastModified: null },
          ],
        },
      ],
    });
    await expect(new UpdateFeedService(service).createFeed("arm64")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("falls back to the current time when the archive has no lastModified", async () => {
    const { service } = stubDownloadService({
      versions: [
        {
          version: "v1.4.2",
          downloads: [
            { name: "Kazibee-mac-arm64.zip", href: "#", size: 20, lastModified: null },
          ],
        },
      ],
    });
    const feed = await new UpdateFeedService(service).createFeed("arm64");

    const pubDate = feed.releases[0].updateTo.pub_date;
    expect(Number.isNaN(Date.parse(pubDate))).toBe(false);
    expect(Math.abs(Date.now() - Date.parse(pubDate))).toBeLessThan(60_000);
  });

  it("falls back to 3600 when KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS is not a positive integer", async () => {
    process.env.KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS = "not-a-number";
    const { service, createDownload } = stubDownloadService(versionsFixture());
    await new UpdateFeedService(service).createFeed("arm64");

    expect(createDownload).toHaveBeenCalledWith("app", "v1.4.2", "Kazibee-mac-arm64.zip", { expiresIn: 3600 });
  });

  it("honours KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS override", async () => {
    process.env.KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS = "7200";
    const { service, createDownload } = stubDownloadService(versionsFixture());
    await new UpdateFeedService(service).createFeed("arm64");

    expect(createDownload).toHaveBeenCalledWith("app", "v1.4.2", "Kazibee-mac-arm64.zip", { expiresIn: 7200 });
  });
});

describe("normalizeUpdateArch", () => {
  it("normalizes known arch tokens", () => {
    expect(normalizeUpdateArch("arm64")).toBe("arm64");
    expect(normalizeUpdateArch("aarch64")).toBe("arm64");
    expect(normalizeUpdateArch("x64")).toBe("x64");
    expect(normalizeUpdateArch("amd64")).toBe("x64");
    expect(normalizeUpdateArch("x86_64")).toBe("x64");
  });

  it("rejects unknown arch tokens", () => {
    expect(normalizeUpdateArch("ia32")).toBeNull();
    expect(normalizeUpdateArch(undefined)).toBeNull();
    expect(normalizeUpdateArch("")).toBeNull();
  });
});

describe("UpdateFeedService (win32)", () => {
  function windowsVersions() {
    return {
      versions: [
        {
          version: "v0.8.7",
          downloads: [
            { name: "RELEASES", href: "#", size: 1, lastModified: null },
            { name: "Kazibee-0.8.7-full.nupkg", href: "#", size: 100, lastModified: null },
            { name: "Kazibee-0.8.7-win-x64-Setup.exe", href: "#", size: 100, lastModified: null },
          ],
        },
      ],
    };
  }

  function stubWindowsDownloadService(versions = windowsVersions()) {
    const createDownload = vi.fn(async () => ({ key: "k", url: "https://signed.example/pkg.nupkg" }));
    const listVersions = vi.fn(async () => versions);
    const readItemText = vi.fn(async () => "HASH Kazibee-0.8.7-full.nupkg 100\n");
    return {
      service: { createDownload, listVersions, readItemText } as unknown as DownloadService,
      createDownload,
      readItemText,
    };
  }

  it("serves the newest release's RELEASES manifest verbatim", async () => {
    const { service, readItemText } = stubWindowsDownloadService();
    const text = await new UpdateFeedService(service).createWindowsReleases("x64");
    expect(text).toBe("HASH Kazibee-0.8.7-full.nupkg 100\n");
    expect(readItemText).toHaveBeenCalledWith("app", "v0.8.7", "RELEASES");
  });

  it("404s when the newest release has no RELEASES manifest", async () => {
    const { service } = stubWindowsDownloadService({
      versions: [{ version: "v0.8.7", downloads: [{ name: "Kazibee-mac-arm64.zip", href: "#", size: 1, lastModified: null }] }],
    });
    await expect(new UpdateFeedService(service).createWindowsReleases("x64")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("presigns a nupkg from the version that contains it", async () => {
    const { service, createDownload } = stubWindowsDownloadService();
    const url = await new UpdateFeedService(service).createWindowsPackageDownload("x64", "Kazibee-0.8.7-full.nupkg");
    expect(url).toBe("https://signed.example/pkg.nupkg");
    expect(createDownload).toHaveBeenCalledWith("app", "v0.8.7", "Kazibee-0.8.7-full.nupkg", { expiresIn: 3600 });
  });

  it("rejects non-nupkg package names and unknown packages", async () => {
    const { service } = stubWindowsDownloadService();
    const feed = new UpdateFeedService(service);
    await expect(feed.createWindowsPackageDownload("x64", "evil.exe")).rejects.toThrow("Invalid update package name");
    await expect(feed.createWindowsPackageDownload("x64", "missing-full.nupkg")).rejects.toBeInstanceOf(NotFoundError);
  });
});
