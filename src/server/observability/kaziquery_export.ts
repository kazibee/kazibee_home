import { ExecutionContext, type ExecutionScope } from "@noego/ioc";
import { getManager, getLogger } from "@noego/logger";
import { getTraceManager } from "@noego/trace";
import { KaziQueryRecordPolicy, type ExportRecord } from "./kaziquery_record";

export interface ExportNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
export interface ExportRuntime {
  env?: Record<string, unknown>;
  waitUntil(work: Promise<unknown>): void;
}

/** Only the active invocation supplies its own runtime/binding; never a global env. */
export class KaziQueryExport {
  private static readonly invocations = new WeakMap<object, KaziQueryExport>();
  private static subscribed = false;
  private static readonly policy = new KaziQueryRecordPolicy();
  private readonly logger = getLogger("kazibee:kaziquery-export");
  private count = 0;
  private active = 0;
  private reported = false;

  constructor(private readonly runtime: ExportRuntime, private readonly namespace: ExportNamespace) {}

  static attach(scope: object, candidate: unknown): void {
    const runtime = candidate as ExportRuntime | undefined;
    const env = runtime?.env;
    if (!runtime || typeof runtime.waitUntil !== "function" || env?.KAZIQUERY_EXPORT_ENABLED !== "true") return;
    if (env.KAZI_WEBSITE_ORIGIN !== "https://dev.kazibee.com" || env.KAZIQUERY_ORIGIN !== "https://dev.kaziquery.com") return;
    const namespace = env.KAZIQUERY_EXPORT_RELAY as ExportNamespace | undefined;
    if (!namespace || typeof namespace.get !== "function") return;
    this.invocations.set(scope, new KaziQueryExport(runtime, namespace));
    if (this.subscribed) return;
    this.subscribed = true;
    getManager().records$.subscribe(record => this.capture(() => this.policy.log(record)));
    getTraceManager().events$.subscribe(record => this.capture(() => this.policy.trace(record)));
    this.invocations.get(scope)?.send({
      id: crypto.randomUUID(), occurredAtMs: Date.now(), kind: "log", name: "kaziquery.export.started", level: "info",
      attributes: { exportPolicyVersion: 1, asyncContext: ExecutionContext.capabilities().propagation === "async", scopeMatched: ExecutionContext.current() === scope },
    });
  }

  private static capture(convert: () => ExportRecord | undefined): void {
    const scope: ExecutionScope | undefined = ExecutionContext.current();
    const invocation = scope && this.invocations.get(scope);
    if (!invocation) return;
    try {
      const record = convert();
      if (record) invocation.send(record);
    } catch { invocation.report("policy_rejected"); }
  }

  private send(record: ExportRecord): void {
    if (++this.count > 64 || this.active >= 8) return this.report("admission_capacity");
    ++this.active;
    // Capture immutable bytes now. waitUntil covers ONLY initial durable admission.
    const request = new Request("https://export-relay.internal/admit", {
      method: "POST", body: JSON.stringify({ record, admittedAtMs: Date.now() }),
      signal: AbortSignal.timeout(2000),
    });
    const stub = this.namespace.get(this.namespace.idFromName("kazibee-dev-v1"));
    const work = stub.fetch(request)
      .then(async response => {
        if (response.status === 202 || this.reported) return;
        const health = await stub.fetch(new Request("https://export-relay.internal/status", { signal: AbortSignal.timeout(2000) }));
        const value = await health.json() as Record<string, unknown>;
        this.report(`admission_rejected_${response.status}`, {
          pending: typeof value.pending === "number" ? value.pending : -1,
          blocked: typeof value.blocked === "number" ? value.blocked : 0,
          failures: typeof value.failures === "number" ? value.failures : 0,
          lastStatus: typeof value.lastStatus === "number" ? value.lastStatus : 0,
          lastAttemptAtMs: typeof value.lastAttemptAtMs === "number" ? value.lastAttemptAtMs : 0,
          nextAlarm: typeof value.nextAlarm === "number" ? value.nextAlarm : 0,
        });
      })
      .catch(error => this.report(error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? "admission_timeout" : "admission_unconfirmed"))
      .finally(() => { --this.active; });
    this.runtime.waitUntil(work);
  }

  private report(reason: string, details: Record<string, number> = {}): void {
    if (this.reported) return;
    this.reported = true;
    this.logger.warn("kaziquery.export.admission_failed", { reason, ...details });
  }
}
