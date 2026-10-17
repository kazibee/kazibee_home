import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectSessionAuthService from "./connect_session_auth_service";
import ConnectAuthPolicy from "./connect_auth_policy";
import ConnectExecutorCredentialRepo from "../repo/connect_executor_credential_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import { repoUnavailable, type RepoFailure, type RepoUnavailable } from "../repo/repo_failure";
import { ConnectCredentials } from "./connect_auth_primitives";

export type ConnectExecutorActor =
  | { role: "browser_session"; userId: string; sessionId: string }
  | { role: "executor_device"; executorId: string; deviceId: string; generation: number; userId?: string };
/**
 * Why an actor was not resolved: the session or credential was refused
 * (`unauthorized`, `csrf`), or the lookup itself failed (`unavailable`,
 * carrying the repository failure for the controller to log and answer 500).
 */
export type ActorDenial = { ok: false; reason: "unauthorized" | "csrf" } | RepoUnavailable;
export type ActorResolution = { ok: true; actor: ConnectExecutorActor } | ActorDenial;

/** Maps a session-auth failure onto the denial controllers already answer. */
export function actorDenial(
  failure: { kind: "unauthorized" } | { kind: "csrf" } | RepoFailure,
): ActorDenial {
  switch (failure.kind) {
    case "unauthorized":
    case "csrf":
      return { ok: false, reason: failure.kind };
    case "query_failed":
    case "write_failed":
      return repoUnavailable(failure);
    default: {
      const unhandled: never = failure;
      return unhandled;
    }
  }
}

@Component()
export default class ConnectExecutorActorResolver {
  constructor(
    @Inject(ConnectSessionAuthService) private readonly sessions: ConnectSessionAuthService,
    @Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectExecutorCredentialRepo) private readonly credentialRepo: ConnectExecutorCredentialRepo,
    @Inject(ConnectExecutorRepo) private readonly executorRepo: ConnectExecutorRepo,
  ) {}

  async browser(req: Request, sessionId: string, mutation: boolean): Promise<ActorResolution> {
    const token = this.cookie(req, this.policy.sessionCookieName);
    const result = mutation
      ? await this.sessions.authorizeMutation(
        token,
        this.cookie(req, this.policy.csrfCookieName),
        typeof req.headers["x-csrf-token"] === "string" ? req.headers["x-csrf-token"] : null,
      )
      : await this.sessions.authenticate(token);
    if (!result.ok) return actorDenial(result.error);
    if (result.value.session.session_id !== sessionId) return { ok: false, reason: "unauthorized" };
    return {
      ok: true,
      actor: {
        role: "browser_session",
        userId: result.value.account.user_id,
        sessionId: result.value.session.session_id,
      },
    };
  }

  async device(token: string | null): Promise<ActorResolution> {
    if (!token) return { ok: false, reason: "unauthorized" };
    const credentialLookup = await this.credentialRepo.findByTokenHash({
      token_hash: this.credentials.hashToken(token),
    });
    if (!credentialLookup.ok) return repoUnavailable(credentialLookup.error);
    const credential = credentialLookup.value;
    if (!credential || credential.status !== "active") return { ok: false, reason: "unauthorized" };
    const executorLookup = await this.executorRepo.findByExecutorId({ executor_id: credential.executor_id });
    if (!executorLookup.ok) return repoUnavailable(executorLookup.error);
    const executor = executorLookup.value;
    if (!executor || executor.state !== "active"
      || executor.credential_generation !== credential.generation) {
      return { ok: false, reason: "unauthorized" };
    }
    return {
      ok: true,
      actor: {
        role: "executor_device", executorId: executor.executor_id,
        deviceId: executor.device_id, generation: credential.generation,
        ...(executor.owner_user_id ? { userId: executor.owner_user_id } : {}),
      },
    };
  }

  private cookie(req: Request, name: string): string | null {
    const cookies: unknown = req.cookies;
    if (typeof cookies !== "object" || cookies === null || Array.isArray(cookies)) return null;
    const value = (cookies as Record<string, unknown>)[name];
    return typeof value === "string" ? value : null;
  }
}

/** Injectable relay-facing verifier; it intentionally exposes no HTTP/controller concerns. */
@Component()
export class ConnectExecutorDeviceAuthVerifier {
  constructor(@Inject(ConnectExecutorActorResolver) private readonly resolver: ConnectExecutorActorResolver) {}

  /**
   * The resolved executor device, `{ ok: false }` when the credential is
   * refused, or the `unavailable` denial when the credential lookup failed.
   */
  async verify(
    token: string | null,
  ): Promise<Extract<ActorResolution, { ok: true }> | { ok: false } | RepoUnavailable> {
    const result = await this.resolver.device(token);
    if (!result.ok && result.reason === "unavailable") return result;
    return result.ok && result.actor.role === "executor_device" ? result : { ok: false };
  }
}
