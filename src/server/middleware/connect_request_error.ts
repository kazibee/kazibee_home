import type { BackendRequestContext, BackendRequestErrorV1 } from "@noego/dinner";

const CONNECT_PATH_PREFIX = "/v1/connect/";
const CORRELATION_PATTERN = /^cor_[A-Za-z0-9]{8,64}$/;
const FALLBACK_CORRELATION_ID = "cor_invalid000";
const PROTOCOL_VERSION = "1.0";
const RELAY_MAX_FRAME_BYTES = 256 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestValues(context: BackendRequestContext): Record<string, unknown>[] {
  return [context.body, context.query].filter(isRecord);
}

function correlationId(context: BackendRequestContext): string {
  for (const value of requestValues(context)) {
    const candidate = value.correlationId;
    if (typeof candidate === "string" && CORRELATION_PATTERN.test(candidate)) return candidate;
  }
  return FALLBACK_CORRELATION_ID;
}

function hasUnsupportedProtocolVersion(context: BackendRequestContext): boolean {
  const supplied = requestValues(context)
    .map((value) => value.protocolVersion)
    .find((value) => value !== undefined);
  return typeof supplied === "string" && supplied.length > 0 && supplied !== PROTOCOL_VERSION;
}

function isOversizedRelayFrame(context: BackendRequestContext): boolean {
  const url = new URL(context.request.url);
  if (context.request.method !== "POST" || url.pathname !== "/v1/connect/relay") return false;
  try {
    return new TextEncoder().encode(JSON.stringify(context.body)).byteLength > RELAY_MAX_FRAME_BYTES;
  } catch {
    return false;
  }
}

/**
 * Pre-controller request errors (malformed JSON, schema validation) on the
 * Connect protocol surface answer with the canonical protocol error
 * envelope instead of the framework's default 400. Wired through the
 * backend hooks (`onRequestError`) so it applies on Node and Workers alike.
 */
export function connectRequestError(
  context: BackendRequestContext,
  _error: BackendRequestErrorV1,
): Response | undefined {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith(CONNECT_PATH_PREFIX)) return undefined;

  const oversized = isOversizedRelayFrame(context);
  const protocolMismatch = !oversized && hasUnsupportedProtocolVersion(context);
  const status = oversized ? 413 : protocolMismatch ? 409 : 400;
  return new Response(
    JSON.stringify({
      kind: "error",
      protocolVersion: PROTOCOL_VERSION,
      code: protocolMismatch ? "protocol-version-mismatch" : "invalid-envelope",
      message: protocolMismatch ? "Protocol version mismatch" : "Invalid request envelope",
      retryable: false,
      correlationId: correlationId(context),
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-kazi-protocol-version": PROTOCOL_VERSION,
      },
    },
  );
}
