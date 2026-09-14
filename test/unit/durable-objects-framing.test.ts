import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHANNEL_PROTOCOL_VERSION, FRAME_LIMITS } from "@kazibee-internal/connect-protocol/channel";

/**
 * ExecutorCoordinator framing — differential tier.
 *
 * The coordinator's session-frame serialization now comes from
 * `@kazibee-internal/connect-protocol/channel`. The reference functions below
 * are the coordinator's previous in-file serializers, copied verbatim, so the
 * emitted bytes are proven identical (modulo the time-based frame id) rather
 * than assumed. The 160 KiB serialized-envelope budget stays coordinator-owned
 * and is pinned here as distinct from the 128 KiB payload / 192 KiB result
 * budgets.
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
  storage = new FakeStorage();
  acceptWebSocket(ws: FakeSocket) { this.sockets.push(ws); this.accepted.push(ws); }
  getWebSockets() { return this.sockets; }
  setWebSocketAutoResponse() {}
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

// ---------------------------------------------------------------- reference
// Verbatim copies of the coordinator's pre-migration serializers.

const REFERENCE_PROTOCOL_VERSION = "1.1";
const REFERENCE_SESSION_CHUNK_LIMIT = 128 * 1024;

function referenceUtf8Chunks(value: string): string[] {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const point of value) {
    const size = encoder.encode(point).byteLength;
    if (bytes + size > REFERENCE_SESSION_CHUNK_LIMIT && chunk) {
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

function referenceSessionFrames(sessionId: string, payload: string, frameId: string): string[] {
  const chunks = referenceUtf8Chunks(payload);
  return chunks.map((chunk, chunkIndex) => JSON.stringify({
    kind: "session.frame",
    protocolVersion: REFERENCE_PROTOCOL_VERSION,
    sessionId,
    frameId,
    chunkIndex,
    chunkCount: chunks.length,
    payload: chunk,
  }));
}

function referenceErrorFrame(code: string, message: string, fatal: boolean): string {
  return JSON.stringify({ kind: "channel.error", protocolVersion: REFERENCE_PROTOCOL_VERSION, code, message, fatal });
}

function referenceSessionClose(sessionId: string, reason: string): string {
  return JSON.stringify({ kind: "session.close", protocolVersion: REFERENCE_PROTOCOL_VERSION, sessionId, reason });
}

// ---------------------------------------------------------------- harness

const EXECUTOR_ID = "exe_do0000000001";
const SESSION_ID = "vs_session000001";

type Coordinator = {
  fetch(request: Request): Promise<Response>;
  webSocketMessage(ws: FakeSocket, message: string | ArrayBuffer): Promise<void>;
  webSocketClose(ws: FakeSocket): Promise<void>;
};

function makeCoordinator() {
  const state = new FakeState();
  const coordinator = new ExecutorCoordinator(state as never) as unknown as Coordinator;
  return { state, coordinator };
}

async function connect(state: FakeState, coordinator: Coordinator): Promise<FakeSocket> {
  await coordinator.fetch(new Request("https://do.internal/channel", {
    headers: {
      Upgrade: "websocket",
      "x-kazi-executor-id": EXECUTOR_ID,
      "x-kazi-device-id": "dev_do0000000001",
      "x-kazi-credential-generation": "1",
    },
  }));
  const ws = state.sockets[state.sockets.length - 1]!;
  await coordinator.webSocketMessage(ws, JSON.stringify({
    kind: "channel.hello", protocolVersion: CHANNEL_PROTOCOL_VERSION, executorId: EXECUTOR_ID, correlationId: "cor_hello01",
  }));
  return ws;
}

async function attachViewer(state: FakeState, coordinator: Coordinator): Promise<FakeSocket> {
  await coordinator.fetch(new Request("https://do.internal/viewer", {
    headers: {
      Upgrade: "websocket",
      "x-kazi-executor-id": EXECUTOR_ID,
      "x-kazi-account-ref": "usr_do0000000001",
      "x-kazi-session-id": SESSION_ID,
    },
  }));
  return state.accepted.at(-1)!;
}

function sessionFrame(payload: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    kind: "session.frame",
    protocolVersion: CHANNEL_PROTOCOL_VERSION,
    sessionId: SESSION_ID,
    frameId: "sf_test_1",
    chunkIndex: 0,
    chunkCount: 1,
    payload,
    ...overrides,
  });
}

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;

describe("ExecutorCoordinator framing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("viewer -> executor session frames (canonical encoder vs. reference serializer)", () => {
    it("keeps frame correlation counters local to each coordinator", async () => {
      const first = makeCoordinator();
      const second = makeCoordinator();
      const firstExecutor = await connect(first.state, first.coordinator);
      const secondExecutor = await connect(second.state, second.coordinator);
      const firstViewer = await attachViewer(first.state, first.coordinator);
      const secondViewer = await attachViewer(second.state, second.coordinator);
      const message = JSON.stringify({ type: "invoke", id: "inv_1", channel: "echo", payload: "x" });
      await first.coordinator.webSocketMessage(firstViewer, message);
      await first.coordinator.webSocketMessage(firstViewer, message);
      await second.coordinator.webSocketMessage(secondViewer, message);
      expect(JSON.parse(firstExecutor.sent.at(-1)!).frameId).toMatch(/_2$/);
      expect(JSON.parse(secondExecutor.sent.at(-1)!).frameId).toMatch(/_1$/);
    });
    const cases: Array<[string, string]> = [
      ["single ASCII chunk", "x".repeat(1_000)],
      ["exactly one 128 KiB payload after the invoke envelope", "x".repeat(FRAME_LIMITS.sessionPayloadBytes - 60)],
      ["300 KiB ASCII", "x".repeat(300 * 1024)],
      ["4-byte code points straddling the chunk boundary", "🙂".repeat(70_000)],
      ["mixed-width text", "é🙂z".repeat(50_000)],
    ];

    for (const [label, value] of cases) {
      it(`emits byte-identical frames for ${label}`, async () => {
        const { state, coordinator } = makeCoordinator();
        const executor = await connect(state, coordinator);
        const viewer = await attachViewer(state, coordinator);
        const before = executor.sent.length;
        const original = JSON.stringify({ type: "invoke", id: "inv_1", channel: "echo", payload: value });

        await coordinator.webSocketMessage(viewer, original);

        const emitted = executor.sent.slice(before);
        expect(emitted.length).toBeGreaterThan(0);
        const first = JSON.parse(emitted[0]!) as { frameId: string };
        expect(first.frameId).toMatch(/^sf_[0-9a-z]+_[0-9a-z]+$/);
        expect(emitted).toEqual(referenceSessionFrames(SESSION_ID, original, first.frameId));
        for (const raw of emitted) {
          const frame = JSON.parse(raw) as { payload: string; frameId: string };
          expect(frame.frameId).toBe(first.frameId);
          expect(byteLength(frame.payload)).toBeLessThanOrEqual(FRAME_LIMITS.sessionPayloadBytes);
        }
        expect(emitted.map((raw) => (JSON.parse(raw) as { payload: string }).payload).join("")).toBe(original);
        expect(viewer.closed).toEqual([]);
        expect(executor.closed).toEqual([]);
      });
    }

    it("uses a fresh frame id per viewer message", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      const viewer = await attachViewer(state, coordinator);
      const before = executor.sent.length;
      await coordinator.webSocketMessage(viewer, JSON.stringify({ type: "invoke", id: "a", channel: "c" }));
      await coordinator.webSocketMessage(viewer, JSON.stringify({ type: "invoke", id: "b", channel: "c" }));
      const [first, second] = executor.sent.slice(before).map((raw) => JSON.parse(raw) as { frameId: string });
      expect(first!.frameId).not.toBe(second!.frameId);
    });
  });

  describe("control frames", () => {
    it("serializes channel.error exactly as before", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, "{nope");
      expect(ws.sent.at(-1)).toBe(referenceErrorFrame("EXECUTOR_PROTOCOL_VIOLATION", "invalid json", true));
      expect(ws.closed.at(-1)).toEqual({ code: 1002, reason: "invalid json" });
    });

    it("serializes session.close exactly as before when a viewer disconnects", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      const viewer = await attachViewer(state, coordinator);
      await coordinator.webSocketClose(viewer);
      expect(executor.sent.at(-1)).toBe(referenceSessionClose(SESSION_ID, "viewer-closed"));
    });

    it("stamps hello.ack and session.open with the canonical channel version", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      const ack = JSON.parse(executor.sent.at(-1)!) as Record<string, unknown>;
      expect(ack.kind).toBe("channel.hello.ack");
      expect(ack.protocolVersion).toBe(CHANNEL_PROTOCOL_VERSION);
      expect(CHANNEL_PROTOCOL_VERSION).toBe("1.1");

      await attachViewer(state, coordinator);
      const open = JSON.parse(executor.sent.at(-1)!) as Record<string, unknown>;
      expect(open).toMatchObject({
        kind: "session.open",
        protocolVersion: "1.1",
        sessionId: SESSION_ID,
        viewerRole: "web_agent_viewer",
        accountRef: "usr_do0000000001",
      });
      expect(Object.keys(open).sort()).toEqual([
        "accountRef", "correlationId", "kind", "protocolVersion", "sentAt", "sessionId", "viewerRole",
      ]);
    });

    it("rejects a hello on the wrong channel version with the canonical incompatibility frame", async () => {
      const { state, coordinator } = makeCoordinator();
      const ws = await connect(state, coordinator);
      await coordinator.webSocketMessage(ws, JSON.stringify({
        kind: "channel.hello", protocolVersion: "1.0", executorId: EXECUTOR_ID,
      }));
      expect(ws.sent.at(-1)).toBe(referenceErrorFrame("EXECUTOR_INCOMPATIBLE", "unsupported protocol version", true));
    });
  });

  describe("budgets", () => {
    it("pins the coordinator envelope budget apart from the Connect payload and result budgets", () => {
      expect(FRAME_LIMITS.sessionPayloadBytes).toBe(128 * 1024);
      expect(FRAME_LIMITS.resultFrameBytes).toBe(192 * 1024);
      // 160 KiB is coordinator-owned: strictly between payload and result budgets.
      expect(160 * 1024).toBeGreaterThan(FRAME_LIMITS.sessionPayloadBytes);
      expect(160 * 1024).toBeLessThan(FRAME_LIMITS.resultFrameBytes);
    });

    it("forwards a session.frame carrying a full 128 KiB payload verbatim", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      const viewer = await attachViewer(state, coordinator);
      const payload = "x".repeat(FRAME_LIMITS.sessionPayloadBytes);
      const raw = sessionFrame(payload);
      expect(byteLength(raw)).toBeLessThanOrEqual(160 * 1024);
      await coordinator.webSocketMessage(executor, raw);
      expect(viewer.sent.at(-1)).toBe(payload);
      expect(executor.closed).toEqual([]);
    });

    it("drops (without fencing) a session.frame whose payload exceeds 128 KiB but whose envelope fits 160 KiB", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      const viewer = await attachViewer(state, coordinator);
      const before = viewer.sent.length;
      const raw = sessionFrame("x".repeat(FRAME_LIMITS.sessionPayloadBytes + 1));
      expect(byteLength(raw)).toBeLessThanOrEqual(160 * 1024);
      await coordinator.webSocketMessage(executor, raw);
      expect(viewer.sent.length).toBe(before);
      expect(executor.closed).toEqual([]);
      expect(viewer.closed).toEqual([]);
    });

    it("fences a session.frame envelope over 160 KiB even though it is under the 192 KiB result budget", async () => {
      const { state, coordinator } = makeCoordinator();
      const executor = await connect(state, coordinator);
      await attachViewer(state, coordinator);
      const raw = sessionFrame("x".repeat(161 * 1024));
      expect(byteLength(raw)).toBeGreaterThan(160 * 1024);
      expect(byteLength(raw)).toBeLessThanOrEqual(FRAME_LIMITS.resultFrameBytes);
      await coordinator.webSocketMessage(executor, raw);
      expect(executor.sent.at(-1)).toBe(referenceErrorFrame("EXECUTOR_PROTOCOL_VIOLATION", "frame exceeds result budget", true));
      expect(executor.closed.at(-1)).toEqual({ code: 1009, reason: "frame too large" });
    });

    it("keeps accepting non-session frames up to the 192 KiB result budget and fences one byte over", async () => {
      const okay = makeCoordinator();
      const okayWs = await connect(okay.state, okay.coordinator);
      const filler = "x".repeat(170 * 1024);
      const under = JSON.stringify({
        kind: "command.result", protocolVersion: CHANNEL_PROTOCOL_VERSION, executorId: EXECUTOR_ID, operationId: "opn_none", filler,
      });
      expect(byteLength(under)).toBeGreaterThan(160 * 1024);
      expect(byteLength(under)).toBeLessThanOrEqual(FRAME_LIMITS.resultFrameBytes);
      const sentBefore = okayWs.sent.length;
      await okay.coordinator.webSocketMessage(okayWs, under);
      expect(okayWs.sent.length).toBe(sentBefore);
      expect(okayWs.closed).toEqual([]);

      const over = makeCoordinator();
      const overWs = await connect(over.state, over.coordinator);
      await over.coordinator.webSocketMessage(overWs, "x".repeat(FRAME_LIMITS.resultFrameBytes + 1));
      expect(overWs.sent.at(-1)).toBe(referenceErrorFrame("EXECUTOR_PROTOCOL_VIOLATION", "frame exceeds result budget", true));
      expect(overWs.closed.at(-1)).toEqual({ code: 1009, reason: "frame too large" });
    });
  });
});
