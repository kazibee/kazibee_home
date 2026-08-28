import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectExecutorActorResolver from "../services/connect_executor_actor_resolver";
import RemoteToolDispatchService from "../services/remote_tool_dispatch_service";
import RemoteToolGrantService from "../services/remote_tool_grant_service";

type Context = { req: Request; res: Response };

const SERVER_INFO = { name: "Kazibee Remote Tool Service", version: "0.1.0" };
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

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
 * MCP over Streamable HTTP (JSON response mode) plus PAT-style grant
 * management for the owner.
 *
 * The MCP surface implements the current published protocol an external host
 * actually speaks today — initialize / notifications / tools/list /
 * tools/call, stateless, JSON responses — so a real client (Claude Code, MCP
 * Inspector) can connect with just a bearer header. Doc 07's dated revision
 * (server/discover, SSE call streams, strict Mcp-* headers) layers on when an
 * official frozen SDK for it exists; the authorization model underneath is
 * the same either way.
 */
@Component()
export default class RemoteToolsController {
  constructor(
    @Inject(RemoteToolGrantService) private readonly grants: RemoteToolGrantService,
    @Inject(RemoteToolDispatchService) private readonly dispatch: RemoteToolDispatchService,
    @Inject(ConnectExecutorActorResolver) private readonly actors: ConnectExecutorActorResolver,
  ) {}

  // ------------------------------------------------------------ MCP

  async mcp({ req, res }: Context) {
    const grant = await this.grants.authenticate(bearer(req));
    if (!grant) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="kazibee-remote-tools"');
      return res.status(401).json({ error: true, message: "A valid remote tool grant bearer is required." });
    }

    const body = req.body as { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> } | undefined;
    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return rpcError(res, body?.id, -32600, "Invalid JSON-RPC request.");
    }

    // Notifications (no id) are acknowledged and have no effect.
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
          instructions: "Kazibee runs approved tools on one user-authorized machine and workspace. Paths are workspace-relative. Handles expire; re-read when a result says a handle is stale.",
        });
      }

      case "ping":
        return rpcResult(res, body.id, {});

      case "tools/list": {
        // The executor is the manifest authority: tool_help returns exactly
        // the tools visible to this grant's scopes, schemas included.
        const outcome = await this.dispatch.call(grant, "tool_help", {});
        if (!outcome.ok) {
          return rpcError(res, body.id, -32603, `${outcome.code}: ${outcome.message}`);
        }
        const payload = outcome.payload as { tools?: Array<{ name: string; description: string; inputSchema: unknown }> };
        return rpcResult(res, body.id, {
          tools: (payload.tools ?? []).map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema ?? { type: "object" },
          })),
        });
      }

      case "tools/call": {
        const name = body.params?.name;
        const args = body.params?.arguments;
        if (typeof name !== "string" || name.length === 0) {
          return rpcError(res, body.id, -32602, "params.name is required.");
        }
        const outcome = await this.dispatch.call(
          grant,
          name,
          (args && typeof args === "object" && !Array.isArray(args) ? args : {}) as Record<string, unknown>,
        );
        if (outcome.ok) {
          return rpcResult(res, body.id, {
            content: [{ type: "text", text: JSON.stringify(outcome.payload, null, 2) }],
            structuredContent: outcome.payload,
            isError: false,
          });
        }
        // Tool-domain failures are successful JSON-RPC envelopes with
        // isError=true; only protocol failures use JSON-RPC errors.
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

  // ------------------------------------------------------------ grants

  async createGrant({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });

    const body = req.body as { executorId?: string; workspaceId?: string; scopes?: string[] } | undefined;
    if (!body || typeof body.executorId !== "string" || typeof body.workspaceId !== "string" || !Array.isArray(body.scopes)) {
      return res.status(400).json({ error: true, message: "executorId, workspaceId, and scopes are required." });
    }
    const result = await this.grants.create({
      ownerUserId: (actor.actor as { userId: string }).userId,
      executorId: body.executorId,
      workspaceId: body.workspaceId,
      scopes: body.scopes,
    });
    if (!result.ok) {
      return res.status(400).json({ error: true, message: `Grant creation failed: ${result.reason}.` });
    }
    // Raw token exactly once; only hashes are stored.
    return res.status(201).json({
      grantId: result.grant.grant_id,
      executorId: result.grant.executor_id,
      workspaceId: result.grant.workspace_id,
      scopes: JSON.parse(result.grant.scopes) as string[],
      token: result.token,
      mcpHint: "Connect an MCP client to POST /v1/remote-tools/mcp with Authorization: Bearer <token>.",
    });
  }

  async listGrants({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, false);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });
    const grants = await this.grants.list((actor.actor as { userId: string }).userId);
    return res.json({
      grants: grants.map((grant) => ({
        grantId: grant.grant_id,
        executorId: grant.executor_id,
        workspaceId: grant.workspace_id,
        scopes: JSON.parse(grant.scopes) as string[],
        state: grant.state,
        createdAt: grant.created_at,
        lastUsedAt: grant.last_used_at,
      })),
    });
  }

  async revokeGrant({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });
    const grantId = req.params?.grantId;
    if (typeof grantId !== "string" || !/^rtg_[A-Za-z0-9]{8,64}$/.test(grantId)) {
      return res.status(400).json({ error: true, message: "Invalid grant id." });
    }
    await this.grants.revoke((actor.actor as { userId: string }).userId, grantId);
    return res.json({ ok: true });
  }
}
