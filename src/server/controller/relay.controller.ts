import { Component } from "@noego/ioc";
import type { Response } from "express";

@Component()
export default class RelayController {
  async createSession({ res }: { res: Response }) {
    return this.disabled(res);
  }

  async sendMessage({ res }: { res: Response }) {
    return this.disabled(res);
  }

  async streamEvents({ res }: { res: Response }) {
    return this.disabled(res);
  }

  private disabled(res: Response) {
    return res.status(503).json({
      error: true,
      message: "Relay service is currently disabled",
    });
  }
}
