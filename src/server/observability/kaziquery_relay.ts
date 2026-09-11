import { getLogger } from "@noego/logger";
import type { ExportRecord } from "./kaziquery_record";

interface Store {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(options: { prefix: string; limit: number }): Promise<Map<string, T>>;
  setAlarm(time: number): Promise<void>;
}
export interface RelayStorage extends Store {
  getAlarm?(): Promise<number | null>;
  transaction<T>(callback: (transaction: Store) => Promise<T>): Promise<T>;
}
interface Pending { id: string; body: string; sequence: number; }
interface RelayQueue {
  destination: string;
  next: number;
  pending: Pending[];
  failures: number;
  blocked?: number;
  lastAttemptAtMs?: number;
  lastStatus?: number;
}
interface Receipt { fingerprint: string; expires: number; }
const DAY = 86400000;
const MAX_PENDING = 32;
const ORIGIN = "https://dev.kaziquery.com";

/** Private DO: no public route. Queue, sequence and admission receipt commit together. */
export class KaziQueryExportRelay {
  private readonly logger = getLogger("kazibee:kaziquery-export");
  constructor(private readonly state: { storage: RelayStorage }, private readonly env: Record<string, unknown>) {}

  private config(): { dataset: string; connector: string; producer: string; epoch: string; key: string } | undefined {
    if (this.env.KAZIQUERY_ORIGIN !== ORIGIN || this.env.KAZI_WEBSITE_ORIGIN !== "https://dev.kazibee.com") return;
    const names = ["DATASET_ID", "CONNECTOR_ID", "PRODUCER_ID", "PRODUCER_EPOCH"];
    const ids = names.map(name => this.env[`KAZIQUERY_${name}`]);
    if (!ids.every(value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value))) return;
    const key = this.env.KAZIQUERY_INGEST_KEY;
    if (typeof key !== "string" || !key) return;
    const [dataset, connector, producer, epoch] = ids as string[];
    return { dataset, connector, producer, epoch, key };
  }

  async fetch(request: Request): Promise<Response> {
    const config = this.config();
    if (!config) return new Response(null, { status: 503 });
    const retryRevision = this.env.KAZIQUERY_RETRY_REVISION;
    if (typeof retryRevision === "string") {
      await this.state.storage.transaction(async storage => {
        if (await storage.get("retryRevision") === retryRevision) return;
        await storage.put("retryRevision", retryRevision);
        const queue = await storage.get<RelayQueue>("queue");
        if (queue?.pending.length && !queue.blocked) {
          queue.failures = 0;
          await storage.put("queue", queue);
          await storage.setAlarm(Date.now() + 1000);
        }
      });
    }
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/status") {
      const queue = await this.state.storage.get<RelayQueue>("queue");
      return Response.json({ pending: queue?.pending.length ?? 0, blocked: queue?.blocked ?? null, failures: queue?.failures ?? 0, lastAttemptAtMs: queue?.lastAttemptAtMs ?? 0, lastStatus: queue?.lastStatus ?? 0, nextAlarm: await this.state.storage.getAlarm?.() ?? 0 });
    }
    if (request.method === "POST" && path === "/resume") {
      await this.state.storage.transaction(async storage => {
        const queue = await storage.get<RelayQueue>("queue");
        if (!queue) return;
        delete queue.blocked;
        queue.failures = 0;
        await storage.put("queue", queue);
        await storage.setAlarm(Date.now() + 1000);
      });
      return new Response(null, { status: 204 });
    }
    if (this.env.KAZIQUERY_EXPORT_ENABLED !== "true") return new Response(null, { status: 503 });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/admit") return new Response(null, { status: 404 });
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 64 * 1024) return new Response(null, { status: 413 });
    let input: { record: ExportRecord; admittedAtMs: number };
    try { input = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
    if (!this.valid(input)) return new Response(null, { status: 400 });
    const fingerprint = await this.hash(text);
    const receiptKey = `receipt:${await this.hash(input.record.id)}`;
    const destination = JSON.stringify([config.dataset, config.connector, config.producer, config.epoch]);
    const status = await this.state.storage.transaction(async storage => {
      const receipt = await storage.get<Receipt>(receiptKey);
      if (receipt) return receipt.fingerprint === fingerprint ? 202 : 409;
      const queue = await storage.get<RelayQueue>("queue") ?? { destination, next: 0, pending: [], failures: 0 };
      if (queue.destination !== destination || queue.blocked) return 409;
      if (queue.pending.length >= MAX_PENDING || !Number.isSafeInteger(queue.next + 1)) return 429;
      const sequence = queue.next++;
      const body = JSON.stringify({
        ...input.record, schemaVersion: 1, service: "kazibee", environment: "dev",
        producerId: config.producer, producerEpoch: config.epoch, sequence,
      }) + "\n";
      if (new TextEncoder().encode(body).length - 1 > 64 * 1024) return 413;
      queue.pending.push({ id: crypto.randomUUID(), body, sequence });
      await storage.put("queue", queue);
      await storage.put(receiptKey, { fingerprint, expires: input.admittedAtMs + DAY });
      await storage.put(`expiry:${String(input.admittedAtMs + DAY).padStart(16, "0")}:${receiptKey}`, receiptKey);
      if (queue.pending.length === 1) await storage.setAlarm(Date.now() + 1000);
      return 202;
    });
    return Response.json({ state: status === 202 ? "source_durable" : "rejected" }, { status });
  }

  private valid(input: { record: ExportRecord; admittedAtMs: number }): boolean {
    const record = input?.record;
    if (!record || !Number.isSafeInteger(input.admittedAtMs) || input.admittedAtMs < Date.now() - DAY || input.admittedAtMs > Date.now() + 300000) return false;
    if (typeof record.id !== "string" || !record.id || record.id.length > 128) return false;
    if (!Number.isSafeInteger(record.occurredAtMs) || record.occurredAtMs < 0) return false;
    if (record.kind !== "log" && record.kind !== "trace") return false;
    if (typeof record.name !== "string" || record.name.length > 128 || !record.attributes || typeof record.attributes !== "object") return false;
    if (record.message !== undefined && (record.kind !== "log" || typeof record.message !== "string")) return false;
    return Object.keys(record).every(key => ["id", "occurredAtMs", "kind", "name", "level", "message", "context", "attributes"].includes(key));
  }

  async alarm(): Promise<void> {
    // Arm repair BEFORE network work; a killed invocation cannot strand pending data.
    await this.state.storage.setAlarm(Date.now() + 60000);
    await this.pruneReceipts();
    const config = this.config();
    const queue = await this.state.storage.get<RelayQueue>("queue");
    if (!queue?.pending.length || queue.blocked || !config) return;
    if (queue.destination !== JSON.stringify([config.dataset, config.connector, config.producer, config.epoch])) return;
    const batch = queue.pending[0];
    await this.state.storage.transaction(async storage => {
      const current = await storage.get<RelayQueue>("queue");
      if (current) { current.lastAttemptAtMs = Date.now(); await storage.put("queue", current); }
    });
    let status = 503;
    try {
      const response = await fetch(`${ORIGIN}/v1/datasets/${config.dataset}/ingest`, {
        method: "POST", redirect: "manual", signal: AbortSignal.timeout(10000), body: batch.body,
        headers: {
          Authorization: `Bearer ${config.key}`, "Content-Type": "application/x-ndjson",
          "Idempotency-Key": batch.id, "X-Connector-Id": config.connector,
          "X-Producer-Id": config.producer, "X-Producer-Epoch": config.epoch,
          "X-First-Sequence": String(batch.sequence), "X-Last-Sequence": String(batch.sequence),
          "X-Envelope-Version": "1",
        },
      });
      status = response.status;
      // HTTP 202 is the documented committed-acceptance boundary.
      await response.body?.cancel();
    } catch (error) {
      // The URL is fixed and contains no credential; never log batch bytes or headers.
      this.logger.warn("kaziquery.export.network_failed", { errorName: error instanceof Error ? error.name : "unknown",
        detail: error instanceof Error ? error.message.split(config.key).join("[REDACTED]").slice(0, 200) : "unknown",
        category: error instanceof Error && /timeout|aborted/i.test(error.message) ? "timeout" : "network" });
    }
    await this.state.storage.transaction(async storage => {
      const current = await storage.get<RelayQueue>("queue");
      if (!current || current.pending[0]?.id !== batch.id) return;
      current.lastStatus = status;
      if (status === 202) {
        current.pending.shift();
        current.failures = 0;
      } else {
        current.failures = Math.min(current.failures + 1, 12);
        if (status >= 300 && status < 500 && status !== 408 && status !== 429) current.blocked = status;
      }
      await storage.put("queue", current);
      await storage.setAlarm(Date.now() + (status === 202 ? 1000 : Math.min(3600000, 1000 * 2 ** current.failures)));
    });
    if (status !== 202) this.logger.warn("kaziquery.export.delivery_failed", { status });
  }

  private async pruneReceipts(): Promise<void> {
    const entries = await this.state.storage.list<string>({ prefix: "expiry:", limit: 100 });
    for (const [key, receiptKey] of entries) {
      if (Number(key.split(":")[1]) > Date.now()) break;
      await this.state.storage.transaction(async storage => {
        await storage.delete(receiptKey);
        await storage.delete(key);
      });
    }
  }

  private async hash(value: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  }
}
