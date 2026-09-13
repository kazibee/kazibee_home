/** Metadata-only diagnostics. Never serialize errors, tokens, arguments or results. */
export async function mcpStage<T>(phase: string, work: () => Promise<T>, fields: Record<string, unknown> = {}): Promise<T> {
  const id = crypto.randomUUID(), started = Date.now();
  const emit = (outcome: string, extra: Record<string, unknown> = {}) => {
    try { console.log(JSON.stringify({ event: "mcp.stage", phase, id, ...fields, outcome, elapsedMs: Date.now() - started, ...extra })); } catch {}
  };
  emit("started");
  try { const result = await work(); emit("completed"); return result; }
  catch (error) {
    let details: Record<string, unknown> = {};
    try {
      const e = error as { name?: unknown; code?: unknown; stack?: unknown; message?: unknown };
      details = {
        errorType: ["Error", "TypeError", "RangeError", "SyntaxError", "TimeoutError", "AbortError"].includes(String(e?.name)) ? e.name : "unknown",
        sqlState: typeof e?.code === "string" && /^[0-9A-Z]{5}$/.test(e.code) ? e.code : undefined,
        // Emit only numeric source positions, not error messages or stack source URLs.
        locations: typeof e?.stack === "string" ? e.stack.split("\n").slice(1, 9).map(line => line.match(/:(\d+):(\d+)\)?$/)?.slice(1).join(":")).filter(Boolean) : [],
        timestampComparisonFailure: typeof e?.message === "string" && e.message.includes("localeCompare") && e.message.includes("not a function"),
      };
    } catch {}
    emit("failed", details);
    throw error;
  }
}
