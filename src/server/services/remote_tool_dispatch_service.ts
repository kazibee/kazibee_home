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

  async call(grant: RemoteToolGrant, toolName: string, args: Record<string, unknown>): Promise<DispatchResult> {
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
      executorId: grant.executor_id,
      actorRole: "remote_tool_gateway",
      payload: {
        operationId,
        toolName,
        arguments: args,
        scopes: JSON.parse(grant.scopes) as string[],
        workspaceId: grant.workspace_id,
        toolSessionId: `rts_${grant.grant_id.slice(4)}`,
        grantId: grant.grant_id,
        grantGeneration: 1,
        deadlineAt: new Date(Date.now() + DEFAULT_DEADLINE_MS).toISOString(),
      },
    };

    let response: Response;
    try {
      const request = new Request(
        coordinator
          ? "https://coordinator/dispatch"
          : `${devOrigin}/executors/${encodeURIComponent(grant.executor_id)}/dispatch`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(frame),
        },
      );
      response = coordinator
        ? await coordinator.get(coordinator.idFromName(grant.executor_id)).fetch(request)
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
