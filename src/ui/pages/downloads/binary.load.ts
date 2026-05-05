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

interface RequestDataLike {
  params?: {
    kind?: string;
    version?: string;
  };
  url: string;
}

interface DownloadsResponse {
  versions?: VersionDownloads[];
}

type DownloadKind = "cli" | "app";

function resolveKindFromUrl(rawUrl: string): DownloadKind {
  try {
    const path = rawUrl.startsWith("http") ? new URL(rawUrl).pathname : rawUrl;
    return path.includes("/downloads/app") ? "app" : "cli";
  } catch {
    return "cli";
  }
}

export default async function load(req: RequestDataLike) {
  const kind = (req.params?.kind === "app" || req.params?.kind === "cli")
    ? req.params.kind as DownloadKind
    : resolveKindFromUrl(req.url);
  const selectedVersion = req.params?.version ?? "latest";

  try {
    const origin = req.url.startsWith("http") ? new URL(req.url).origin : "http://localhost:3000";
    const response = await fetch(`${origin}/downloads/binary/${kind}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        kind,
        versions: [],
        selectedVersion,
        error: "Downloads are not available right now.",
      };
    }

    const body = await response.json() as DownloadsResponse;
    return {
      kind,
      versions: body.versions ?? [],
      selectedVersion,
      error: null,
    };
  } catch {
    return {
      kind,
      versions: [],
      selectedVersion,
      error: "Downloads are not available right now.",
    };
  }
}
