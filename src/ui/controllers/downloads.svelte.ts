import { Component } from '@noego/ioc/framework/decorators/Component';
import { LoadAs } from '@noego/ioc/framework/implementation/LoadAs';
type DownloadKind = "cli" | "app";

interface DownloadItem {
  name: string;
  href: string;
  size: number;
  lastModified: string | null;
}

interface VersionDownloads {
  version: string;
  downloads: DownloadItem[];
}

interface DownloadsData {
  kind: DownloadKind;
  versions: VersionDownloads[];
  selectedVersion: string;
  isLoading: boolean;
  error: string | null;
  /** Whether release candidates (pre-release versions) are listed. */
  showBeta: boolean;
}

interface DownloadsInput {
  refresh(): Promise<void>;
  setShowBeta(showBeta: boolean): void;
}

/** A version folder carrying a pre-release tag, e.g. `v0.9.2-rc20260920-1`. */
export function isBetaVersion(version: string): boolean {
  return /^v?\d+\.\d+\.\d+-/.test(version);
}

interface DownloadsResponse {
  versions?: VersionDownloads[];
  message?: string;
}

@Component({ scope: LoadAs.Scoped })
export default class DownloadsController {
  data: DownloadsData = $state({
    kind: "cli",
    versions: [],
    selectedVersion: "latest",
    isLoading: false,
    error: null,
    showBeta: false,
  });

  input: DownloadsInput = {
    setShowBeta: (showBeta: boolean) => {
      this.data.showBeta = showBeta;
    },
    refresh: async () => {
      this.data.isLoading = true;
      this.data.error = null;

      try {
        const response = await fetch(`/downloads/binary/${this.data.kind}`, {
          headers: { Accept: "application/json" },
        });
        const body = await response.json() as DownloadsResponse;

        if (!response.ok) {
          throw new Error(body.message ?? "Failed to load downloads");
        }

        this.data.versions = body.versions ?? [];
      } catch (error) {
        this.data.error = error instanceof Error ? error.message : "Failed to load downloads";
      } finally {
        this.data.isLoading = false;
      }
    },
  };

  initialize(loadData: { kind?: DownloadKind; versions?: VersionDownloads[]; selectedVersion?: string; error?: string | null }) {
    this.data.kind = loadData.kind ?? "cli";
    this.data.versions = loadData.versions ?? [];
    this.data.selectedVersion = loadData.selectedVersion ?? "latest";
    this.data.error = loadData.error ?? null;
    // A direct link to a release candidate opens with beta versions listed.
    this.data.showBeta = isBetaVersion(this.data.selectedVersion);
  }

  destroy() {
    // No cleanup needed
  }
}
