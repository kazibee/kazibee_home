import { randomBytes } from "node:crypto";
import { Component, Inject, LoadAs } from "@noego/ioc";
import RemoteToolGrantRepo, { type RemoteToolGrant } from "../repo/remote_tool_grant_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import { ConnectCredentials } from "./connect_auth_primitives";

const SCOPE_NAMES = new Set([
  "workspace.read",
  "workspace.write",
  "shell.execute",
  "sandbox.execute",
  "web.read",
  "browser.fetch",
]);

/** Scope dependency closure (doc 06 §3): rejected, never silently repaired. */
const SCOPE_DEPENDENCIES: Record<string, string> = {
  "workspace.write": "workspace.read",
  "shell.execute": "workspace.read",
  "sandbox.execute": "workspace.read",
  "browser.fetch": "web.read",
};

export type CreateGrantResult =
  | { ok: true; grant: RemoteToolGrant; token: string }
  | { ok: false; reason: "invalid_scopes" | "executor_not_owned" | "invalid_workspace" };

/**
 * PAT-style remote tool grants for the demo path: the signed-in owner mints a
 * bearer that binds one executor + one workspace + one scope set. The raw
 * token is returned exactly once and stored as a hash. Full OAuth
 * (discovery/PKCE/refresh, doc 01) layers on top later; this table is the
 * grant substrate either way.
 */
@Component({ scope: LoadAs.Singleton })
export default class RemoteToolGrantService {
  constructor(
    @Inject(RemoteToolGrantRepo) private readonly grants: RemoteToolGrantRepo,
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
  ) {}

  async create(input: {
    ownerUserId: string;
    executorId: string;
    workspaceId: string;
    scopes: string[];
  }): Promise<CreateGrantResult> {
    const scopes = [...new Set(input.scopes)].sort();
    if (scopes.length === 0 || !scopes.every((scope) => SCOPE_NAMES.has(scope))) {
      return { ok: false, reason: "invalid_scopes" };
    }
    for (const scope of scopes) {
      const dependency = SCOPE_DEPENDENCIES[scope];
      if (dependency && !scopes.includes(dependency)) {
        return { ok: false, reason: "invalid_scopes" };
      }
    }
    if (!/^wrk_[A-Za-z0-9]{8,64}$/.test(input.workspaceId)) {
      return { ok: false, reason: "invalid_workspace" };
    }

    const executor = await this.executors.findByExecutorId({ executor_id: input.executorId });
    if (!executor || executor.state !== "active" || executor.owner_user_id !== input.ownerUserId) {
      return { ok: false, reason: "executor_not_owned" };
    }

    const token = this.credentials.randomToken();
    const grantId = `rtg_${randomBytes(16).toString("hex")}`;
    await this.grants.createGrant({
      grant_id: grantId,
      owner_user_id: input.ownerUserId,
      executor_id: input.executorId,
      workspace_id: input.workspaceId,
      scopes: JSON.stringify(scopes),
      token_hash: this.credentials.hashToken(token),
      created_at: new Date().toISOString(),
      expires_at: null,
    });
    const grant = await this.grants.findByTokenHash({
      token_hash: this.credentials.hashToken(token),
    });
    if (!grant) throw new Error("Grant row was not persisted.");
    return { ok: true, grant, token };
  }

  /** Bearer -> active grant, or null. Never says why it failed. */
  async authenticate(bearer: string | null): Promise<RemoteToolGrant | null> {
    if (!bearer || !/^[A-Za-z0-9_-]{43}$/.test(bearer)) return null;
    const grant = await this.grants.findByTokenHash({
      token_hash: this.credentials.hashToken(bearer),
    });
    if (!grant || grant.state !== "active") return null;
    if (grant.expires_at && Date.parse(grant.expires_at) <= Date.now()) return null;
    await this.grants.touchLastUsed({
      grant_id: grant.grant_id,
      last_used_at: new Date().toISOString(),
    });
    return grant;
  }

  list(ownerUserId: string): Promise<RemoteToolGrant[]> {
    return this.grants.listByOwner({ owner_user_id: ownerUserId });
  }

  async revoke(ownerUserId: string, grantId: string): Promise<void> {
    await this.grants.revokeGrant({
      grant_id: grantId,
      owner_user_id: ownerUserId,
      revoked_at: new Date().toISOString(),
    });
  }
}
