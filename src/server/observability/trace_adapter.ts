import { Component, LoadAs } from "@noego/ioc";
import {
  configureTrace,
  getTrace,
  type ScopedTrace,
} from "@noego/trace";

const REDACTED = "[REDACTED]";
const CIRCULAR = "[CIRCULAR]";

const SENSITIVE_KEY_PARTS = [
  "apikey",
  "auth",
  "authorization",
  "cookie",
  "credential",
  "pairingcode",
  "password",
  "secret",
  "token",
];

const CONTENT_KEYS = new Set([
  "body",
  "content",
  "data",
  "input",
  "message",
  "messages",
  "output",
  "payload",
  "prompt",
  "request",
  "response",
]);

export interface TracePort {
  debug(event: string, context?: Record<string, unknown>, message?: string): void;
  info(event: string, context?: Record<string, unknown>, message?: string): void;
  warn(event: string, context?: Record<string, unknown>, message?: string): void;
  error(event: string, context?: Record<string, unknown>, message?: string): void;
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mustRedact(key: string): boolean {
  const normalized = normalizedKey(key);
  return CONTENT_KEYS.has(normalized)
    || SENSITIVE_KEY_PARTS.some(part => normalized.includes(part));
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      mustRedact(key) ? REDACTED : redactValue(nestedValue, seen),
    ]),
  );
}

export function redactTraceContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }
  return redactValue(context, new WeakSet()) as Record<string, unknown>;
}

class RedactingTracePort implements TracePort {
  constructor(private readonly trace: ScopedTrace) {}

  debug(event: string, context?: Record<string, unknown>, message?: string): void {
    this.trace.debug(event, redactTraceContext(context), redactMessage(message));
  }

  info(event: string, context?: Record<string, unknown>, message?: string): void {
    this.trace.info(event, redactTraceContext(context), redactMessage(message));
  }

  warn(event: string, context?: Record<string, unknown>, message?: string): void {
    this.trace.warn(event, redactTraceContext(context), redactMessage(message));
  }

  error(event: string, context?: Record<string, unknown>, message?: string): void {
    this.trace.error(event, redactTraceContext(context), redactMessage(message));
  }
}

function redactMessage(message?: string): string | undefined {
  return message === undefined ? undefined : REDACTED;
}

/**
 * The website's only production adapter to @noego/trace.
 *
 * Callers receive a source-bound port; all metadata passes through recursive
 * redaction before it reaches the process-wide synchronous trace stream.
 */
@Component({ scope: LoadAs.Singleton })
export default class TraceAdapter {
  private readonly ports = new Map<string, TracePort>();

  static configureWebsiteProcess(): void {
    configureTrace({ process: "website" });
  }

  forSource(source: string): TracePort {
    let port = this.ports.get(source);
    if (!port) {
      port = new RedactingTracePort(getTrace(source));
      this.ports.set(source, port);
    }
    return port;
  }
}
