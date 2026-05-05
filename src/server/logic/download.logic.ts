import { Component, Inject } from "@noego/ioc";
import DownloadService from "../services/download_service";

@Component()
export default class DownloadLogic {
  constructor(@Inject(DownloadService) private downloadService: DownloadService) {}

  async createCliDownload(version: string, item: string) {
    return this.downloadService.createCliDownload(version, item);
  }

  async listCliVersions() {
    return this.downloadService.listCliVersions();
  }
}
