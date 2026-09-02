/**
 * ConnectAuthRequestParser negative envelope shapes.
 *
 * Complements the parser-depth assertions in the connect auth flow suites
 * with the rejection arms only reachable below the OpenAPI envelope:
 * non-record bodies, wrong key sets, kind mismatches, non-string fields,
 * and the query-fallback with a non-record query.
 */
import { describe, expect, it } from "vitest";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectAuthRequestParser from "../../../src/server/services/connect_auth_request_parser";
import ConnectAuthPolicy from "../../../src/server/services/connect_auth_policy";

const signupBody = {
  kind: "auth.signup.request", protocolVersion: "1.0",
  username: "shavyg2", email: "shavyg2@gmail.com", password: "a-long-password-123",
  idempotencyKey: "idem_aaaaaaaaaaaaaaaa", correlationId: "cor_abcdefgh",
};
const loginBody = {
  kind: "auth.login.request", protocolVersion: "1.0",
  username: "shavyg2", password: "a-long-password-123",
  idempotencyKey: "idem_aaaaaaaaaaaaaaaa", correlationId: "cor_abcdefgh",
};

const request = (overrides: Record<string, unknown>) =>
  ({ body: {}, query: {}, cookies: {}, headers: {}, ...overrides }) as Request;

describe("ConnectAuthRequestParser negative envelopes", () => {
  const parser = new ConnectAuthRequestParser(new ConnectAuthPolicy());

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an array", []],
    ["missing keys", { kind: "auth.signup.request" }],
  ])("rejects a signup body that is %s with the fallback correlationId", (_name, body) => {
    expect(parser.signup(body)).toEqual({
      ok: false, reason: "invalid-envelope",
      correlationId: "cor_invalid000",
    });
  });

  it("rejects extra keys while keeping the caller's valid correlationId", () => {
    expect(parser.signup({ ...signupBody, extra: true })).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_abcdefgh",
    });
  });

  it("rejects an unknown signup protocol version, keeping the caller's correlationId", () => {
    expect(parser.signup({ ...signupBody, protocolVersion: "9.9" })).toEqual({
      ok: false, reason: "protocol-version-mismatch", correlationId: "cor_abcdefgh",
    });
  });

  it("rejects a signup envelope carrying the wrong kind", () => {
    expect(parser.signup({ ...signupBody, kind: "auth.login.request" })).toMatchObject({
      ok: false, reason: "invalid-envelope",
    });
  });

  it("treats a non-string email as an empty, disallowed email", () => {
    expect(parser.signup({ ...signupBody, email: 123 })).toMatchObject({
      ok: false, reason: "invalid-envelope",
    });
  });

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an array", []],
  ])("rejects a login body that is %s", (_name, body) => {
    expect(parser.login(body)).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
    expect(parser.login({ ...loginBody, kind: "auth.signup.request" })).toMatchObject({
      ok: false, reason: "invalid-envelope",
    });
  });

  it("session and logout reject when both body and query fall outside record shapes", () => {
    // Empty body defers to the query envelope; a non-record query is invalid.
    expect(parser.session(request({ body: {}, query: undefined }))).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
    expect(parser.logout(request({ body: [], query: [] }))).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
  });
});
