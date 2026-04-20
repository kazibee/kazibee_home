import { Component, Inject } from "@noego/ioc";
import PairingService from "../services/pairing_service";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:pairing-logic");

@Component()
export default class PairingLogic {
  constructor(@Inject(PairingService) private pairingService: PairingService) {}

  async registerDevice(deviceName: string | null, deviceType: string | null) {
    logger.info("registerDevice called", { deviceName, deviceType });
    return this.pairingService.registerDevice(deviceName, deviceType);
  }

  async claimPairing(pairingCode: string, deviceName: string | null, deviceType: string | null) {
    logger.info("claimPairing called", { pairingCode });
    return this.pairingService.claimPairing(pairingCode, deviceName, deviceType);
  }

  async getDevicesForUser(userId: string, currentDeviceId: string) {
    logger.info("getDevicesForUser called", { userId });
    return this.pairingService.getDevicesForUser(userId, currentDeviceId);
  }
}
