import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import type { Beacon } from "@noego/beacon";
import { BeaconExpressHandler } from "@noego/beacon";
import { BEACON } from "../beacon_instance";

@Component()
export default class PairingController {
  constructor(
    @Inject(BEACON) private beacon: Beacon,
  ) {}

  async createPairing({ req, res }: { req: Request; res: Response }) {
    await BeaconExpressHandler.dispatch(this.beacon, 'pair.register', req, res);
  }

  async claimPairing({ req, res }: { req: Request; res: Response }) {
    await BeaconExpressHandler.dispatch(this.beacon, 'pair.claim', req, res);
  }

  async listDevices({ req, res }: { req: Request; res: Response }) {
    await BeaconExpressHandler.dispatch(this.beacon, 'devices.list', req, res);
  }
}
