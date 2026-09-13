import { afterEach, expect, it, vi } from "vitest";
import Service from "../../src/server/services/oauth_connection_machines_service";
import Repo from "../../src/server/repo/connect_executor_repo";
afterEach(() => vi.restoreAllMocks());
const row = (id: string, claimed: unknown, created: unknown = "2026-01-01T00:00:00Z", state = "active") =>
  ({ executor_id: id, claimed_at: claimed, created_at: created, state, display_name: id });
async function listed(rows: unknown[]) {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const repo = { listByOwner: vi.fn().mockResolvedValue(rows) } as unknown as Repo;
  return (await new Service(repo).listForUser("owner", "read")).map(x => x.executor_id);
}
it.each(["date", "string", "mixed"])("sorts three machines chronologically with %s timestamps", async mode => {
 const values = ["2026-01-03T00:00:00Z", "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"]
   .map((s, i) => mode === "date" || (mode === "mixed" && i !== 1) ? new Date(s) : s);
 expect(await listed(values.map((v,i) => row(String(i),v)))).toEqual(["1","2","0"]);
});
it("uses creation fallback, ID ties, and excludes revoked machines", async () => {
 expect(await listed([row("b",new Date("2026-01-01Z")),row("a",null),row("c","2026-01-02Z"),row("revoked",null,undefined,"revoked")])).toEqual(["a","b","c"]);
});
it("compares timezone offsets by instant rather than lexical order", async () => {
 expect(await listed([row("later","2026-01-01T00:00:00-05:00"),row("earlier","2026-01-01T01:00:00Z")])).toEqual(["earlier","later"]);
});
it("places invalid timestamps last deterministically", async () => {
 expect(await listed([row("z","invalid"),row("b",new Date(NaN)),row("a","2026-01-01Z")])).toEqual(["a","b","z"]);
});
