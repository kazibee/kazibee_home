import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { getContainer } from "@noego/app";
import DeviceRepo from "../../server/repo/device_repo";
import MobileSessionRepo from "../../server/repo/mobile_session_repo";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:device-middleware");

/**
 * Middleware that validates X-Device-Id + X-Device-Secret headers.
 * Attaches the device record to req.device on success.
 */
export async function isDevice(
  req: Request & { device?: any },
  res: Response,
  next: NextFunction
) {
  try {
    const deviceId = req.headers["x-device-id"] as string;
    const deviceSecret = req.headers["x-device-secret"] as string;

    if (!deviceId || !deviceSecret) {
      return res.status(401).json({ error: true, message: "Device credentials required" });
    }

    const container = getContainer();
    const deviceRepo = container.instance(DeviceRepo);
    const device = await deviceRepo.findByDeviceId({ device_id: deviceId });

    if (!device) {
      return res.status(401).json({ error: true, message: "Unknown device" });
    }

    const valid = await bcrypt.compare(deviceSecret, device.device_secret);
    if (!valid) {
      return res.status(401).json({ error: true, message: "Invalid device credentials" });
    }

    req.device = device;
    await deviceRepo.updateLastSeen({ device_id: deviceId });

    return next();
  } catch (err) {
    logger.error("Device auth error", err);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
}

/**
 * Middleware that validates Authorization: Bearer <sessionToken>.
 * Attaches the mobile session to req.mobileSession on success.
 */
export async function isMobile(
  req: Request & { mobileSession?: any },
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (typeof header !== "string" || !header.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ error: true, message: "Bearer token required" });
    }

    const token = header.slice(7).trim();
    const container = getContainer();
    const sessionRepo = container.instance(MobileSessionRepo);
    const session = await sessionRepo.findByToken({ session_token: token });

    if (!session) {
      return res.status(401).json({ error: true, message: "Invalid or expired session" });
    }

    req.mobileSession = session;
    return next();
  } catch (err) {
    logger.error("Mobile auth error", err);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
}
