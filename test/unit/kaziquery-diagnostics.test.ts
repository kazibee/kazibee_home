import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContainer, ExecutionContext } from "@noego/ioc";
import { getLogger, getManager } from "@noego/logger";
import { classifyError, diagnose } from "../../src/server/observability/kaziquery_diagnostics";
import { KaziQueryExport } from "../../src/server/observability/kaziquery_export";
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
const SECRET = "ingest-secret-never-logged";
const env = {
  KAZIQUERY_ORIGIN: "https://dev.kaziquery.com", KAZI_WEBSITE_ORIGIN: "https://dev.kazibee.com",
  KAZIQUERY_EXPORT_ENABLED: "true", KAZIQUERY_DATASET_ID: "db_test", KAZIQUERY_CONNECTOR_ID: "con_test",
  KAZIQUERY_PRODUCER_ID: "website", KAZIQUERY_PRODUCER_EPOCH: "v1", KAZIQUERY_INGEST_KEY: SECRET,
};
const BODY_SENTINEL = "record-body-sentinel-é-🙂";
const admission = (id = "record-1") => JSON.stringify({
  admittedAtMs: Date.now(), record: { id, occurredAtMs: 1000, kind: "log", name: "server.log", level: "info", message: BODY_SENTINEL, attributes: { site: "mcp" } },
});
const request = (body: string) => new Request("https://relay.internal/admit", { method: "POST", body });

type Entry = Record<string, unknown> & { event: string };
const sinks = { log: [] as Entry[], warn: [] as Entry[], error: [] as Entry[] };
const parse = (line: unknown) => { try { return JSON.parse(String(line)) as Entry; } catch { return undefined; } };
const all = () => [...sinks.log, ...sinks.warn, ...sinks.error];
const events = (name: string, outcome?: string) => all().filter(entry => entry.event === name && (outcome === undefined || entry.outcome === outcome));
/** Serialized diagnostic output only; the @noego logger may also write its own lines to console. */
const output = () => JSON.stringify(all());

beforeEach(() => {
  sinks.log.length = sinks.warn.length = sinks.error.length = 0;
  for (const level of ["log", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((line: unknown) => {
      const entry = parse(line);
      if (typeof entry?.event === "string" && entry.event.startsWith("kaziquery.")) sinks[level].push(entry);
    });
  }
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("kaziquery diagnostics helper", () => {
  it("drops sensitive primitive fields", () => {
    diagnose("log", "kaziquery.test", { token: SECRET, sql: BODY_SENTINEL, body: BODY_SENTINEL, phase: "test" });
    expect(output()).not.toContain(SECRET);
    expect(output()).not.toContain(BODY_SENTINEL);
  });

  it("emits one JSON line per event, drops non-primitives, caps strings and never throws", () => {
    diagnose("warn", "kaziquery.test", { ok: true, n: 3, s: "x".repeat(500), obj: { secret: "leak" }, err: new Error("leak"), nil: null, inf: Infinity });
    const [entry] = sinks.warn;
    expect(entry).toMatchObject({ event: "kaziquery.test", ok: true, n: 3, nil: null, inf: "Infinity" });
    expect(typeof entry.ts).toBe("number");
    expect((entry.s as string).length).toBe(201);
    expect(entry).not.toHaveProperty("obj");
    expect(entry).not.toHaveProperty("err");
    expect(output()).not.toContain("leak");
    vi.mocked(console.error).mockImplementation(() => { throw new Error("sink broken"); });
    expect(() => diagnose("error", "kaziquery.test", {})).not.toThrow();
  });

  it("classifies errors by name only", () => {
    expect(classifyError(new DOMException("t", "TimeoutError"))).toBe("timeout");
    expect(classifyError(new DOMException("a", "AbortError"))).toBe("aborted");
    expect(classifyError(new TypeError("fetch failed"))).toBe("network");
    expect(classifyError(new Error("plain"))).toBe("error");
    expect(classifyError("string")).toBe("unknown");
  });
});

describe("exporter diagnostics", () => {
  const runtimeEnv = (namespace: unknown, overrides: Record<string, unknown> = {}) => ({
    KAZIQUERY_EXPORT_ENABLED: "true", KAZIQUERY_ORIGIN: "https://dev.kaziquery.com",
    KAZI_WEBSITE_ORIGIN: "https://dev.kazibee.com", KAZIQUERY_SITE: "mcp", KAZIQUERY_EXPORT_RELAY: namespace, ...overrides,
  });

  it("reports attach skips for misconfiguration but stays silent when export is disabled", () => {
    const scope = {};
    KaziQueryExport.attach(scope, { env: runtimeEnv(undefined, { KAZIQUERY_EXPORT_ENABLED: "false" }), waitUntil: vi.fn() });
    expect(events("kaziquery.export.attach")).toHaveLength(0);
    KaziQueryExport.attach(scope, { env: runtimeEnv(undefined), waitUntil: vi.fn() });
    KaziQueryExport.attach(scope, { env: runtimeEnv({ get: vi.fn(), idFromName: (n: string) => n }, { KAZIQUERY_SITE: "bad" }), waitUntil: vi.fn() });
    KaziQueryExport.attach(scope, { env: runtimeEnv({ get: vi.fn(), idFromName: (n: string) => n }, { KAZIQUERY_ORIGIN: "https://kaziquery.com" }), waitUntil: vi.fn() });
    expect(events("kaziquery.export.attach", "skipped").map(entry => entry.reason)).toEqual(["relay_binding_missing", "site_invalid", "origin_mismatch"]);
    expect(events("kaziquery.export.attach", "attached")).toHaveLength(0);
  });

  it("records attachment, admission outcomes and the single report without leaking record content", async () => {
    const work: Promise<unknown>[] = [];
    // First successful attach in this worker also sends the one-time `kaziquery.export.started` record,
    // so the relay sees 4 admissions: started + 3 gateway records. Reject the last one.
    const responses = [202, 202, 202, 429];
    const namespace = { idFromName: (name: string) => name, get: () => ({ fetch: async (req: Request) => {
      if (new URL(req.url).pathname === "/status") return Response.json({ pending: 32, failures: 11, lastStatus: 503, blocked: null });
      return new Response(null, { status: responses.shift() ?? 202 });
    } }) };
    const scope = createContainer();
    try {
      await ExecutionContext.run(scope, async () => {
        KaziQueryExport.attach(scope, { env: runtimeEnv(namespace), waitUntil: (p: Promise<unknown>) => work.push(p) });
        await Promise.resolve();
        for (let i = 0; i < 3; i++) getLogger("kazibee:gateway").info("gateway.request.completed", { requestId: `req-${i}`, secretMessage: BODY_SENTINEL });
      });
      await Promise.all(work);
    } finally { await scope.dispose(); }
    const attach = events("kaziquery.export.attach", "attached");
    expect(attach).toHaveLength(1);
    expect(attach[0]).toMatchObject({ phase: "attach", site: "mcp", scopeMatched: true, subscribed: true });
    expect(typeof attach[0].invocationId).toBe("string");
    const admitted = events("kaziquery.export.admission", "admitted");
    expect(admitted).toHaveLength(1);
    expect(admitted[0]).toMatchObject({ phase: "admission", status: 202, site: "mcp", kind: "log", invocationId: attach[0].invocationId });
    expect(typeof admitted[0].elapsedMs).toBe("number");
    expect(typeof admitted[0].bytes).toBe("number");
    const rejected = events("kaziquery.export.admission", "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ status: 429, rejected: 1, invocationId: attach[0].invocationId });
    const report = events("kaziquery.export.report");
    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({ reason: "admission_rejected_429", pending: 32, failures: 11, lastStatus: 503, admitted: 3, rejected: 1, dropped: 0 });
    expect(output()).not.toContain(BODY_SENTINEL);
    expect(output()).not.toContain("gateway.request.completed");
    expect(output()).not.toContain("req-0");
  });

  it("classifies admission transport failures and reports capacity drops once", async () => {
    const work: Promise<unknown>[] = [];
    const namespace = { idFromName: (name: string) => name, get: () => ({ fetch: async () => { throw new DOMException("t", "TimeoutError"); } }) };
    const scope = createContainer();
    try {
      await ExecutionContext.run(scope, async () => {
        KaziQueryExport.attach(scope, { env: runtimeEnv(namespace), waitUntil: (p: Promise<unknown>) => work.push(p) });
        await Promise.resolve();
        // 8 concurrent unsettled fetches saturate the active cap; the rest are dropped synchronously.
        for (let i = 0; i < 12; i++) getLogger("kazibee:gateway").info("gateway.request.completed", { requestId: `req-${i}` });
      });
      await Promise.all(work);
    } finally { await scope.dispose(); }
    const failed = events("kaziquery.export.admission", "failed");
    expect(failed).toHaveLength(8);
    expect(failed.every(entry => entry.errorClass === "timeout")).toBe(true);
    const dropped = events("kaziquery.export.admission", "dropped");
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({ reason: "active_cap", limitActive: 8, limitRecords: 64, active: 8 });
    const report = events("kaziquery.export.report");
    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({ reason: "admission_capacity" });
    expect(output()).not.toContain("stack");
  });
});

describe("relay diagnostics", () => {
  it("logs enqueue outcomes with counts and never the record body or ingest key", async () => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    const body = admission();
    expect((await relay.fetch(request(body))).status).toBe(202);
    expect((await relay.fetch(request(body))).status).toBe(202);
    expect((await relay.fetch(request("{not json"))).status).toBe(400);
    const queued = events("kaziquery.relay.enqueue", "queued");
    expect(queued).toHaveLength(2);
    expect(queued[0]).toMatchObject({ phase: "admit", status: 202, reason: "queued", recordId: "record-1", kind: "log", site: "mcp", pending: 1, sequence: 0, limitPending: 32 });
    expect(typeof queued[0].bytes).toBe("number");
    expect(queued[1]).toMatchObject({ reason: "duplicate", status: 202 });
    expect(events("kaziquery.relay.enqueue", "rejected")[0]).toMatchObject({ reason: "malformed", status: 400 });
    expect(output()).not.toContain(BODY_SENTINEL);
    expect(output()).not.toContain(SECRET);
  });

  it("reports capacity and blocked admissions", async () => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    for (let i = 0; i < 33; i++) await relay.fetch(request(admission(`record-${i}`)));
    const capacity = events("kaziquery.relay.enqueue", "rejected");
    expect(capacity).toHaveLength(1);
    expect(capacity[0]).toMatchObject({ reason: "capacity", status: 429, pending: 32 });
    const queue = await storage.get<Record<string, unknown>>("queue");
    await storage.put("queue", { ...queue, blocked: 401 });
    await relay.fetch(request(admission("record-blocked")));
    expect(events("kaziquery.relay.enqueue", "rejected").at(-1)).toMatchObject({ reason: "blocked", status: 409, blocked: 401 });
  });

  it("traces delivery start, retry scheduling, blocked state and recovery", async () => {
    const storage = new MemoryStorage();
    const relay = new KaziQueryExportRelay({ storage }, env);
    await relay.fetch(request(admission()));
    const network = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new TypeError("fetch failed " + SECRET))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", network);
    await relay.alarm();
    await relay.alarm();
    await relay.alarm();
    await relay.alarm(); // blocked: skipped without network
    const started = events("kaziquery.relay.delivery", "started");
    expect(started).toHaveLength(3);
    expect(started[0]).toMatchObject({ phase: "delivery", sequence: 0, pending: 1, attempt: 1, failures: 0 });
    expect(typeof started[0].batchId).toBe("string");
    expect(typeof started[0].bytes).toBe("number");
    const retries = events("kaziquery.relay.delivery", "retry");
    expect(retries).toHaveLength(2);
    expect(retries[0]).toMatchObject({ status: 503, failures: 1, nextRetryMs: 2000, blocked: 0, pending: 1, batchId: started[0].batchId });
    expect(retries[1]).toMatchObject({ status: 503, errorClass: "network", failures: 2, nextRetryMs: 4000 });
    expect(typeof retries[0].elapsedMs).toBe("number");
    const blocked = events("kaziquery.relay.delivery", "blocked");
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ status: 401, blocked: 401, failures: 3 });
    expect(sinks.error.some(entry => entry.outcome === "blocked")).toBe(true);
    expect(events("kaziquery.relay.delivery", "skipped")[0]).toMatchObject({ reason: "blocked", pending: 1, blocked: 401, lastStatus: 401 });

    await relay.fetch(new Request("https://relay.internal/resume", { method: "POST" }));
    expect(events("kaziquery.relay.recovery")[0]).toMatchObject({ trigger: "resume", previousBlocked: 401, previousFailures: 3, pending: 1, nextRetryMs: 1000 });
    await relay.alarm();
    const delivered = events("kaziquery.relay.delivery", "delivered");
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({ status: 202, pending: 0, failures: 0, nextRetryMs: 1000 });
    expect(network).toHaveBeenCalledTimes(4);
    expect(output()).not.toContain(SECRET);
    expect(output()).not.toContain(BODY_SENTINEL);
    expect(output()).not.toContain("Authorization");
    expect(output()).not.toContain("kaziquery.com/v1");
  });

  it("logs retry-revision recovery once per revision", async () => {
    const storage = new MemoryStorage();
    await new KaziQueryExportRelay({ storage }, env).fetch(request(admission()));
    const queue = await storage.get<Record<string, unknown>>("queue");
    await storage.put("queue", { ...queue, failures: 5 });
    const relay = new KaziQueryExportRelay({ storage }, { ...env, KAZIQUERY_RETRY_REVISION: "r2" });
    await relay.fetch(new Request("https://relay.internal/status"));
    await relay.fetch(new Request("https://relay.internal/status"));
    const recovery = events("kaziquery.relay.recovery");
    expect(recovery).toHaveLength(1);
    expect(recovery[0]).toMatchObject({ trigger: "retry_revision", previousFailures: 5, pending: 1 });
  });

  it("reports invalid relay configuration without exposing environment values", async () => {
    const relay = new KaziQueryExportRelay({ storage: new MemoryStorage() }, { ...env, KAZIQUERY_INGEST_KEY: "" });
    expect((await relay.fetch(request(admission()))).status).toBe(503);
    expect(events("kaziquery.relay.request", "rejected")[0]).toMatchObject({ reason: "config_invalid", status: 503 });
    expect(output()).not.toContain("db_test");
  });

  it("keeps console diagnostics out of the subscribed logger stream (no recursive export)", async () => {
    const captured: string[] = [];
    const subscription = getManager().records$.subscribe(record => captured.push(JSON.stringify(record)));
    try {
      const relay = new KaziQueryExportRelay({ storage: new MemoryStorage() }, env);
      await relay.fetch(request(admission()));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
      await relay.alarm();
    } finally { subscription.unsubscribe(); }
    expect(events("kaziquery.relay.enqueue", "queued")).toHaveLength(1);
    expect(events("kaziquery.relay.delivery", "retry")).toHaveLength(1);
    const stream = captured.join("\n");
    expect(stream).toContain("kaziquery.export.delivery_failed");
    expect(stream).not.toContain("kaziquery.relay.");
  });
});
