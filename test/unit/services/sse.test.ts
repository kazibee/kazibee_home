/**
 * SSE plumbing: createSseStream (web-stream sink). Pure in-process —
 * no server, no database.
 */
import { describe, it, expect } from "vitest";
import { createSseStream } from "../../../src/server/services/sse_stream";
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
