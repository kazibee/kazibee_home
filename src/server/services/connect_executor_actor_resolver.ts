import { Component, Inject } from "@noego/ioc";
import type { Request } from "express";
import ConnectSessionAuthService from "./connect_session_auth_service";
import ConnectAuthPolicy from "./connect_auth_policy";
import ConnectExecutorCredentialRepo from "../repo/connect_executor_credential_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import { ConnectCredentials } from "./connect_auth_primitives";

export type ConnectExecutorActor =
  | { role: "browser_session"; userId: string; sessionId: string }
  | { role: "executor_device"; executorId: string; deviceId: string; generation: number };
export type ActorResolution = { ok: true; actor: ConnectExecutorActor } | {
  ok: false; reason: "unauthorized" | "csrf";
};

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
    if (!result.ok) return result;
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
    const credential = await this.credentialRepo.findByTokenHash({
      token_hash: this.credentials.hashToken(token),
    });
    if (!credential || credential.status !== "active") return { ok: false, reason: "unauthorized" };
    const executor = await this.executorRepo.findByExecutorId({ executor_id: credential.executor_id });
    if (!executor || executor.state !== "active"
      || executor.credential_generation !== credential.generation) {
      return { ok: false, reason: "unauthorized" };
    }
    return {
      ok: true,
      actor: {
        role: "executor_device", executorId: executor.executor_id,
        deviceId: executor.device_id, generation: credential.generation,
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

  async verify(token: string | null): Promise<Extract<ActorResolution, { ok: true }> | { ok: false }> {
    const result = await this.resolver.device(token);
    return result.ok && result.actor.role === "executor_device" ? result : { ok: false };
  }
}
