import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ExecutorCoordinator durable object — pure unit tier.
 *
 * The Workers runtime surface the module needs (WebSocketPair,
 * WebSocketRequestResponsePair, the DO state/storage) is faked in-process;
 * the coordinator logic itself runs unmodified.
 */

class FakeSocket {
  sent: string[] = [];
  closed: Array<{ code?: number; reason?: string }> = [];
  attachment: unknown = null;
  autoResponseAt: Date | null = null;
  send(data: string) { this.sent.push(data); }
  close(code?: number, reason?: string) { this.closed.push({ code, reason }); }
  serializeAttachment(value: unknown) { this.attachment = value; }
  deserializeAttachment() { return this.attachment; }
  lastFrame(): Record<string, unknown> {
    return JSON.parse(this.sent[this.sent.length - 1]!) as Record<string, unknown>;
  }
}

class FakeStorage {
  map = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return this.map.get(key) as T | undefined; }
  async put<T>(key: string, value: T): Promise<void> { this.map.set(key, value); }
  async delete(key: string): Promise<boolean> { return this.map.delete(key); }
}

class FakeState {
  sockets: FakeSocket[] = [];
  accepted: FakeSocket[] = [];
  autoResponsePair: unknown = null;
  storage = new FakeStorage();
  acceptWebSocket(ws: FakeSocket) { this.sockets.push(ws); this.accepted.push(ws); }
  getWebSockets() { return this.sockets; }
  setWebSocketAutoResponse(pair: unknown) { this.autoResponsePair = pair; }
  getWebSocketAutoResponseTimestamp(ws: FakeSocket) { return ws.autoResponseAt; }
}

class FakePair {
  0: FakeSocket;
  1: FakeSocket;
  constructor() {
    this[0] = new FakeSocket();
    this[1] = new FakeSocket();
  }
}
class FakeRequestResponsePair {
  constructor(public request: string, public response: string) {}
}

// Node's undici Response rejects the Workers-only 101 switching-protocols
// status; tolerate it so acceptChannel can be exercised as-is.
const NativeResponse = Response;
class WorkersResponse extends NativeResponse {
  private statusOverride: number | null = null;
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    if (init?.status === 101) {
      super(body, { ...init, status: 200 });
      this.statusOverride = 101;
    } else {
      super(body, init);
    }
  }
  override get status(): number {
    return this.statusOverride ?? super.status;
  }
}
vi.stubGlobal("Response", WorkersResponse);

vi.stubGlobal("WebSocketPair", FakePair);
vi.stubGlobal("WebSocketRequestResponsePair", FakeRequestResponsePair);

const { ExecutorCoordinator } = await import("../../src/server/durable-objects");

const PROTOCOL = "1.1";

function upgradeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://do.internal/channel", {
    headers: {
      Upgrade: "websocket",
      "x-kazi-executor-id": "exe_do0000000001",
      "x-kazi-device-id": "dev_do0000000001",
      "x-kazi-credential-generation": "3",
      ...headers,
    },
  });
}

function makeCoordinator() {
  const state = new FakeState();
  const coordinator = new ExecutorCoordinator(state as never) as unknown as {
    fetch(request: Request): Promise<Response>;
    webSocketMessage(ws: FakeSocket, message: string | ArrayBuffer): Promise<void>;
    webSocketClose(ws: FakeSocket): Promise<void>;
  };
  return { state, coordinator };
}

/** Accept a channel and complete hello; returns the server-side socket. */
async function connect(state: FakeState, coordinator: ReturnType<typeof makeCoordinator>["coordinator"]) {
  await coordinator.fetch(upgradeRequest());
  const ws = state.sockets[state.sockets.length - 1]!;
  await coordinator.webSocketMessage(ws, JSON.stringify({
    kind: "channel.hello",
    protocolVersion: PROTOCOL,
    executorId: "exe_do0000000001",
    executorVersion: "9.9.9",
    platform: "darwin",
    capabilities: { tools: ["bash"] },
    workspaces: [{ id: "wsp_1" }],
    correlationId: "cor_hello01",
  }));
  return ws;
}

async function drain(): Promise<void> {
  // dispatch() awaits request.json() and storage before registering the
  // route; let those microtasks run before timers or frames are applied.
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

function dispatchCommand(overrides: Record<string, unknown> = {}, payloadOverrides: Record<string, unknown> = {}) {
  return new Request("https://do.internal/dispatch", {
    method: "POST",
    body: JSON.stringify({
      kind: "command.post",
      commandId: "cmd_do0000000001",
      payload: { operationId: "opn_do0000000001", ...payloadOverrides },
      ...overrides,
    }),
  });
}

describe("ExecutorCoordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetch routing", () => {
    it("rejects unknown paths with 404", async () => {
      const { coordinator } = makeCoordinator();
      const response = await coordinator.fetch(new Request("https://do.internal/nope"));
      expect(response.status).toBe(404);
    });

    it("rejects channel upgrades missing identity headers", async () => {
      const { coordinator } = makeCoordinator();
      const response = await coordinator.fetch(
        new Request("https://do.internal/channel", { headers: { Upgrade: "websocket" } }),
      );
      expect(response.status).toBe(400);
    });

    it("rejects a non-integer credential generation", async () => {
      const { coordinator } = makeCoordinator();
      const response = await coordinator.fetch(
        upgradeRequest({ "x-kazi-credential-generation": "zero" }),
      );
      expect(response.status).toBe(400);
    });

    it("accepts a well-identified websocket upgrade with a 101", async () => {
      const { state, coordinator } = makeCoordinator();
      const response = await coordinator.fetch(upgradeRequest());
      expect(response.status).toBe(101);
      expect(state.accepted).toHaveLength(1);
      const attachment = state.accepted[0]!.attachment as Record<string, unknown>;
      expect(attachment.executorId).toBe("exe_do0000000001");
      expect(attachment.credentialGeneration).toBe(3);
      expect(String(attachment.fence)).toMatch(/^fence_[0-9a-f]{32}$/);
      expect(state.autoResponsePair).toBeInstanceOf(FakeRequestResponsePair);
    });

    it("closes the previous channel when a newer one connects", async () => {
      const { state, coordinator } = makeCoordinator();
      await coordinator.fetch(upgradeRequest());
      const first = state.sockets[0]!;
      await coordinator.fetch(upgradeRequest());
      expect(first.closed[0]).toEqual({ code: 1012, reason: "replaced by newer channel" });
    });

    it("survives a close() that throws while replacing a channel", async () => {
      const { state, coordinator } = makeCoordinator();
      await coordinator.fetch(upgradeRequest());
      state.sockets[0]!.close = () => { throw new Error("already closing"); };
      const response = await coordinator.fetch(upgradeRequest());
      expect(response.status).toBe(101);
    });
  });

  describe("webSocketMessage", () => {
    it("ignores binary frames", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const before = ws.sent.length;
      await coordinator.webSocketMessage(ws, new ArrayBuffer(4));
      expect(ws.sent.length).toBe(before);
    });

    it("closes oversized frames with a fatal protocol violation", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, "x".repeat(192 * 1024 + 1));
      expect(ws.lastFrame().code).toBe("EXECUTOR_PROTOCOL_VIOLATION");
      expect(ws.closed.at(-1)).toEqual({ code: 1009, reason: "frame too large" });
    });

    it("closes an unidentified channel", async () => {
      const { coordinator } = makeCoordinator();
      const ws = new FakeSocket();
      await coordinator.webSocketMessage(ws, "{}");
      expect(ws.closed[0]).toEqual({ code: 1008, reason: "unidentified channel" });
    });

    it("closes on invalid json", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, "{nope");
      expect(ws.lastFrame().code).toBe("EXECUTOR_PROTOCOL_VIOLATION");
      expect(ws.closed.at(-1)).toEqual({ code: 1002, reason: "invalid json" });
    });

    it("closes on an unsupported protocol version", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "channel.hello", protocolVersion: "0.9", executorId: "exe_do0000000001",
      }));
      expect(ws.lastFrame().code).toBe("EXECUTOR_INCOMPATIBLE");
      expect(ws.closed.at(-1)).toEqual({ code: 1008, reason: "protocol version" });
    });

    it("closes on an executor identity mismatch", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "channel.hello", protocolVersion: PROTOCOL, executorId: "exe_other0000001",
      }));
      expect(ws.lastFrame().code).toBe("EXECUTOR_PROTOCOL_VIOLATION");
      expect(ws.closed.at(-1)).toEqual({ code: 1008, reason: "identity mismatch" });
    });

    it("answers an unknown frame kind with a non-fatal violation and keeps the channel", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const closesBefore = ws.closed.length;
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "channel.mystery", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
      }));
      const frame = ws.lastFrame();
      expect(frame.code).toBe("EXECUTOR_PROTOCOL_VIOLATION");
      expect(frame.fatal).toBe(false);
      expect(ws.closed.length).toBe(closesBefore);
    });

    it("stores presence and acks on hello", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const ack = ws.lastFrame();
      expect(ack.kind).toBe("channel.hello.ack");
      expect(ack.correlationId).toBe("cor_hello01");
      const record = state.storage.map.get("presence") as Record<string, unknown>;
      expect(record.executorVersion).toBe("9.9.9");
      expect(record.platform).toBe("darwin");
      expect(record.capabilities).toEqual({ tools: ["bash"] });
    });
  });

  describe("webSocketMessage (minimal hello)", () => {
    it("defaults optional hello fields and acks with a null correlation id", async () => {
      const { state, coordinator } = makeCoordinator();
      await coordinator.fetch(upgradeRequest());
      const ws = state.sockets[0]!;
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "channel.hello", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
      }));
      const ack = ws.lastFrame();
      expect(ack.kind).toBe("channel.hello.ack");
      expect(ack.correlationId).toBeNull();
      const record = state.storage.map.get("presence") as Record<string, unknown>;
      expect(record.executorVersion).toBe("");
      expect(record.platform).toBe("");
      expect(record.capabilities).toBeNull();
      expect(record.workspaces).toBeNull();
    });
  });

  describe("presence", () => {
    it("reports offline when nothing has connected", async () => {
      const { coordinator } = makeCoordinator();
      const response = await coordinator.fetch(new Request("https://do.internal/presence"));
      expect(await response.json()).toMatchObject({
        state: "offline", executorId: null, capabilities: null, lastSeenAt: null, inflight: 0,
      });
    });

    it("reports online right after hello", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const response = await coordinator.fetch(new Request("https://do.internal/presence"));
      expect(await response.json()).toMatchObject({
        state: "online", executorId: "exe_do0000000001", credentialGeneration: 3,
        executorVersion: "9.9.9",
      });
    });

    it("degrades to stale then offline as lastSeenAt ages", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      vi.advanceTimersByTime(90_000);
      let body = await (await coordinator.fetch(new Request("https://do.internal/presence"))).json();
      expect(body.state).toBe("stale");
      vi.advanceTimersByTime(60_000);
      body = await (await coordinator.fetch(new Request("https://do.internal/presence"))).json();
      expect(body.state).toBe("offline");
    });

    it("folds the runtime auto-response timestamp into liveness", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      vi.advanceTimersByTime(110_000);
      ws.autoResponseAt = new Date(Date.now() - 1_000);
      const body = await (await coordinator.fetch(new Request("https://do.internal/presence"))).json();
      expect(body.state).toBe("online");
    });
  });

  describe("executor.event", () => {
    it("updates capabilities on remote_tool.capabilities.changed", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.capabilities.changed", payload: { tools: ["bash", "read"] },
      }));
      const record = state.storage.map.get("presence") as Record<string, unknown>;
      expect(record.capabilities).toEqual({ tools: ["bash", "read"] });
    });

    it("updates workspaces on remote_tool.workspaces.changed", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.workspaces.changed", payload: [{ id: "wsp_2" }],
      }));
      const record = state.storage.map.get("presence") as Record<string, unknown>;
      expect(record.workspaces).toEqual([{ id: "wsp_2" }]);
    });

    it("ignores events from a retired fence", async () => {
      const { state, coordinator } = makeCoordinator();
      const oldWs = await connect(state, coordinator);
      // A newer channel replaces the fence; then it says hello.
      await connect(state, coordinator);
      await coordinator.webSocketMessage(oldWs, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.capabilities.changed", payload: { tools: ["stale"] },
      }));
      const record = state.storage.map.get("presence") as Record<string, unknown>;
      expect(record.capabilities).toEqual({ tools: ["bash"] });
    });

    it("keeps the previous projection when a change event carries no payload", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.capabilities.changed",
      }));
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.workspaces.changed",
      }));
      const record = state.storage.map.get("presence") as Record<string, unknown>;
      expect(record.capabilities).toEqual({ tools: ["bash"] });
      expect(record.workspaces).toEqual([{ id: "wsp_1" }]);
    });

    it("ignores unknown event types", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const before = state.storage.map.get("presence") as Record<string, unknown>;
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.mystery.changed", payload: { tools: ["stale"] },
      }));
      expect(state.storage.map.get("presence")).toEqual(before);
    });

    it("ignores events before any hello stored presence", async () => {
      const { state, coordinator } = makeCoordinator();
      await coordinator.fetch(upgradeRequest());
      const ws = state.sockets[0]!;
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "executor.event", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        eventType: "remote_tool.capabilities.changed", payload: {},
      }));
      expect(state.storage.map.has("presence")).toBe(false);
    });
  });

  describe("dispatch", () => {
    it("rejects invalid json with 400 INVALID_FRAME", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const response = await coordinator.fetch(new Request("https://do.internal/dispatch", {
        method: "POST", body: "{broken",
      }));
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("INVALID_FRAME");
    });

    it("returns EXECUTOR_OFFLINE when no channel is connected", async () => {
      const { coordinator } = makeCoordinator();
      const response = await coordinator.fetch(dispatchCommand());
      expect(response.status).toBe(503);
      expect((await response.json()).code).toBe("EXECUTOR_OFFLINE");
    });

    it("returns EXECUTOR_OFFLINE when the channel is no longer online", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      vi.advanceTimersByTime(121_000);
      const response = await coordinator.fetch(dispatchCommand());
      expect(response.status).toBe(503);
    });

    it("rejects a missing operation id", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const response = await coordinator.fetch(dispatchCommand({}, { operationId: "" }));
      expect(response.status).toBe(400);
    });

    it("rejects a missing command id", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const response = await coordinator.fetch(dispatchCommand({ commandId: "" }));
      expect(response.status).toBe(400);
    });

    it("rejects a command without a payload object", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const response = await coordinator.fetch(new Request("https://do.internal/dispatch", {
        method: "POST",
        body: JSON.stringify({ kind: "command.post", commandId: "cmd_do0000000001" }),
      }));
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("INVALID_FRAME");
    });

    it("rejects a command with the commandId key absent", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const response = await coordinator.fetch(new Request("https://do.internal/dispatch", {
        method: "POST",
        body: JSON.stringify({ kind: "command.post", payload: { operationId: "opn_do0000000001" } }),
      }));
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("INVALID_FRAME");
    });

    it("tolerates a duplicate command.accepted frame", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      const accepted = JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      });
      await coordinator.webSocketMessage(ws, accepted);
      await coordinator.webSocketMessage(ws, accepted);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.result", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001", status: "ok",
      }));
      const response = await pending;
      expect(response.status).toBe(200);
      expect((await response.json()).status).toBe("ok");
    });

    it("a route deadline firing after the route was removed is a no-op", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      // The send failure removes the route but deliberately leaves the result
      // timer to lapse against the empty map.
      ws.send = () => { throw new Error("channel closed"); };
      const response = await coordinator.fetch(dispatchCommand());
      expect((await response.json()).code).toBe("EXECUTOR_OFFLINE");
      vi.advanceTimersByTime(60_000);
      const presence = await coordinator.fetch(new Request("https://do.internal/presence"));
      expect((await presence.json()).inflight).toBe(0);
    });

    it("delivers the command and resolves with the result frame", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      // The command reached the socket verbatim.
      const delivered = ws.lastFrame();
      expect(delivered.commandId).toBe("cmd_do0000000001");
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      }));
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.result", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001", status: "ok", output: { value: 42 },
      }));
      const response = await pending;
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "ok", output: { value: 42 } });
    });

    it("rejects a duplicate in-flight operation id", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      const duplicate = await coordinator.fetch(dispatchCommand());
      expect(duplicate.status).toBe(400);
      vi.advanceTimersByTime(6_000);
      await pending;
    });

    it("returns BACKPRESSURE past the inflight route cap", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const pendings: Array<Promise<Response>> = [];
      for (let index = 0; index < 32; index += 1) {
        pendings.push(coordinator.fetch(dispatchCommand(
          { commandId: `cmd_bp${index}` }, { operationId: `opn_bp${index}` },
        )));
      }
      const overflow = await coordinator.fetch(dispatchCommand(
        { commandId: "cmd_bp_over" }, { operationId: "opn_bp_over" },
      ));
      expect(overflow.status).toBe(429);
      expect((await overflow.json()).code).toBe("BACKPRESSURE");
      vi.advanceTimersByTime(6_000);
      await Promise.all(pendings);
    });

    it("times out with EXECUTOR_ACCEPT_TIMEOUT when never accepted", async () => {
      const { state, coordinator } = makeCoordinator();
      await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      vi.advanceTimersByTime(5_000);
      const response = await pending;
      expect(response.status).toBe(502);
      expect((await response.json()).code).toBe("EXECUTOR_ACCEPT_TIMEOUT");
    });

    it("times out with DEADLINE_EXCEEDED when accepted but never resolved", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      }));
      vi.advanceTimersByTime(60_000);
      const response = await pending;
      expect(response.status).toBe(502);
      expect((await response.json()).code).toBe("DEADLINE_EXCEEDED");
    });

    it("clamps an explicit deadlineAt into the route budget", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand({}, {
        deadlineAt: new Date(Date.now() + 10_000).toISOString(),
      }));
      await drain();
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      }));
      // Route budget = 10s remaining + 2s grace; not expired at 11s...
      vi.advanceTimersByTime(11_000);
      let settled = false;
      void pending.then(() => { settled = true; });
      await Promise.resolve();
      expect(settled).toBe(false);
      // ...but expired past 12s.
      vi.advanceTimersByTime(2_000);
      const response = await pending;
      expect((await response.json()).code).toBe("DEADLINE_EXCEEDED");
    });

    it("clamps a deadlineAt already in the past to the minimum budget", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand({}, {
        deadlineAt: new Date(Date.now() - 10_000).toISOString(),
      }));
      await drain();
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      }));
      vi.advanceTimersByTime(3_100);
      const response = await pending;
      expect((await response.json()).code).toBe("DEADLINE_EXCEEDED");
    });

    it("fails fast with EXECUTOR_OFFLINE when the socket send throws", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      ws.send = () => { throw new Error("channel closed"); };
      const response = await coordinator.fetch(dispatchCommand());
      expect(response.status).toBe(502);
      expect((await response.json()).code).toBe("EXECUTOR_OFFLINE");
    });

    it("ignores accepted/result frames from a retired fence", async () => {
      const { state, coordinator } = makeCoordinator();
      const oldWs = await connect(state, coordinator);
      const newWs = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      await coordinator.webSocketMessage(oldWs, JSON.stringify({
        kind: "command.result", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001", status: "stale",
      }));
      await coordinator.webSocketMessage(oldWs, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      }));
      // Still pending: only the live fence can resolve it.
      await coordinator.webSocketMessage(newWs, JSON.stringify({
        kind: "command.result", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001", status: "fresh",
      }));
      const response = await pending;
      expect((await response.json()).status).toBe("fresh");
    });

    it("ignores accepted/result frames for unknown operations", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_unknown",
      }));
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.result", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_unknown",
      }));
      // Nothing to assert beyond "did not throw"; presence stays intact.
      expect(state.storage.map.has("presence")).toBe(true);
    });
  });

  describe("webSocketClose", () => {
    it("is a no-op for an unidentified socket", async () => {
      const { coordinator } = makeCoordinator();
      await coordinator.webSocketClose(new FakeSocket());
    });

    it("clears presence and rejects unaccepted routes as EXECUTOR_OFFLINE", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      await coordinator.webSocketClose(ws);
      const response = await pending;
      expect(response.status).toBe(502);
      expect((await response.json()).code).toBe("EXECUTOR_OFFLINE");
      expect(state.storage.map.has("presence")).toBe(false);
    });

    it("rejects accepted routes as RESULT_ROUTE_LOST", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "command.accepted", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001",
      }));
      await coordinator.webSocketClose(ws);
      expect((await (await pending).json()).code).toBe("RESULT_ROUTE_LOST");
    });

    it("keeps routes owned by the live fence when a retired fence closes", async () => {
      const { state, coordinator } = makeCoordinator();
      const oldWs = await connect(state, coordinator);
      const newWs = await connect(state, coordinator);
      const pending = coordinator.fetch(dispatchCommand());
      await drain();
      await coordinator.webSocketClose(oldWs);
      // The route survives; only the live fence resolves it.
      await coordinator.webSocketMessage(newWs, JSON.stringify({
        kind: "command.result", protocolVersion: PROTOCOL, executorId: "exe_do0000000001",
        operationId: "opn_do0000000001", status: "survived",
      }));
      const response = await pending;
      expect(response.status).toBe(200);
      expect((await response.json()).status).toBe("survived");
    });

    it("does not clear presence when a retired fence closes", async () => {
      const { state, coordinator } = makeCoordinator();
      const oldWs = await connect(state, coordinator);
      await connect(state, coordinator);
      await coordinator.webSocketClose(oldWs);
      expect(state.storage.map.has("presence")).toBe(true);
    });
  });

  describe("viewer sessions", () => {
    const viewerRequest = () => new Request("https://do.internal/viewer", {
      headers: {
        Upgrade: "websocket",
        "x-kazi-executor-id": "exe_do0000000001",
        "x-kazi-account-ref": "usr_do0000000001",
        "x-kazi-session-id": "vs_session000001",
      },
    });

    it("accepts viewers when the executor is attached and rejects them offline", async () => {
      const offline = makeCoordinator();
      expect((await offline.coordinator.fetch(viewerRequest())).status).toBe(101);
      expect(offline.state.accepted[0]!.closed.at(-1)).toEqual({
        code: 4404,
        reason: "executor-offline",
      });

      const online = makeCoordinator();
      const executor = await connect(online.state, online.coordinator);
      expect((await online.coordinator.fetch(viewerRequest())).status).toBe(101);
      const viewer = online.state.accepted.at(-1)!;
      expect(viewer.lastFrame()).toEqual({ kind: "session.ready", sessionId: "vs_session000001" });
      expect(executor.sent.map((value) => JSON.parse(value) as { kind?: string }).at(-1)?.kind)
        .toBe("session.open");
    });

    it("chunks a 300 KiB viewer frame toward the executor and forwards executor chunks unassembled", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      await coordinator.fetch(viewerRequest());
      const viewer = state.accepted.at(-1)!;
      const original = JSON.stringify({
        type: "invoke",
        id: "inv_large",
        channel: "echo",
        payload: "x".repeat(300 * 1024),
      });
      await coordinator.webSocketMessage(viewer, original);
      const chunks = executor.sent
        .map((value) => JSON.parse(value) as Record<string, unknown>)
        .filter((frame) => frame.kind === "session.frame");
      expect(chunks.length).toBeGreaterThan(2);

      // Executor -> viewer: multi-chunk frames are relayed piecewise (a Workers
      // WebSocket message is capped at 1 MiB; the browser reassembles), while a
      // single-chunk frame is passed through verbatim.
      const sentBefore = viewer.sent.length;
      for (const chunk of chunks) {
        await coordinator.webSocketMessage(executor, JSON.stringify(chunk));
      }
      const relayed = viewer.sent.slice(sentBefore)
        .map((value) => JSON.parse(value) as Record<string, unknown>);
      expect(relayed.length).toBe(chunks.length);
      expect(relayed.every((frame) => frame.kind === "session.chunk")).toBe(true);
      expect(relayed.map((frame) => frame.chunkIndex)).toEqual(chunks.map((_, index) => index));
      expect(relayed.map((frame) => String(frame.payload)).join("")).toBe(original);

      const small = JSON.stringify({ type: "result", id: "inv_small", value: 1 });
      await coordinator.webSocketMessage(executor, JSON.stringify({
        kind: "session.frame",
        protocolVersion: PROTOCOL,
        sessionId: "vs_session000001",
        frameId: "sf_small_1",
        chunkIndex: 0,
        chunkCount: 1,
        payload: small,
      }));
      expect(viewer.sent.at(-1)).toBe(small);
    });

    it("closes only the viewer when a viewer send fails, never the executor", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      await coordinator.fetch(viewerRequest());
      const viewer = state.accepted.at(-1)!;
      viewer.send = () => { throw new Error("message too large"); };
      await coordinator.webSocketMessage(executor, JSON.stringify({
        kind: "session.frame",
        protocolVersion: PROTOCOL,
        sessionId: "vs_session000001",
        frameId: "sf_boom_1",
        chunkIndex: 0,
        chunkCount: 1,
        payload: JSON.stringify({ type: "result", id: "inv_boom", value: 1 }),
      }));
      expect(viewer.closed.at(-1)).toEqual({ code: 4413, reason: "viewer-send-failed" });
      expect(executor.closed).toEqual([]);
    });

    it("fans executor-offline out to every viewer", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      await coordinator.fetch(viewerRequest());
      await coordinator.fetch(new Request("https://do.internal/viewer", {
        headers: {
          Upgrade: "websocket",
          "x-kazi-executor-id": "exe_do0000000001",
          "x-kazi-account-ref": "usr_do0000000001",
          "x-kazi-session-id": "vs_session000002",
        },
      }));
      const viewers = state.accepted.slice(-2);
      await coordinator.webSocketClose(executor);
      for (const viewer of viewers) {
        expect(viewer.lastFrame()).toEqual({ kind: "session.closed", reason: "executor-offline" });
        expect(viewer.closed.at(-1)).toEqual({ code: 4001, reason: "executor-offline" });
      }
    });

    it("completes and times out ephemeral session invokes", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      const request = () => new Request("https://do.internal/session-invoke", {
        method: "POST",
        body: JSON.stringify({ channel: "assets.read", payload: { path: "/tmp/a.png" } }),
      });
      const pending = coordinator.fetch(request());
      await drain();
      const frames = executor.sent
        .map((value) => JSON.parse(value) as Record<string, unknown>);
      const open = frames.findLast((frame) => frame.kind === "session.open")!;
      const outbound = frames.filter((frame) =>
        frame.kind === "session.frame" && frame.sessionId === open.sessionId);
      const invoke = JSON.parse(outbound.map((frame) => String(frame.payload)).join("")) as {
        id: string;
      };
      await coordinator.webSocketMessage(executor, JSON.stringify({
        kind: "session.frame",
        protocolVersion: PROTOCOL,
        sessionId: open.sessionId,
        frameId: "sf_result_1",
        chunkIndex: 0,
        chunkCount: 1,
        payload: JSON.stringify({ type: "result", id: invoke.id, value: { ok: true } }),
      }));
      expect(await (await pending).json()).toEqual({
        type: "result",
        id: invoke.id,
        value: { ok: true },
      });

      const timeout = coordinator.fetch(request());
      await drain();
      await vi.advanceTimersByTimeAsync(30_000);
      expect((await timeout).status).toBe(504);
    });
  });
});
