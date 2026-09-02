/**
 * ConnectScheduler — the one timer adapter Connect domain services may use.
 * Deterministic via vitest fake timers; no real waiting.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectScheduler } from "../../../src/server/services/connect_auth_primitives";

describe("ConnectScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the task after the requested delay, not before", () => {
    const scheduler = new ConnectScheduler();
    const task = vi.fn();
    scheduler.schedule(1_000, task);
    vi.advanceTimersByTime(999);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("a cancelled task never fires", () => {
    const scheduler = new ConnectScheduler();
    const task = vi.fn();
    const handle = scheduler.schedule(1_000, task);
    handle.cancel();
    vi.advanceTimersByTime(10_000);
    expect(task).not.toHaveBeenCalled();
  });
});
