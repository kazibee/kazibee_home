import { Component, Inject } from "@noego/ioc";
import type { UpdateChannel } from "../services/release_version";
import UpdateFeedService, { type UpdateArch } from "../services/update_feed_service";

@Component()
export default class UpdateLogic {
  constructor(@Inject(UpdateFeedService) private updateFeedService: UpdateFeedService) {}

  async createFeed(arch: UpdateArch, channel: UpdateChannel = "stable") {
    return this.updateFeedService.createFeed(arch, channel);
  }

  async createWindowsReleases(arch: UpdateArch, channel: UpdateChannel = "stable") {
    return this.updateFeedService.createWindowsReleases(arch, channel);
  }

  async createWindowsPackageDownload(arch: UpdateArch, file: string) {
    return this.updateFeedService.createWindowsPackageDownload(arch, file);
  }
}
