import { describe, expect, it, vi } from "vitest";
import type { SseSink as Response } from "../../../src/server/services/sse_stream";
import ConnectExecutorConnectionRegistry from "../../../src/server/services/connect_executor_connection_registry";
import {
  ConnectClock,
  ConnectIdGenerator,
} from "../../../src/server/services/connect_auth_primitives";

class TestClock extends ConnectClock {
  constructor(public milliseconds = 1_000) {
    super();
  }
  override now(): Date {
    return new Date(this.milliseconds);
  }
  advance(milliseconds: number): void {
    this.milliseconds += milliseconds;
  }
}

class TestIds extends ConnectIdGenerator {
  private next = 0;
  override channelFenceId(): string {
    this.next += 1;
    return `fen_test${this.next}`;
  }
}

function response(writeResult = true) {
  const writes: string[] = [];
  const value = {
    destroyed: false,
    writableEnded: false,
    write: vi.fn((data: string) => {
      writes.push(data);
      return writeResult;
    }),
    end: vi.fn(),
  };
  return { value: value as unknown as Response, writes, end: value.end };
}

function registry(clock = new TestClock()) {
  return { clock, value: new ConnectExecutorConnectionRegistry(clock, new TestIds()) };
}

const connection = (value: Response, executorId = "exe_12345678") => ({
  executorId,
  deviceId: `dev_${executorId.slice(4)}`,
  generation: 1,
  response: value,
});

describe("ConnectExecutorConnectionRegistry", () => {
  it("starts offline, writes hello ack before ordered frames, and fences takeover cleanup", () => {
    const { value } = registry();
    expect(value.presence("exe_12345678")).toBe("offline");
    expect(value.dispatch("exe_12345678", { kind: "command.post" })).toEqual({
      ok: false, reason: "executor-offline",
    });

    const first = response();
    value.hello("exe_12345678", 1, "cor_12345678");
    const firstFence = value.open(connection(first.value));
    expect(firstFence).toBe("fen_test1");
    expect(first.writes[0]).toBe("data: {\"kind\":\"channel.ack\",\"protocolVersion\":\"1.0\",\"executorId\":\"exe_12345678\",\"acknowledgedKind\":\"channel.hello\",\"correlationId\":\"cor_12345678\"}\n\n");
    expect(value.dispatch("exe_12345678", { n: 1 })).toEqual({ ok: true });
    expect(value.dispatch("exe_12345678", { n: 2 })).toEqual({ ok: true });
    expect(first.writes.slice(-2)).toEqual(["data: {\"n\":1}\n\n", "data: {\"n\":2}\n\n"]);

    const second = response();
    const secondFence = value.open(connection(second.value));
    expect(secondFence).toBe("fen_test2");
    expect(first.writes.filter((item) => item.includes("channel.revoked"))).toHaveLength(1);
    expect(first.end).toHaveBeenCalledOnce();
    value.close("exe_12345678", firstFence);
    expect(value.presence("exe_12345678")).toBe("online");
    value.close("exe_12345678", secondFence);
    expect(value.presence("exe_12345678")).toBe("offline");
  });

  it("expires pending hello deterministically and bounds pending control metadata", () => {
    const { clock, value } = registry();
    const expired = response();
    value.hello("exe_expired01", 1, "cor_expired01");
    clock.advance(30_000);
    value.open(connection(expired.value, "exe_expired01"));
    expect(expired.writes).toEqual([]);

    for (let index = 0; index < 1_025; index += 1) {
      value.hello(
        `exe_bound${index.toString().padStart(8, "0")}`,
        1,
        `cor_bound${index.toString().padStart(8, "0")}`,
      );
    }
    const evicted = response();
    value.open(connection(evicted.value, "exe_bound00000000"));
    expect(evicted.writes).toEqual([]);
    const newest = response();
    value.open(connection(newest.value, "exe_bound00001024"));
    expect(newest.writes).toHaveLength(1);
    expect(newest.writes[0]).toContain("\"correlationId\":\"cor_bound00001024\"");
  });

  it("uses heartbeat activity for stale timeout and never treats dispatch as heartbeat", () => {
    const { clock, value } = registry();
    const live = response();
    value.open(connection(live.value));
    clock.advance(44_000);
    expect(value.dispatch("exe_12345678", { n: 1 })).toEqual({ ok: true });
    clock.advance(1_001);
    expect(value.presence("exe_12345678")).toBe("stale");
    expect(live.end).toHaveBeenCalledOnce();
    expect(value.presence("exe_12345678")).toBe("stale");
    clock.advance(45_000);
    expect(value.presence("exe_12345678")).toBe("offline");

    const refreshed = response();
    value.open(connection(refreshed.value));
    clock.advance(44_000);
    expect(value.touch("exe_12345678", 2)).toBe(false);
    expect(value.touch("exe_12345678", 1)).toBe(true);
    clock.advance(44_000);
    expect(value.presence("exe_12345678")).toBe("online");
  });

  it("drops slow consumers immediately without queueing and cleans pending state on close", () => {
    const { value } = registry();
    const slow = response(false);
    const fence = value.open(connection(slow.value));
    expect(value.dispatch("exe_12345678", { n: 1 })).toEqual({
      ok: false, reason: "backpressure",
    });
    expect(slow.end).toHaveBeenCalledOnce();
    expect(value.presence("exe_12345678")).toBe("offline");

    value.hello("exe_cleanup01", 1, "cor_cleanup01");
    const cleanup = response();
    const cleanupFence = value.open(connection(cleanup.value, "exe_cleanup01"));
    value.hello("exe_cleanup01", 1, "cor_cleanup02");
    value.close("exe_cleanup01", cleanupFence);
    const reopened = response();
    value.open(connection(reopened.value, "exe_cleanup01"));
    expect(reopened.writes).toEqual([]);
    value.close("exe_12345678", fence);
  });
});
