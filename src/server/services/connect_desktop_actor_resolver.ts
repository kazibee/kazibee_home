import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request } from "@noego/dinner";
import ConnectSessionAuthService from "./connect_session_auth_service";
import ConnectAuthPolicy from "./connect_auth_policy";
import ConnectDesktopCredentialRepo from "../repo/connect_desktop_credential_repo";
import ConnectDesktopDeviceRepo from "../repo/connect_desktop_device_repo";
import { ConnectClock, ConnectCredentials } from "./connect_auth_primitives";
import ConnectDesktopRequestParser from "./connect_desktop_request_parser";

export type ConnectDesktopActor =
  | { role: "browser_session"; userId: string; sessionId: string }
  | { role: "desktop_device"; deviceId: string; generation: number };
export type DesktopRelayActor = Extract<ConnectDesktopActor, { role: "desktop_device" }> & {
  ownerUserId: string;
  protocolVersion: "1.0"; audience: "desktop-relay"; credentialState: "active"; expiresAt: string;
};
export type ActorResolution = { ok: true; actor: ConnectDesktopActor } | {
  ok: false; reason: "unauthorized" | "csrf";
};

@Component()
export default class ConnectDesktopActorResolver {
  constructor(
    @Inject(ConnectSessionAuthService) private readonly sessions: ConnectSessionAuthService,
    @Inject(ConnectAuthPolicy) private readonly policy: ConnectAuthPolicy,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectDesktopCredentialRepo) private readonly credentialRepo: ConnectDesktopCredentialRepo,
    @Inject(ConnectDesktopDeviceRepo) private readonly deviceRepo: ConnectDesktopDeviceRepo,
    @Inject(ConnectDesktopRequestParser) private readonly parser: ConnectDesktopRequestParser,
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
    return { ok: true, actor: { role: "browser_session",
      userId: result.value.account.user_id, sessionId: result.value.session.session_id } };
  }

  async relay(req: Request): Promise<{ ok: true; actor: DesktopRelayActor } | { ok: false }> {
    const headers = this.parser.relayHeaders(req);
    if (!headers) return { ok: false };
    const credential = await this.credentialRepo.findByTokenHash({
      token_hash: this.credentials.hashToken(headers.token),
    });
    if (!credential || credential.status !== "active"
      || credential.audience !== headers.audience
      || credential.device_id !== headers.deviceId
      || credential.generation !== headers.generation
      || new Date(credential.expires_at).getTime() <= this.clock.now().getTime()) return { ok: false };
    const device = await this.deviceRepo.findByDeviceId({ device_id: headers.deviceId });
    if (!device || device.owner_user_id === null || device.state !== "active"
      || device.credential_generation !== headers.generation) return { ok: false };
    return { ok: true, actor: {
      role: "desktop_device", deviceId: device.device_id, generation: credential.generation,
      ownerUserId: device.owner_user_id,
      protocolVersion: headers.protocolVersion, audience: headers.audience,
      credentialState: "active", expiresAt: credential.expires_at,
    } };
  }

  private cookie(req: Request, name: string): string | null {
    const cookies: unknown = req.cookies;
    if (typeof cookies !== "object" || cookies === null || Array.isArray(cookies)) return null;
    const value = (cookies as Record<string, unknown>)[name];
    return typeof value === "string" ? value : null;
  }
}

/** Strict reusable Desktop relay admission boundary; no relay command endpoints are added here. */
@Component()
export class ConnectDesktopRelayActorResolver {
  constructor(@Inject(ConnectDesktopActorResolver) private readonly resolver: ConnectDesktopActorResolver) {}
  resolve(req: Request) {
    return this.resolver.relay(req);
  }
}
