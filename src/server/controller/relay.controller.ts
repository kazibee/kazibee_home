import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import type { Beacon } from "@noego/beacon";
import { BeaconExpressHandler } from "@noego/beacon";
import { BEACON } from "../beacon_instance";

@Component()
export default class RelayController {
  constructor(
    @Inject(BEACON) private beacon: Beacon,
  ) {}

  async createSession({ req, res }: { req: Request; res: Response }) {
    await BeaconExpressHandler.dispatch(this.beacon, 'sessions.create', req, res);
  }

  async sendMessage({ req, res }: { req: Request; res: Response }) {
    await BeaconExpressHandler.dispatch(this.beacon, 'messages.send', req, res);
  }

  async streamEvents({ req, res }: { req: Request; res: Response }) {
    await BeaconExpressHandler.dispatch(this.beacon, 'events.stream', req, res);
  }
}
