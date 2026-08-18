import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectDesktopLogic from "../logic/connect_desktop.logic";
import ConnectDesktopRequestParser from "../services/connect_desktop_request_parser";
import ConnectDesktopActorResolver, { type ConnectDesktopActor } from "../services/connect_desktop_actor_resolver";
import type { ConnectDesktopDevice } from "../repo/connect_desktop_device_repo";

type Context = { req: Request; res: Response };
const PROTOCOL = "1.0";

@Component()
export default class ConnectDesktopController {
  constructor(
    @Inject(ConnectDesktopLogic) private readonly logic: ConnectDesktopLogic,
    @Inject(ConnectDesktopRequestParser) private readonly parser: ConnectDesktopRequestParser,
    @Inject(ConnectDesktopActorResolver) private readonly actors: ConnectDesktopActorResolver,
  ) {}

  async createClaim({ req, res }: Context) {
    const input = this.parser.claimCreate(req.body);
    if (!input.ok) return this.parseError(res, input);
    const token = this.parser.bootstrapToken(req);
    if (!token) return this.error(res, 401, "revoked", "Authentication failed", input.value.correlationId);
    const actor: ConnectDesktopActor = {
      role: "desktop_device", deviceId: input.value.deviceId, generation: 0,
    };
    let result;
    try {
      result = await this.logic.createClaim(actor, input.value, token);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique constraint failed")) {
        return this.error(res, 409, "idempotency-conflict", "Claim conflicts with an existing request", input.value.correlationId);
      }
      return this.internal(res, input.value.correlationId);
    }
    if (result.outcome === "conflict") return this.error(res, 409, "idempotency-conflict", "Claim conflicts with an existing request", input.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.status(result.outcome === "created" ? 201 : 200).json({
      kind: "desktop.claim.challenge", protocolVersion: PROTOCOL,
      claimId: result.challenge.claimId, actorRole: "claim_challenge",
      claimUrl: result.challenge.claimUrl, shortCode: result.challenge.shortCode,
      deviceId: input.value.deviceId,
      displayName: result.challenge.displayName, platform: result.challenge.platform,
      architecture: result.challenge.architecture, desktopVersion: result.challenge.desktopVersion,
      keyFingerprint: result.challenge.keyFingerprint, expiresAt: result.challenge.expiresAt,
      correlationId: input.value.correlationId,
    });
  }

  async claimStatus({ req, res }: Context) {
    const claimId = this.parser.lookup(req.params.claimId);
    const correlationId = this.parser.correlation(req);
    if (!claimId?.claimId) return this.error(res, 400, "invalid-envelope", "Invalid request envelope", correlationId);
    const token = this.parser.bootstrapToken(req);
    const actor: ConnectDesktopActor = {
      role: "desktop_device", deviceId: "dev_unclaimed0", generation: 0,
    };
    const result = await this.logic.claimStatus(actor, claimId.claimId, token);
    if (result.outcome === "unauthorized") return this.error(res, 401, "revoked", "Authentication failed", correlationId);
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Claim not found", correlationId);
    if (result.outcome === "failed") return this.internal(res, correlationId);
    const response: Record<string, unknown> = {
      kind: "desktop.claim.status.response", protocolVersion: PROTOCOL,
      claimId: claimId.claimId, status: result.status, correlationId,
    };
    if (result.status === "accepted") Object.assign(response, {
      deviceId: result.deviceId, actorRole: "desktop_device",
      credentialAudience: "desktop-relay", credentialGeneration: 1,
      credentialExpiresAt: result.credentialExpiresAt,
      websiteAccountId: result.websiteAccountId,
      websiteDeploymentId: result.websiteDeploymentId,
    });
    return res.json(response);
  }

  async reviewClaim({ req, res }: Context) {
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    const lookup = this.parser.lookup(req.params.lookup);
    if (!lookup) return this.error(res, 400, "invalid-envelope", "Invalid request envelope", query.value.correlationId);
    const actor = await this.actors.browser(req, query.value.sessionId, false);
    if (!actor.ok) return this.authError(res, actor.reason, query.value.correlationId);
    const result = await this.logic.review(actor.actor, lookup);
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Claim not found", query.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, query.value.correlationId);
    return res.json({
      kind: "desktop.claim.review.response", protocolVersion: PROTOCOL,
      claimId: result.claim.claim_id, status: result.status,
      displayName: result.device.display_name, platform: result.device.platform,
      architecture: result.device.architecture, desktopVersion: result.device.desktop_version,
      keyFingerprint: result.device.key_fingerprint, expiresAt: result.claim.expires_at,
      correlationId: query.value.correlationId,
    });
  }

  async decideClaim({ req, res }: Context) {
    const input = this.parser.decision(req.body, req.params.claimId);
    if (!input.ok) return this.parseError(res, input);
    const actor = await this.actors.browser(req, input.value.sessionId, true);
    if (!actor.ok) return this.authError(res, actor.reason, input.value.correlationId);
    let result;
    try {
      result = await this.logic.decide(actor.actor, input.value);
    } catch {
      return this.internal(res, input.value.correlationId);
    }
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Claim not found", input.value.correlationId);
    if (result.outcome === "expired" || result.outcome === "replayed") {
      return this.error(res, 409, "revoked", "Claim is no longer actionable", input.value.correlationId);
    }
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    const response: Record<string, unknown> = {
      kind: "desktop.claim.decision.response", protocolVersion: PROTOCOL,
      claimId: input.value.claimId, status: result.outcome, correlationId: input.value.correlationId,
    };
    if (result.outcome === "accepted") Object.assign(response, {
      deviceId: result.deviceId, actorRole: "desktop_device",
      credentialAudience: "desktop-relay", credentialGeneration: 1,
      credentialExpiresAt: result.credentialExpiresAt,
      websiteAccountId: result.websiteAccountId,
      websiteDeploymentId: result.websiteDeploymentId,
    });
    return res.json(response);
  }

  async list({ req, res }: Context) {
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    const actor = await this.actors.browser(req, query.value.sessionId, false);
    if (!actor.ok) return this.authError(res, actor.reason, query.value.correlationId);
    const devices = await this.logic.list(actor.actor);
    return res.json({
      kind: "desktop.list.response", protocolVersion: PROTOCOL,
      devices: devices.map((device) => this.summary(device)),
      correlationId: query.value.correlationId,
    });
  }

  async detail({ req, res }: Context) {
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    const actor = await this.actors.browser(req, query.value.sessionId, false);
    if (!actor.ok) return this.authError(res, actor.reason, query.value.correlationId);
    const deviceId = typeof req.params.deviceId === "string" ? req.params.deviceId : "";
    const result = await this.logic.detail(actor.actor, deviceId);
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Desktop not found", query.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, query.value.correlationId);
    return res.json({
      kind: "desktop.detail.response", protocolVersion: PROTOCOL,
      device: this.summary(result.device), deviceId: result.device.device_id,
      actorRole: "desktop_device", lastSeenAt: result.device.last_seen_at,
      correlationId: query.value.correlationId,
    });
  }

  async rename({ req, res }: Context) {
    const input = this.parser.rename(req.body, req.params.deviceId);
    if (!input.ok) return this.parseError(res, input);
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    if (query.value.correlationId !== input.value.correlationId) {
      return this.error(res, 400, "invalid-envelope", "Invalid request envelope", input.value.correlationId);
    }
    const actor = await this.actors.browser(req, query.value.sessionId, true);
    if (!actor.ok) return this.authError(res, actor.reason, input.value.correlationId);
    let result;
    try {
      result = await this.logic.rename(actor.actor, input.value);
    } catch {
      return this.internal(res, input.value.correlationId);
    }
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Desktop not found", input.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.json({
      kind: "desktop.detail.response", protocolVersion: PROTOCOL,
      device: this.summary(result.device), deviceId: result.device.device_id,
      actorRole: "desktop_device", lastSeenAt: result.device.last_seen_at,
      correlationId: input.value.correlationId,
    });
  }

  async revoke({ req, res }: Context) {
    const input = this.parser.revoke(req.body, req.params.deviceId);
    if (!input.ok) return this.parseError(res, input);
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    if (query.value.correlationId !== input.value.correlationId) {
      return this.error(res, 400, "invalid-envelope", "Invalid request envelope", input.value.correlationId);
    }
    const actor = await this.actors.browser(req, query.value.sessionId, true);
    if (!actor.ok) return this.authError(res, actor.reason, input.value.correlationId);
    let result;
    try {
      result = await this.logic.revoke(actor.actor, input.value);
    } catch {
      return this.internal(res, input.value.correlationId);
    }
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Desktop not found", input.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.json({
      kind: "desktop.action.response", protocolVersion: PROTOCOL,
      deviceId: input.value.deviceId, state: "revoked", correlationId: input.value.correlationId,
    });
  }

  private summary(device: ConnectDesktopDevice) {
    return {
      deviceId: device.device_id, displayName: device.display_name,
      state: device.state, protocolVersion: PROTOCOL,
    };
  }
  private parseError(res: Response, result: { reason: "invalid-envelope" | "protocol-version-mismatch"; correlationId: string }) {
    return this.error(res, result.reason === "protocol-version-mismatch" ? 409 : 400,
      result.reason, result.reason === "protocol-version-mismatch" ? "Protocol version mismatch" : "Invalid request envelope",
      result.correlationId);
  }
  private authError(res: Response, reason: "unauthorized" | "csrf", correlationId: string) {
    return this.error(res, reason === "csrf" ? 403 : 401,
      reason === "csrf" ? "invalid-envelope" : "revoked",
      reason === "csrf" ? "CSRF validation failed" : "Session is not active", correlationId);
  }
  private internal(res: Response, correlationId: string) {
    return this.error(res, 500, "invalid-envelope", "Internal server error", correlationId);
  }
  private error(res: Response, status: number,
    code: "invalid-envelope" | "protocol-version-mismatch" | "idempotency-conflict" | "revoked",
    message: string, correlationId: string) {
    return res.status(status).json({
      kind: "error", protocolVersion: PROTOCOL, code, message, retryable: false, correlationId,
    });
  }
}
