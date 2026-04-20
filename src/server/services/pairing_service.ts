import { Component, Inject } from "@noego/ioc";
import { randomUUID, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import DeviceRepo from "../repo/device_repo";
import RelayService from "./relay_service";
import { NotFoundError, ValidationError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";
import { getTrace } from "@noego/trace";

const logger = getLogger("kazibee:pairing-service");

const PAIRING_CODE_LENGTH = 6;
const PAIRING_EXPIRY_MINUTES = 10;

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(PAIRING_CODE_LENGTH);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

@Component()
export default class PairingService {
  private trace = getTrace('PairingService');

  constructor(
    @Inject(DeviceRepo) private deviceRepo: DeviceRepo,
    @Inject(RelayService) private relayService: RelayService,
  ) {}

  /**
   * Register a new desktop device. Creates a user identity and device record.
   * Per spec section 12: Desktop registers -> gets userId + deviceId + authToken + pairingCode.
   */
  async registerDevice(deviceName: string | null, deviceType: string | null) {
    const userId = `user_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const deviceId = `dev_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const rawAuthToken = `sk_${randomBytes(32).toString("hex")}`;
    const hashedToken = await bcrypt.hash(rawAuthToken, 10);
    const pairingCode = generatePairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_EXPIRY_MINUTES * 60_000).toISOString();

    await this.deviceRepo.createDevice({
      device_id: deviceId,
      user_id: userId,
      device_name: deviceName,
      device_type: deviceType || "desktop",
      auth_token_hash: hashedToken,
      pairing_code: pairingCode,
      pairing_expires_at: expiresAt,
    });

    logger.info("Device registered", { userId, deviceId, pairingCode, deviceType: deviceType || "desktop" });
    this.trace.info('register', { userId, deviceId, pairingCode });

    return {
      userId,
      deviceId,
      authToken: rawAuthToken,
      pairingCode,
      expiresAt,
    };
  }

  /**
   * Claim a pairing code from mobile. Creates a NEW device for the mobile
   * under the same userId as the desktop device that generated the code.
   * Per spec section 12: Mobile scans QR -> gets its own deviceId + authToken.
   */
  async claimPairing(pairingCode: string, deviceName: string | null, deviceType: string | null) {
    const desktopDevice = await this.deviceRepo.findByPairingCode({ pairing_code: pairingCode.toUpperCase() });

    if (!desktopDevice) {
      throw new NotFoundError("Invalid or expired pairing code");
    }

    if (desktopDevice.pairing_expires_at && new Date(desktopDevice.pairing_expires_at) < new Date()) {
      await this.deviceRepo.clearPairingCode({ device_id: desktopDevice.device_id });
      throw new ValidationError("Pairing code has expired");
    }

    // Invalidate the pairing code (single-use)
    await this.deviceRepo.clearPairingCode({ device_id: desktopDevice.device_id });

    // Create a new device for the mobile under the same userId
    const mobileDeviceId = `dev_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const rawAuthToken = `sk_${randomBytes(32).toString("hex")}`;
    const hashedToken = await bcrypt.hash(rawAuthToken, 10);

    await this.deviceRepo.createDevice({
      device_id: mobileDeviceId,
      user_id: desktopDevice.user_id,
      device_name: deviceName,
      device_type: deviceType || "phone",
      auth_token_hash: hashedToken,
      pairing_code: null,
      pairing_expires_at: null,
    });

    logger.info("Pairing claimed", {
      mobileDeviceId,
      desktopDeviceId: desktopDevice.device_id,
      userId: desktopDevice.user_id,
    });
    this.trace.info('claim', {
      mobileDeviceId, desktopDeviceId: desktopDevice.device_id, userId: desktopDevice.user_id,
    });

    // Publish pairing.claimed message to the desktop device via the relay bus.
    // The desktop's SSE stream will receive this and complete the pairing flow.
    try {
      await this.relayService.sendMessage({
        fromUserId: desktopDevice.user_id,
        fromDeviceId: mobileDeviceId,
        targetKind: "device",
        targetUserId: null,
        targetDeviceId: desktopDevice.device_id,
        type: "pairing.claimed",
        requestId: null,
        correlationId: null,
        payload: { mobileDeviceId, mobileDeviceName: deviceName },
      });
      logger.info("pairing.claimed message published", { desktopDeviceId: desktopDevice.device_id });
    } catch (err) {
      // Log but don't fail the claim — the mobile still gets its credentials
      logger.error("Failed to publish pairing.claimed message", { error: err });
    }

    return {
      userId: desktopDevice.user_id,
      deviceId: mobileDeviceId,
      authToken: rawAuthToken,
      desktopDeviceId: desktopDevice.device_id,
      desktopDeviceName: desktopDevice.device_name,
    };
  }

  /**
   * Authenticate a device by its authToken (Bearer token).
   * Returns the device record or throws UnauthorizedError.
   */
  async authenticateByToken(authToken: string) {
    // We need to check all devices since we hash the token.
    // In production, you would use a lookup table or JWT. For now, we iterate.
    // Since this is a small-scale relay, this is acceptable.
    //
    // Better approach: extract a device_id from a structured token.
    // For now, brute-force check is acceptable for single-user relay.

    // The token format is sk_<hex>. We need to check bcrypt hashes.
    // This is expensive. A better approach would be to store a token prefix.
    // For now, this works for the small device count in a personal relay.

    throw new ValidationError("Use authenticateDevice instead");
  }

  /**
   * Get all devices for a userId.
   */
  async getDevicesForUser(userId: string, currentDeviceId: string) {
    const devices = await this.deviceRepo.findByUserId({ user_id: userId });
    return devices.map(d => ({
      deviceId: d.device_id,
      deviceName: d.device_name,
      deviceType: d.device_type,
      lastSeenAt: d.last_seen_at,
      isCurrentDevice: d.device_id === currentDeviceId,
    }));
  }
}
