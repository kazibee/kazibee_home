import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { is_auth } from "../../../src/middleware/auth/cookie";

const originalNodeEnvironment = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnvironment === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnvironment;
  }
});

function response() {
  const bodies: unknown[] = [];
  const value = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      bodies.push(body);
      return this;
    },
  };
  return { value: value as unknown as Response, bodies };
}

describe("is_auth", () => {
  it("never treats x-debug-user-id as authentication outside production", async () => {
    process.env.NODE_ENV = "test";
    const req = {
      url: "/owner-only",
      headers: { "x-debug-user-id": "42" },
      cookies: {},
    } as unknown as Request;
    const res = response();
    const next = vi.fn() as unknown as NextFunction;

    await is_auth(req, res.value, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.value.statusCode).toBe(401);
    expect(res.bodies).toEqual([{
      error: true,
      message: "Unauthorized: missing token",
    }]);
  });
});
