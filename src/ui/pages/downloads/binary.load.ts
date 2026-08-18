// Page loader for /downloads/{cli,app}.
//
// Loaders run on the server during SSR (Node and the Cloudflare worker). They
// must NEVER call the application over HTTP (fetch to our own origin) — forge
// rejects that at runtime. Resolve the service from the IoC container instead.
import container from "../../../server/container";
import DownloadService, {
  type DownloadKind,
  type VersionDownloads,
} from "../../../server/services/download_service";

interface RequestDataLike {
  params?: {
    kind?: string;
    version?: string;
  };
  request: { url: string };
}

function resolveKindFromUrl(rawUrl: string): DownloadKind {
  try {
    const path = rawUrl.startsWith("http") ? new URL(rawUrl).pathname : rawUrl;
    return path.includes("/downloads/app") ? "app" : "cli";
  } catch {
    return "cli";
  }
}

export default async function load(req: RequestDataLike): Promise<{
  kind: DownloadKind;
  versions: VersionDownloads[];
  selectedVersion: string;
  error: string | null;
}> {
  const kind = (req.params?.kind === "app" || req.params?.kind === "cli")
    ? req.params.kind as DownloadKind
    : resolveKindFromUrl(req.request.url);
  const selectedVersion = req.params?.version ?? "latest";

  try {
    const service = await container.get<DownloadService>(DownloadService);
    const { versions } = await service.listVersions(kind);
    return { kind, versions, selectedVersion, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind,
      versions: [],
      selectedVersion,
      error: `Downloads are not available right now (${message}).`,
    };
  }
}
