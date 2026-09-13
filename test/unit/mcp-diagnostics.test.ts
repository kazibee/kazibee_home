import { afterEach, expect, it, vi } from "vitest";
import { mcpStage } from "../../src/server/observability/mcp_diagnostics";
afterEach(() => vi.restoreAllMocks());
it("logs start and failure without secret error text and preserves the exception", async () => {
 const log = vi.spyOn(console, "log").mockImplementation(() => {});
 const error = new TypeError("secret-token localeCompare is not a function");
 await expect(mcpStage("test", async () => { throw error; })).rejects.toBe(error);
 const entries = log.mock.calls.map(c => JSON.parse(String(c[0])));
 expect(entries.map(e => e.outcome)).toEqual(["started", "failed"]);
 expect(entries[1].timestampComparisonFailure).toBe(true);
 expect(JSON.stringify(entries)).not.toContain("secret-token");
});
it("preserves results when console fails", async () => {
 vi.spyOn(console, "log").mockImplementation(() => { throw new Error("sink"); });
 expect(await mcpStage("test", async () => 42)).toBe(42);
});
