import { Component, Inject } from "@noego/ioc";
import UpdateFeedService, { type UpdateArch } from "../services/update_feed_service";

@Component()
export default class UpdateLogic {
  constructor(@Inject(UpdateFeedService) private updateFeedService: UpdateFeedService) {}

  async createFeed(arch: UpdateArch) {
    return this.updateFeedService.createFeed(arch);
  }

  async createWindowsReleases(arch: UpdateArch) {
    return this.updateFeedService.createWindowsReleases(arch);
  }

  async createWindowsPackageDownload(arch: UpdateArch, file: string) {
    return this.updateFeedService.createWindowsPackageDownload(arch, file);
  }
}
