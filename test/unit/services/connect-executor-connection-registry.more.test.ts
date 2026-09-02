import { describe, expect, it, vi } from "vitest";
import type { SseSink as Response } from "../../../src/server/services/sse_stream";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock,
  ConnectIdGenerator,
} from "../../../src/server/services/connect_auth_primitives";

class TestClock extends ConnectClock {
  constructor(public milliseconds = 1_000) { super(); }
  override now(): Date { return new Date(this.milliseconds); }
  advance(milliseconds: number): void { this.milliseconds += milliseconds; }
}
class TestIds extends ConnectIdGenerator {
  private next = 0;
  override channelFenceId(): string { return `fen_more${++this.next}`; }
}

function response(writeResult = true) {
  const writes: string[] = [];
  const value = {
    destroyed: false,
    writableEnded: false,
    write: vi.fn((data: string) => { writes.push(data); return writeResult; }),
    end: vi.fn(),
  };
  return { value: value as unknown as Response, writes, end: value.end };
}

function registry(clock = new TestClock()) {
  return { clock, value: new ConnectExecutorConnectionRegistry(clock, new TestIds()) };
}

const connection = (value: Response, executorId = "exe_more0001") => ({
  executorId,
  deviceId: `dev_${executorId.slice(4)}`,
  generation: 1,
  response: value,
});

describe("ConnectExecutorConnectionRegistry edge paths", () => {
  it("tears the channel down when the hello ack write is refused", () => {
    const { value } = registry();
    value.hello("exe_more0001", 1, "cor_ackfail0001");
    const sink = response(false);
    value.open(connection(sink.value));
    expect(sink.end).toHaveBeenCalled();
    expect(value.presence("exe_more0001")).toBe("offline");
  });

  it("revoke notifies and ends a live channel, then is a no-op when absent", () => {
    const { value } = registry();
    const sink = response();
    value.open(connection(sink.value));
    const disconnected: string[] = [];
    value.onDisconnect((executorId) => disconnected.push(executorId));
    value.revoke("exe_more0001", "cor_revoke00001");
    expect(sink.writes.join("")).toContain('"kind":"channel.revoked"');
    expect(sink.end).toHaveBeenCalled();
    expect(disconnected).toEqual(["exe_more0001"]);
    // No live channel any more: revoke returns early.
    value.revoke("exe_more0001", "cor_revoke00002");
    expect(disconnected).toEqual(["exe_more0001"]);
  });

  it("close ignores a stale fence and an unknown executor", () => {
    const { value } = registry();
    const sink = response();
    value.open(connection(sink.value));
    value.close("exe_more0001", "fen_wrong");
    expect(value.presence("exe_more0001")).toBe("online");
    value.close("exe_unknown001");
    value.close("exe_more0001");
    expect(value.presence("exe_more0001")).toBe("offline");
  });

  it("touch refreshes only a matching generation", () => {
    const { value, clock } = registry();
    value.open(connection(response().value));
    expect(value.touch("exe_more0001", 2)).toBe(false);
    clock.advance(40_000);
    expect(value.touch("exe_more0001", 1)).toBe(true);
    clock.advance(40_000);
    // Refreshed 40s ago: still online rather than stale.
    expect(value.presence("exe_more0001")).toBe("online");
  });

  it("caps the stale tombstone map at its maximum", () => {
    const { value, clock } = registry();
    const count = 1_025;
    for (let index = 0; index < count; index += 1) {
      value.open(connection(response().value, `exe_tomb${String(index).padStart(6, "0")}`));
    }
    clock.advance(46_000);
    for (let index = 0; index < count; index += 1) {
      expect(value.presence(`exe_tomb${String(index).padStart(6, "0")}`)).toBe("stale");
    }
    // The oldest tombstone was evicted past the cap: it reads offline now.
    expect(value.presence("exe_tomb000000")).toBe("offline");
    expect(value.presence("exe_tomb001024")).toBe("stale");
  });
});
