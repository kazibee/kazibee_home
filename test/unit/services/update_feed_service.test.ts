/**
 * UpdateFeedService over the original-config root testApp (updates module,
 * no server, no database). The service is the real production instance
 * resolved from the built root; its DownloadService boundary is controlled
 * through singular method replacements on the actual token and observed
 * through the watched histories. Cases that pin the expiry override set
 * process.env before the root is built (the service reads it at
 * construction). resourceCase owns environment cleanup. normalizeUpdateArch is
 * a pure export and needs no application.
 */
import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import DownloadService from "../../../src/server/services/download_service";
import type { VersionsResult } from "../../../src/server/services/download_service";
import UpdateFeedService, { normalizeUpdateArch } from "../../../src/server/services/update_feed_service";
import { NotFoundError } from "../../../src/server/errors/domain_errors";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["updates"] } } as const;

type AppEnv = Awaited<ReturnType<ReturnType<typeof testApp>["build"]>>;

// DownloadService boundary: a reusable replacement description (singular
// method controls on the actual token), not an application constructor.
const downloads = (versions: VersionsResult, url = "https://signed.example/download.zip") => testStub()
  .method(DownloadService, "createDownload", control.returns(Promise.resolve({ key: "app/v1.4.2/Kazibee-mac-arm64.zip", url })))
  .method(DownloadService, "listVersions", control.returns(Promise.resolve(versions)));

// Recorded argument lists of one watched DownloadService method.
const calls = (env: AppEnv, method: string) =>
  control.inspect(env, DownloadService, method).calls.map((call) => call.args);

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

  it("builds a Squirrel.Mac feed for the newest non-latest version (arm64)", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(versionsFixture())).build());
    const feed = await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("arm64");

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
    expect(calls(env, "createDownload")).toContainEqual(["app", "v1.4.2", "Kazibee-mac-arm64.zip", { expiresIn: 3600 }]);
  }));

  it("selects the x64 archive for x64", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(versionsFixture())).build());
    await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("x64");

    expect(calls(env, "createDownload")).toContainEqual(["app", "v1.4.2", "Kazibee-mac-x64.zip", { expiresIn: 3600 }]);
  }));

  // A release candidate for the NEXT version sits above the published stable
  // release; a finished candidate sits below its own final version. The
  // listing is deliberately in plain string order (candidate first), which is
  // the order that leaked candidates to every user before channels existed.
  function candidateVersions(): VersionsResult {
    const zip = (lastModified: string) => [{ name: "Kazibee-mac-arm64.zip", href: "#", size: 20, lastModified }];
    return {
      versions: [
        { version: "v1.4.2-rc20260801-1", downloads: zip("2026-08-01T00:00:00.000Z") },
        { version: "v1.5.0-rc20260920-2", downloads: zip("2026-09-20T02:00:00.000Z") },
        { version: "v1.5.0-rc20260920-10", downloads: zip("2026-09-20T10:00:00.000Z") },
        { version: "v1.4.2", downloads: zip("2026-08-09T00:00:00.000Z") },
      ],
    };
  }

  it("never offers a release candidate on the stable channel", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(candidateVersions())).build());
    const feed = await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("arm64");

    expect(feed.currentRelease).toBe("1.4.2");
  }));

  it("offers the newest release candidate on the beta channel", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(candidateVersions())).build());
    const feed = await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("arm64", "beta");

    expect(feed.currentRelease).toBe("1.5.0-rc20260920-10");
  }));

  it("moves the beta channel onto the final release once it ships", resourceCase(async (scope) => {
    const versions = candidateVersions();
    versions.versions.push({
      version: "v1.5.0",
      downloads: [{ name: "Kazibee-mac-arm64.zip", href: "#", size: 20, lastModified: "2026-09-25T00:00:00.000Z" }],
    });
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(versions)).build());
    const service = await env.get<UpdateFeedService>(UpdateFeedService);

    expect((await service.createFeed("arm64", "beta")).currentRelease).toBe("1.5.0");
    expect((await service.createFeed("arm64", "stable")).currentRelease).toBe("1.5.0");
  }));

  it("throws NotFoundError when no versions exist", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads({ versions: [] })).build());
    const service = await env.get<UpdateFeedService>(UpdateFeedService);
    await expect(service.createFeed("arm64")).rejects.toBeInstanceOf(NotFoundError);
  }));

  it("throws NotFoundError when the newest version has no matching mac zip", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads({
      versions: [
        {
          version: "v1.4.2",
          downloads: [
            { name: "Kazibee-1.4.2-arm64.dmg", href: "#", size: 30, lastModified: null },
            { name: "Kazibee-win32-x64.msi", href: "#", size: 30, lastModified: null },
          ],
        },
      ],
    })).build());
    const service = await env.get<UpdateFeedService>(UpdateFeedService);
    await expect(service.createFeed("arm64")).rejects.toBeInstanceOf(NotFoundError);
  }));

  it("falls back to the current time when the archive has no lastModified", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads({
      versions: [
        {
          version: "v1.4.2",
          downloads: [
            { name: "Kazibee-mac-arm64.zip", href: "#", size: 20, lastModified: null },
          ],
        },
      ],
    })).build());
    const feed = await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("arm64");

    const pubDate = feed.releases[0].updateTo.pub_date;
    expect(Number.isNaN(Date.parse(pubDate))).toBe(false);
    expect(Math.abs(Date.now() - Date.parse(pubDate))).toBeLessThan(60_000);
  }));

  it("falls back to 3600 when KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS is not a positive integer", resourceCase(async (scope) => {
    process.env.KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS = "not-a-number";
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(versionsFixture())).build());
    await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("arm64");

    expect(calls(env, "createDownload")).toContainEqual(["app", "v1.4.2", "Kazibee-mac-arm64.zip", { expiresIn: 3600 }]);
  }));

  it("honours KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS override", resourceCase(async (scope) => {
    process.env.KAZIBEE_UPDATE_FEED_EXPIRES_SECONDS = "7200";
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(downloads(versionsFixture())).build());
    await (await env.get<UpdateFeedService>(UpdateFeedService)).createFeed("arm64");

    expect(calls(env, "createDownload")).toContainEqual(["app", "v1.4.2", "Kazibee-mac-arm64.zip", { expiresIn: 7200 }]);
  }));
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

  // Windows DownloadService boundary description (createDownload, listVersions, readItemText).
  const windowsDownloads = (versions = windowsVersions()) => testStub()
    .method(DownloadService, "createDownload", control.returns(Promise.resolve({ key: "k", url: "https://signed.example/pkg.nupkg" })))
    .method(DownloadService, "listVersions", control.returns(Promise.resolve(versions)))
    .method(DownloadService, "readItemText", control.returns(Promise.resolve("HASH Kazibee-0.8.7-full.nupkg 100\n")));

  it("serves the newest release's RELEASES manifest verbatim", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(windowsDownloads()).build());
    const text = await (await env.get<UpdateFeedService>(UpdateFeedService)).createWindowsReleases("x64");
    expect(text).toBe("HASH Kazibee-0.8.7-full.nupkg 100\n");
    expect(calls(env, "readItemText")).toContainEqual(["app", "v0.8.7", "RELEASES"]);
  }));

  it("404s when the newest release has no RELEASES manifest", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(windowsDownloads({
      versions: [{ version: "v0.8.7", downloads: [{ name: "Kazibee-mac-arm64.zip", href: "#", size: 1, lastModified: null }] }],
    })).build());
    const service = await env.get<UpdateFeedService>(UpdateFeedService);
    await expect(service.createWindowsReleases("x64")).rejects.toBeInstanceOf(NotFoundError);
  }));

  it("presigns a nupkg from the version that contains it", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(windowsDownloads()).build());
    const url = await (await env.get<UpdateFeedService>(UpdateFeedService))
      .createWindowsPackageDownload("x64", "Kazibee-0.8.7-full.nupkg");
    expect(url).toBe("https://signed.example/pkg.nupkg");
    expect(calls(env, "createDownload")).toContainEqual(["app", "v0.8.7", "Kazibee-0.8.7-full.nupkg", { expiresIn: 3600 }]);
  }));

  it("rejects non-nupkg package names and unknown packages", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(windowsDownloads()).build());
    const feed = await env.get<UpdateFeedService>(UpdateFeedService);
    await expect(feed.createWindowsPackageDownload("x64", "evil.exe")).rejects.toThrow("Invalid update package name");
    await expect(feed.createWindowsPackageDownload("x64", "missing-full.nupkg")).rejects.toBeInstanceOf(NotFoundError);
  }));
});
