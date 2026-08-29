import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectExecutorActorResolver from "../services/connect_executor_actor_resolver";
import RemoteToolDispatchService, { type DispatchResult } from "../services/remote_tool_dispatch_service";
import RemoteToolGrantService from "../services/remote_tool_grant_service";
import OAuthOrigins from "../services/oauth_origins";
import OAuthTokenAuthService, {
  InvalidOAuthTokenError,
  type OAuthPrincipal,
} from "../services/oauth_token_auth_service";
import { connectionScopeToToolScopes } from "../services/oauth_scopes";
import OAuthRepo from "../repo/oauth_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";

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
    @Inject(OAuthTokenAuthService) private readonly oauthTokens: OAuthTokenAuthService,
    @Inject(OAuthOrigins) private readonly origins: OAuthOrigins,
    @Inject(OAuthRepo) private readonly oauth: OAuthRepo,
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
  ) {}

  // ------------------------------------------------------------ MCP

  /**
   * Resolves the bearer into a dispatch route. OAuth access tokens (resource-
   * tagged, minted for a connection) resolve their membership live — adding
   * or removing machines takes effect on the next call; legacy PAT grants
   * keep their original static binding.
   */
  private async resolveCaller(req: Request): Promise<
    | { ok: true; principal?: OAuthPrincipal; route(toolName: string, args: Record<string, unknown>) : Promise<DispatchResult> }
    | { ok: false }
  > {
    const header = typeof req.headers.authorization === "string" ? req.headers.authorization : null;
    if (this.oauthTokens.looksLikeOAuthToken(header, this.origins.resource)) {
      let principal: OAuthPrincipal;
      try {
        principal = await this.oauthTokens.authenticate(header, this.origins.resource);
      } catch (error) {
        if (error instanceof InvalidOAuthTokenError) return { ok: false };
        throw error;
      }
      return {
        ok: true,
        principal,
        route: (toolName, args) => this.routeConnection(principal, toolName, args),
      };
    }

    const grant = await this.grants.authenticate(bearer(req));
    if (!grant) return { ok: false };
    return {
      ok: true,
      route: (toolName, args) => this.dispatch.call(grant, toolName, args),
    };
  }

  /**
   * Connection routing. Machine identity is only ever needed to enumerate
   * workspaces: list_workspaces takes an optional machineId; every other
   * call is addressed by workspaceId alone and the gateway finds the online
   * member hosting that workspace from live coordinator presence.
   */
  private async routeConnection(
    principal: OAuthPrincipal,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<DispatchResult> {
    let member = null;
    if (toolName === "list_workspaces" && typeof args.machineId === "string" && args.machineId) {
      member = principal.members.find((candidate) => candidate.executor_id === args.machineId) ?? null;
      if (!member) {
        return { ok: false, code: "WORKSPACE_UNAVAILABLE", message: "That machine is not on this connection. Call list_machines." };
      }
      // Routing-only argument; the executor tool does not take it.
      args = Object.fromEntries(Object.entries(args).filter(([key]) => key !== "machineId"));
    } else if (typeof args.workspaceId === "string" && args.workspaceId && principal.members.length > 1) {
      member = await this.memberForWorkspace(principal.members, args.workspaceId);
      if (!member) {
        return {
          ok: false,
          code: "EXECUTOR_OFFLINE",
          message: "No online machine on this connection hosts that workspace. Call list_machines and list_workspaces.",
        };
      }
    } else {
      member = await this.pickMember(principal.members);
      if (!member) {
        return { ok: false, code: "EXECUTOR_OFFLINE", message: "No machine on this connection is online." };
      }
    }

    // The membership must cover the addressed workspace.
    if (typeof args.workspaceId === "string" && args.workspaceId
      && member.workspace_id !== "*" && member.workspace_id !== args.workspaceId) {
      return { ok: false, code: "WORKSPACE_UNAVAILABLE", message: "That workspace is not covered by this connection." };
    }

    return this.dispatch.callTarget({
      executorId: member.executor_id,
      workspaceId: member.workspace_id,
      scopes: connectionScopeToToolScopes(member.scope),
      grantId: principal.connection_id,
      toolSessionId: `rts_${principal.connection_id.slice(4)}`,
    }, toolName, args);
  }

  /** First member (added_at order) whose live presence hosts the workspace. */
  private async memberForWorkspace(members: OAuthPrincipal["members"], workspaceId: string) {
    for (const member of members) {
      if (member.workspace_id !== "*" && member.workspace_id !== workspaceId) continue;
      const detail = await this.dispatch.presenceDetail(member.executor_id);
      if (detail?.state !== "online") continue;
      if (member.workspace_id === workspaceId) return member;
      if (detail.workspaces.some((workspace) => workspace.workspaceId === workspaceId)) return member;
    }
    return null;
  }

  /**
   * Deterministic default: members in added_at order, first one online. A
   * single member routes directly — dispatch itself reports EXECUTOR_OFFLINE.
   */
  private async pickMember(members: OAuthPrincipal["members"]) {
    if (members.length === 0) return null;
    if (members.length === 1) return members[0];
    for (const member of members) {
      const presence = await this.dispatch.presence(member.executor_id);
      if (presence === "online") return member;
    }
    return null;
  }

  /** Gateway-level tool: the connection's machines with live presence. */
  private async listMachines(principal: OAuthPrincipal) {
    return {
      ok: true,
      machines: await Promise.all(principal.members.map(async (member) => ({
        machineId: member.executor_id,
        name: member.display_name,
        presence: (await this.dispatch.presence(member.executor_id)) ?? "offline",
        workspaceAccess: member.workspace_id === "*" ? "all" : member.workspace_id,
        scope: member.scope,
      }))),
    };
  }

  async mcp({ req, res }: Context) {
    const caller = await this.resolveCaller(req);
    if (!caller.ok) {
      // RFC 9728: point OAuth-capable clients at the protected-resource
      // metadata; PAT holders just see the 401.
      res.setHeader(
        "WWW-Authenticate",
        `Bearer resource_metadata="${this.origins.issuer}/.well-known/oauth-protected-resource"`,
      );
      return res.status(401).json({ error: true, message: "A valid remote tool bearer is required." });
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
        const outcome = await caller.route("tool_help", {});
        if (!outcome.ok) {
          return rpcError(res, body.id, -32603, `${outcome.code}: ${outcome.message}`);
        }
        const payload = outcome.payload as { tools?: Array<{ name: string; description: string; inputSchema: unknown }> };
        const tools = (payload.tools ?? []).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ?? { type: "object" },
        }));
        if (caller.principal) {
          // Gateway-level tools: machines belong to the connection, not to
          // any one executor. machineId exists only to enumerate workspaces;
          // after that, workspaceId alone addresses every operation.
          for (const tool of tools) {
            if (tool.name !== "list_workspaces") continue;
            const schema = tool.inputSchema as { properties?: Record<string, unknown> };
            if (schema?.properties) {
              schema.properties.machineId = {
                type: "string",
                pattern: "^exe_[A-Za-z0-9]{8,64}$",
                description: "Optional machine id from list_machines; lists that machine's workspaces.",
              };
            }
          }
          tools.push({
            name: "list_machines",
            description: "List the machines on this connection with live presence. Use a machineId with list_workspaces; after that, workspaceId alone addresses every operation.",
            inputSchema: { type: "object", additionalProperties: false, properties: {} },
          });
          tools.sort((a, b) => (a.name < b.name ? -1 : 1));
        }
        return rpcResult(res, body.id, { tools });
      }

      case "tools/call": {
        const name = body.params?.name;
        const args = body.params?.arguments;
        if (typeof name !== "string" || name.length === 0) {
          return rpcError(res, body.id, -32602, "params.name is required.");
        }
        if (name === "list_machines" && caller.principal) {
          const machines = await this.listMachines(caller.principal);
          return rpcResult(res, body.id, {
            content: [{ type: "text", text: JSON.stringify(machines, null, 2) }],
            structuredContent: machines,
            isError: false,
          });
        }
        const outcome = await caller.route(
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

  // ------------------------------------------------------------ connections
  // OAuth connections are living objects: machines can be added and removed
  // after consent; MCP calls resolve the membership live on every request.

  async listConnections({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, false);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });
    const userId = (actor.actor as { userId: string }).userId;

    const connections = await this.oauth.listConnectionsByUser({ user_id: userId });
    const withMembers = await Promise.all(connections.map(async (connection) => ({
      connectionId: connection.connection_id,
      clientId: connection.client_id,
      clientName: connection.client_name,
      approvedScope: connection.approved_scope,
      status: connection.status,
      createdAt: connection.created_at,
      members: (await this.oauth.listConnectionExecutors({
        connection_id: connection.connection_id,
      })).map((member) => ({
        executorId: member.executor_id,
        displayName: member.executor_display_name,
        workspaceId: member.workspace_id,
        scope: member.scope,
        addedAt: member.added_at,
      })),
    })));
    return res.json({ connections: withMembers });
  }

  async addConnectionMember({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });
    const userId = (actor.actor as { userId: string }).userId;

    const connection = await this.ownedConnection(req.params?.connectionId, userId);
    if (!connection) return res.status(404).json({ error: true, message: "Connection not found." });

    const body = req.body as { executorId?: string; workspaceId?: string; scope?: string } | undefined;
    if (!body || typeof body.executorId !== "string" || typeof body.workspaceId !== "string") {
      return res.status(400).json({ error: true, message: "executorId and workspaceId are required." });
    }
    const scope = body.scope === "read" || body.scope === "read_write"
      ? body.scope
      : connection.approved_scope;
    if (scope === "read_write" && connection.approved_scope !== "read_write") {
      return res.status(400).json({ error: true, message: "Member scope exceeds the connection's approved scope." });
    }
    const executor = await this.executors.findByExecutorId({ executor_id: body.executorId });
    if (!executor || executor.state !== "active" || executor.owner_user_id !== userId) {
      return res.status(404).json({ error: true, message: "Machine not found." });
    }
    try {
      await this.oauth.addConnectionExecutor({
        connection_id: connection.connection_id,
        executor_id: body.executorId,
        workspace_id: body.workspaceId,
        scope,
        added_at: new Date().toISOString(),
      });
    } catch {
      return res.status(409).json({ error: true, message: "That machine is already on this connection." });
    }
    return res.status(201).json({ ok: true });
  }

  async removeConnectionMember({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });
    const userId = (actor.actor as { userId: string }).userId;

    const connection = await this.ownedConnection(req.params?.connectionId, userId);
    if (!connection) return res.status(404).json({ error: true, message: "Connection not found." });
    const executorId = req.params?.executorId;
    if (typeof executorId !== "string" || !/^exe_[A-Za-z0-9]{8,64}$/.test(executorId)) {
      return res.status(400).json({ error: true, message: "Invalid executor id." });
    }
    await this.oauth.removeConnectionExecutor({
      connection_id: connection.connection_id,
      executor_id: executorId,
    });
    return res.json({ ok: true });
  }

  async revokeConnection({ req, res }: Context) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const actor = await this.actors.browser(req, sessionId, true);
    if (!actor.ok) return res.status(401).json({ error: true, message: "Not signed in." });
    const userId = (actor.actor as { userId: string }).userId;

    const connection = await this.ownedConnection(req.params?.connectionId, userId);
    if (!connection) return res.status(404).json({ error: true, message: "Connection not found." });
    const revokedAt = new Date().toISOString();
    await this.oauth.revokeTokensByConnection({
      connection_id: connection.connection_id,
      revoked_at: revokedAt,
    });
    await this.oauth.revokeConnection({
      connection_id: connection.connection_id,
      revoked_at: revokedAt,
    });
    return res.json({ ok: true });
  }

  private async ownedConnection(connectionId: unknown, userId: string) {
    if (typeof connectionId !== "string" || !/^ocn_[a-f0-9]{32}$/.test(connectionId)) return null;
    const connection = await this.oauth.findActiveConnectionById({ connection_id: connectionId });
    return connection && connection.user_id === userId ? connection : null;
  }
}
