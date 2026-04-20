import { Component, LoadAs } from "@noego/ioc";
import { getLogger } from "@noego/logger";
import { getTrace } from "@noego/trace";
import type { Response } from "express";
import type { Message } from "../repo/message_repo";

const logger = getLogger("kazibee:sse-connection-manager");

interface Connection {
  sessionId: string;
  userId: string;
  deviceId: string;
  res: Response;
  streamSeq: number;
  replayComplete: boolean;
  liveQueue: Message[];
}

@Component({ scope: LoadAs.Singleton })
export default class SSEConnectionManager {
  private sessionsById = new Map<string, Connection>();
  private sessionByDeviceId = new Map<string, string>();
  private sessionsByUserId = new Map<string, Set<string>>();
  private trace = getTrace('SSEConnectionManager');

  attach(sessionId: string, userId: string, deviceId: string, res: Response): void {
    // Device takeover: close old session for same device
    const oldSessionId = this.sessionByDeviceId.get(deviceId);
    if (oldSessionId && oldSessionId !== sessionId) {
      logger.info("sse.device-takeover", { oldSessionId, newSessionId: sessionId, deviceId });
      this.detach(oldSessionId);
    }

    const connection: Connection = {
      sessionId,
      userId,
      deviceId,
      res,
      streamSeq: 0,
      replayComplete: false,
      liveQueue: [],
    };

    this.sessionsById.set(sessionId, connection);
    this.sessionByDeviceId.set(deviceId, sessionId);

    if (!this.sessionsByUserId.has(userId)) {
      this.sessionsByUserId.set(userId, new Set());
    }
    this.sessionsByUserId.get(userId)!.add(sessionId);

    logger.info("sse.attached", {
      sessionId,
      userId,
      deviceId,
      totalSessions: this.sessionsById.size,
      deviceMapSize: this.sessionByDeviceId.size,
      userMapSize: this.sessionsByUserId.size,
    });
    this.trace.info('sse.attached', { sessionId, userId, deviceId, totalSessions: this.sessionsById.size });
  }

  detach(sessionId: string): void {
    const conn = this.sessionsById.get(sessionId);
    if (!conn) return;

    this.sessionsById.delete(sessionId);

    // Only remove device mapping if it still points to this session
    if (this.sessionByDeviceId.get(conn.deviceId) === sessionId) {
      this.sessionByDeviceId.delete(conn.deviceId);
    }

    const userSessions = this.sessionsByUserId.get(conn.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.sessionsByUserId.delete(conn.userId);
      }
    }

    // Try to end the response if still open
    try {
      if (!conn.res.writableEnded) {
        conn.res.end();
      }
    } catch {
      // Connection already closed
    }

    logger.info("sse.detached", { sessionId, deviceId: conn.deviceId });
    this.trace.info('sse.detached', { sessionId, deviceId: conn.deviceId });
  }

  markReplayComplete(sessionId: string): void {
    const conn = this.sessionsById.get(sessionId);
    if (!conn) return;

    conn.replayComplete = true;
    const queuedCount = conn.liveQueue.length;

    // Drain any messages that arrived during replay
    for (const msg of conn.liveQueue) {
      this.writeMessage(conn, msg);
    }
    conn.liveQueue = [];

    logger.info("sse.replay-complete", { sessionId, deviceId: conn.deviceId, drainedFromQueue: queuedCount });
  }

  deliver(message: Message): void {
    const matchingSessions = this.findTargetSessions(message);

    logger.info("sse.deliver", {
      messageId: message.message_id,
      type: message.type,
      targetKind: message.target_kind,
      targetDeviceId: message.target_device_id,
      targetUserId: message.target_user_id,
      matchCount: matchingSessions.length,
      matchedSessionIds: matchingSessions.map(c => c.sessionId),
      totalSessions: this.sessionsById.size,
      deviceMapKeys: Array.from(this.sessionByDeviceId.keys()),
    });
    this.trace.info('sse.deliver', {
      messageId: message.message_id, type: message.type, targetKind: message.target_kind,
      matchCount: matchingSessions.length,
    });

    for (const conn of matchingSessions) {
      if (!conn.replayComplete) {
        // Queue for after replay completes to maintain messageId ordering
        conn.liveQueue.push(message);
        logger.info("sse.deliver.queued", { messageId: message.message_id, sessionId: conn.sessionId, queueSize: conn.liveQueue.length });
      } else {
        this.writeMessage(conn, message);
      }
    }

    if (matchingSessions.length === 0) {
      logger.warn("sse.deliver.no-match", {
        messageId: message.message_id,
        type: message.type,
        targetKind: message.target_kind,
        targetDeviceId: message.target_device_id,
        targetUserId: message.target_user_id,
        knownDevices: Array.from(this.sessionByDeviceId.keys()),
        knownUsers: Array.from(this.sessionsByUserId.keys()),
      });
      this.trace.warn('sse.deliver.no-match', {
        messageId: message.message_id, type: message.type, targetKind: message.target_kind,
      });
    }
  }

  heartbeat(): void {
    for (const conn of this.sessionsById.values()) {
      try {
        if (!conn.res.writableEnded) {
          conn.res.write(": keepalive\n\n");
        }
      } catch {
        logger.warn("sse.heartbeat.failed", { sessionId: conn.sessionId });
        this.detach(conn.sessionId);
      }
    }
  }

  getConnection(sessionId: string): Connection | undefined {
    return this.sessionsById.get(sessionId);
  }

  writeMessage(conn: Connection, message: Message): void {
    conn.streamSeq += 1;

    const payload = message.payload ? JSON.parse(message.payload) : null;
    const envelope = {
      messageId: message.message_id,
      streamSeq: conn.streamSeq,
      type: message.type,
      requestId: message.request_id,
      correlationId: message.correlation_id,
      payload,
      createdAt: message.created_at,
      fromUserId: message.from_user_id,
      fromDeviceId: message.from_device_id,
      targetKind: message.target_kind,
      targetUserId: message.target_user_id,
      targetDeviceId: message.target_device_id,
    };

    try {
      if (!conn.res.writableEnded) {
        const written = conn.res.write(`event: message\nid: ${message.message_id}\ndata: ${JSON.stringify(envelope)}\n\n`);
        logger.info("sse.write", {
          messageId: message.message_id,
          sessionId: conn.sessionId,
          deviceId: conn.deviceId,
          streamSeq: conn.streamSeq,
          type: message.type,
          written,
          writableEnded: conn.res.writableEnded,
        });
        this.trace.info('sse.write', {
          messageId: message.message_id, sessionId: conn.sessionId, streamSeq: conn.streamSeq, type: message.type,
        });
      } else {
        logger.warn("sse.write.skipped-ended", { messageId: message.message_id, sessionId: conn.sessionId });
      }
    } catch (err) {
      logger.warn("sse.write.failed", { sessionId: conn.sessionId, error: err });
      this.detach(conn.sessionId);
    }
  }

  private findTargetSessions(message: Message): Connection[] {
    const results: Connection[] = [];

    if (message.target_kind === "device" && message.target_device_id) {
      const sessionId = this.sessionByDeviceId.get(message.target_device_id);
      if (sessionId) {
        const conn = this.sessionsById.get(sessionId);
        if (conn) results.push(conn);
      }
    } else if (message.target_kind === "user" && message.target_user_id) {
      const userSessions = this.sessionsByUserId.get(message.target_user_id);
      if (userSessions) {
        for (const sessionId of userSessions) {
          const conn = this.sessionsById.get(sessionId);
          if (conn) results.push(conn);
        }
      }
    }

    return results;
  }
}
