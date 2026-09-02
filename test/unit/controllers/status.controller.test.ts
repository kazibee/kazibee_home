import { describe, expect, it, vi } from "vitest";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import StatusController from "../../../src/server/controller/status.controller";
import type StatusLogic from "../../../src/server/logic/status.logic";
import { GUEST_ACTOR } from "../../../src/server/types/actor";

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as typeof res & Response;
}

describe("StatusController", () => {
  it("builds an authenticated actor from req.user for getStatus", async () => {
    const status = { ok: true };
    const getStatus = vi.fn(() => status);
    const controller = new StatusController({ getStatus } as unknown as StatusLogic);
    const res = fakeResponse();
    const req = { user: { id: 7, email: "owner@example.com", role: "owner" } } as unknown as Request;

    await controller.getStatus({ req, res });

    expect(getStatus).toHaveBeenCalledTimes(1);
    const [actor] = getStatus.mock.calls[0] as unknown[];
    expect(actor).toMatchObject({ id: 7, email: "owner@example.com", isSystem: false });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(status);
  });

  it("uses the guest actor and returns the database status for anonymous requests", async () => {
    const dbStatus = { database: "up" };
    const getDatabaseStatus = vi.fn(async () => dbStatus);
    const controller = new StatusController({ getDatabaseStatus } as unknown as StatusLogic);
    const res = fakeResponse();

    await controller.getDatabaseStatus({ req: {} as unknown as Request, res });

    expect(getDatabaseStatus).toHaveBeenCalledWith(GUEST_ACTOR);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(dbStatus);
  });
});
