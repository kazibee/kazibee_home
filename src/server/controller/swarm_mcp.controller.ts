import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import RemoteToolDispatchService, { type DispatchResult } from "../services/remote_tool_dispatch_service";
import SwarmRepo, { type Swarm } from "../repo/swarm_repo";
import { SWARM_ID } from "../../shared/swarm_head_protocol";

type Context = { req: Request; res: Response };

const SERVER_INFO = { name: "Kazibee Swarm Member Tools", version: "0.1.0" };
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SWARM_BEARER = /^swarm:[A-Za-z0-9_-]{16,256}$/;
const MAX_ARGUMENT_BYTES = 256 * 1024;

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function rpcError(res: Response, id: unknown, code: number, message: string) {
  return res.status(code === -32600 || code === -32700 ? 400 : 200).json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

function rpcResult(res: Response, id: unknown, result: Record<string, unknown>) {
  return res.json({ jsonrpc: "2.0", id, result });
}

/**
 * MCP over Streamable HTTP (JSON response mode) for swarm member threads
 * running on Fargate heads.
 *
 * The website is a pure relay: the bearer is an opaque `swarm:<token>`
 * runtime binding minted by the owning Desktop, which is the only party that
 * can verify it (token hash, member, epoch, allowlist, workspace root). The
 * relay only decides *which* Desktop executor to forward to — the executor
 * that created the swarm — and never persists arguments or results.
 */
@Component()
export default class SwarmMcpController {
  constructor(
    @Inject(SwarmRepo) private readonly swarms: SwarmRepo,
    @Inject(RemoteToolDispatchService) private readonly dispatch: RemoteToolDispatchService,
  ) {}

  async mcp({ req, res }: Context) {
    const token = bearer(req);
    if (!token || !SWARM_BEARER.test(token)) {
      return res.status(401).json({ error: true, code: "SWARM_BEARER_REQUIRED" });
    }
    const swarmId = req.params?.swarmId;
    if (typeof swarmId !== "string" || !SWARM_ID.test(swarmId)) {
      return res.status(404).json({ error: true, code: "SWARM_NOT_FOUND" });
    }
    const swarm = await this.swarms.findById({ swarm_id: swarmId });
    if (!swarm || swarm.state !== "active") {
      return res.status(404).json({ error: true, code: "SWARM_NOT_FOUND" });
    }
    if (!swarm.executor_id) {
      return res.status(409).json({ error: true, code: "SWARM_EXECUTOR_UNBOUND" });
    }

    const body = req.body as { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> } | undefined;
    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return rpcError(res, body?.id, -32600, "Invalid JSON-RPC request.");
    }
    if (body.id === undefined || body.id === null) {
      return res.status(202).end();
    }

    switch (body.method) {
      case "initialize": {
        const requested = String(body.params?.protocolVersion ?? "");
        const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : SUPPORTED_PROTOCOL_VERSIONS[0];
        return rpcResult(res, body.id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: "Tools run on the swarm owner's Desktop against the shared workspace. Every mutation is checked against your slice, write intents, and file identity; treat STALE_HANDLE and swarm_* denials as authoritative.",
        });
      }

      case "ping":
        return rpcResult(res, body.id, {});

      case "tools/list": {
        // The Desktop executor is the manifest authority for the binding:
        // tool_help with no tool name answers with the binding's allowlist.
        const outcome = await this.route(swarm, token, "tool_help", {});
        if (!outcome.ok) {
          return rpcError(res, body.id, -32603, `${outcome.code}: ${outcome.message}`);
        }
        const payload = outcome.payload as { tools?: Array<{ name: string; description: string; inputSchema: unknown }> };
        const tools = (payload.tools ?? []).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ?? { type: "object" },
        }));
        return rpcResult(res, body.id, { tools });
      }

      case "tools/call": {
        const name = body.params?.name;
        const args = body.params?.arguments;
        if (typeof name !== "string" || name.length === 0) {
          return rpcError(res, body.id, -32602, "params.name is required.");
        }
        const callArguments = (args && typeof args === "object" && !Array.isArray(args) ? args : {}) as Record<string, unknown>;
        if (JSON.stringify(callArguments).length > MAX_ARGUMENT_BYTES) {
          return rpcError(res, body.id, -32602, "params.arguments exceed the relay size limit.");
        }
        const outcome = await this.route(swarm, token, name, callArguments);
        if (outcome.ok) {
          return rpcResult(res, body.id, {
            content: [{ type: "text", text: JSON.stringify(outcome.payload, null, 2) }],
            structuredContent: outcome.payload,
            isError: false,
          });
        }
        // Tool-domain failures (including binding denials from the Desktop)
        // are successful JSON-RPC envelopes with isError=true.
        return rpcResult(res, body.id, {
          content: [{ type: "text", text: `${outcome.code}: ${outcome.message}${outcome.requiredAction ? ` ${outcome.requiredAction}` : ""}` }],
          structuredContent: {
            ok: false,
            code: outcome.code,
            message: outcome.message,
            retryable: outcome.retryable ?? false,
            requiredAction: outcome.requiredAction,
            effectState: outcome.effectState ?? "none",
          },
          isError: true,
        });
      }

      default:
        return rpcError(res, body.id, -32601, `Method not found: ${body.method}`);
    }
  }

  private route(swarm: Swarm, token: string, toolName: string, args: Record<string, unknown>): Promise<DispatchResult> {
    return this.dispatch.callTarget({
      executorId: swarm.executor_id as string,
      // The Desktop derives the workspace root from the binding, never from
      // the caller; '*' marks the request as unbound on the website side.
      workspaceId: "*",
      scopes: [],
      grantId: `swarm:${swarm.swarm_id}`,
      toolSessionId: `rts_swarm_${swarm.swarm_id.slice(4)}`,
      authorization: token,
    }, toolName, args);
  }
}
