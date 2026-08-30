/**
 * SSE plumbing: createSseStream (web-stream sink) and SSEConnectionManager
 * (in-memory session registry + delivery). Both are pure in-process — driven
 * here with fake sinks matching the SseSink contract; no server, no database.
 */
import { describe, it, expect } from "vitest";
import { createSseStream, type SseSink } from "../../../src/server/services/sse_stream";
import SSEConnectionManager from "../../../src/server/services/sse_connection_manager";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import type { Message } from "../../../src/server/repo/message_repo";

const message = (over: Partial<Message> = {}): Message => ({
  message_id: 1,
  from_user_id: "user_a",
  from_device_id: "dev_desktop",
  target_kind: "device",
  target_user_id: null,
  target_device_id: "dev_phone",
  type: "note",
  request_id: "req_1",
  correlation_id: "cor_1",
  payload: JSON.stringify({ n: 1 }),
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

interface FakeSink extends SseSink {
  writes: string[];
  endedCount: number;
}

function fakeSink(options: { failWrite?: boolean } = {}): FakeSink {
  let ended = false;
  const sink: FakeSink = {
    writes: [],
    endedCount: 0,
    write(chunk: string) {
      if (options.failWrite) throw new Error("write failed");
      sink.writes.push(chunk);
      return true;
    },
    end() {
      ended = true;
      sink.endedCount += 1;
    },
    get writableEnded() {
      return ended;
    },
    onClose() {},
  };
  return sink;
}

const manager = () => new SSEConnectionManager(new TraceAdapter());

describe("createSseStream", () => {
  it("returns an SSE Response and announces the connection", async () => {
    const { response, sink } = createSseStream();
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(response.headers.get("x-accel-buffering")).toBe("no");

    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe(": connected\n\n");

    expect(sink.write("data: hello\n\n")).toBe(true);
    const second = await reader.read();
    expect(new TextDecoder().decode(second.value)).toBe("data: hello\n\n");

    sink.end();
    const done = await reader.read();
    expect(done.done).toBe(true);
  });

  it("end() fires close callbacks once and stops further writes", () => {
    const { sink } = createSseStream();
    let closes = 0;
    sink.onClose(() => closes++);
    expect(sink.writableEnded).toBe(false);

    sink.end();
    sink.end(); // idempotent
    expect(closes).toBe(1);
    expect(sink.writableEnded).toBe(true);
    expect(sink.write("late\n\n")).toBe(false);

    // A callback registered after the end fires immediately.
    let lateClose = false;
    sink.onClose(() => { lateClose = true; });
    expect(lateClose).toBe(true);
  });

  it("client cancel (stream cancel) notifies close callbacks", async () => {
    const { response, sink } = createSseStream();
    let closed = false;
    sink.onClose(() => { closed = true; });
    await response.body!.cancel();
    expect(closed).toBe(true);
    expect(sink.writableEnded).toBe(true);
  });
});

describe("SSEConnectionManager", () => {
  it("attach registers the connection and getConnection finds it", () => {
    const m = manager();
    const sink = fakeSink();
    m.attach("sess_1", "user_a", "dev_phone", sink);
    const conn = m.getConnection("sess_1");
    expect(conn).toMatchObject({
      sessionId: "sess_1",
      userId: "user_a",
      deviceId: "dev_phone",
      streamSeq: 0,
      replayComplete: false,
    });
  });

  it("a second attach for the same device takes over and ends the old sink", () => {
    const m = manager();
    const oldSink = fakeSink();
    const newSink = fakeSink();
    m.attach("sess_old", "user_a", "dev_phone", oldSink);
    m.attach("sess_new", "user_a", "dev_phone", newSink);

    expect(m.getConnection("sess_old")).toBeUndefined();
    expect(oldSink.endedCount).toBe(1);
    expect(m.getConnection("sess_new")).toBeDefined();
  });

  it("detach removes all mappings, ends the sink, and tolerates unknown sessions", () => {
    const m = manager();
    const sink = fakeSink();
    m.attach("sess_1", "user_a", "dev_phone", sink);
    m.detach("sess_1");
    expect(m.getConnection("sess_1")).toBeUndefined();
    expect(sink.endedCount).toBe(1);

    // Unknown session: no-op. Repeated detach: no double-end.
    m.detach("sess_1");
    m.detach("sess_never_existed");
    expect(sink.endedCount).toBe(1);

    // Fully detached: a device-targeted message no longer matches.
    m.deliver(message({ target_device_id: "dev_phone" }));
    expect(sink.writes).toHaveLength(0);
  });

  it("queues deliveries during replay, then drains them on markReplayComplete", () => {
    const m = manager();
    const sink = fakeSink();
    m.attach("sess_1", "user_a", "dev_phone", sink);

    m.deliver(message({ message_id: 1 }));
    m.deliver(message({ message_id: 2 }));
    expect(sink.writes).toHaveLength(0);
    expect(m.getConnection("sess_1")!.liveQueue).toHaveLength(2);

    m.markReplayComplete("sess_1");
    expect(sink.writes).toHaveLength(2);
    expect(sink.writes[0]).toContain("id: 1\n");
    expect(sink.writes[0]).toContain('"streamSeq":1');
    expect(sink.writes[1]).toContain("id: 2\n");
    expect(sink.writes[1]).toContain('"streamSeq":2');
    expect(m.getConnection("sess_1")!.liveQueue).toHaveLength(0);

    // markReplayComplete for an unknown session is a no-op.
    m.markReplayComplete("sess_nope");
  });

  it("delivers live messages with a full envelope after replay", () => {
    const m = manager();
    const sink = fakeSink();
    m.attach("sess_1", "user_a", "dev_phone", sink);
    m.markReplayComplete("sess_1");

    m.deliver(message({ message_id: 7 }));
    expect(sink.writes).toHaveLength(1);
    const dataLine = sink.writes[0].split("\n").find((l) => l.startsWith("data: "))!;
    expect(JSON.parse(dataLine.slice(6))).toEqual({
      messageId: 7,
      streamSeq: 1,
      type: "note",
      requestId: "req_1",
      correlationId: "cor_1",
      payload: { n: 1 },
      createdAt: "2026-01-01T00:00:00Z",
      fromUserId: "user_a",
      fromDeviceId: "dev_desktop",
      targetKind: "device",
      targetUserId: null,
      targetDeviceId: "dev_phone",
    });
  });

  it("user-targeted messages fan out to every session of that user only", () => {
    const m = manager();
    const phone = fakeSink();
    const tablet = fakeSink();
    const stranger = fakeSink();
    m.attach("sess_phone", "user_a", "dev_phone", phone);
    m.attach("sess_tablet", "user_a", "dev_tablet", tablet);
    m.attach("sess_other", "user_b", "dev_other", stranger);
    m.markReplayComplete("sess_phone");
    m.markReplayComplete("sess_tablet");
    m.markReplayComplete("sess_other");

    m.deliver(message({ target_kind: "user", target_user_id: "user_a", target_device_id: null }));
    expect(phone.writes).toHaveLength(1);
    expect(tablet.writes).toHaveLength(1);
    expect(stranger.writes).toHaveLength(0);
  });

  it("a message with no matching session is dropped without throwing", () => {
    const m = manager();
    expect(() => m.deliver(message({ target_device_id: "dev_ghost" }))).not.toThrow();
    expect(() => m.deliver(message({ target_kind: "user", target_user_id: "user_ghost" }))).not.toThrow();
    expect(() => m.deliver(message({ target_kind: "broadcast", target_device_id: null }))).not.toThrow();
  });

  it("a null payload is delivered as payload:null", () => {
    const m = manager();
    const sink = fakeSink();
    m.attach("sess_1", "user_a", "dev_phone", sink);
    m.markReplayComplete("sess_1");
    m.deliver(message({ payload: null }));
    expect(sink.writes[0]).toContain('"payload":null');
  });

  it("a write failure detaches the broken connection", () => {
    const m = manager();
    const broken = fakeSink({ failWrite: true });
    m.attach("sess_1", "user_a", "dev_phone", broken);
    m.markReplayComplete("sess_1");
    m.deliver(message());
    expect(m.getConnection("sess_1")).toBeUndefined();
  });

  it("writes are skipped on an already-ended sink without detaching", () => {
    const m = manager();
    const sink = fakeSink();
    m.attach("sess_1", "user_a", "dev_phone", sink);
    m.markReplayComplete("sess_1");
    sink.end(); // client went away
    m.deliver(message());
    expect(sink.writes).toHaveLength(0);
    expect(m.getConnection("sess_1")).toBeDefined();
  });

  it("heartbeat writes keepalives to open sinks, skips ended, detaches broken", () => {
    const m = manager();
    const open = fakeSink();
    const gone = fakeSink();
    const broken = fakeSink({ failWrite: true });
    m.attach("sess_open", "user_a", "dev_a", open);
    m.attach("sess_gone", "user_a", "dev_b", gone);
    m.attach("sess_broken", "user_a", "dev_c", broken);
    gone.end();

    m.heartbeat();
    expect(open.writes).toEqual([": keepalive\n\n"]);
    expect(gone.writes).toHaveLength(0);
    expect(m.getConnection("sess_gone")).toBeDefined();
    expect(m.getConnection("sess_broken")).toBeUndefined();
  });
});
