import { describe, expect, it, vi } from "vitest";

class FakeSocket {
  sent: string[] = [];
  attachment: unknown = null;
  send(data: string) { this.sent.push(data); }
  close() { /* no-op fake */ }
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
  storage = new FakeStorage();
  acceptWebSocket(ws: FakeSocket) { this.sockets.push(ws); }
  getWebSockets() { return this.sockets; }
  setWebSocketAutoResponse() { /* no-op fake */ }
  getWebSocketAutoResponseTimestamp() { return null; }
}

class FakeRequestResponsePair {
  constructor(public request: string, public response: string) {}
}
vi.stubGlobal("WebSocketRequestResponsePair", FakeRequestResponsePair);

const { SwarmMachineCoordinator } = await import("../../src/server/durable-objects");

type Coordinator = {
  fetch(request: Request): Promise<Response>;
  webSocketMessage(ws: FakeSocket, message: string | ArrayBuffer): Promise<void>;
};

const SWARM_ID = "swm_12345678";
const MACHINE_ID = "mch_12345678";

function makeCoordinator(connected = true): { state: FakeState; socket: FakeSocket; coordinator: Coordinator } {
  const state = new FakeState();
  const socket = new FakeSocket();
  socket.attachment = { swarmId: SWARM_ID, machineId: MACHINE_ID, fence: "fence_test", helloAt: 0 };
  if (connected) state.sockets.push(socket);
  const coordinator = new SwarmMachineCoordinator(state as never) as unknown as Coordinator;
  return { state, socket, coordinator };
}

function helloFrame() {
  return {
    kind: "head.hello",
    protocolVersion: "1.0",
    swarmId: SWARM_ID,
    machineId: MACHINE_ID,
    env: "dev",
    headClass: "head_micro",
    imageDigest: null,
    headVersion: "1.0.0",
    providers: [],
    maxThreads: 2,
    threads: [],
    correlationId: "cor_12345678",
    sentAt: "2026-09-02T10:00:00.000Z",
  };
}

function heartbeat(state: "ready" | "stopping") {
  return {
    kind: "head.heartbeat",
    protocolVersion: "1.0",
    machineId: MACHINE_ID,
    state,
    threads: [],
    rssBytes: 1024,
    sentAt: "2026-09-02T10:00:01.000Z",
  };
}

describe("SwarmMachineCoordinator", () => {
  it("acknowledges hello and stores machine presence", async () => {
    const { state, socket, coordinator } = makeCoordinator();
    await coordinator.webSocketMessage(socket, JSON.stringify(helloFrame()));
    expect(JSON.parse(socket.sent.at(-1)!)).toMatchObject({
      kind: "head.hello.ack",
      protocolVersion: "1.0",
      machineId: MACHINE_ID,
      machineFence: "fence_test",
      correlationId: "cor_12345678",
    });
    expect(state.storage.map.get("swarm-presence")).toMatchObject({
      swarmId: SWARM_ID,
      machineId: MACHINE_ID,
      headVersion: "1.0.0",
    });
  });

  it("orders ring-buffer cursors and paginates events", async () => {
    const { socket, coordinator } = makeCoordinator();
    await coordinator.webSocketMessage(socket, JSON.stringify(helloFrame()));
    await coordinator.webSocketMessage(socket, JSON.stringify(heartbeat("ready")));
    await coordinator.webSocketMessage(socket, JSON.stringify(heartbeat("stopping")));

    const response = await coordinator.fetch(
      new Request("https://do.internal/events?after=1&limit=1"),
    );
    const body = await response.json() as {
      events: Array<{ cursor: number; frame: { state: string } }>;
      nextCursor: number;
    };
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ cursor: 2, frame: { state: "stopping" } });
    expect(body.nextCursor).toBe(2);
  });

  it("returns MACHINE_OFFLINE when send has no live socket", async () => {
    const { coordinator } = makeCoordinator(false);
    const response = await coordinator.fetch(new Request("https://do.internal/send", {
      method: "POST",
      body: JSON.stringify({
        kind: "thread.interrupt",
        protocolVersion: "1.0",
        machineId: MACHINE_ID,
        threadId: "thr_12345678",
        sentAt: "2026-09-02T10:00:00.000Z",
      }),
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "MACHINE_OFFLINE" });
  });
});
