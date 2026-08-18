import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import UpdateLogic from "../logic/update.logic";
import { normalizeUpdateArch } from "../services/update_feed_service";

const logger = getLogger("kazibee:update-controller");

@Component()
export default class UpdateController {
  constructor(@Inject(UpdateLogic) private updateLogic: UpdateLogic) {}

  async releasesFeed({ req, res }: { req: Request; res: Response }) {
    try {
      const { arch } = req.params as { arch?: string };
      const normalizedArch = normalizeUpdateArch(arch);
      if (!normalizedArch) {
        throw new ValidationError("Invalid update arch");
      }
      const feed = await this.updateLogic.createFeed(normalizedArch);
      return res.json(feed);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async windowsReleases({ req, res }: { req: Request; res: Response }) {
    try {
      const { arch } = req.params as { arch?: string };
      const normalizedArch = normalizeUpdateArch(arch);
      if (!normalizedArch) {
        throw new ValidationError("Invalid update arch");
      }
      const manifest = await this.updateLogic.createWindowsReleases(normalizedArch);
      res.setHeader("content-type", "text/plain");
      return res.send(manifest);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async windowsPackage({ req, res }: { req: Request; res: Response }) {
    try {
      const { arch, file } = req.params as { arch?: string; file?: string };
      const normalizedArch = normalizeUpdateArch(arch);
      if (!normalizedArch) {
        throw new ValidationError("Invalid update arch");
      }
      const url = await this.updateLogic.createWindowsPackageDownload(normalizedArch, file ?? "");
      return res.redirect(302, url);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): Response {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: true, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: true, message: error.message });
    }

    logger.error("Unexpected error in update controller", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
}
