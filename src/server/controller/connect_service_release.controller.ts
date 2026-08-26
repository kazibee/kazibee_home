import { Component, Inject } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import ConnectServiceReleaseLogic from "../logic/connect_service_release.logic";
import { parseServiceReleaseResolveRequest } from "../services/connect_service_release_resolver";

const logger = getLogger("kazibee:connect-service-release-controller");

@Component()
export default class ConnectServiceReleaseController {
  constructor(@Inject(ConnectServiceReleaseLogic) private logic: ConnectServiceReleaseLogic) {}

  /** Public resolver endpoint: closed request parsing, closed failures —
   *  malformed, incomplete, revoked, and incompatible requests disclose no
   *  artifact details. */
  async resolve({ req, res }: { req: Request; res: Response }) {
    try {
      const parsed = parseServiceReleaseResolveRequest(req.body);
      if (!parsed.ok) {
        return res.status(400).json({ error: true, code: "invalid-request" });
      }
      const candidate = await this.logic.resolve(parsed.value);
      return res.json(candidate);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): Response {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: true, code: "invalid-request" });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: true, code: "no-compatible-release" });
    }

    logger.error("Unexpected error in connect service release controller", error);
    return res.status(500).json({ error: true, code: "internal-error" });
  }
}
