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
