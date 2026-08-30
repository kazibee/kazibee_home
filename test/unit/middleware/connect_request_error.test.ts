/**
 * connectRequestError — the Connect protocol's pre-controller error shaper.
 * A pure function over BackendRequestContext: invoked directly with fabricated
 * contexts and asserted on the shaped Response. No server, no database.
 */
import { describe, it, expect } from "vitest";
import type { BackendRequestContext, BackendRequestErrorV1 } from "@noego/dinner";
import { connectRequestError } from "../../../src/server/middleware/connect_request_error";

const ERROR = {} as BackendRequestErrorV1;

function context(over: {
  path?: string;
  method?: string;
  body?: unknown;
  query?: unknown;
} = {}): BackendRequestContext {
  return {
    request: new Request(`http://relay.test${over.path ?? "/v1/connect/handshake"}`, {
      method: over.method ?? "POST",
    }),
    body: over.body,
    query: over.query,
  } as unknown as BackendRequestContext;
}

describe("connectRequestError", () => {
  it("ignores requests outside the Connect surface", () => {
    expect(connectRequestError(context({ path: "/v1/sessions" }), ERROR)).toBeUndefined();
    expect(connectRequestError(context({ path: "/api/status" }), ERROR)).toBeUndefined();
  });

  it("shapes the canonical invalid-envelope 400 with the fallback correlationId", async () => {
    const response = connectRequestError(context({ body: undefined, query: undefined }), ERROR)!;
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("x-kazi-protocol-version")).toBe("1.0");
    expect(await response.json()).toEqual({
      kind: "error",
      protocolVersion: "1.0",
      code: "invalid-envelope",
      message: "Invalid request envelope",
      retryable: false,
      correlationId: "cor_invalid000",
    });
  });

  it("echoes a well-formed correlationId from the body", async () => {
    const response = connectRequestError(
      context({ body: { correlationId: "cor_abc12345" } }),
      ERROR,
    )!;
    expect((await response.json()).correlationId).toBe("cor_abc12345");
  });

  it("falls back to the query correlationId when the body has none", async () => {
    const response = connectRequestError(
      context({ body: { other: 1 }, query: { correlationId: "cor_qquery99" } }),
      ERROR,
    )!;
    expect((await response.json()).correlationId).toBe("cor_qquery99");
  });

  it("rejects malformed correlationIds back to the fallback", async () => {
    const response = connectRequestError(
      context({ body: { correlationId: "not-a-correlation-id" } }),
      ERROR,
    )!;
    expect((await response.json()).correlationId).toBe("cor_invalid000");
  });

  it("answers 409 protocol-version-mismatch for an unsupported protocolVersion", async () => {
    const response = connectRequestError(
      context({ body: { protocolVersion: "2.0", correlationId: "cor_abc12345" } }),
      ERROR,
    )!;
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "protocol-version-mismatch",
      message: "Protocol version mismatch",
      correlationId: "cor_abc12345",
    });
  });

  it("the supported protocolVersion stays an invalid-envelope 400", async () => {
    const response = connectRequestError(context({ body: { protocolVersion: "1.0" } }), ERROR)!;
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("invalid-envelope");
  });

  it("answers 413 for an oversized POST /v1/connect/relay frame, beating the version check", async () => {
    const response = connectRequestError(
      context({
        path: "/v1/connect/relay",
        body: { protocolVersion: "2.0", blob: "x".repeat(257 * 1024) },
      }),
      ERROR,
    )!;
    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe("invalid-envelope");
  });

  it("the frame-size check only applies to POST /v1/connect/relay", async () => {
    const big = { blob: "x".repeat(257 * 1024) };
    const other = connectRequestError(context({ path: "/v1/connect/handshake", body: big }), ERROR)!;
    expect(other.status).toBe(400);
    const get = connectRequestError(context({ path: "/v1/connect/relay", method: "GET", body: big }), ERROR)!;
    expect(get.status).toBe(400);
  });

  it("an unserializable relay body is not treated as oversized", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const response = connectRequestError(
      context({ path: "/v1/connect/relay", body: circular }),
      ERROR,
    )!;
    expect(response.status).toBe(400);
  });
});
