/**
 * StatusRepo against REAL SQL.
 *
 * Same harness as connect-website-deployment-identity.service.test.ts: the
 * "full" migrated template database from test-db.ts, the repo constructed
 * with plain `new` (the @QueryBinder resolver finds each method's .sql next
 * to the class, and SqlStackDB's process-global default carries the
 * connection; per-file fork isolation keeps the registry private to this
 * file).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db";
import StatusRepo from "../../src/server/repo/status_repo";

const statusRepo = new StatusRepo();

beforeAll(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});

describe("StatusRepo", () => {
  it("checkDatabase round-trips a literal through the connection", async () => {
    // Bare @Query (no @Single): the runner hands back the row array.
    const result = await statusRepo.checkDatabase() as unknown as Array<{ result: number }>;
    expect(result).toEqual([{ result: 1 }]);
  });
});
