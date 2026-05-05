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
  versions: VersionDownloads[];
  selectedVersion: string;
  isLoading: boolean;
  error: string | null;
}

interface DownloadsInput {
  refresh(): Promise<void>;
}

interface DownloadsResponse {
  versions?: VersionDownloads[];
  message?: string;
}

export default class DownloadsController {
  data: DownloadsData = $state({
    versions: [],
    selectedVersion: "latest",
    isLoading: false,
    error: null,
  });

  input: DownloadsInput = {
    refresh: async () => {
      this.data.isLoading = true;
      this.data.error = null;

      try {
        const response = await fetch("/downloads/binary", {
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

  initialize(loadData: { versions?: VersionDownloads[]; selectedVersion?: string; error?: string | null }) {
    this.data.versions = loadData.versions ?? [];
    this.data.selectedVersion = loadData.selectedVersion ?? "latest";
    this.data.error = loadData.error ?? null;
  }

  destroy() {
    // No cleanup needed
  }
}
