import { randomBytes } from "node:crypto";
import { Component, Inject, LoadAs } from "@noego/ioc";
import Env from "./env";
import type { RemoteToolGrant } from "../repo/remote_tool_grant_repo";

interface CoordinatorNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(req: Request): Promise<Response> };
}

function asCoordinator(value: unknown): CoordinatorNamespace | null {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
  const candidate = value as Partial<CoordinatorNamespace>;
  if (typeof candidate.idFromName !== "function" || typeof candidate.get !== "function") return null;
  return candidate as CoordinatorNamespace;
}

function opaque(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

export type DispatchResult =
  | { ok: true; status: "succeeded"; payload: unknown; effectState: string }
  | {
      ok: false;
      code: string;
      message: string;
      retryable?: boolean;
      requiredAction?: string;
      effectState?: string;
    };

// Web MCP clients time out at 60s per request; the whole dispatch must
// resolve inside that. 45s leaves headroom for edge/proxy latency, and the
// coordinator enforces it as a route deadline (spec doc 01 §17's 120s default
// applies to native hosts; the web budget is the binding one here).
const DEFAULT_DEADLINE_MS = 45_000;

/**
 * Routes one authorized tool call to the grant-bound executor through its
 * ExecutorCoordinator Durable Object. This service performs no authorization
 * itself — the caller must already hold a validated grant — and never
 * persists tool arguments or results.
 */
@Component({ scope: LoadAs.Singleton })
export default class RemoteToolDispatchService {
  constructor(@Inject(Env) private readonly env: Env) {}

  /**
   * Live presence as the ExecutorCoordinator sees it, or null when this
   * deployment has no coordinator routing at all (pure in-process channels).
   */
  async presence(executorId: string): Promise<"online" | "stale" | "offline" | null> {
    const detail = await this.presenceDetail(executorId);
    return detail && detail.state;
  }

  /** Full coordinator presence: state plus the executor's live workspace projection. */
  async presenceDetail(executorId: string): Promise<{
    state: "online" | "stale" | "offline";
    workspaces: Array<{ workspaceId: string; displayName: string; state: string }>;
  } | null> {
    const coordinator = asCoordinator(this.env.get("EXECUTOR_COORDINATOR"));
    const devOrigin = this.env.string("KAZIBEE_DEV_COORDINATOR_ORIGIN");
    if (!coordinator && !devOrigin) return null;
    try {
      const request = new Request(
        coordinator
          ? "https://coordinator/presence"
          : `${devOrigin}/executors/${encodeURIComponent(executorId)}/presence`,
      );
      const response = coordinator
        ? await coordinator.get(coordinator.idFromName(executorId)).fetch(request)
        : await fetch(request);
      if (!response.ok) return { state: "offline", workspaces: [] };
      const body = (await response.json()) as {
        state?: unknown;
        workspaces?: { workspaces?: Array<{ workspaceId?: unknown; displayName?: unknown; state?: unknown }> } | null;
      };
      const state = body.state === "online" || body.state === "stale" ? body.state : "offline";
      const workspaces = (body.workspaces?.workspaces ?? [])
        .filter((entry) => typeof entry?.workspaceId === "string")
        .map((entry) => ({
          workspaceId: String(entry.workspaceId),
          displayName: typeof entry.displayName === "string" ? entry.displayName : String(entry.workspaceId),
          state: typeof entry.state === "string" ? entry.state : "unavailable",
        }));
      return { state, workspaces };
    } catch {
      return { state: "offline", workspaces: [] };
    }
  }

  async call(grant: RemoteToolGrant, toolName: string, args: Record<string, unknown>): Promise<DispatchResult> {
    return this.callTarget({
      executorId: grant.executor_id,
      workspaceId: grant.workspace_id,
      scopes: JSON.parse(grant.scopes) as string[],
      grantId: grant.grant_id,
      toolSessionId: `rts_${grant.grant_id.slice(4)}`,
    }, toolName, args);
  }

  /** Dispatches one tool call to an explicit target (grant- or connection-routed). */
  async callTarget(
    target: {
      executorId: string;
      workspaceId: string;
      scopes: string[];
      grantId: string;
      toolSessionId: string;
      /**
       * Opaque executor-verified bearer (e.g. `swarm:<token>`); the website
       * never inspects it and the executor resolves it locally.
       */
      authorization?: string;
    },
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<DispatchResult> {
    const coordinator = asCoordinator(this.env.get("EXECUTOR_COORDINATOR"));
    // Node dev has no Durable Object runtime; a local dev coordinator speaks
    // the same /dispatch contract over plain HTTP.
    const devOrigin = this.env.string("KAZIBEE_DEV_COORDINATOR_ORIGIN");
    if (!coordinator && !devOrigin) {
      return {
        ok: false,
        code: "EXECUTOR_OFFLINE",
        message: "Executor routing is unavailable in this deployment.",
      };
    }

    const operationId = opaque("rto");
    const frame = {
      kind: "command.post",
      protocolVersion: "1.1",
      operation: "remote_tool.call",
      commandId: opaque("cmd"),
      correlationId: opaque("cor"),
      idempotencyKey: `idem_${randomBytes(18).toString("base64url")}`,
      executorId: target.executorId,
      actorRole: "remote_tool_gateway",
      payload: {
        operationId,
        toolName,
        arguments: args,
        scopes: target.scopes,
        workspaceId: target.workspaceId,
        toolSessionId: target.toolSessionId,
        grantId: target.grantId,
        grantGeneration: 1,
        ...(target.authorization ? { authorization: target.authorization } : {}),
        deadlineAt: new Date(Date.now() + DEFAULT_DEADLINE_MS).toISOString(),
      },
    };

    let response: Response;
    try {
      const request = new Request(
        coordinator
          ? "https://coordinator/dispatch"
          : `${devOrigin}/executors/${encodeURIComponent(target.executorId)}/dispatch`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(frame),
        },
      );
      response = coordinator
        ? await coordinator.get(coordinator.idFromName(target.executorId)).fetch(request)
        : await fetch(request);
    } catch {
      return { ok: false, code: "EXECUTOR_OFFLINE", message: "Executor routing failed." };
    }

    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      return { ok: false, code: "INTERNAL_ERROR", message: "Malformed coordinator response." };
    }

    if (!response.ok) {
      return {
        ok: false,
        code: String(body.code ?? "INTERNAL_ERROR"),
        message: String(body.message ?? "Dispatch failed."),
      };
    }

    // Success responses are command.result frames from the executor.
    const result = body.result as
      | { status: "succeeded"; payload: unknown; effectState: string }
      | { status: "failed"; error: { code: string; message: string; retryable?: boolean; requiredAction?: string }; effectState: string }
      | undefined;
    if (!result) {
      return { ok: false, code: "INTERNAL_ERROR", message: "Coordinator returned no result." };
    }
    if (result.status === "succeeded") {
      return { ok: true, status: "succeeded", payload: result.payload, effectState: result.effectState };
    }
    return {
      ok: false,
      code: result.error.code,
      message: result.error.message,
      retryable: result.error.retryable,
      requiredAction: result.error.requiredAction,
      effectState: result.effectState,
    };
  }
}
