import { Component } from "@noego/ioc";
import type { Response } from "express";

@Component()
export default class PairingController {
  async createPairing({ res }: { res: Response }) {
    return this.disabled(res);
  }

  async claimPairing({ res }: { res: Response }) {
    return this.disabled(res);
  }

  async listDevices({ res }: { res: Response }) {
    return this.disabled(res);
  }

  private disabled(res: Response) {
    return res.status(503).json({
      error: true,
      message: "Pairing service is currently disabled",
    });
  }
}
