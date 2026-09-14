import { Component, LoadAs } from "@noego/ioc";
import { currentLogContext, getLogger } from "@noego/logger";

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const ERROR_KINDS = new Set(["Error", "TypeError", "AbortError", "TimeoutError", "SyntaxError"]);

/** Metadata-only HTTP outcomes. Never reads bodies, cookies, bearer tokens or raw error text. */
@Component({ scope: LoadAs.Scoped })
export default class GatewayRequestLog {
  private readonly logger = getLogger("kazibee:gateway");
  private context: Record<string, unknown> | undefined;
  private startedAt = 0;
  private finished = false;

  start(request: Request, runtime: unknown): void {
    if (this.context) return;
    const env = (runtime as { env?: Record<string, unknown> } | undefined)?.env;
    if (env?.KAZIQUERY_EXPORT_ENABLED !== "true" || env.KAZI_WEBSITE_ORIGIN !== "https://dev.kazibee.com") return;
    const site = env.KAZIQUERY_SITE ?? "website";
    if (site !== "website" && site !== "mcp" && site !== "agent") return;
    const pathname = new URL(request.url).pathname;
    if (site === "website" && !this.isGatewayPath(pathname)) return;
    this.startedAt = performance.now();
    const ray = request.headers.get("cf-ray") ?? "";
    // Share the request identity the ambient log context minted in
    // requestScope, so gateway lines and every service line join on it.
    const ambientRequestId = currentLogContext()?.requestId;
    this.context = {
      requestId: typeof ambientRequestId === "string" ? ambientRequestId : crypto.randomUUID(),
      site, route: this.route(pathname),
      method: METHODS.has(request.method) ? request.method : "OTHER",
      ...(/^[a-f0-9]{16,32}-[A-Z]{3}$/.test(ray) ? { cfRay: ray } : {}),
    };
    this.logger.info("gateway.request.started", { ...this.context, outcome: "started" });
  }

  /** `matchedRoute`: the framework-reported raw pattern (App `onRequestSettled` context); replaces the path-family guess when known. */
  finish(response?: Response, error?: unknown, matchedRoute?: string): void {
    if (!this.context || this.finished) return;
    this.finished = true;
    const status = response?.status ?? null;
    const failed = !response || response.status >= 500;
    const context = {
      ...this.context, ...(matchedRoute ? { route: matchedRoute } : {}), status, responseReturned: Boolean(response),
      durationMs: Math.max(0, Math.round(performance.now() - this.startedAt)),
      outcome: failed ? "failed" : this.outcome(response.status),
      ...(!response ? { errorKind: this.errorKind(error) } : {}),
    };
    if (failed) this.logger.error("gateway.request.failed", context);
    else this.logger.info("gateway.request.completed", context);
  }

  private isGatewayPath(path: string): boolean {
    return path === "/mcp" || path.startsWith("/v1/connect/")
      || path.startsWith("/v1/remote-tools/") || path.startsWith("/v1/agent/")
      || path.startsWith("/v1/swarms/") || path.startsWith("/oauth/");
  }

  private route(path: string): string {
    if (path === "/mcp" || path === "/v1/remote-tools/mcp") return path;
    if (/^\/v1\/swarms\/[^/]+\/mcp$/.test(path)) return "/v1/swarms/:swarmId/mcp";
    if (path.startsWith("/handoff/")) return "/handoff/:token";
    if (path === "/v1/agent/session" || path === "/assets" || path === "/") return path;
    if (path.startsWith("/assets/")) return "/assets/:file";
    for (const family of ["/v1/connect/", "/v1/remote-tools/", "/v1/agent/", "/v1/swarms/", "/oauth/", "/.well-known/"]) {
      if (path.startsWith(family)) return family + "*";
    }
    return "/:path";
  }

  private outcome(status: number): string {
    if (status >= 400) return "rejected";
    if (status >= 300) return "redirected";
    if (status === 101) return "upgraded";
    return "completed";
  }

  private errorKind(error: unknown): string {
    return error instanceof Error && ERROR_KINDS.has(error.name) ? error.name : "unknown";
  }
}
