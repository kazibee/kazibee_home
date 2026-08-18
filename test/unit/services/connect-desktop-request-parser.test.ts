import { describe, expect, it } from "vitest";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectDesktopRequestParser from "../../../src/server/services/connect_desktop_request_parser";
import ConnectDesktopPolicy from "../../../src/server/services/connect_desktop_policy";

const token = Buffer.alloc(32, 9).toString("base64url");
const headers = [
  "Authorization", `Bearer ${token}`,
  "X-Kazi-Device-Id", "dev_desktop001",
  "X-Kazi-Credential-Generation", "1",
  "X-Kazi-Audience", "desktop-relay",
  "X-Kazi-Protocol-Version", "1.0",
];
const request = (rawHeaders: string[]) => ({ rawHeaders }) as Request;

describe("ConnectDesktopRequestParser", () => {
  const parser = new ConnectDesktopRequestParser(new ConnectDesktopPolicy());

  it("admits exactly one canonical value for every Desktop relay auth header", () => {
    expect(parser.relayHeaders(request(headers))).toEqual({
      token, deviceId: "dev_desktop001", generation: 1,
      audience: "desktop-relay", protocolVersion: "1.0",
    });
  });

  it.each([
    ["missing", headers.slice(0, -2)],
    ["duplicate", [...headers, "Authorization", `Bearer ${token}`]],
    ["comma-combined", headers.map((value, index) => index === 1 ? `${value}, Bearer ${token}` : value)],
    ["wrong audience", headers.map((value, index) => index === 7 ? "executor-relay" : value)],
    ["wrong version", headers.map((value, index) => index === 9 ? "1.1" : value)],
    ["wrong device", headers.map((value, index) => index === 3 ? "exe_desktop001" : value)],
    ["noncanonical generation", headers.map((value, index) => index === 5 ? "01" : value)],
  ])("rejects %s relay headers", (_name, rawHeaders) => {
    expect(parser.relayHeaders(request(rawHeaders))).toBeNull();
  });

  it("strictly parses the canonical v1.0.4 Desktop claim envelope", () => {
    expect(parser.claimCreate({
      kind: "desktop.claim.create.request", protocolVersion: "1.0",
      claimId: "clm_desktop001", deviceId: "dev_desktop001", actorRole: "desktop_device",
      displayName: "Desktop", platform: "linux", architecture: "x64",
      desktopVersion: "1.2.3", keyFingerprint: "a".repeat(64),
      idempotencyKey: "idem_desktop_claim_0001", correlationId: "cor_desktop001",
    }).ok).toBe(true);
  });
});
