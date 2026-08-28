import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectExecutorLogic from "../logic/connect_executor.logic";
import ConnectExecutorRequestParser from "../services/connect_executor_request_parser";
import ConnectExecutorActorResolver, { type ConnectExecutorActor } from "../services/connect_executor_actor_resolver";
import type { ConnectExecutor } from "../repo/connect_executor_repo";

type Context = { req: Request; res: Response };
const PROTOCOL = "1.0";

@Component()
export default class ConnectExecutorController {
  constructor(
    @Inject(ConnectExecutorLogic) private readonly logic: ConnectExecutorLogic,
    @Inject(ConnectExecutorRequestParser) private readonly parser: ConnectExecutorRequestParser,
    @Inject(ConnectExecutorActorResolver) private readonly actors: ConnectExecutorActorResolver,
  ) {}

  async createClaim({ req, res }: Context) {
    const input = this.parser.claimCreate(req.body);
    if (!input.ok) return this.parseError(res, input);
    const token = this.parser.bootstrapToken(req);
    if (!token) return this.error(res, 401, "revoked", "Authentication failed", input.value.correlationId);
    const actor: ConnectExecutorActor = {
      role: "executor_device", executorId: input.value.executorId,
      deviceId: input.value.deviceId, generation: 0,
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
      kind: "executor.claim.challenge", protocolVersion: PROTOCOL,
      claimId: result.challenge.claimId, executorId: result.challenge.executorId,
      deviceId: result.challenge.deviceId, actorRole: "claim_challenge",
      claimUrl: result.challenge.claimUrl, shortCode: result.challenge.shortCode,
      displayName: result.challenge.displayName, platform: result.challenge.platform,
      architecture: result.challenge.architecture, executorVersion: result.challenge.executorVersion,
      keyFingerprint: result.challenge.keyFingerprint, expiresAt: result.challenge.expiresAt,
      correlationId: input.value.correlationId,
    });
  }

  async claimStatus({ req, res }: Context) {
    const claimId = this.parser.lookup(req.params.claimId);
    const correlationId = this.parser.correlation(req);
    if (!claimId?.claimId) return this.error(res, 400, "invalid-envelope", "Invalid request envelope", correlationId);
    const token = this.parser.bootstrapToken(req);
    const actor: ConnectExecutorActor = {
      role: "executor_device", executorId: "exe_unclaimed0", deviceId: "dev_unclaimed0", generation: 0,
    };
    const result = await this.logic.claimStatus(actor, claimId.claimId, token);
    if (result.outcome === "unauthorized") return this.error(res, 401, "revoked", "Authentication failed", correlationId);
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Claim not found", correlationId);
    if (result.outcome === "failed") return this.internal(res, correlationId);
    const response: Record<string, unknown> = {
      kind: "executor.claim.status.response", protocolVersion: PROTOCOL,
      claimId: claimId.claimId, status: result.status, correlationId,
    };
    if (result.status === "accepted") {
      response.websiteDeploymentId = result.websiteDeploymentId;
    }
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
      kind: "executor.claim.review.response", protocolVersion: PROTOCOL,
      claimId: result.claim.claim_id, status: result.status,
      displayName: result.executor.display_name, platform: result.executor.platform,
      architecture: result.executor.architecture, executorVersion: result.executor.executor_version,
      keyFingerprint: result.executor.key_fingerprint, expiresAt: result.claim.expires_at,
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
      kind: "executor.claim.decision.response", protocolVersion: PROTOCOL,
      claimId: input.value.claimId, status: result.outcome, correlationId: input.value.correlationId,
    };
    if (result.outcome === "accepted") {
      response.websiteDeploymentId = result.websiteDeploymentId;
    }
    return res.json(response);
  }

  async list({ req, res }: Context) {
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    const actor = await this.actors.browser(req, query.value.sessionId, false);
    if (!actor.ok) return this.authError(res, actor.reason, query.value.correlationId);
    const executors = await this.logic.list(actor.actor);
    return res.json({
      kind: "executor.list.response", protocolVersion: PROTOCOL,
      executors: executors.map((executor) => this.summary(executor)),
      correlationId: query.value.correlationId,
    });
  }

  async detail({ req, res }: Context) {
    const query = this.parser.browserQuery(req);
    if (!query.ok) return this.parseError(res, query);
    const actor = await this.actors.browser(req, query.value.sessionId, false);
    if (!actor.ok) return this.authError(res, actor.reason, query.value.correlationId);
    const executorId = typeof req.params.executorId === "string" ? req.params.executorId : "";
    const result = await this.logic.detail(actor.actor, executorId);
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Executor not found", query.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, query.value.correlationId);
    return res.json({
      kind: "executor.detail.response", protocolVersion: PROTOCOL,
      executor: this.summary(result.executor), deviceId: result.executor.device_id,
      actorRole: "executor_device", lastSeenAt: result.executor.last_seen_at,
      correlationId: query.value.correlationId,
    });
  }

  async rename({ req, res }: Context) {
    const input = this.parser.rename(req.body, req.params.executorId);
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
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Executor not found", input.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.json({
      kind: "executor.detail.response", protocolVersion: PROTOCOL,
      executor: this.summary(result.executor), deviceId: result.executor.device_id,
      actorRole: "executor_device", lastSeenAt: result.executor.last_seen_at,
      correlationId: input.value.correlationId,
    });
  }

  async revoke({ req, res }: Context) {
    const input = this.parser.revoke(req.body, req.params.executorId);
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
    if (result.outcome === "not-found") return this.error(res, 404, "invalid-envelope", "Executor not found", input.value.correlationId);
    if (result.outcome === "failed") return this.internal(res, input.value.correlationId);
    return res.json({
      kind: "executor.action.response", protocolVersion: PROTOCOL,
      executorId: input.value.executorId, state: "revoked", correlationId: input.value.correlationId,
    });
  }

  private summary(executor: ConnectExecutor) {
    const presence = this.logic.presence(executor.executor_id);
    return {
      executorId: executor.executor_id, displayName: executor.display_name,
      state: executor.state, online: presence === "online", presence, protocolVersion: PROTOCOL,
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
