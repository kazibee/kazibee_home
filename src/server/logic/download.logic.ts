import { Component, Inject } from "@noego/ioc";
import DownloadService, { type DownloadKind } from "../services/download_service";

@Component()
export default class DownloadLogic {
  constructor(@Inject(DownloadService) private downloadService: DownloadService) {}

  async createDownload(kind: DownloadKind, version: string, item: string) {
    return this.downloadService.createDownload(kind, version, item);
  }

  async listVersions(kind: DownloadKind) {
    return this.downloadService.listVersions(kind);
  }
}
