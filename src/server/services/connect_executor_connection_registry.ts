import { Component, Inject, LoadAs } from "@noego/ioc";
import type { SseSink as Response } from "./sse_stream";
import { ConnectClock, ConnectIdGenerator } from "./connect_auth_primitives";

const PROTOCOL = "1.0";
const STALE_AFTER_MS = 45_000;
const PENDING_HELLO_TTL_MS = 30_000;
const STALE_TOMBSTONE_TTL_MS = 45_000;
const MAX_PENDING_HELLOS = 1_024;
const MAX_STALE_TOMBSTONES = 1_024;

interface Connection {
  fence: string;
  executorId: string;
  deviceId: string;
  generation: number;
  response: Response;
  lastActivityMs: number;
}
interface PendingHello {
  generation: number;
  correlationId: string;
  expiresAtMs: number;
}
export type ExecutorPresence = "online" | "offline" | "stale";
export type ExecutorDispatchResult = { ok: true } | {
  ok: false; reason: "executor-offline" | "backpressure";
};
export type ExecutorInboundFrame = Record<string, unknown> & {
  kind: "command.post" | "channel.ack" | "channel.revoked" | "error";
  protocolVersion: "1.0";
  correlationId: string;
};

@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorConnectionRegistry {
  private readonly connections = new Map<string, Connection>();
  private readonly staleExecutors = new Map<string, number>();
  private readonly pendingHello = new Map<string, PendingHello>();
  private readonly disconnectListeners = new Set<(executorId: string) => void>();

  constructor(
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectIdGenerator) private readonly ids: ConnectIdGenerator,
  ) {}

  hello(executorId: string, generation: number, correlationId: string): void {
    const now = this.now();
    this.prunePending(now);
    // Control metadata only: one overwriteable hello per executor, never command data.
    this.pendingHello.delete(executorId);
    this.pendingHello.set(executorId, {
      generation, correlationId, expiresAtMs: now + PENDING_HELLO_TTL_MS,
    });
    while (this.pendingHello.size > MAX_PENDING_HELLOS) {
      const oldest = this.pendingHello.keys().next().value;
      if (oldest === undefined) break;
      this.pendingHello.delete(oldest);
    }
  }

  open(input: {
    executorId: string; deviceId: string; generation: number; response: Response;
  }): string {
    const now = this.now();
    this.prunePending(now);
    this.pruneStale(now);
    const previous = this.connections.get(input.executorId);
    if (previous) {
      this.write(previous, {
        kind: "channel.revoked", protocolVersion: PROTOCOL, executorId: input.executorId,
        code: "revoked", correlationId: "cor_channeltakeover",
      });
      previous.response.end();
      this.connections.delete(input.executorId);
      this.notifyDisconnected(input.executorId);
    }
    const connection: Connection = {
      ...input, fence: this.ids.channelFenceId(), lastActivityMs: now,
    };
    this.staleExecutors.delete(input.executorId);
    this.connections.set(input.executorId, connection);
    const hello = this.pendingHello.get(input.executorId);
    if (hello?.generation === input.generation && hello.expiresAtMs > now) {
      this.pendingHello.delete(input.executorId);
      if (!this.write(connection, {
        kind: "channel.ack", protocolVersion: PROTOCOL, executorId: input.executorId,
        acknowledgedKind: "channel.hello", correlationId: hello.correlationId,
      })) {
        input.response.end();
        this.connections.delete(input.executorId);
      }
    }
    return connection.fence;
  }

  touch(executorId: string, generation: number): boolean {
    const connection = this.connections.get(executorId);
    if (!connection || connection.generation !== generation) return false;
    connection.lastActivityMs = this.now();
    this.staleExecutors.delete(executorId);
    return true;
  }

  close(executorId: string, fence?: string): void {
    const current = this.connections.get(executorId);
    if (current && (!fence || current.fence === fence)) {
      this.connections.delete(executorId);
      this.staleExecutors.delete(executorId);
      this.pendingHello.delete(executorId);
      this.notifyDisconnected(executorId);
    }
  }

  revoke(executorId: string, correlationId: string): void {
    const current = this.connections.get(executorId);
    this.pendingHello.delete(executorId);
    this.staleExecutors.delete(executorId);
    if (!current) return;
    this.write(current, {
      kind: "channel.revoked", protocolVersion: PROTOCOL, executorId,
      code: "revoked", correlationId,
    });
    current.response.end();
    this.connections.delete(executorId);
    this.notifyDisconnected(executorId);
  }

  presence(executorId: string): ExecutorPresence {
    const now = this.now();
    this.prunePending(now);
    this.pruneStale(now);
    const connection = this.connections.get(executorId);
    if (!connection) return this.staleExecutors.has(executorId) ? "stale" : "offline";
    if (now - connection.lastActivityMs > STALE_AFTER_MS) {
      connection.response.end();
      this.connections.delete(executorId);
      this.markStale(executorId, now);
      this.notifyDisconnected(executorId);
      return "stale";
    }
    return "online";
  }

  dispatch(executorId: string, frame: Record<string, unknown>): ExecutorDispatchResult {
    const connection = this.connections.get(executorId);
    if (!connection || this.presence(executorId) !== "online") {
      return { ok: false, reason: "executor-offline" };
    }
    if (!this.write(connection, frame)) {
      connection.response.end();
      this.connections.delete(executorId);
      this.notifyDisconnected(executorId);
      return { ok: false, reason: "backpressure" };
    }
    return { ok: true };
  }

  matches(executorId: string, deviceId: string, generation: number): boolean {
    const connection = this.connections.get(executorId);
    return !!connection && connection.deviceId === deviceId
      && connection.generation === generation && this.presence(executorId) === "online";
  }

  onDisconnect(listener: (executorId: string) => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  private notifyDisconnected(executorId: string): void {
    for (const listener of this.disconnectListeners) listener(executorId);
  }

  private write(connection: Connection, frame: Record<string, unknown>): boolean {
    if (connection.response.writableEnded) return false;
    return connection.response.write(`data: ${JSON.stringify(frame)}\n\n`);
  }

  private now(): number {
    return this.clock.now().getTime();
  }

  private prunePending(now: number): void {
    for (const [executorId, pending] of this.pendingHello) {
      if (pending.expiresAtMs <= now) this.pendingHello.delete(executorId);
    }
  }

  private markStale(executorId: string, now: number): void {
    this.staleExecutors.delete(executorId);
    this.staleExecutors.set(executorId, now + STALE_TOMBSTONE_TTL_MS);
    while (this.staleExecutors.size > MAX_STALE_TOMBSTONES) {
      const oldest = this.staleExecutors.keys().next().value;
      if (oldest === undefined) break;
      this.staleExecutors.delete(oldest);
    }
  }

  private pruneStale(now: number): void {
    for (const [executorId, expiresAtMs] of this.staleExecutors) {
      if (expiresAtMs <= now) this.staleExecutors.delete(executorId);
    }
  }
}

/** Injection boundary for the later Desktop transport. It never stores an offline command. */
export abstract class ConnectExecutorDispatchPort {
  abstract dispatch(executorId: string, frame: ExecutorInboundFrame): ExecutorDispatchResult;
}
