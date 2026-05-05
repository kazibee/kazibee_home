import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import type { Request, Response } from "express";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import DownloadLogic from "../logic/download.logic";
import { isDownloadKind } from "../services/download_service";

const logger = getLogger("kazibee:download-controller");

@Component()
export default class DownloadController {
  constructor(@Inject(DownloadLogic) private downloadLogic: DownloadLogic) {}

  async downloadItem({ req, res }: { req: Request; res: Response }) {
    try {
      const { kind, version, item } = req.params as { kind?: string; version?: string; item?: string };
      if (!isDownloadKind(kind)) {
        throw new ValidationError("Invalid download kind");
      }
      const result = await this.downloadLogic.createDownload(kind, version ?? "", item ?? "");
      return res.redirect(302, result.url);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async listVersions({ req, res }: { req: Request; res: Response }) {
    try {
      const { kind } = req.params as { kind?: string };
      if (!isDownloadKind(kind)) {
        throw new ValidationError("Invalid download kind");
      }
      const result = await this.downloadLogic.listVersions(kind);
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
