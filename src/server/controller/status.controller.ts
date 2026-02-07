import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import StatusLogic from "../logic/status.logic";
import { createActor, GUEST_ACTOR, type Actor } from "../types/actor";
import { ForbiddenError, UnauthorizedError, NotFoundError, ValidationError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:status-controller");

/**
 * StatusController - HTTP layer for status endpoints
 *
 * Controllers handle:
 * - Request parsing and validation
 * - Building Actor from authenticated user
 * - Calling logic layer methods
 * - Mapping domain errors to HTTP responses
 * - Response formatting
 */
@Component()
export default class StatusController {
  constructor(@Inject(StatusLogic) private statusLogic: StatusLogic) {}

  /**
   * Build an Actor from the request's authenticated user
   */
  private buildActor(req: Request & { user?: { id: number; email?: string; role?: string } }): Actor {
    if (req.user) {
      return createActor(req.user);
    }
    return GUEST_ACTOR;
  }

  /**
   * Handle domain errors and map to appropriate HTTP responses
   */
  private handleError(error: unknown, res: Response): Response {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ error: true, message: error.message });
    }
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: true, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: true, message: error.message });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: true, message: error.message });
    }

    // Log unexpected errors
    logger.error("Unexpected error in status controller", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }

  async getStatus({ req, res }: { req: Request; res: Response }) {
    try {
      const actor = this.buildActor(req);
      const result = this.statusLogic.getStatus(actor);
      return res.json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  async getDatabaseStatus({ req, res }: { req: Request; res: Response }) {
    try {
      const actor = this.buildActor(req);
      const result = await this.statusLogic.getDatabaseStatus(actor);
      return res.json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }
}
