/** Metadata-only diagnostics. Never serialize errors, tokens, arguments or results. */
export async function mcpStage<T>(phase: string, work: () => Promise<T>, fields: Record<string, unknown> = {}): Promise<T> {
  const id = crypto.randomUUID(), started = Date.now();
  const emit = (outcome: string, extra: Record<string, unknown> = {}) => {
    try { console.log(JSON.stringify({ event: "mcp.stage", phase, id, ...fields, outcome, elapsedMs: Date.now() - started, ...extra })); } catch {}
  };
  emit("started");
  try {
    const result = await work();
    // A stage whose work returns a failed trust Result (a repository lookup
    // that reports `{ ok: false, error: { cause } }` instead of throwing)
    // failed just like one that threw: report it the same way.
    const failed = failedResultCause(result);
    if (failed.failed) emit("failed", errorDetails(failed.cause));
    else emit("completed");
    return result;
  }
  catch (error) {
    emit("failed", errorDetails(error));
    throw error;
  }
}

function failedResultCause(result: unknown): { failed: false } | { failed: true; cause: unknown } {
  if (typeof result !== "object" || result === null || !("ok" in result) || result.ok !== false) {
    return { failed: false };
  }
  const failure = "error" in result ? result.error : undefined;
  return {
    failed: true,
    cause: typeof failure === "object" && failure !== null && "cause" in failure ? failure.cause : undefined,
  };
}

function errorDetails(error: unknown): Record<string, unknown> {
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
  return details;
}
