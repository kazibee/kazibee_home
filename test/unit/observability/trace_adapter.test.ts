import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TraceLevel } from "@noego/trace";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import { TraceProbe } from "../../helpers/trace-probe";

describe("TraceAdapter", () => {
  let adapter: TraceAdapter;
  let probe: TraceProbe;

  beforeEach(() => {
    TraceAdapter.configureWebsiteProcess();
    adapter = new TraceAdapter();
    probe = new TraceProbe();
    probe.start();
  });

  afterEach(() => {
    probe.stop();
  });

  it("recursively redacts nested secrets and content before emission", async () => {
    const canary = "trace-canary-must-not-escape";
    const context = {
      safeId: "safe-123",
      nested: {
        password: canary,
        payload: { value: canary },
        list: [
          { authorization: canary },
          { pairing_code: canary },
          { safe: "visible" },
        ],
      },
      content: canary,
    };

    adapter.forSource("CanarySource").info("canary.emitted", context, canary);
    await probe.flush();

    const [event] = probe.query({
      source: "CanarySource",
      event: "canary.emitted",
    });
    expect(event.process).toBe("website");
    expect(event.message).toBe("[REDACTED]");
    expect(event.context).toEqual({
      safeId: "safe-123",
      nested: {
        password: "[REDACTED]",
        payload: "[REDACTED]",
        list: [
          { authorization: "[REDACTED]" },
          { pairing_code: "[REDACTED]" },
          { safe: "visible" },
        ],
      },
      content: "[REDACTED]",
    });
    expect(JSON.stringify(event)).not.toContain(canary);
    expect(context.nested.password).toBe(canary);
  });

  it("marks circular references, serializes dates, and redacts debug/warn/error messages", async () => {
    const canary = "trace-canary-must-not-escape";
    const circular: Record<string, unknown> = { safe: "visible" };
    circular.self = circular;
    const context = {
      loop: circular,
      when: new Date("2026-08-31T00:00:00.000Z"),
    };

    const trace = adapter.forSource("EdgeSource");
    trace.debug("edge.debug", context, canary);
    trace.warn("edge.warn", context, canary);
    trace.error("edge.error", context, canary);
    await probe.flush();

    for (const eventName of ["edge.debug", "edge.warn", "edge.error"]) {
      const [event] = probe.query({ source: "EdgeSource", event: eventName });
      expect(event.message).toBe("[REDACTED]");
      expect(event.context).toEqual({
        loop: { safe: "visible", self: "[CIRCULAR]" },
        when: "2026-08-31T00:00:00.000Z",
      });
      expect(JSON.stringify(event)).not.toContain(canary);
    }
  });

  it("caches one port per source and passes an absent message through untouched", async () => {
    expect(adapter.forSource("Cached")).toBe(adapter.forSource("Cached"));

    adapter.forSource("Cached").info("cached.no-message");
    await probe.flush();
    const [event] = probe.query({ source: "Cached", event: "cached.no-message" });
    expect(event.message).toBeUndefined();
  });

  it("supports ordered events, exact counts, and absence assertions", async () => {
    const trace = adapter.forSource("Workflow");
    trace.info("workflow.started");
    trace.warn("workflow.retry");
    trace.info("workflow.finished");
    trace.info("workflow.finished");
    await probe.flush();

    expect(probe.hasOrderedSubsequence([
      { source: "Workflow", event: "workflow.started" },
      { source: "Workflow", event: "workflow.retry", level: TraceLevel.WARN },
      { source: "Workflow", event: "workflow.finished" },
    ])).toBe(true);
    expect(probe.count({ source: "Workflow", event: "workflow.finished" })).toBe(2);
    expect(probe.count({ source: "Workflow", event: "workflow.failed" })).toBe(0);
  });

  it("isolates capture windows across explicit subscription lifecycles", async () => {
    const trace = adapter.forSource("Lifecycle");
    trace.info("first-window");
    probe.stop();
    trace.info("while-stopped");

    probe.start();
    trace.info("second-window");
    await probe.flush();

    expect(probe.count()).toBe(1);
    expect(probe.count({ event: "first-window" })).toBe(0);
    expect(probe.count({ event: "while-stopped" })).toBe(0);
    expect(probe.count({ event: "second-window" })).toBe(1);
  });
});
