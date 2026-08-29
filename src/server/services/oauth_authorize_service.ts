import { Component, Inject } from "@noego/ioc";
import { randomBytes } from "node:crypto";
import OAuthRepo, {
  type OAuthClientRecord,
  type OAuthConnectionScope,
} from "../repo/oauth_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import { ConnectClock } from "./connect_auth_primitives";
import OAuthClientService from "./oauth_client_service";
import OAuthFlowService from "./oauth_flow_service";
import OAuthOrigins from "./oauth_origins";
import RemoteToolDispatchService from "./remote_tool_dispatch_service";
import {
  grantScopeToOAuthScope,
  parseOAuthGrantScope,
  type OAuthGrantScope,
} from "./oauth_scopes";

export interface OAuthAuthorizationParams {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  resource: string;
}

export type OAuthAuthorizationError =
  | "invalid_request"
  | "invalid_client"
  | "unsupported_response_type"
  | "invalid_scope";

export interface OAuthAuthorizationFailure {
  ok: false;
  error: OAuthAuthorizationError;
  message: string;
  redirectUri?: string;
  state?: string;
}

export interface OAuthAuthorizationSuccess {
  ok: true;
  client: OAuthClientRecord;
  params: OAuthAuthorizationParams;
  requestedScope: OAuthGrantScope;
}

export type OAuthAuthorizationValidation =
  | OAuthAuthorizationSuccess
  | OAuthAuthorizationFailure;

export interface GrantableExecutor {
  executor_id: string;
  display_name: string;
  presence: "online" | "stale" | "offline";
  workspaces: Array<{ workspace_id: string; display_name: string; state: string }>;
}

export interface OAuthConsentContext {
  client: {
    id: string;
    name: string;
  };
  requested_scope: string;
  requested_access: OAuthConnectionScope;
  requested_shell: boolean;
  requested_web: boolean;
  executors: GrantableExecutor[];
}

export type OAuthConsentContextResult =
  | { ok: true; context: OAuthConsentContext }
  | OAuthAuthorizationFailure;

export type OAuthApproveResult =
  | { ok: true; redirectTo: string }
  | OAuthAuthorizationFailure;

export interface OAuthExecutorSelection {
  executor_id: string;
  workspace_id: string;
  /** Explicit per-executor choice; defaults to the overall approved scope. */
  scope?: OAuthConnectionScope;
}

@Component()
export default class OAuthAuthorizeService {
  constructor(
    @Inject(OAuthClientService)
    private readonly clients: OAuthClientService,
    @Inject(ConnectExecutorRepo)
    private readonly executors: ConnectExecutorRepo,
    @Inject(RemoteToolDispatchService)
    private readonly routing: RemoteToolDispatchService,
    @Inject(OAuthRepo)
    private readonly oauth: OAuthRepo,
    @Inject(OAuthFlowService)
    private readonly flow: OAuthFlowService,
    @Inject(OAuthOrigins)
    private readonly origins: OAuthOrigins,
    @Inject(ConnectClock)
    private readonly clock: ConnectClock,
  ) {}

  /**
   * Validates the complete authorization request. A redirect target is only
   * attached after both the client and its exact registered redirect URI have
   * been validated.
   */
  async validate(
    params: OAuthAuthorizationParams,
  ): Promise<OAuthAuthorizationValidation> {
    if (!params.client_id) {
      return failure("invalid_client", "Missing or invalid client_id");
    }

    const resolved = await this.clients.resolveClient(params.client_id);
    if (!resolved.ok) {
      return failure("invalid_client", "Missing or invalid client_id");
    }

    if (
      !params.redirect_uri
      || !this.clients.validateRedirectUri(resolved.client, params.redirect_uri)
      || !validRedirectTarget(params.redirect_uri)
    ) {
      return failure("invalid_request", "redirect_uri is not registered for this client");
    }

    const safe = {
      redirectUri: params.redirect_uri,
      state: params.state,
    };

    if (params.response_type !== "code") {
      return failure(
        "unsupported_response_type",
        "Only response_type=code is supported",
        safe,
      );
    }
    if (!params.code_challenge) {
      return failure("invalid_request", "code_challenge is required", safe);
    }
    if (params.code_challenge_method !== "S256") {
      return failure(
        "invalid_request",
        "Only code_challenge_method=S256 is supported",
        safe,
      );
    }
    if (params.resource !== this.origins.resource) {
      return failure("invalid_request", "Invalid OAuth resource", safe);
    }

    const requestedScope = parseOAuthGrantScope(params.scope);
    if (!requestedScope) {
      return failure("invalid_scope", "Unsupported OAuth scope", safe);
    }

    return {
      ok: true,
      client: resolved.client,
      params,
      requestedScope,
    };
  }

  async consentContext(
    userId: string,
    params: OAuthAuthorizationParams,
  ): Promise<OAuthConsentContextResult> {
    const validated = await this.validate(params);
    if (!validated.ok) return validated;

    const owned = await this.executors.listByOwner({
      owner_user_id: userId,
      limit: 100,
    });
    const active = owned.filter((executor) => executor.state === "active");
    const executors: GrantableExecutor[] = await Promise.all(
      active.map(async (executor) => {
        const detail = await this.routing.presenceDetail(executor.executor_id);
        return {
          executor_id: executor.executor_id,
          display_name: executor.display_name,
          presence: detail?.state ?? "offline",
          workspaces: (detail?.workspaces ?? []).map((workspace) => ({
            workspace_id: workspace.workspaceId,
            display_name: workspace.displayName,
            state: workspace.state,
          })),
        };
      }),
    );

    return {
      ok: true,
      context: {
        client: {
          id: validated.client.client_id,
          name: validated.client.client_name?.trim()
            || validated.client.client_id,
        },
        requested_scope: grantScopeToOAuthScope(validated.requestedScope),
        requested_access: validated.requestedScope.access,
        requested_shell: validated.requestedScope.shell,
        requested_web: validated.requestedScope.web,
        executors,
      },
    };
  }

  /**
   * Re-validates every OAuth value and the user's live executor ownership
   * before persisting a connection or issuing an authorization code. Write
   * order is connection -> memberships -> code so any mid-sequence failure
   * leaves only an inert connection with no code and no tokens.
   */
  async approve(
    userId: string,
    params: OAuthAuthorizationParams,
    selections: OAuthExecutorSelection[],
    approvedScopeValue: string,
  ): Promise<OAuthApproveResult> {
    const validated = await this.validate(params);
    if (!validated.ok) return validated;

    const approvedScope = parseOAuthGrantScope(approvedScopeValue);
    // The signed-in owner outranks the client's request: the consent screen
    // may grant shell/web families the app never asked for (the dashboard can
    // add them post-consent anyway). Write access is still capped by the
    // request — an app that asked to read should not silently gain writes.
    if (!approvedScope
      || (approvedScope.access === "read_write" && validated.requestedScope.access !== "read_write")) {
      return failure(
        "invalid_scope",
        "Approved scope exceeds the requested scope",
        safeRedirect(validated),
      );
    }

    const uniqueSelections = new Map<string, OAuthExecutorSelection>();
    for (const selection of selections) {
      if (selection.executor_id && selection.workspace_id) {
        uniqueSelections.set(selection.executor_id, selection);
      }
    }
    if (uniqueSelections.size === 0) {
      return failure(
        "invalid_request",
        "At least one machine is required",
        safeRedirect(validated),
      );
    }

    // Live ownership check per selection; scope defaults to the approved
    // scope and is always capped by it.
    const members: Array<{ executor_id: string; workspace_id: string; scope: OAuthConnectionScope }> = [];
    for (const selection of uniqueSelections.values()) {
      const executor = await this.executors.findByExecutorId({
        executor_id: selection.executor_id,
      });
      if (!executor || executor.state !== "active" || executor.owner_user_id !== userId) {
        return failure(
          "invalid_scope",
          "No access to a selected machine",
          safeRedirect(validated),
        );
      }
      members.push({
        executor_id: selection.executor_id,
        workspace_id: selection.workspace_id,
        scope: capScope(approvedScope.access, selection.scope ?? approvedScope.access),
      });
    }

    const connectionId = `ocn_${randomBytes(16).toString("hex")}`;
    const createdAt = this.clock.now().toISOString();
    await this.oauth.createConnection({
      connection_id: connectionId,
      user_id: userId,
      client_id: validated.client.client_id,
      approved_scope: approvedScope.access,
      allow_shell: approvedScope.shell,
      allow_web: approvedScope.web,
      status: "active",
      created_at: createdAt,
      revoked_at: null,
    });
    try {
      for (const member of members) {
        await this.oauth.addConnectionExecutor({
          connection_id: connectionId,
          executor_id: member.executor_id,
          workspace_id: member.workspace_id,
          scope: member.scope,
          added_at: createdAt,
        });
      }
    } catch (error) {
      await this.oauth.revokeConnection({
        connection_id: connectionId,
        revoked_at: this.clock.now().toISOString(),
      }).catch(() => undefined);
      throw error;
    }

    let code: string;
    try {
      code = await this.flow.createAuthorizationCode({
        connectionId,
        clientId: validated.client.client_id,
        redirectUri: validated.params.redirect_uri,
        codeChallenge: validated.params.code_challenge,
        codeChallengeMethod: "S256",
        resource: this.origins.resource,
      });
    } catch (error) {
      await this.oauth.revokeConnection({
        connection_id: connectionId,
        revoked_at: this.clock.now().toISOString(),
      }).catch(() => undefined);
      throw error;
    }

    // New consent supersedes the user's older connections from the same app.
    // Clients re-register a fresh client_id on every connect, so the display
    // name is the durable identity; unnamed clients are never superseded.
    // Best-effort: a failure here must not break the fresh authorization.
    const clientName = validated.client.client_name?.trim();
    if (clientName) {
      const revokedAt = this.clock.now().toISOString();
      const superseded = {
        user_id: userId,
        connection_id: connectionId,
        client_name: clientName,
        revoked_at: revokedAt,
      };
      await this.oauth.revokeSupersededConnectionTokens(superseded).catch(() => undefined);
      await this.oauth.revokeSupersededConnections(superseded).catch(() => undefined);
    }

    return {
      ok: true,
      redirectTo: oauthRedirect(validated.params.redirect_uri, {
        code,
        state: validated.params.state,
        iss: this.origins.issuer,
      }),
    };
  }

  async deny(
    params: OAuthAuthorizationParams,
  ): Promise<OAuthApproveResult> {
    const validated = await this.validate(params);
    if (!validated.ok) return validated;
    return {
      ok: true,
      redirectTo: oauthRedirect(validated.params.redirect_uri, {
        error: "access_denied",
        state: validated.params.state,
        iss: this.origins.issuer,
      }),
    };
  }

  errorRedirect(failureResult: OAuthAuthorizationFailure): string | null {
    if (!failureResult.redirectUri) return null;
    return oauthRedirect(failureResult.redirectUri, {
      error: failureResult.error,
      error_description: failureResult.message,
      state: failureResult.state ?? "",
      iss: this.origins.issuer,
    });
  }
}

function failure(
  error: OAuthAuthorizationError,
  message: string,
  safe?: { redirectUri: string; state: string },
): OAuthAuthorizationFailure {
  return {
    ok: false,
    error,
    message,
    ...(safe ? safe : {}),
  };
}

function safeRedirect(
  validation: OAuthAuthorizationSuccess,
): { redirectUri: string; state: string } {
  return {
    redirectUri: validation.params.redirect_uri,
    state: validation.params.state,
  };
}

function capScope(
  ceiling: OAuthConnectionScope,
  chosen: OAuthConnectionScope,
): OAuthConnectionScope {
  return ceiling === "read_write" && chosen === "read_write"
    ? "read_write"
    : "read";
}

function validRedirectTarget(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function oauthRedirect(
  redirectUri: string,
  values: Record<string, string>,
): string {
  const url = new URL(redirectUri);
  for (const [name, value] of Object.entries(values)) {
    if (value) url.searchParams.set(name, value);
  }
  return url.toString();
}
