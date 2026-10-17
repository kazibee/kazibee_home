import { Component, Inject } from "@noego/ioc";
import StatusRepo from "../repo/status_repo";
import type { RepoFailure } from "../repo/repo_failure";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:status-service");

@Component()
export default class StatusService {
  constructor(@Inject(StatusRepo) private statusRepo: StatusRepo) {}

  getStatus() {
    return { status: "OK" };
  }

  async getDatabaseStatus() {
    const checked = await this.statusRepo.checkDatabase();
    if (!checked.ok) return this.disconnected(checked.error);
    if (checked.value?.result === 1) {
      return { status: "OK", database: "connected" };
    }
    return { status: "ERROR", database: "unexpected response" };
  }

  /** The health query failed: report the database as disconnected, with the reason. */
  private disconnected(failure: RepoFailure) {
    logger.error("Database health check failed", failure.cause);
    return { status: "ERROR", database: "disconnected", error: String(failure.cause) };
  }

}
