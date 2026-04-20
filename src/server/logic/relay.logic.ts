import { Component, Inject, LoadAs } from "@noego/ioc";
import RelayService from "../services/relay_service";
import SessionService from "../services/session_service";
import SSEConnectionManager from "../services/sse_connection_manager";
import MessageBus from "../services/message_bus";
import { getLogger } from "@noego/logger";

const logger = getLogger("kazibee:relay-logic");

@Component({ scope: LoadAs.Singleton })
export default class RelayLogic {
  private busSubscribed = false;

  constructor(
    @Inject(RelayService) private relayService: RelayService,
    @Inject(SessionService) private sessionService: SessionService,
    @Inject(SSEConnectionManager) private sseManager: SSEConnectionManager,
    @Inject(MessageBus) private messageBus: MessageBus,
  ) {}

  private ensureBusSubscription(): void {
    if (!this.busSubscribed) {
      this.messageBus.subscribe((message) => {
        this.sseManager.deliver(message);
      });
      this.busSubscribed = true;
      logger.info("MessageBus -> SSEConnectionManager subscription active");
    }
  }

  async authenticateDevice(authToken: string) {
    // Extract deviceId from a broader set
    // For auth by token alone, we need to iterate (small device count)
    throw new Error("Use authenticateDeviceById instead");
  }

  async authenticateDeviceById(deviceId: string, authToken: string) {
    return this.relayService.authenticateDeviceByIdAndToken(deviceId, authToken);
  }

  async createSession(
    userId: string,
    deviceId: string,
    deviceType: string | null,
    lastSeenMessageId: number | null,
    resumeMode: string | null,
  ) {
    this.ensureBusSubscription();
    return this.sessionService.createSession(userId, deviceId, deviceType, lastSeenMessageId, resumeMode);
  }

  async validateSession(sessionId: string) {
    return this.sessionService.validateSession(sessionId);
  }

  verifyStreamToken(token: string) {
    return this.sessionService.verifyStreamToken(token);
  }

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
    this.ensureBusSubscription();
    return this.relayService.sendMessage(params);
  }

  async getVisibleMessagesSince(deviceId: string, userId: string, sinceMessageId: number) {
    return this.relayService.getVisibleMessagesSince(deviceId, userId, sinceMessageId);
  }

  getSSEManager(): SSEConnectionManager {
    this.ensureBusSubscription();
    return this.sseManager;
  }
}
