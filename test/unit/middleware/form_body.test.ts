import { describe, expect, it, vi } from "vitest";
import formBody from "../../../src/middleware/form_body";

function contextFor(options: { contentType?: string; body?: unknown; text?: string }) {
  const headers = new Headers();
  if (options.contentType !== undefined) {
    headers.set("content-type", options.contentType);
  }
  const request = new Request("https://kazibee.test/oauth/token", {
    method: "POST",
    headers,
    body: options.text ?? "",
  });
  return { request, body: options.body } as { request: Request; body: unknown };
}

describe("formBody middleware", () => {
  it("parses a form-encoded body into context.body", async () => {
    const context = contextFor({
      contentType: "application/x-www-form-urlencoded",
      text: "grant_type=authorization_code&code=abc123",
    });
    const next = vi.fn(async () => new Response("ok"));

    const response = await formBody(context, next);

    expect(context.body).toEqual({ grant_type: "authorization_code", code: "abc123" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe("ok");
  });

  it("leaves the body untouched when the content-type header is absent", async () => {
    // A bodyless request carries no content-type header at all, exercising
    // the `?? ""` fallback.
    const context = {
      request: new Request("https://kazibee.test/oauth/token"),
      body: undefined as unknown,
    };
    const next = vi.fn(async () => new Response("ok"));

    await formBody(context, next);

    expect(context.body).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite an already-parsed body", async () => {
    const parsed = { already: "parsed" };
    const context = contextFor({
      contentType: "application/x-www-form-urlencoded",
      body: parsed,
      text: "a=1",
    });
    const next = vi.fn(async () => new Response("ok"));

    await formBody(context, next);

    expect(context.body).toBe(parsed);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
