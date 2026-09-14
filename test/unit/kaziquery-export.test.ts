import { describe, expect, it, vi, afterEach } from "vitest";
import { KaziQueryRecordPolicy } from "../../src/server/observability/kaziquery_record";
import { KaziQueryExportRelay, type RelayStorage } from "../../src/server/observability/kaziquery_relay";

class MemoryStorage implements RelayStorage {
  data = new Map<string, unknown>();
  alarm = 0;
  async get<T>(key: string): Promise<T | undefined> { return structuredClone(this.data.get(key)) as T | undefined; }
  async put<T>(key: string, value: T) { this.data.set(key, structuredClone(value)); }
  async delete(key: string) { return this.data.delete(key); }
  async list<T>({ prefix, limit }: { prefix: string; limit: number }) {
    return new Map([...this.data].filter(([key]) => key.startsWith(prefix)).sort().slice(0, limit)) as Map<string, T>;
  }
  async setAlarm(time: number) { this.alarm = time; }
  async transaction<T>(callback: (storage: RelayStorage) => Promise<T>): Promise<T> { return callback(this); }
}
const env = {
  KAZIQUERY_ORIGIN: "https://dev.kaziquery.com", KAZI_WEBSITE_ORIGIN: "https://dev.kazibee.com",
  KAZIQUERY_EXPORT_ENABLED: "true", KAZIQUERY_DATASET_ID: "db_test", KAZIQUERY_CONNECTOR_ID: "con_test",
  KAZIQUERY_PRODUCER_ID: "website", KAZIQUERY_PRODUCER_EPOCH: "v1", KAZIQUERY_INGEST_KEY: "test-only",
};
const admission = (id = "original-id") => JSON.stringify({
  admittedAtMs: Date.now(), record: { id, occurredAtMs: 1000, kind: "log", name: "server.log", level: "info", attributes: { count: 1 } },
});
const request = (body: string) => new Request("https://relay.internal/admit", { method: "POST", body });
afterEach(() => vi.unstubAllGlobals());

describe("development KaziQuery export", () => {
  it("preserves the original message and complete context through relay delivery", async () => {
    const context = { count: 0, outcome: "unauthorized", route: "/v1/connect/auth/session",
      correlationId: "cor_test", nested: { values: [false, null, 0, ""] },
      exportPolicyVersion: 99, detail: "x".repeat(3000) };
    const message = "connect.auth.skipped\n  original spacing ✓";
    const record = new KaziQueryRecordPolicy().log({
      id: "id", occurredAtMs: 1, producerId: "p", sequence: 9, logger: "kazibee:test", level: "WARN",
      message, service: "test", environment: "test", context,
    });
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    expect((await relay.fetch(request(JSON.stringify({ record, admittedAtMs: Date.now() })))).status).toBe(202);
    const network = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", network);
    await relay.alarm();
    const delivered = JSON.parse(network.mock.calls[0][1].body);
    expect(delivered.message).toBe(message);
    expect(delivered.context).toEqual(context);
    // A free-text message is not an event name; request-scoped scalars are promoted, the rest stays only in context.
    expect(delivered.name).toBe("server.log");
    expect(delivered.requestId).toBeUndefined();
    expect(delivered.attributes).toEqual({ exportPolicyVersion: 3, logger: "kazibee:test", route: "/v1/connect/auth/session", outcome: "unauthorized" });
  });

  it("names records after their event, promotes requestId and request scalars, and keeps context verbatim", async () => {
    const context = { requestId: "req_123", site: "mcp", route: "/mcp", method: "POST", status: 502, durationMs: 1234, outcome: "failed", responseReturned: true, cfRay: "abc", nested: { deep: true } };
    const record = new KaziQueryRecordPolicy().log({
      id: "id", occurredAtMs: 1, producerId: "p", sequence: 9, logger: "kazibee:gateway", level: "ERROR",
      message: "gateway.request.failed", service: "test", environment: "test", context,
    });
    expect(record).toMatchObject({
      name: "gateway.request.failed", message: "gateway.request.failed", level: "error", requestId: "req_123", context,
      attributes: { exportPolicyVersion: 3, logger: "kazibee:gateway", site: "mcp", route: "/mcp", method: "POST", status: 502, durationMs: 1234, outcome: "failed" },
    });
    expect(Object.keys(record!.attributes)).not.toContain("cfRay");
    // Never a server-owned envelope field, and no requestId when the context has none.
    expect(Object.keys(record!)).toEqual(expect.not.arrayContaining(["datasetId", "connectorId", "accountId", "receivedAtMs"]));
    const plain = new KaziQueryRecordPolicy().log({ id: "id", occurredAtMs: 1, producerId: "p", sequence: 1, logger: "kazibee:x", level: "INFO", message: "Built update feed", service: "t", environment: "t", context: { count: 3 } });
    expect(plain).toMatchObject({ name: "server.log", message: "Built update feed" });
    expect(plain!.requestId).toBeUndefined();
  });

  it("delivers many pending records in one ingest POST with the exact sequence range, replaying the same batch until accepted", async () => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    for (let i = 0; i < 3; i++) expect((await relay.fetch(request(admission("rec-" + i)))).status).toBe(202);
    const network = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", network);
    await relay.alarm();
    await new KaziQueryExportRelay({ storage }, env).alarm();
    expect(network).toHaveBeenCalledTimes(2);
    const [, first] = network.mock.calls[0], [, second] = network.mock.calls[1];
    expect(first.body).toBe(second.body);
    expect(first.headers["Idempotency-Key"]).toBe(second.headers["Idempotency-Key"]);
    expect(first.headers["X-First-Sequence"]).toBe("0");
    expect(first.headers["X-Last-Sequence"]).toBe("2");
    const lines = (first.body as string).split("\n").filter(Boolean).map(line => JSON.parse(line));
    expect(lines.map(line => [line.id, line.sequence])).toEqual([["rec-0", 0], ["rec-1", 1], ["rec-2", 2]]);
    expect(await storage.get("queue")).toMatchObject({ next: 3, pending: [] });
    expect((await storage.get<{ inflight?: unknown }>("queue"))!.inflight).toBeUndefined();
  });

  it("splits a batch at the 256 KB body cap and flushes immediately once a full batch is pending", async () => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    const big = (id: string) => JSON.stringify({ admittedAtMs: Date.now(), record: { id, occurredAtMs: 1000, kind: "log", name: "server.log", message: "x".repeat(60_000), attributes: {} } });
    for (let i = 0; i < 5; i++) expect((await relay.fetch(request(big("big-" + i)))).status).toBe(202);
    const network = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", network);
    await relay.alarm();
    expect(network.mock.calls[0][1].headers["X-Last-Sequence"]).toBe("3");
    expect(new TextEncoder().encode(network.mock.calls[0][1].body).byteLength).toBeLessThanOrEqual(256 * 1024);
    expect(storage.alarm).toBeLessThanOrEqual(Date.now() + 1000);
    await relay.alarm();
    expect(network.mock.calls[1][1].headers["X-First-Sequence"]).toBe("4");
    expect(await storage.get("queue")).toMatchObject({ pending: [] });
    // 200 pending records arm an immediate flush instead of waiting for the coalescing second.
    const burst = new MemoryStorage();
    const bursty = new KaziQueryExportRelay({ storage: burst }, env);
    for (let i = 0; i < 200; i++) await bursty.fetch(request(admission("burst-" + i)));
    expect(burst.alarm).toBeLessThanOrEqual(Date.now());
    await bursty.alarm();
    expect(network.mock.calls[2][1].headers["X-Last-Sequence"]).toBe("199");
  });

  it("retains exact batch identity, bytes and sequence across outage and restart", async () => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    const body = admission();
    expect((await relay.fetch(request(body))).status).toBe(202);
    expect((await relay.fetch(request(body))).status).toBe(202);
    const network = vi.fn().mockRejectedValueOnce(new Error("response lost")).mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", network);
    await relay.alarm();
    const restarted = new KaziQueryExportRelay({ storage }, env);
    await restarted.alarm();
    const [url, first] = network.mock.calls[0];
    const [, second] = network.mock.calls[1];
    expect(url).toBe("https://dev.kaziquery.com/v1/datasets/db_test/ingest");
    expect(first.body).toBe(second.body);
    expect(first.redirect).toBe("manual");
    expect(first.headers).toEqual(second.headers);
    expect(JSON.parse(first.body)).toMatchObject({ id: "original-id", occurredAtMs: 1000, sequence: 0 });
    expect(await storage.get("queue")).toMatchObject({ next: 1, pending: [] });
    expect(storage.alarm).toBeGreaterThan(Date.now());
  });

  it.each([302, 401])("blocks delivery status %i without discarding acknowledged records", async (status) => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    await relay.fetch(request(admission()));
    const network = vi.fn().mockResolvedValue(new Response(null, { status }));
    vi.stubGlobal("fetch", network);
    await relay.alarm();
    await relay.alarm();
    expect(network).toHaveBeenCalledTimes(1);
    expect(await storage.get("queue")).toMatchObject({ blocked: status, pending: [expect.any(Object)] });
  });

  it("rejects production and missing credentials", async () => {
    for (const overrides of [{ KAZIQUERY_ORIGIN: "https://kaziquery.com" }, { KAZI_WEBSITE_ORIGIN: "https://kazibee.com" }, { KAZIQUERY_INGEST_KEY: "" }]) {
      const storage = new MemoryStorage();
      const relay = new KaziQueryExportRelay({ storage }, { ...env, ...overrides });
      expect((await relay.fetch(request(admission()))).status).toBe(503);
      expect(storage.data.size).toBe(0);
    }
  });
});
