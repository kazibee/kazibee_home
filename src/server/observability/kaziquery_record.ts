import type { LogRecord } from "@noego/logger";
import type { AdmittedTraceEvent } from "@noego/trace";

/** Preserve the logger message and JSON context; metadata lives outside that context. */
export interface ExportRecord {
  id: string;
  occurredAtMs: number;
  kind: "log" | "trace";
  name: string;
  level?: string;
  message?: string;
  context?: unknown;
  attributes: Record<string, unknown>;
}

const SOURCES = new Set([
  "ConnectAuthService", "ConnectAuthController", "ConnectDesktopService",
  "ConnectExecutorService", "ConnectClientRelayService",
]);
const EVENTS = new Set(["started", "completed", "failed", "skipped"]);
const LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

export class KaziQueryRecordPolicy {
  log(record: LogRecord): ExportRecord | undefined {
    if (!record.logger.startsWith("kazibee") || record.logger === "kazibee:kaziquery-export") return;
    const level = record.level.toLowerCase();
    if (!LEVELS.has(level)) return;
    const exported = this.record(record, "log", "server.log", record.context, level);
    return exported && { ...exported, message: record.message };
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
      exportPolicyVersion: 2,

    };
    return { id: record.id, occurredAtMs: record.occurredAtMs, kind, name, ...(context !== undefined ? { context } : {}), ...(level ? { level } : {}), attributes };
  }
}
