import { Component, Inject } from "@noego/ioc";
import StatusRepo from "../repo/status_repo";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:status-service");

@Component()
export default class StatusService {
  constructor(@Inject(StatusRepo) private statusRepo: StatusRepo) {}

  getStatus() {
    return { status: "OK" };
  }

  async getDatabaseStatus() {
    try {
      const result = await this.statusRepo.checkDatabase();
      if (result?.result === 1) {
        return { status: "OK", database: "connected" };
      }
      return { status: "ERROR", database: "unexpected response" };
    } catch (error) {
      logger.error("Database health check failed", error);
      return { status: "ERROR", database: "disconnected", error: String(error) };
    }
  }

  async getFrameworkName(): Promise<string> {
    const result = await this.statusRepo.getFrameworkName();
    return result.name;
  }
}
