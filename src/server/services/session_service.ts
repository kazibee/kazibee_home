import { Component, Inject } from "@noego/ioc";
import { randomUUID } from "crypto";
import jsonwebtoken from "jsonwebtoken";
import SessionRepo from "../repo/session_repo";
import MessageRepo from "../repo/message_repo";
import { UnauthorizedError, ValidationError } from "../errors/domain_errors";
import { getLogger } from "@noego/logger";
import { getTrace } from "@noego/trace";

const logger = getLogger("kazibee:session-service");

const STREAM_TOKEN_SECRET = process.env.STREAM_TOKEN_SECRET || "kazibee-stream-token-secret-dev";
const STREAM_TOKEN_EXPIRY = "5m";
const HEARTBEAT_INTERVAL_MS = 15000;
const RETRY_MIN_MS = 500;
const RETRY_MAX_MS = 5000;

export interface SessionBootstrapResponse {
  sessionId: string;
  userId: string;
  deviceId: string;
  streamToken: string;
  sessionFenceMessageId: number;
  startAfterMessageId: number;
  heartbeatIntervalMs: number;
  retryMinMs: number;
  retryMaxMs: number;
}

@Component()
export default class SessionService {
  private trace = getTrace('SessionService');

  constructor(
    @Inject(SessionRepo) private sessionRepo: SessionRepo,
    @Inject(MessageRepo) private messageRepo: MessageRepo,
  ) {}

  async createSession(
    userId: string,
    deviceId: string,
    deviceType: string | null,
    lastSeenMessageId: number | null,
    resumeMode: string | null,
  ): Promise<SessionBootstrapResponse> {
    const sessionId = `sess_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    // Close any existing active sessions for this device
    const activeSessions = await this.sessionRepo.findActiveByDeviceId({ device_id: deviceId });
    for (const session of activeSessions) {
      await this.sessionRepo.closeSession({ session_id: session.session_id });
      logger.info("Closed previous session for device", { closedSessionId: session.session_id, deviceId });
    }

    // Compute session fence
    const { hwm } = await this.messageRepo.getHighWaterMark();
    let sessionFenceMessageId: number;

    if (resumeMode === "fresh" || activeSessions.length === 0) {
      // New device or fresh mode: fence = current high-water mark
      sessionFenceMessageId = hwm;
    } else {
      // Resume mode: use the old session's fence (or current hwm if none)
      sessionFenceMessageId = activeSessions[0]?.session_fence_message_id ?? hwm;
    }

    await this.sessionRepo.createSession({
      session_id: sessionId,
      user_id: userId,
      device_id: deviceId,
      device_type: deviceType,
      session_fence_message_id: sessionFenceMessageId,
    });

    // Generate a short-lived signed stream token for SSE auth
    const streamToken = jsonwebtoken.sign(
      { sessionId, userId, deviceId },
      STREAM_TOKEN_SECRET,
      { expiresIn: STREAM_TOKEN_EXPIRY },
    );

    // Compute effective start cursor
    const clientCursor = lastSeenMessageId ?? 0;
    const startAfterMessageId = Math.max(clientCursor, sessionFenceMessageId);

    logger.info("Session created", {
      sessionId,
      userId,
      deviceId,
      sessionFenceMessageId,
      startAfterMessageId,
      resumeMode,
    });
    this.trace.info('session.created', {
      sessionId, userId, deviceId, sessionFenceMessageId, startAfterMessageId, resumeMode,
    });

    // Detect replay gap: if client's cursor is behind the oldest available message
    // Per spec section 16.4: indicate if some messages were not recoverable
    const replayGap = clientCursor > 0 && startAfterMessageId > clientCursor;

    return {
      sessionId,
      userId,
      deviceId,
      streamToken,
      sessionFenceMessageId,
      startAfterMessageId,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      retryMinMs: RETRY_MIN_MS,
      retryMaxMs: RETRY_MAX_MS,
      ...(replayGap ? { replayGap: true, oldestRetainedMessageId: startAfterMessageId + 1 } : {}),
    };
  }

  async validateSession(sessionId: string) {
    const session = await this.sessionRepo.findBySessionId({ session_id: sessionId });
    if (!session) {
      throw new UnauthorizedError("Session not found");
    }
    if (session.status !== "active") {
      throw new UnauthorizedError("Session is no longer active");
    }
    return session;
  }

  verifyStreamToken(token: string): { sessionId: string; userId: string; deviceId: string } {
    try {
      const decoded = jsonwebtoken.verify(token, STREAM_TOKEN_SECRET) as { sessionId: string; userId: string; deviceId: string };
      return decoded;
    } catch {
      throw new UnauthorizedError("Invalid or expired stream token");
    }
  }

  async updateHeartbeat(sessionId: string): Promise<void> {
    await this.sessionRepo.updateHeartbeat({ session_id: sessionId });
  }
}
