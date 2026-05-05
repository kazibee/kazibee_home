import container from "../../../server/container";
import DownloadLogic from "../../../server/logic/download.logic";

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
    version?: string;
  };
  url: string;
}

interface DownloadsResponse {
  versions?: VersionDownloads[];
}

export default async function load(req: RequestDataLike) {
  const selectedVersion = req.params?.version ?? "latest";

  try {
    const downloadLogic = await container.instance(DownloadLogic);
    const body = await downloadLogic.listCliVersions() as DownloadsResponse;
    return {
      versions: body.versions ?? [],
      selectedVersion,
      error: null,
    };
  } catch {
    return {
      versions: [],
      selectedVersion,
      error: "Downloads are not available right now.",
    };
  }
}
