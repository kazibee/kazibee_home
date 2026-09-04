/**
 * ExecutorCoordinator — one Durable Object per Kazi Connect executor.
 *
 * Replaces the process-memory connection maps (ConnectExecutorConnectionRegistry /
 * ConnectClientRelayService) as the authority for "which channel is this
 * executor on, and where does its in-flight work route back to". Those maps
 * cannot survive a deploy, cannot be reached from the separate MCP worker, and
 * are not a routing authority once there is more than one isolate.
 *
 * What it owns:
 *   - the single active channel fence for one executor
 *   - presence (online / stale / offline) from heartbeat recency
 *   - the capability + workspace projection reported on hello
 *   - bounded in-flight routes from operationId -> the waiting requester
 *
 * What it deliberately does not own: OAuth, grants, scopes, workspace choice,
 * tool arguments, or execution. It never persists a tool argument or result —
 * those live in memory for the life of one request and nowhere else.
 *
 * Transport is WebSocket (`websocket_v1`). The legacy SSE downlink is not used.
 *
 * Hibernation-safe: channel identity lives in the socket attachment, presence
 * in DO storage. No timers, no outbound connections.
 */

import { MACHINE_ID, SWARM_HEAD_PROTOCOL_VERSION, SWARM_ID, parseHeadInboundFrame, parseHeadOutboundFrame } from "../shared/swarm_head_protocol";

// Minimal ambient declarations for the Workers runtime APIs used here, so
// `tsc --noEmit` passes without pulling in @cloudflare/workers-types (this
// module is only bundled/executed in cloudflare builds).
declare const WebSocketPair: { new (): { 0: CoordinatorSocket; 1: CoordinatorSocket } };
declare class WebSocketRequestResponsePair {
  constructor(request: string, response: string);
}
interface CoordinatorSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}
interface CoordinatorStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}
interface CoordinatorState {
  acceptWebSocket(ws: CoordinatorSocket): void;
  getWebSockets(): CoordinatorSocket[];
  setWebSocketAutoResponse(pair: WebSocketRequestResponsePair): void;
  getWebSocketAutoResponseTimestamp(ws: CoordinatorSocket): Date | null;
  storage: CoordinatorStorage;
}

const PROTOCOL_VERSION = "1.1";
const MAX_INFLIGHT_ROUTES = 32;
const ACCEPT_TIMEOUT_MS = 5_000;
const RESULT_FRAME_LIMIT = 192 * 1024;
const SESSION_FRAME_LIMIT = 160 * 1024;
const SESSION_CHUNK_LIMIT = 128 * 1024;
const SESSION_PENDING_BYTES = 8 * 1024 * 1024;
const SESSION_PENDING_FRAMES = 64;
const MAX_EPHEMERAL_INVOKES = 8;
const SESSION_INVOKE_TIMEOUT_MS = 30_000;
const STALE_AFTER_MS = 60_000;
const OFFLINE_AFTER_MS = 120_000;

const PRESENCE_KEY = "presence";

interface ChannelAttachment {
  /** Absent on hibernation-restored legacy executor sockets. */
  role?: "executor";
  executorId: string;
  deviceId: string;
  credentialGeneration: number;
  fence: string;
  helloAt: number;
}

interface ViewerAttachment {
  role: "viewer";
  executorId: string;
  accountRef: string;
  sessionId: string;
}

interface PendingSessionFrame {
  chunkCount: number;
  nextIndex: number;
  payload: string[];
  bytes: number;
}

interface EphemeralInvoke {
  id: string;
  resolve(response: Response): void;
  timer: ReturnType<typeof setTimeout>;
}

type SocketAttachment = ChannelAttachment | ViewerAttachment;

interface PresenceRecord {
  executorId: string;
  deviceId: string;
  credentialGeneration: number;
  fence: string;
  lastSeenAt: number;
  executorVersion: string;
  platform: string;
  capabilities: unknown;
  workspaces: unknown;
}

interface InflightRoute {
  operationId: string;
  commandId: string;
  fence: string;
  resolve(frame: Record<string, unknown>): void;
  reject(code: string, message: string): void;
  acceptTimer: ReturnType<typeof setTimeout> | null;
  /** Whole-route budget; fires DEADLINE_EXCEEDED if no result arrives. */
  resultTimer: ReturnType<typeof setTimeout> | null;
  accepted: boolean;
}

const DEFAULT_ROUTE_DEADLINE_MS = 50_000;
const MAX_ROUTE_DEADLINE_MS = 55_000;
const ROUTE_DEADLINE_GRACE_MS = 2_000;

/**
 * Route lifetime = the command's deadlineAt plus a small grace, clamped so a
 * route can never outlive the web MCP client's 60-second request timeout.
 */
function routeDeadlineMs(payload: Record<string, unknown> | undefined): number {
  const raw = typeof payload?.deadlineAt === "string" ? Date.parse(payload.deadlineAt) : NaN;
  const remaining = Number.isFinite(raw) ? raw - now() : DEFAULT_ROUTE_DEADLINE_MS;
  return Math.min(Math.max(remaining, 1_000), MAX_ROUTE_DEADLINE_MS) + ROUTE_DEADLINE_GRACE_MS;
}

function now(): number {
  return Date.now();
}

function presenceState(record: PresenceRecord | undefined, hasSocket: boolean): "online" | "stale" | "offline" {
  if (!record || !hasSocket) return "offline";
  const age = now() - record.lastSeenAt;
  if (age > OFFLINE_AFTER_MS) return "offline";
  if (age > STALE_AFTER_MS) return "stale";
  return "online";
}

function errorFrame(code: string, message: string, fatal: boolean): string {
  return JSON.stringify({
    kind: "channel.error",
    protocolVersion: PROTOCOL_VERSION,
    code,
    message,
    fatal,
  });
}

function isViewerAttachment(value: unknown): value is ViewerAttachment {
  return !!value && typeof value === "object"
    && (value as { role?: unknown }).role === "viewer";
}

function sessionFrameId(counter: number): string {
  return `sf_${Date.now().toString(36)}_${counter.toString(36)}`;
}

function utf8Chunks(value: string): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const point of value) {
    const size = encoder.encode(point).byteLength;
    if (bytes + size > SESSION_CHUNK_LIMIT && chunk) {
      chunks.push(chunk);
      chunk = "";
      bytes = 0;
    }
    chunk += point;
    bytes += size;
  }
  if (chunk || chunks.length === 0) chunks.push(chunk);
  return chunks;
}

export class ExecutorCoordinator {
  private readonly state: CoordinatorState;
  private readonly routes = new Map<string, InflightRoute>();
  /**
   * Reassembly is intentionally in-memory. Viewer socket identity survives
   * hibernation through attachments; incomplete chunk groups do not and must be
   * retried by the LocalService client.
   */
  private readonly sessionFrames = new Map<string, Map<string, PendingSessionFrame>>();
  private readonly ephemeral = new Map<string, EphemeralInvoke>();
  private frameCounter = 0;

  constructor(state: CoordinatorState) {
    this.state = state;
    // Runtime-level keepalive: free, and does not wake the object.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return url.pathname === "/viewer" ? this.acceptViewer(request) : this.acceptChannel(request);
    }

    // Internal-binding surface. Only reachable from an approved Kazibee worker.
    if (request.method === "POST" && url.pathname === "/dispatch") {
      return this.dispatch(request);
    }
    if (request.method === "POST" && url.pathname === "/session-invoke") {
      return this.sessionInvoke(request);
    }
    if (request.method === "GET" && url.pathname === "/presence") {
      return this.presence();
    }

    return new Response("not found", { status: 404 });
  }

  // ------------------------------------------------------------ channel

  private acceptChannel(request: Request): Response {
    const executorId = request.headers.get("x-kazi-executor-id");
    const deviceId = request.headers.get("x-kazi-device-id");
    const generation = Number(request.headers.get("x-kazi-credential-generation"));
    if (!executorId || !deviceId || !Number.isInteger(generation) || generation < 1) {
      return new Response("missing channel identity", { status: 400 });
    }

    // One executor fence at a time. Viewer sockets are not executor channels;
    // notify and close them when the executor is replaced.
    const fence = `fence_${crypto.randomUUID().replace(/-/g, "")}`;
    for (const existing of this.state.getWebSockets()) {
      const attachment = existing.deserializeAttachment() as SocketAttachment | null;
      try {
        if (isViewerAttachment(attachment)) {
          existing.send(JSON.stringify({ kind: "session.closed", reason: "executor-offline" }));
          existing.close(4001, "executor-offline");
        } else {
          existing.close(1012, "replaced by newer channel");
        }
      } catch {
        // Already closing; the runtime reaps it.
      }
    }
    this.sessionFrames.clear();
    this.rejectEphemeralOffline();

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    const attachment: ChannelAttachment = {
      role: "executor",
      executorId,
      deviceId,
      credentialGeneration: generation,
      fence,
      helloAt: 0,
    };
    pair[1].serializeAttachment(attachment);

    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit & {
      webSocket: CoordinatorSocket;
    });
  }

  private acceptViewer(request: Request): Response {
    const executorId = request.headers.get("x-kazi-executor-id");
    const accountRef = request.headers.get("x-kazi-account-ref");
    const sessionId = request.headers.get("x-kazi-session-id");
    if (!executorId || !accountRef || !sessionId) {
      return new Response("missing viewer identity", { status: 400 });
    }
    const executor = this.executorSocket();
    if (!executor) {
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment({ role: "viewer", executorId, accountRef, sessionId } satisfies ViewerAttachment);
      pair[1].close(4404, "executor-offline");
      return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit & {
        webSocket: CoordinatorSocket;
      });
    }

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ role: "viewer", executorId, accountRef, sessionId } satisfies ViewerAttachment);
    executor.send(JSON.stringify({
      kind: "session.open",
      protocolVersion: PROTOCOL_VERSION,
      sessionId,
      viewerRole: "web_agent_viewer",
      accountRef,
      correlationId: `cor_${crypto.randomUUID().replace(/-/g, "")}`,
      sentAt: new Date().toISOString(),
    }));
    pair[1].send(JSON.stringify({ kind: "session.ready", sessionId }));
    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit & {
      webSocket: CoordinatorSocket;
    });
  }

  async webSocketMessage(ws: CoordinatorSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) {
      ws.close(1008, "unidentified channel");
      return;
    }
    if (isViewerAttachment(attachment)) {
      // A viewer's failure must never propagate to the executor socket.
      try {
        this.onViewerMessage(ws, attachment, message);
      } catch {
        try {
          ws.close(4413, "viewer-message-failed");
        } catch {
          // Already closing.
        }
      }
      return;
    }
    if (new TextEncoder().encode(message).byteLength > RESULT_FRAME_LIMIT) {
      ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "frame exceeds result budget", true));
      ws.close(1009, "frame too large");
      return;
    }

    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(message) as Record<string, unknown>;
    } catch {
      ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "invalid json", true));
      ws.close(1002, "invalid json");
      return;
    }
    const limit = frame.kind === "session.frame" ? SESSION_FRAME_LIMIT : RESULT_FRAME_LIMIT;
    if (new TextEncoder().encode(message).byteLength > limit) {
      ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "frame exceeds result budget", true));
      ws.close(1009, "frame too large");
      return;
    }
    if (frame.protocolVersion !== PROTOCOL_VERSION) {
      ws.send(errorFrame("EXECUTOR_INCOMPATIBLE", "unsupported protocol version", true));
      ws.close(1008, "protocol version");
      return;
    }
    if (frame.kind !== "session.frame" && frame.kind !== "session.close"
      && frame.executorId !== attachment.executorId) {
      ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "executor identity mismatch", true));
      ws.close(1008, "identity mismatch");
      return;
    }

    switch (frame.kind) {
      case "channel.hello":
        await this.onHello(ws, attachment, frame);
        return;
      case "command.accepted":
        this.onAccepted(attachment, frame);
        return;
      case "command.result":
        this.onResult(attachment, frame);
        return;
      case "executor.event":
        await this.onEvent(attachment, frame);
        return;
      case "session.frame":
        this.onSessionFrame(frame);
        return;
      case "session.close":
        this.onSessionClose(frame);
        return;
      default:
        ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "unknown frame kind", false));
    }
  }

  async webSocketClose(ws: CoordinatorSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) return;
    if (isViewerAttachment(attachment)) {
      this.sessionFrames.delete(attachment.sessionId);
      const executor = this.executorSocket();
      if (executor) this.sendSessionClose(executor, attachment.sessionId, "viewer-closed");
      return;
    }

    // Only clear presence if this socket still owns the current fence; a
    // replaced channel closing must not knock the new one offline.
    const record = await this.state.storage.get<PresenceRecord>(PRESENCE_KEY);
    if (record?.fence === attachment.fence) {
      await this.state.storage.delete(PRESENCE_KEY);
      this.closeAllViewers("executor-offline");
      this.rejectEphemeralOffline();
    }
    for (const [operationId, route] of this.routes) {
      if (route.fence === attachment.fence) {
        this.routes.delete(operationId);
        if (route.acceptTimer) clearTimeout(route.acceptTimer);
        if (route.resultTimer) clearTimeout(route.resultTimer);
        route.reject(
          route.accepted ? "RESULT_ROUTE_LOST" : "EXECUTOR_OFFLINE",
          route.accepted
            ? "The executor accepted this operation but the result route was lost."
            : "The executor disconnected before accepting this operation.",
        );
      }
    }
  }

  async webSocketError(ws: CoordinatorSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  private executorSocket(): CoordinatorSocket | null {
    const sockets = this.state.getWebSockets();
    for (let index = sockets.length - 1; index >= 0; index -= 1) {
      const socket = sockets[index]!;
      if (!isViewerAttachment(socket.deserializeAttachment())) return socket;
    }
    return null;
  }

  private viewerSocket(sessionId: string): CoordinatorSocket | null {
    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment();
      if (isViewerAttachment(attachment) && attachment.sessionId === sessionId) return socket;
    }
    return null;
  }

  private onViewerMessage(
    viewer: CoordinatorSocket,
    attachment: ViewerAttachment,
    message: string,
  ): void {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(message) as Record<string, unknown>;
    } catch {
      viewer.close(4400, "bad-frame");
      return;
    }
    const allowed = new Set(["invoke", "subscribe", "subscribe-all", "unsubscribe"]);
    if (!frame || typeof frame !== "object" || !allowed.has(String(frame.type))) {
      viewer.close(4400, "bad-frame");
      return;
    }
    const executor = this.executorSocket();
    if (!executor) {
      viewer.close(4404, "executor-offline");
      return;
    }
    this.sendSessionFrame(executor, attachment.sessionId, message);
  }

  private sendSessionFrame(socket: CoordinatorSocket, sessionId: string, payload: string): void {
    const chunks = utf8Chunks(payload);
    const frameId = sessionFrameId(++this.frameCounter);
    chunks.forEach((chunk, chunkIndex) => socket.send(JSON.stringify({
      kind: "session.frame",
      protocolVersion: PROTOCOL_VERSION,
      sessionId,
      frameId,
      chunkIndex,
      chunkCount: chunks.length,
      payload: chunk,
    })));
  }

  private sendSessionClose(socket: CoordinatorSocket, sessionId: string, reason: string): void {
    socket.send(JSON.stringify({
      kind: "session.close",
      protocolVersion: PROTOCOL_VERSION,
      sessionId,
      reason,
    }));
  }

  private onSessionFrame(frame: Record<string, unknown>): void {
    const sessionId = typeof frame.sessionId === "string" ? frame.sessionId : "";
    const frameId = typeof frame.frameId === "string" ? frame.frameId : "";
    const chunkIndex = Number(frame.chunkIndex);
    const chunkCount = Number(frame.chunkCount);
    const payload = typeof frame.payload === "string" ? frame.payload : null;
    if (!sessionId || !frameId || payload === null
      || new TextEncoder().encode(payload).byteLength > SESSION_CHUNK_LIMIT
      || !Number.isInteger(chunkIndex) || !Number.isInteger(chunkCount)
      || chunkCount < 1 || chunkIndex < 0 || chunkIndex >= chunkCount) return;

    // Viewer-bound frames are forwarded chunk-by-chunk and reassembled in the
    // browser: a Workers WebSocket message is capped at 1 MiB, while executor
    // frames may run to the 8 MiB session budget, so reassembling here would
    // make `viewer.send` throw (and take the executor socket down with it).
    // Only ephemeral (worker-internal) invokes are reassembled in the object.
    if (!this.ephemeral.has(sessionId)) {
      const viewer = this.viewerSocket(sessionId);
      if (!viewer) return;
      this.sendToViewer(viewer, chunkCount === 1
        ? payload
        : JSON.stringify({ kind: "session.chunk", frameId, chunkIndex, chunkCount, payload }));
      return;
    }

    let frames = this.sessionFrames.get(sessionId);
    if (!frames) {
      frames = new Map();
      this.sessionFrames.set(sessionId, frames);
    }
    let pending = frames.get(frameId);
    if (!pending) {
      if (chunkIndex !== 0 || frames.size >= SESSION_PENDING_FRAMES) {
        this.failSessionBudget(sessionId);
        return;
      }
      pending = { chunkCount, nextIndex: 0, payload: [], bytes: 0 };
      frames.set(frameId, pending);
    }
    if (pending.chunkCount !== chunkCount || pending.nextIndex !== chunkIndex) {
      this.failSessionBudget(sessionId);
      return;
    }
    pending.bytes += new TextEncoder().encode(payload).byteLength;
    const totalBytes = Array.from(frames.values()).reduce((sum, value) => sum + value.bytes, 0);
    if (totalBytes > SESSION_PENDING_BYTES) {
      this.failSessionBudget(sessionId);
      return;
    }
    pending.payload.push(payload);
    pending.nextIndex += 1;
    if (pending.nextIndex !== pending.chunkCount) return;

    frames.delete(frameId);
    if (frames.size === 0) this.sessionFrames.delete(sessionId);
    const complete = pending.payload.join("");
    const invoke = this.ephemeral.get(sessionId);
    if (invoke) {
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(complete) as Record<string, unknown>;
      } catch {
        return;
      }
      if ((result.type !== "result" && result.type !== "error") || result.id !== invoke.id) return;
      this.ephemeral.delete(sessionId);
      clearTimeout(invoke.timer);
      const executor = this.executorSocket();
      if (executor) this.sendSessionClose(executor, sessionId, "ephemeral-complete");
      invoke.resolve(Response.json(result));
      return;
    }
    this.viewerSocket(sessionId)?.send(complete);
  }

  private onSessionClose(frame: Record<string, unknown>): void {
    const sessionId = typeof frame.sessionId === "string" ? frame.sessionId : "";
    if (!sessionId) return;
    const reason = typeof frame.reason === "string" ? frame.reason : "executor-closed";
    this.sessionFrames.delete(sessionId);
    const viewer = this.viewerSocket(sessionId);
    if (viewer) {
      try {
        viewer.send(JSON.stringify({ kind: "session.closed", reason }));
        viewer.close(4001, reason);
      } catch {
        // Already closing.
      }
    }
    const invoke = this.ephemeral.get(sessionId);
    if (invoke) {
      this.ephemeral.delete(sessionId);
      clearTimeout(invoke.timer);
      invoke.resolve(Response.json({ type: "error", id: invoke.id, message: reason }, { status: 502 }));
    }
  }

  /**
   * A failing viewer send (oversize message, socket already gone) must only
   * cost that viewer; the executor channel is shared by every session.
   */
  private sendToViewer(viewer: CoordinatorSocket, message: string): void {
    try {
      viewer.send(message);
    } catch {
      const attachment = viewer.deserializeAttachment() as SocketAttachment | null;
      if (isViewerAttachment(attachment)) this.sessionFrames.delete(attachment.sessionId);
      try {
        viewer.close(4413, "viewer-send-failed");
      } catch {
        // Already closing.
      }
    }
  }

  private failSessionBudget(sessionId: string): void {
    this.sessionFrames.delete(sessionId);
    const viewer = this.viewerSocket(sessionId);
    if (viewer) viewer.close(4413, "budget-exceeded");
    const invoke = this.ephemeral.get(sessionId);
    if (invoke) {
      this.ephemeral.delete(sessionId);
      clearTimeout(invoke.timer);
      invoke.resolve(Response.json({ type: "error", id: invoke.id, message: "budget exceeded" }, { status: 502 }));
    }
  }

  private closeAllViewers(reason: string): void {
    this.sessionFrames.clear();
    for (const socket of this.state.getWebSockets()) {
      if (!isViewerAttachment(socket.deserializeAttachment())) continue;
      try {
        socket.send(JSON.stringify({ kind: "session.closed", reason }));
        socket.close(4001, reason);
      } catch {
        // Already closing.
      }
    }
  }

  private rejectEphemeralOffline(): void {
    for (const [sessionId, invoke] of this.ephemeral) {
      this.ephemeral.delete(sessionId);
      clearTimeout(invoke.timer);
      invoke.resolve(Response.json(
        { type: "error", id: invoke.id, message: "executor-offline" },
        { status: 503 },
      ));
    }
  }

  private async sessionInvoke(request: Request): Promise<Response> {
    if (this.ephemeral.size >= MAX_EPHEMERAL_INVOKES) {
      return Response.json({ code: "BACKPRESSURE" }, { status: 429 });
    }
    let body: { channel?: unknown; payload?: unknown };
    try {
      body = await request.json() as { channel?: unknown; payload?: unknown };
    } catch {
      return Response.json({ code: "INVALID_FRAME" }, { status: 400 });
    }
    if (typeof body.channel !== "string" || !body.channel) {
      return Response.json({ code: "INVALID_FRAME" }, { status: 400 });
    }
    const executor = this.executorSocket();
    if (!executor) return Response.json({ code: "EXECUTOR_OFFLINE" }, { status: 503 });

    const sessionId = `vs_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const id = `inv_${crypto.randomUUID().replace(/-/g, "")}`;
    executor.send(JSON.stringify({
      kind: "session.open",
      protocolVersion: PROTOCOL_VERSION,
      sessionId,
      viewerRole: "web_agent_viewer",
      accountRef: request.headers.get("x-kazi-account-ref") ?? "",
      correlationId: `cor_${crypto.randomUUID().replace(/-/g, "")}`,
      sentAt: new Date().toISOString(),
    }));

    return new Promise<Response>((resolve) => {
      const timer = setTimeout(() => {
        this.ephemeral.delete(sessionId);
        this.sessionFrames.delete(sessionId);
        const live = this.executorSocket();
        if (live) this.sendSessionClose(live, sessionId, "ephemeral-timeout");
        resolve(Response.json({ type: "error", id, message: "timeout" }, { status: 504 }));
      }, SESSION_INVOKE_TIMEOUT_MS);
      this.ephemeral.set(sessionId, { id, resolve, timer });
      this.sendSessionFrame(executor, sessionId, JSON.stringify({
        type: "invoke",
        id,
        channel: body.channel,
        payload: body.payload,
      }));
    });
  }

  private async onHello(
    ws: CoordinatorSocket,
    attachment: ChannelAttachment,
    frame: Record<string, unknown>,
  ): Promise<void> {
    const helloAt = now();
    ws.serializeAttachment({ ...attachment, helloAt } satisfies ChannelAttachment);

    await this.state.storage.put<PresenceRecord>(PRESENCE_KEY, {
      executorId: attachment.executorId,
      deviceId: attachment.deviceId,
      credentialGeneration: attachment.credentialGeneration,
      fence: attachment.fence,
      lastSeenAt: helloAt,
      executorVersion: String(frame.executorVersion ?? ""),
      platform: String(frame.platform ?? ""),
      capabilities: frame.capabilities ?? null,
      workspaces: frame.workspaces ?? null,
    });

    ws.send(JSON.stringify({
      kind: "channel.hello.ack",
      protocolVersion: PROTOCOL_VERSION,
      executorId: attachment.executorId,
      executorFence: attachment.fence,
      correlationId: frame.correlationId ?? null,
      acceptedAt: new Date(helloAt).toISOString(),
    }));
  }

  private onAccepted(attachment: ChannelAttachment, frame: Record<string, unknown>): void {
    const route = this.routes.get(String(frame.operationId));
    if (!route || route.fence !== attachment.fence) return;
    route.accepted = true;
    if (route.acceptTimer) {
      clearTimeout(route.acceptTimer);
      route.acceptTimer = null;
    }
  }

  private onResult(attachment: ChannelAttachment, frame: Record<string, unknown>): void {
    const operationId = String(frame.operationId);
    const route = this.routes.get(operationId);
    // A late frame from a retired fence is dropped, never attached to a newer
    // request that happens to reuse the id.
    if (!route || route.fence !== attachment.fence) return;
    this.routes.delete(operationId);
    if (route.acceptTimer) clearTimeout(route.acceptTimer);
    if (route.resultTimer) clearTimeout(route.resultTimer);
    route.resolve(frame);
  }

  private async onEvent(
    attachment: ChannelAttachment,
    frame: Record<string, unknown>,
  ): Promise<void> {
    const record = await this.state.storage.get<PresenceRecord>(PRESENCE_KEY);
    if (!record || record.fence !== attachment.fence) return;

    const eventType = String(frame.eventType);
    if (eventType === "remote_tool.capabilities.changed") {
      await this.state.storage.put<PresenceRecord>(PRESENCE_KEY, {
        ...record,
        lastSeenAt: now(),
        capabilities: frame.payload ?? record.capabilities,
      });
      return;
    }
    if (eventType === "remote_tool.workspaces.changed") {
      await this.state.storage.put<PresenceRecord>(PRESENCE_KEY, {
        ...record,
        lastSeenAt: now(),
        workspaces: frame.payload ?? record.workspaces,
      });
    }
  }

  // ------------------------------------------------------------ internal binding

  /**
   * Heartbeat pings are answered by the runtime's auto-response without
   * waking this object, so the stored lastSeenAt goes quiet on an idle but
   * healthy channel. Fold the runtime's auto-response timestamp back in
   * before judging staleness.
   */
  private liveRecord(record: PresenceRecord | undefined): PresenceRecord | undefined {
    if (!record) return undefined;
    let lastSeenAt = record.lastSeenAt;
    for (const socket of this.state.getWebSockets()) {
      if (isViewerAttachment(socket.deserializeAttachment())) continue;
      const answeredAt = this.state.getWebSocketAutoResponseTimestamp(socket);
      if (answeredAt) lastSeenAt = Math.max(lastSeenAt, answeredAt.getTime());
    }
    return { ...record, lastSeenAt };
  }

  private async presence(): Promise<Response> {
    const record = this.liveRecord(await this.state.storage.get<PresenceRecord>(PRESENCE_KEY));
    const hasSocket = this.executorSocket() !== null;
    return Response.json({
      state: presenceState(record, hasSocket),
      executorId: record?.executorId ?? null,
      credentialGeneration: record?.credentialGeneration ?? null,
      executorVersion: record?.executorVersion ?? null,
      capabilities: record?.capabilities ?? null,
      workspaces: record?.workspaces ?? null,
      lastSeenAt: record ? new Date(record.lastSeenAt).toISOString() : null,
      inflight: this.routes.size,
    });
  }

  private async dispatch(request: Request): Promise<Response> {
    let command: Record<string, unknown>;
    try {
      command = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ code: "INVALID_FRAME", message: "invalid json" }, { status: 400 });
    }

    const record = this.liveRecord(await this.state.storage.get<PresenceRecord>(PRESENCE_KEY));
    const socket = this.executorSocket();
    if (!socket || !record || presenceState(record, true) !== "online") {
      return Response.json(
        { code: "EXECUTOR_OFFLINE", message: "The executor is not connected." },
        { status: 503 },
      );
    }
    if (this.routes.size >= MAX_INFLIGHT_ROUTES) {
      return Response.json(
        { code: "BACKPRESSURE", message: "Too many operations in flight.", retryAfterMs: 1000 },
        { status: 429 },
      );
    }

    // command.post carries the operation id inside payload; accepted/result
    // frames surface it at the top level.
    const payload = command.payload as Record<string, unknown> | undefined;
    const operationId = String(payload?.operationId ?? "");
    const commandId = String(command.commandId ?? "");
    if (!operationId || !commandId || this.routes.has(operationId)) {
      return Response.json(
        { code: "INVALID_FRAME", message: "missing or duplicate operation id" },
        { status: 400 },
      );
    }

    return new Promise<Response>((resolve) => {
      const route: InflightRoute = {
        operationId,
        commandId,
        fence: record.fence,
        accepted: false,
        acceptTimer: null,
        resultTimer: null,
        resolve: (frame) => resolve(Response.json(frame)),
        reject: (code, message) => resolve(
          Response.json({ code, message }, { status: 502 }),
        ),
      };
      const removeRoute = () => {
        this.routes.delete(operationId);
        if (route.acceptTimer) clearTimeout(route.acceptTimer);
        if (route.resultTimer) clearTimeout(route.resultTimer);
      };
      route.acceptTimer = setTimeout(() => {
        if (this.routes.get(operationId) !== route) return;
        removeRoute();
        route.reject("EXECUTOR_ACCEPT_TIMEOUT", "The executor did not accept in time.");
      }, ACCEPT_TIMEOUT_MS);
      route.resultTimer = setTimeout(() => {
        if (this.routes.get(operationId) !== route) return;
        removeRoute();
        route.reject("DEADLINE_EXCEEDED", "The executor did not return a result before the deadline.");
      }, routeDeadlineMs(payload));
      this.routes.set(operationId, route);

      try {
        socket.send(JSON.stringify(command));
      } catch {
        this.routes.delete(operationId);
        if (route.acceptTimer) clearTimeout(route.acceptTimer);
        route.reject("EXECUTOR_OFFLINE", "The channel closed during dispatch.");
      }
    });
  }
}


const SWARM_PRESENCE_KEY = "swarm-presence";
const SWARM_EVENTS_KEY = "swarm-events";
const SWARM_CURSOR_KEY = "swarm-cursor";
const SWARM_EVENT_LIMIT = 500;

interface SwarmChannelAttachment {
  swarmId: string;
  machineId: string;
  fence: string;
  helloAt: number;
}

interface SwarmPresenceRecord {
  swarmId: string;
  machineId: string;
  fence: string;
  lastSeenAt: number;
  helloAt: number;
  headVersion: string | null;
  headClass: string | null;
  headState: string | null;
}

interface StoredSwarmFrame {
  cursor: number;
  receivedAt: string;
  frame: Record<string, unknown>;
}

/**
 * One hibernation-safe runtime-control channel per swarm machine.
 *
 * The object owns the channel fence, machine presence, and a bounded replay
 * buffer. It deliberately does not own authorization or database state.
 */
export class SwarmMachineCoordinator {
  private readonly state: CoordinatorState;

  constructor(state: CoordinatorState) {
    this.state = state;
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return this.acceptChannel(request);
    }
    if (request.method === "GET" && url.pathname === "/presence") return this.presence();
    if (request.method === "GET" && url.pathname === "/events") return this.events(url);
    if (request.method === "POST" && url.pathname === "/send") return this.send(request);
    if (request.method === "POST" && url.pathname === "/liveness") return this.liveness(request);
    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: CoordinatorSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const attachment = ws.deserializeAttachment() as SwarmChannelAttachment | null;
    if (!attachment) {
      ws.close(1008, "unidentified channel");
      return;
    }
    const parsed = parseHeadOutboundFrame(message, attachment.machineId);
    if (!parsed || (parsed.kind === "head.hello" && parsed.swarmId !== attachment.swarmId)) {
      ws.send(JSON.stringify({
        kind: "channel.error",
        protocolVersion: SWARM_HEAD_PROTOCOL_VERSION,
        code: "HEAD_PROTOCOL_VIOLATION",
        message: "invalid head frame",
        fatal: true,
      }));
      ws.close(1008, "invalid head frame");
      return;
    }

    if (parsed.kind === "head.hello") {
      const helloAt = Date.now();
      const nextAttachment = { ...attachment, helloAt };
      ws.serializeAttachment(nextAttachment satisfies SwarmChannelAttachment);
      await this.state.storage.put<SwarmPresenceRecord>(SWARM_PRESENCE_KEY, {
        swarmId: attachment.swarmId,
        machineId: attachment.machineId,
        fence: attachment.fence,
        lastSeenAt: helloAt,
        helloAt,
        headVersion: parsed.headVersion,
        headClass: parsed.headClass,
        headState: "booting",
      });
      ws.send(JSON.stringify({
        kind: "head.hello.ack",
        protocolVersion: SWARM_HEAD_PROTOCOL_VERSION,
        machineId: attachment.machineId,
        machineFence: attachment.fence,
        correlationId: parsed.correlationId,
        acceptedAt: new Date(helloAt).toISOString(),
      }));
      return;
    }

    await this.touchPresence(attachment, parsed.kind === "head.heartbeat" ? parsed.state : undefined);
    if (this.shouldBuffer(parsed.kind)) {
      await this.appendFrame(parsed as unknown as Record<string, unknown>);
    }
  }

  async webSocketClose(ws: CoordinatorSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as SwarmChannelAttachment | null;
    if (!attachment) return;
    const record = await this.state.storage.get<SwarmPresenceRecord>(SWARM_PRESENCE_KEY);
    if (record?.fence === attachment.fence) {
      await this.state.storage.put<SwarmPresenceRecord>(SWARM_PRESENCE_KEY, {
        ...record,
        lastSeenAt: Date.now(),
      });
    }
  }

  private acceptChannel(request: Request): Response {
    const swarmId = request.headers.get("x-kazi-swarm-id");
    const machineId = request.headers.get("x-kazi-machine-id");
    if (!swarmId || !SWARM_ID.test(swarmId) || !machineId || !MACHINE_ID.test(machineId)) {
      return new Response("missing channel identity", { status: 400 });
    }
    const fence = "fence_" + crypto.randomUUID().replace(/-/g, "");
    for (const existing of this.state.getWebSockets()) {
      try {
        existing.close(1012, "replaced by newer channel");
      } catch {
        // The runtime reaps sockets that are already closing.
      }
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ swarmId, machineId, fence, helloAt: 0 } satisfies SwarmChannelAttachment);
    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit & {
      webSocket: CoordinatorSocket;
    });
  }

  private async touchPresence(attachment: SwarmChannelAttachment, headState?: string): Promise<void> {
    const current = await this.state.storage.get<SwarmPresenceRecord>(SWARM_PRESENCE_KEY);
    if (!current || current.fence !== attachment.fence) return;
    await this.state.storage.put<SwarmPresenceRecord>(SWARM_PRESENCE_KEY, {
      ...current,
      lastSeenAt: Date.now(),
      headState: headState ?? current.headState,
    });
  }

  private shouldBuffer(kind: string): boolean {
    return kind === "head.heartbeat"
      || kind === "thread.state"
      || kind === "thread.event"
      || kind === "thread.turn.result"
      || kind === "credential.accepted"
      || kind === "credential.rejected";
  }

  private async appendFrame(frame: Record<string, unknown>): Promise<void> {
    const cursor = (await this.state.storage.get<number>(SWARM_CURSOR_KEY) ?? 0) + 1;
    const current = await this.state.storage.get<StoredSwarmFrame[]>(SWARM_EVENTS_KEY) ?? [];
    current.push({ cursor, receivedAt: new Date().toISOString(), frame });
    await this.state.storage.put(SWARM_CURSOR_KEY, cursor);
    await this.state.storage.put(SWARM_EVENTS_KEY, current.slice(-SWARM_EVENT_LIMIT));
  }

  private liveSocket(record: SwarmPresenceRecord | undefined): CoordinatorSocket | null {
    if (!record) return null;
    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SwarmChannelAttachment | null;
      if (attachment?.fence === record.fence) return socket;
    }
    return null;
  }

  private async presence(): Promise<Response> {
    const record = await this.state.storage.get<SwarmPresenceRecord>(SWARM_PRESENCE_KEY);
    const socket = this.liveSocket(record);
    let lastSeenAt = record?.lastSeenAt ?? null;
    if (record && socket) {
      const answeredAt = this.state.getWebSocketAutoResponseTimestamp(socket);
      if (answeredAt) lastSeenAt = Math.max(lastSeenAt ?? 0, answeredAt.getTime());
    }
    return Response.json({
      state: socket ? "online" : "offline",
      swarmId: record?.swarmId ?? null,
      machineId: record?.machineId ?? null,
      fence: record?.fence ?? null,
      helloAt: record?.helloAt ? new Date(record.helloAt).toISOString() : null,
      lastSeenAt: lastSeenAt === null ? null : new Date(lastSeenAt).toISOString(),
      headVersion: record?.headVersion ?? null,
      headClass: record?.headClass ?? null,
      headState: record?.headState ?? null,
    });
  }

  private async events(url: URL): Promise<Response> {
    const rawAfter = Number(url.searchParams.get("after") ?? "0");
    const rawLimit = Number(url.searchParams.get("limit") ?? "100");
    const after = Number.isSafeInteger(rawAfter) && rawAfter >= 0 ? rawAfter : 0;
    const limit = Number.isSafeInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 100;
    const stored = await this.state.storage.get<StoredSwarmFrame[]>(SWARM_EVENTS_KEY) ?? [];
    const events = stored.filter((entry) => entry.cursor > after).slice(0, limit);
    return Response.json({
      events,
      nextCursor: events.at(-1)?.cursor ?? after,
    });
  }

  private async send(request: Request): Promise<Response> {
    let frame: unknown;
    try {
      frame = await request.json();
    } catch {
      return Response.json({ code: "INVALID_FRAME" }, { status: 400 });
    }
    const record = await this.state.storage.get<SwarmPresenceRecord>(SWARM_PRESENCE_KEY);
    const candidateMachineId = record?.machineId
      ?? (frame && typeof frame === "object" ? (frame as { machineId?: unknown }).machineId : null);
    if (typeof candidateMachineId !== "string"
      || !MACHINE_ID.test(candidateMachineId)
      || !parseHeadInboundFrame(JSON.stringify(frame), candidateMachineId)) {
      return Response.json({ code: "INVALID_FRAME" }, { status: 400 });
    }
    const socket = this.liveSocket(record);
    if (!record || !socket) return Response.json({ code: "MACHINE_OFFLINE" }, { status: 503 });
    try {
      socket.send(JSON.stringify(frame));
      return Response.json({ ok: true });
    } catch {
      return Response.json({ code: "MACHINE_OFFLINE" }, { status: 503 });
    }
  }

  private async liveness(request: Request): Promise<Response> {
    let desktopSeenAt: unknown;
    try {
      desktopSeenAt = (await request.json() as { desktopSeenAt?: unknown }).desktopSeenAt;
    } catch {
      return Response.json({ code: "INVALID_FRAME" }, { status: 400 });
    }
    if (typeof desktopSeenAt !== "string" || !Number.isFinite(Date.parse(desktopSeenAt))) {
      return Response.json({ code: "INVALID_FRAME" }, { status: 400 });
    }
    const record = await this.state.storage.get<SwarmPresenceRecord>(SWARM_PRESENCE_KEY);
    const socket = this.liveSocket(record);
    if (!record || !socket) return Response.json({ code: "MACHINE_OFFLINE" }, { status: 503 });
    socket.send(JSON.stringify({
      kind: "desktop.liveness",
      protocolVersion: SWARM_HEAD_PROTOCOL_VERSION,
      machineId: record.machineId,
      desktopSeenAt,
      sentAt: new Date().toISOString(),
    }));
    return Response.json({ ok: true });
  }
}
