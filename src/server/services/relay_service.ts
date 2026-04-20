import { Component, Inject } from "@noego/ioc";
import bcrypt from "bcryptjs";
import DeviceRepo from "../repo/device_repo";
import MessageRepo from "../repo/message_repo";
import MessageBus from "./message_bus";
import { ConflictError, NotFoundError, UnauthorizedError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";
import { getTrace } from "@noego/trace";

const logger = getLogger("kazibee:relay-service");

@Component()
export default class RelayService {
  private trace = getTrace('RelayService');

  constructor(
    @Inject(DeviceRepo) private deviceRepo: DeviceRepo,
    @Inject(MessageRepo) private messageRepo: MessageRepo,
    @Inject(MessageBus) private messageBus: MessageBus,
  ) {}

  /**
   * Authenticate a device by deviceId + raw authToken (Bearer token).
   * Compares against bcrypt hash stored in devices table.
   */
  async authenticateDevice(authToken: string) {
    // Extract all devices and check token against each.
    // Token format: sk_<hex>
    // This is a small personal relay so device count is low (2-5 devices).
    // A production system would use a token lookup index.

    // We need a way to find which device this token belongs to.
    // Since we bcrypt-hash the token, we cannot do a DB lookup.
    // Strategy: the authToken could embed a hint, or we iterate.

    // For efficiency, we'll use a simple approach:
    // On registration, we could store a token prefix for lookup.
    // But the current schema doesn't have that.
    // So we rely on the fact that device count is very small.

    // Actually, let's reconsider: we can require the client to send deviceId
    // in the session creation, and for message sending we already have a session.
    // The Bearer token auth path needs to identify the device.

    // Better approach: parse all devices for the moment. This is fine for
    // a personal relay with 2-5 devices.
    throw new Error("Use authenticateDeviceByIdAndToken for device auth");
  }

  /**
   * Authenticate a device by explicit deviceId + authToken.
   * Used when the client provides both (e.g., session creation).
   */
  async authenticateDeviceByIdAndToken(deviceId: string, authToken: string) {
    const device = await this.deviceRepo.findByDeviceId({ device_id: deviceId });
    if (!device) {
      this.trace.warn('auth.device-not-found', { deviceId });
      throw new NotFoundError("Device not found");
    }

    if (!device.auth_token_hash) {
      this.trace.warn('auth.no-token', { deviceId });
      throw new UnauthorizedError("Device has no auth token configured");
    }

    const valid = await bcrypt.compare(authToken, device.auth_token_hash);
    if (!valid) {
      this.trace.warn('auth.invalid-token', { deviceId });
      throw new UnauthorizedError("Invalid auth token");
    }

    this.trace.info('auth.ok', { deviceId, userId: device.user_id });
    await this.deviceRepo.updateLastSeen({ device_id: deviceId });
    return device;
  }

  /**
   * Persist a message and publish to bus.
   * Per spec section 7.3: persist-before-publish is required.
   */
  async sendMessage(params: {
    fromUserId: string;
    fromDeviceId: string;
    targetKind: string;
    targetUserId: string | null;
    targetDeviceId: string | null;
    type: string;
    requestId: string | null;
    correlationId: string | null;
    payload: unknown;
  }) {
    const payloadStr = params.payload ? JSON.stringify(params.payload) : null;

    // Idempotency check
    if (params.requestId) {
      const existing = await this.messageRepo.findByRequestId({
        from_device_id: params.fromDeviceId,
        request_id: params.requestId,
      });

      if (existing) {
        // Check if it is the same message (same type + target)
        const existingPayload = existing.payload;
        if (existing.type === params.type && existing.target_kind === params.targetKind) {
          logger.info("Idempotent retry detected, returning original", { requestId: params.requestId, messageId: existing.message_id });
          return {
            accepted: true,
            messageId: existing.message_id,
            createdAt: existing.created_at,
          };
        }
        // Different content with same requestId = conflict
        throw new ConflictError(`requestId '${params.requestId}' already used with different message content`);
      }
    }

    // Persist first
    await this.messageRepo.createMessage({
      from_user_id: params.fromUserId,
      from_device_id: params.fromDeviceId,
      target_kind: params.targetKind,
      target_user_id: params.targetUserId,
      target_device_id: params.targetDeviceId,
      type: params.type,
      request_id: params.requestId,
      correlation_id: params.correlationId,
      payload: payloadStr,
    });

    // Get the message_id from the last insert
    const { message_id: messageId } = await this.messageRepo.getLastInsertedId();

    // Fetch the full message for bus publish
    const message = await this.messageRepo.findByMessageId({ message_id: messageId });
    if (message) {
      this.messageBus.publish(message);
    }

    logger.info("Message persisted and published", { messageId, type: params.type, targetKind: params.targetKind });
    this.trace.info('sendMessage', {
      messageId, type: params.type, targetKind: params.targetKind, fromDeviceId: params.fromDeviceId,
    });

    return {
      accepted: true,
      messageId,
      createdAt: message?.created_at || new Date().toISOString(),
    };
  }

  /**
   * Get visible messages since a given messageId for a specific device/user.
   * Per spec section 7.2 visibility rules.
   */
  async getVisibleMessagesSince(deviceId: string, userId: string, sinceMessageId: number) {
    return this.messageRepo.findVisibleSince({
      device_id: deviceId,
      user_id: userId,
      since_message_id: sinceMessageId,
    });
  }
}
