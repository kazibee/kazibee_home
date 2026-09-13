/**
 * Direct console diagnostics for the KaziQuery export pipeline.
 *
 * These deliberately bypass the @noego logger: the exporter subscribes to the
 * logger record stream, so logging through it would re-enter the export
 * pipeline recursively. Every event is one JSON line with a stable `event`
 * name and metadata-only fields. Callers must never pass credentials,
 * headers, SQL, record bodies, request/response bodies, URLs or error objects;
 * this helper additionally drops anything that is not a primitive and caps
 * string length. This is not general secret redaction; values still require audit.
 *
 * Diagnostic failures never affect behavior: every path is wrapped.
 */
export type DiagnosticLevel = "log" | "warn" | "error";
export type DiagnosticValue = string | number | boolean | null | undefined;
export type DiagnosticFields = Record<string, DiagnosticValue>;

const MAX_STRING = 200;
const MAX_FIELDS = 24;

export function sanitizeField(value: unknown): DiagnosticValue {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "string") return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + "…" : value;
  return undefined;
}

/** Safe classification of an unknown error: never its message, stack or object. */
export function classifyError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  if (error.name === "TimeoutError") return "timeout";
  if (error.name === "AbortError") return "aborted";
  if (error.name === "TypeError") return "network";
  return "error";
}

export function diagnose(level: DiagnosticLevel, event: string, fields: Record<string, unknown> = {}): void {
  try {
    const entry: Record<string, DiagnosticValue> = { event: String(event).slice(0, 128), ts: Date.now() };
    let count = 0;
    for (const [key, raw] of Object.entries(fields)) {
      if (/token|secret|password|authorization|cookie|headers?|sql|body|payload|message|stack|url/i.test(key)) continue;
      if (++count > MAX_FIELDS) break;
      const value = sanitizeField(raw);
      if (value !== undefined) entry[key.slice(0, 64)] = value;
    }
    const sink = globalThis.console;
    const write = sink?.[level] ?? sink?.log;
    if (typeof write !== "function") return;
    write.call(sink, JSON.stringify(entry));
  } catch {
    // Diagnostics are best-effort and must never change export behavior.
  }
}
