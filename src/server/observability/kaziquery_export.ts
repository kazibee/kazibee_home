import { ExecutionContext, type ExecutionScope } from "@noego/ioc";
import { getManager, getLogger } from "@noego/logger";
import { getTraceManager } from "@noego/trace";
import { classifyError, diagnose } from "./kaziquery_diagnostics";
import { KaziQueryRecordPolicy, type ExportRecord } from "./kaziquery_record";

export interface ExportNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
export interface ExportRuntime {
  env?: Record<string, unknown>;
  waitUntil(work: Promise<unknown>): void;
}

const MAX_RECORDS = 64;
const MAX_ACTIVE = 8;
const ADMIT_TIMEOUT_MS = 2000;

/** Only the active invocation supplies its own runtime/binding; never a global env. */
export class KaziQueryExport {
  private static readonly invocations = new WeakMap<object, KaziQueryExport>();
  private static subscribed = false;
  private static readonly policy = new KaziQueryRecordPolicy();
  private readonly logger = getLogger("kazibee:kaziquery-export");
  private readonly invocationId = crypto.randomUUID();
  private count = 0;
  private active = 0;
  private admitted = 0;
  private rejected = 0;
  private dropped = 0;
  private reported = false;

  constructor(
    private readonly runtime: ExportRuntime,
    private readonly namespace: ExportNamespace,
    private readonly site: "website" | "mcp" | "agent" = "website",
  ) {}

  static attach(scope: object, candidate: unknown): void {
    const runtime = candidate as ExportRuntime | undefined;
    const env = runtime?.env;
    // A disabled environment is the normal production state: stay silent there.
    if (!runtime || typeof runtime.waitUntil !== "function" || env?.KAZIQUERY_EXPORT_ENABLED !== "true") return;
    if (env.KAZI_WEBSITE_ORIGIN !== "https://dev.kazibee.com" || env.KAZIQUERY_ORIGIN !== "https://dev.kaziquery.com") {
      return diagnose("warn", "kaziquery.export.attach", { phase: "attach", outcome: "skipped", reason: "origin_mismatch" });
    }
    const namespace = env.KAZIQUERY_EXPORT_RELAY as ExportNamespace | undefined;
    if (!namespace || typeof namespace.get !== "function") {
      return diagnose("warn", "kaziquery.export.attach", { phase: "attach", outcome: "skipped", reason: "relay_binding_missing" });
    }
    const site = env.KAZIQUERY_SITE ?? "website";
    if (site !== "website" && site !== "mcp" && site !== "agent") {
      return diagnose("warn", "kaziquery.export.attach", { phase: "attach", outcome: "skipped", reason: "site_invalid" });
    }
    const invocation = new KaziQueryExport(runtime, namespace, site);
    this.invocations.set(scope, invocation);
    const firstSubscription = !this.subscribed;
    diagnose("log", "kaziquery.export.attach", {
      phase: "attach", outcome: "attached", invocationId: invocation.invocationId, site,
      subscribed: firstSubscription, scopeMatched: ExecutionContext.current() === scope,
      asyncContext: ExecutionContext.capabilities().propagation === "async",
    });
    if (this.subscribed) return;
    this.subscribed = true;
    getManager().records$.subscribe(record => this.capture(() => this.policy.log(record)));
    getTraceManager().events$.subscribe(record => this.capture(() => this.policy.trace(record)));
    this.invocations.get(scope)?.send({
      id: crypto.randomUUID(), occurredAtMs: Date.now(), kind: "log", name: "kaziquery.export.started", level: "info",
      attributes: { exportPolicyVersion: 2, asyncContext: ExecutionContext.capabilities().propagation === "async", scopeMatched: ExecutionContext.current() === scope },
    });
  }

  private static capture(convert: () => ExportRecord | undefined): void {
    const scope: ExecutionScope | undefined = ExecutionContext.current();
    const invocation = scope && this.invocations.get(scope);
    if (!invocation) return;
    try {
      const record = convert();
      if (!record) return;
      // Satellite opt-in admits only the audited, metadata-only gateway logger.
      // Do not start exporting arbitrary existing tool/provider messages.
      if (invocation.site !== "website" && record.attributes.logger !== "kazibee:gateway") return;
      invocation.send(record);
    } catch { invocation.report("policy_rejected"); }
  }

  private send(record: ExportRecord): void {
    if (++this.count > MAX_RECORDS || this.active >= MAX_ACTIVE) {
      ++this.dropped;
      // Capacity drops are reported once; the counters carry the ongoing volume.
      if (this.dropped === 1) {
        diagnose("warn", "kaziquery.export.admission", {
          phase: "admission", outcome: "dropped", reason: this.count > MAX_RECORDS ? "record_cap" : "active_cap",
          invocationId: this.invocationId, recordId: record.id, site: this.site, kind: record.kind,
          count: this.count, active: this.active, limitRecords: MAX_RECORDS, limitActive: MAX_ACTIVE,
        });
      }
      return this.report("admission_capacity");
    }
    ++this.active;
    // Capture immutable bytes now. waitUntil covers ONLY initial durable admission.
    const body = JSON.stringify({
      record: { ...record, attributes: { ...record.attributes, site: this.site } },
      admittedAtMs: Date.now(),
    });
    const request = new Request("https://export-relay.internal/admit", {
      method: "POST", body,
      signal: AbortSignal.timeout(ADMIT_TIMEOUT_MS),
    });
    const startedAt = Date.now();
    const base = { phase: "admission", invocationId: this.invocationId, recordId: record.id, site: this.site, kind: record.kind, bytes: new TextEncoder().encode(body).byteLength };
    const stub = this.namespace.get(this.namespace.idFromName("kazibee-dev-v1"));
    const work = stub.fetch(request)
      .then(async response => {
        const elapsedMs = Date.now() - startedAt;
        if (response.status === 202) {
          ++this.admitted;
          // First success per invocation proves the path; later ones are counted only.
          if (this.admitted === 1) diagnose("log", "kaziquery.export.admission", { ...base, outcome: "admitted", status: 202, elapsedMs, count: this.count, active: this.active });
          return;
        }
        ++this.rejected;
        diagnose("warn", "kaziquery.export.admission", { ...base, outcome: "rejected", status: response.status, elapsedMs, count: this.count, active: this.active, rejected: this.rejected });
        if (this.reported) return;
        const health = await stub.fetch(new Request("https://export-relay.internal/status", { signal: AbortSignal.timeout(ADMIT_TIMEOUT_MS) }));
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
      .catch(error => {
        const errorClass = classifyError(error);
        ++this.rejected;
        diagnose("warn", "kaziquery.export.admission", { ...base, outcome: "failed", errorClass, elapsedMs: Date.now() - startedAt, count: this.count, active: this.active, rejected: this.rejected });
        this.report(errorClass === "timeout" || errorClass === "aborted" ? "admission_timeout" : "admission_unconfirmed");
      })
      .finally(() => { --this.active; });
    this.runtime.waitUntil(work);
  }

  private report(reason: string, details: Record<string, number> = {}): void {
    if (this.reported) return;
    this.reported = true;
    diagnose("error", "kaziquery.export.report", {
      phase: "report", invocationId: this.invocationId, site: this.site, reason,
      count: this.count, admitted: this.admitted, rejected: this.rejected, dropped: this.dropped, ...details,
    });
    this.logger.warn("kaziquery.export.admission_failed", { reason, ...details });
  }
}
