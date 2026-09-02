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
const STALE_AFTER_MS = 60_000;
const OFFLINE_AFTER_MS = 120_000;

const PRESENCE_KEY = "presence";

interface ChannelAttachment {
  executorId: string;
  deviceId: string;
  credentialGeneration: number;
  fence: string;
  helloAt: number;
}

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

export class ExecutorCoordinator {
  private readonly state: CoordinatorState;
  private readonly routes = new Map<string, InflightRoute>();

  constructor(state: CoordinatorState) {
    this.state = state;
    // Runtime-level keepalive: free, and does not wake the object.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return this.acceptChannel(request);
    }

    // Internal-binding surface. Only reachable from an approved Kazibee worker;
    // the public site's browser relay cannot construct these.
    if (request.method === "POST" && url.pathname === "/dispatch") {
      return this.dispatch(request);
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

    // One fence at a time. A newer authenticated channel replaces the old one;
    // frames arriving on the retired fence are ignored rather than raced.
    const fence = `fence_${crypto.randomUUID().replace(/-/g, "")}`;
    for (const existing of this.state.getWebSockets()) {
      try {
        existing.close(1012, "replaced by newer channel");
      } catch {
        // Already closing; the runtime reaps it.
      }
    }

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    const attachment: ChannelAttachment = {
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

  async webSocketMessage(ws: CoordinatorSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    if (message.length > RESULT_FRAME_LIMIT) {
      ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "frame exceeds result budget", true));
      ws.close(1009, "frame too large");
      return;
    }

    const attachment = ws.deserializeAttachment() as ChannelAttachment | null;
    if (!attachment) {
      ws.close(1008, "unidentified channel");
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
    if (frame.protocolVersion !== PROTOCOL_VERSION) {
      ws.send(errorFrame("EXECUTOR_INCOMPATIBLE", "unsupported protocol version", true));
      ws.close(1008, "protocol version");
      return;
    }
    if (frame.executorId !== attachment.executorId) {
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
      default:
        ws.send(errorFrame("EXECUTOR_PROTOCOL_VIOLATION", "unknown frame kind", false));
    }
  }

  async webSocketClose(ws: CoordinatorSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as ChannelAttachment | null;
    if (!attachment) return;
    // Only clear presence if this socket still owns the current fence; a
    // replaced channel closing must not knock the new one offline.
    const record = await this.state.storage.get<PresenceRecord>(PRESENCE_KEY);
    if (record?.fence === attachment.fence) {
      await this.state.storage.delete(PRESENCE_KEY);
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
      const answeredAt = this.state.getWebSocketAutoResponseTimestamp(socket);
      if (answeredAt) lastSeenAt = Math.max(lastSeenAt, answeredAt.getTime());
    }
    return { ...record, lastSeenAt };
  }

  private async presence(): Promise<Response> {
    const record = this.liveRecord(await this.state.storage.get<PresenceRecord>(PRESENCE_KEY));
    const hasSocket = this.state.getWebSockets().length > 0;
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
    const sockets = this.state.getWebSockets();
    const socket = sockets[0];
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
