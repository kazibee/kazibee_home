import { Component, Inject } from "@noego/ioc";
import StatusService from "../services/status_service";
import type { Actor } from "../types/actor";
import { ForbiddenError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:status-logic");

/**
 * StatusLogic - Business logic layer for status operations
 *
 * The logic layer sits between controllers and services:
 * - Controllers handle HTTP request/response concerns
 * - Logic handles authorization, business rules, and orchestration
 * - Services handle data operations and external integrations
 *
 * All public methods receive an Actor parameter for authorization decisions.
 */
@Component()
export default class StatusLogic {
  constructor(@Inject(StatusService) private statusService: StatusService) {}

  /**
   * Get basic application status
   * Public endpoint - no authorization required
   */
  getStatus(actor: Actor) {
    logger.debug("getStatus called", { actorId: actor.id, isSystem: actor.isSystem });
    return this.statusService.getStatus();
  }

  /**
   * Get database connection status
   * Requires admin role - demonstrates authorization pattern
   */
  async getDatabaseStatus(actor: Actor) {
    logger.debug("getDatabaseStatus called", { actorId: actor.id, role: actor.role });

    // Authorization: only admins can check database status
    if (!actor.isSystem && actor.role !== "admin") {
      throw new ForbiddenError("Only administrators can check database status");
    }

    return this.statusService.getDatabaseStatus();
  }

  /**
   * Get the framework name
   * Public endpoint - no authorization required
   */
  async getFrameworkName(actor: Actor): Promise<string> {
    logger.debug("getFrameworkName called", { actorId: actor.id });
    return this.statusService.getFrameworkName();
  }
}
