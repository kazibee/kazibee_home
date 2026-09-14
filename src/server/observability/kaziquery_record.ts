import type { LogRecord } from "@noego/logger";
import type { AdmittedTraceEvent } from "@noego/trace";

/** Preserve the logger message and JSON context; metadata lives outside that context. */
export interface ExportRecord {
  id: string;
  occurredAtMs: number;
  kind: "log" | "trace";
  /** Event name (`gateway.request.completed`); the logger message when it is a bounded event token, else `server.log`. */
  name: string;
  level?: string;
  message?: string;
  context?: unknown;
  /** Correlation id promoted from the structured context so it lands in the envelope's indexed `requestId` column. */
  requestId?: string;
  attributes: Record<string, unknown>;
}

const SOURCES = new Set([
  "ConnectAuthService", "ConnectAuthController", "ConnectDesktopService",
  "ConnectExecutorService", "ConnectClientRelayService",
]);
const EVENTS = new Set(["started", "completed", "failed", "skipped"]);
const LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);
/** Logger messages are event tokens (`area.thing.outcome`); anything else stays a plain server log line. */
const EVENT_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,7}$/;
/** Request-scoped scalars worth querying as top-level attributes; the full context stays verbatim. */
const PROMOTED = ["site", "route", "method", "status", "durationMs", "outcome", "logger"] as const;

export class KaziQueryRecordPolicy {
  log(record: LogRecord): ExportRecord | undefined {
    if (!record.logger.startsWith("kazibee") || record.logger === "kazibee:kaziquery-export") return;
    const level = record.level.toLowerCase();
    if (!LEVELS.has(level)) return;
    const message = typeof record.message === "string" ? record.message : "";
    const name = message.length <= 128 && EVENT_NAME.test(message) ? message : "server.log";
    const exported = this.record(record, "log", name, record.context, level);
    if (!exported) return;
    const context = record.context !== null && typeof record.context === "object" && !Array.isArray(record.context) ? record.context as Record<string, unknown> : undefined;
    const attributes: ExportRecord["attributes"] = { ...exported.attributes, logger: record.logger };
    for (const key of PROMOTED) {
      const value = context?.[key];
      if (typeof value === "string" ? value.length <= 256 : typeof value === "number" ? Number.isFinite(value) : typeof value === "boolean") attributes[key] = value;
    }
    const requestId = context?.requestId;
    return {
      ...exported, message, attributes,
      ...(typeof requestId === "string" && requestId.length > 0 && requestId.length <= 128 ? { requestId } : {}),
    };
  }

  trace(record: AdmittedTraceEvent): ExportRecord | undefined {
    if (!SOURCES.has(record.source) || !EVENTS.has(record.event)) return;
    return this.record(record, "trace", `${record.source}.${record.event}`, record.context);
  }

  private record(
    record: { id: string; occurredAtMs: number }, kind: ExportRecord["kind"],
    name: string, context: unknown, level?: string,
  ): ExportRecord | undefined {
    if (!record.id || record.id.length > 128 || !Number.isSafeInteger(record.occurredAtMs) || record.occurredAtMs < 0) return;
    const attributes: ExportRecord["attributes"] = {
      exportPolicyVersion: 3,
    };
    return { id: record.id, occurredAtMs: record.occurredAtMs, kind, name, ...(context !== undefined ? { context } : {}), ...(level ? { level } : {}), attributes };
  }
}
