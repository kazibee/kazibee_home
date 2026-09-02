/**
 * Last uncovered rejection branches of ConnectDesktopRequestParser and the
 * HTTPS guard of ConnectDesktopPolicy.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectDesktopRequestParser from "../../../src/server/services/connect_desktop_request_parser";
import ConnectDesktopPolicy from "../../../src/server/services/connect_desktop_policy";

const parser = () => new ConnectDesktopRequestParser(new ConnectDesktopPolicy());
const asReq = (value: Record<string, unknown>) => value as unknown as Request;
const TOKEN = "B".repeat(43);
const DEVICE_ID = "dev_abcdefgh";

describe("ConnectDesktopRequestParser remaining rejections", () => {
  it("decision rejects a non-record body with the fallback correlation id", () => {
    expect(parser().decision(null, "clm_abcdefgh")).toEqual({
      ok: false, reason: "invalid-envelope", correlationId: "cor_invalid000",
    });
    expect(parser().decision("text", "clm_abcdefgh")).toMatchObject({ ok: false });
  });

  it("relayHeaders treats a dangling header name (odd rawHeaders) as an empty value", () => {
    // ["authorization"] with no value: the parser records "" and fails closed.
    expect(parser().relayHeaders(asReq({ rawHeaders: ["authorization"] }))).toBeNull();
  });

  it("relayHeaders rejects a generation that overflows the safe integer range", () => {
    const rawHeaders = [
      "Authorization", `Bearer ${TOKEN}`, "X-Kazi-Device-Id", DEVICE_ID,
      "X-Kazi-Credential-Generation", "9999999999999999",
      "X-Kazi-Audience", "desktop-relay", "X-Kazi-Protocol-Version", "1.0",
    ];
    expect(parser().relayHeaders(asReq({ rawHeaders }))).toBeNull();
  });
});

describe("ConnectDesktopPolicy claim base url", () => {
  const original = process.env.KAZI_CONNECT_ACCOUNT_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.KAZI_CONNECT_ACCOUNT_URL;
    else process.env.KAZI_CONNECT_ACCOUNT_URL = original;
  });

  it("refuses a non-HTTPS configured account url", () => {
    process.env.KAZI_CONNECT_ACCOUNT_URL = "http://connect.kazibee.example";
    expect(() => new ConnectDesktopPolicy()).toThrow("KAZI_CONNECT_ACCOUNT_URL must use HTTPS");
  });

  it("strips the trailing slash from a valid HTTPS url", () => {
    process.env.KAZI_CONNECT_ACCOUNT_URL = "https://connect.kazibee.example/";
    expect(new ConnectDesktopPolicy().claimBaseUrl).toBe("https://connect.kazibee.example");
  });
});
