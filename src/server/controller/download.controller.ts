import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import DownloadLogic from "../logic/download.logic";

const logger = getLogger("kazibee:download-controller");

@Component()
export default class DownloadController {
  constructor(@Inject(DownloadLogic) private downloadLogic: DownloadLogic) {}

  async downloadCliItem({ req, res }: { req: Request; res: Response }) {
    try {
      const { version, item } = req.params as { version?: string; item?: string };
      const result = await this.downloadLogic.createCliDownload(version ?? "", item ?? "");
      return res.redirect(302, result.url);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async listCliVersions({ res }: { res: Response }) {
    try {
      const result = await this.downloadLogic.listCliVersions();
      return res.json(result);
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

    logger.error("Unexpected error in download controller", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
}
