import { Component, Inject } from "@noego/ioc";
import { createHash } from "node:crypto";
import { currentTransaction } from "sqlstack";
import ConnectExecutorRepo, { type ConnectExecutor } from "../repo/connect_executor_repo";
import ConnectExecutorClaimRepo, { type ConnectExecutorClaim } from "../repo/connect_executor_claim_repo";
import ConnectExecutorCredentialRepo from "../repo/connect_executor_credential_repo";
import ConnectExecutorAuditRepo, { type ConnectExecutorAuditKind } from "../repo/connect_executor_audit_repo";
import { ConnectClock, ConnectCredentials, ConnectIdGenerator, WebsiteLoggerAdapter, type WebsiteLoggerPort } from "./connect_auth_primitives";
import ConnectExecutorPolicy from "./connect_executor_policy";
import type { ClaimCreateInput, ClaimDecisionInput, RenameInput, RevokeInput } from "./connect_executor_request_parser";
import type { ConnectExecutorActor } from "./connect_executor_actor_resolver";
import TraceAdapter, { type TracePort } from "../observability/trace_adapter";
import ConnectExecutorConnectionRegistry, { type ExecutorPresence } from "./connect_executor_connection_registry";
import ConnectWebsiteDeploymentIdentityService from "./connect_website_deployment_identity_service";
import RemoteToolDispatchService from "./remote_tool_dispatch_service";

export interface ClaimChallenge {
  claimId: string; executorId: string; deviceId: string;
  claimUrl: string; shortCode: string; displayName: string;
  platform: string; architecture: string; executorVersion: string;
  keyFingerprint: string; expiresAt: string;
}
export type ClaimCreateResult =
  | { outcome: "created" | "retry"; challenge: ClaimChallenge }
  | { outcome: "conflict" }
  | { outcome: "failed" };
export type ClaimStatusResult =
  | { outcome: "status"; status: "pending" | "denied" | "expired" }
  | {
      outcome: "status"; status: "accepted"; websiteDeploymentId: string;
      executorId: string; deviceId: string; credentialGeneration: number; websiteAccountId: string;
    }
  | { outcome: "unauthorized" }
  | { outcome: "not-found" }
  | { outcome: "failed" };
export type ClaimReviewResult =
  | { outcome: "found"; claim: ConnectExecutorClaim; executor: ConnectExecutor; status: "pending" | "accepted" | "denied" | "expired" }
  | { outcome: "not-found" }
  | { outcome: "failed" };
export type ClaimDecisionResult =
  | { outcome: "accepted"; websiteDeploymentId: string }
  | { outcome: "denied" | "expired" | "replayed" | "not-found" | "failed" };
export type OwnerResult =
  | { outcome: "found"; executor: ConnectExecutor }
  | { outcome: "not-found" }
  | { outcome: "failed" };
export type OwnerMutationResult =
  | { outcome: "renamed" | "revoked"; executor: ConnectExecutor }
  | { outcome: "not-found" }
  | { outcome: "failed" };

@Component()
export default class ConnectExecutorService {
  private readonly logger: WebsiteLoggerPort;
  private readonly trace: TracePort;

  constructor(
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
    @Inject(ConnectExecutorClaimRepo) private readonly claims: ConnectExecutorClaimRepo,
    @Inject(ConnectExecutorCredentialRepo) private readonly credentialsRepo: ConnectExecutorCredentialRepo,
    @Inject(ConnectExecutorAuditRepo) private readonly audit: ConnectExecutorAuditRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectIdGenerator) private readonly ids: ConnectIdGenerator,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectExecutorPolicy) private readonly policy: ConnectExecutorPolicy,
    @Inject(WebsiteLoggerAdapter) loggers: WebsiteLoggerAdapter,
    @Inject(TraceAdapter) traces: TraceAdapter,
    @Inject(ConnectExecutorConnectionRegistry) private readonly connections: ConnectExecutorConnectionRegistry,
    @Inject(ConnectWebsiteDeploymentIdentityService)
    private readonly deploymentIdentity: ConnectWebsiteDeploymentIdentityService,
    @Inject(RemoteToolDispatchService) private readonly dispatchRouting: RemoteToolDispatchService,
  ) {
    this.logger = loggers.forSource("connect-executors");
    this.trace = traces.forSource("ConnectExecutorService");
  }

  async createClaim(input: ClaimCreateInput, token: string): Promise<ClaimCreateResult> {
    const tokenHash = this.credentials.hashToken(token);
    const envelopeHash = this.envelopeHash(input, tokenHash);
    try {
      const existing = await this.claims.findByIdempotencyKey({ idempotency_key: input.idempotencyKey })
        ?? await this.claims.findByClaimId({ claim_id: input.claimId });
      if (existing) {
        const executor = await this.executors.findByExecutorId({ executor_id: existing.executor_id });
        if (!executor || existing.envelope_hash !== envelopeHash || existing.bootstrap_token_hash !== tokenHash
          || existing.claim_id !== input.claimId || existing.executor_id !== input.executorId
          || existing.status !== "pending") return { outcome: "conflict" };
        return { outcome: "retry", challenge: this.challenge(existing, executor, token) };
      }
      const now = this.clock.now();
      const createdAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + this.policy.claimLifetimeMs).toISOString();
      const shortCode = this.shortCode(token, input.claimId);
      // A machine that registered but was never accepted may legitimately
      // restart and claim again: refresh its row and replace the stale
      // pending claim. Owned or revoked executors cannot be re-claimed.
      const registered = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (registered) {
        if (registered.state !== "pending") return { outcome: "conflict" };
        await this.executors.refreshPending({
          executor_id: input.executorId, device_id: input.deviceId, display_name: input.displayName,
          platform: input.platform, architecture: input.architecture,
          executor_version: input.executorVersion, key_fingerprint: input.keyFingerprint,
          updated_at: createdAt, last_seen_at: createdAt,
        });
        await this.claims.deletePendingByExecutorId({ executor_id: input.executorId });
      } else {
        await this.executors.createExecutor({
          executor_id: input.executorId, device_id: input.deviceId, display_name: input.displayName,
          platform: input.platform, architecture: input.architecture,
          executor_version: input.executorVersion, key_fingerprint: input.keyFingerprint,
          created_at: createdAt, updated_at: createdAt, last_seen_at: createdAt,
        });
      }
      await this.claims.createClaim({
        claim_id: input.claimId, executor_id: input.executorId, bootstrap_token_hash: tokenHash,
        short_code_hash: this.hash(shortCode), idempotency_key: input.idempotencyKey,
        envelope_hash: envelopeHash, created_at: createdAt, expires_at: expiresAt,
      });
      await this.appendAudit("claim.created", input.executorId, input.claimId, null, 0, input.correlationId, createdAt);
      this.completed("claim-create", input.correlationId, input.executorId, "created");
      const claim = await this.claims.findByClaimId({ claim_id: input.claimId });
      const executor = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!claim || !executor) throw new Error("Claim persistence invariant failed");
      return { outcome: "created", challenge: this.challenge(claim, executor, token) };
    } catch (error) {
      const uniqueViolation = error instanceof Error
        && (error.message.toLowerCase().includes("unique constraint failed")
          || error.message.toLowerCase().includes("duplicate key value violates unique constraint"));
      if (uniqueViolation) {
        currentTransaction()?.rollbackOnly(error);
        return { outcome: "conflict" };
      }
      this.failed("claim-create", input.correlationId, error);
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Claim creation failed"));
      return { outcome: "failed" };
    }
  }

  async status(claimId: string, token: string | null): Promise<ClaimStatusResult> {
    try {
      const claim = await this.claims.findByClaimId({ claim_id: claimId });
      if (!claim) return { outcome: "not-found" };
      if (!token || !this.credentials.matchesHash(token, claim.bootstrap_token_hash)) {
        return { outcome: "unauthorized" };
      }
      if (claim.status === "accepted") {
        const executor = await this.executors.findByExecutorId({ executor_id: claim.executor_id });
        const credential = await this.credentialsRepo.findByTokenHash({
          token_hash: claim.bootstrap_token_hash,
        });
        if (!executor || executor.state !== "active" || !credential
          || credential.status !== "active"
          || credential.generation !== executor.credential_generation) {
          return { outcome: "unauthorized" };
        }
        if (!executor.owner_user_id) return { outcome: "unauthorized" };
        return {
          outcome: "status",
          status: "accepted",
          websiteDeploymentId: await this.deploymentIdentity.get(),
          executorId: executor.executor_id,
          deviceId: executor.device_id,
          credentialGeneration: credential.generation,
          websiteAccountId: executor.owner_user_id,
        };
      }
      const status = this.claimStatus(claim);
      if (status === "accepted") throw new Error("Accepted claim identity invariant failed");
      return { outcome: "status", status };
    } catch {
      return { outcome: "failed" };
    }
  }

  async review(lookup: { claimId?: string; code?: string }): Promise<ClaimReviewResult> {
    try {
      const claim = lookup.claimId
        ? await this.claims.findByClaimId({ claim_id: lookup.claimId })
        : await this.claims.findByCodeHash({ short_code_hash: this.hash(lookup.code!) });
      if (!claim) return { outcome: "not-found" };
      const executor = await this.executors.findByExecutorId({ executor_id: claim.executor_id });
      return executor
        ? { outcome: "found", claim, executor, status: this.claimStatus(claim) }
        : { outcome: "not-found" };
    } catch {
      return { outcome: "failed" };
    }
  }

  async decide(actor: ConnectExecutorActor, input: ClaimDecisionInput): Promise<ClaimDecisionResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const claim = await this.claims.findByClaimId({ claim_id: input.claimId });
      if (!claim) return { outcome: "not-found" };
      if (claim.status !== "pending") return this.terminalDecision(claim, actor.userId, input);
      const now = this.clock.now().toISOString();
      if (claim.expires_at <= now) return { outcome: "expired" };
      if (input.decision === "deny") return this.denyClaim(claim, actor.userId, input, now);
      return this.acceptClaim(claim, actor.userId, input, now);
    } catch (error) {
      this.failed("claim-decision", input.correlationId, error);
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Claim decision failed"));
      return { outcome: "failed" };
    }
  }

  private async terminalDecision(
    claim: ConnectExecutorClaim, userId: string, input: ClaimDecisionInput,
  ): Promise<ClaimDecisionResult> {
    const expected = input.decision === "accept" ? "accepted" : "denied";
    const idempotent = claim.decided_by_user_id === userId
      && claim.decision_idempotency_key === input.idempotencyKey
      && claim.status === expected;
    if (!idempotent) return { outcome: "replayed" };
    return claim.status === "accepted"
      ? { outcome: "accepted", websiteDeploymentId: await this.deploymentIdentity.get() }
      : { outcome: "denied" };
  }

  private async denyClaim(
    claim: ConnectExecutorClaim, userId: string, input: ClaimDecisionInput, now: string,
  ): Promise<ClaimDecisionResult> {
    await this.claims.denyPending({
      claim_id: claim.claim_id, decided_at: now, decided_by_user_id: userId,
      decision_idempotency_key: input.idempotencyKey,
    });
    const decided = await this.claims.findByClaimId({ claim_id: claim.claim_id });
    if (!decided || decided.status !== "denied" || decided.decided_by_user_id !== userId) {
      return { outcome: "replayed" };
    }
    await this.appendAudit("claim.denied", claim.executor_id, claim.claim_id, userId, 0, input.correlationId, now);
    return { outcome: "denied" };
  }

  private async acceptClaim(
    claim: ConnectExecutorClaim, userId: string, input: ClaimDecisionInput, now: string,
  ): Promise<ClaimDecisionResult> {
      await this.claims.acceptPending({
        claim_id: claim.claim_id, decided_at: now, decided_by_user_id: userId,
        decision_idempotency_key: input.idempotencyKey,
      });
      const decided = await this.claims.findByClaimId({ claim_id: claim.claim_id });
      if (!decided || decided.status !== "accepted" || decided.decided_by_user_id !== userId
        || decided.decision_idempotency_key !== input.idempotencyKey) return { outcome: "replayed" };
      await this.executors.acceptOwner({
        executor_id: claim.executor_id, owner_user_id: userId, claimed_at: now,
      });
      const executor = await this.executors.findByExecutorId({ executor_id: claim.executor_id });
      if (!executor || executor.owner_user_id !== userId || executor.state !== "active"
        || executor.credential_generation !== 1) throw new Error("Claim owner invariant failed");
      await this.credentialsRepo.createCredential({
        credential_id: this.ids.credentialId(), executor_id: executor.executor_id,
        generation: 1, token_hash: claim.bootstrap_token_hash, created_at: now,
      });
      await this.appendAudit("claim.accepted", executor.executor_id, claim.claim_id, userId, 1, input.correlationId, now);
      return {
        outcome: "accepted",
        websiteDeploymentId: await this.deploymentIdentity.get(),
      };
  }

  async list(actor: ConnectExecutorActor): Promise<ConnectExecutor[]> {
    return actor.role === "browser_session"
      ? this.executors.listByOwner({ owner_user_id: actor.userId, limit: this.policy.ownerListLimit })
      : [];
  }

  async presence(executorId: string): Promise<ExecutorPresence> {
    // Channels terminate at the ExecutorCoordinator (Durable Object on
    // workers, dev coordinator under node dev), so live presence comes from
    // there; the in-process registry only answers when no coordinator
    // routing exists.
    const routed = await this.dispatchRouting.presence(executorId);
    return routed ?? this.connections.presence(executorId);
  }

  async detail(actor: ConnectExecutorActor, executorId: string): Promise<OwnerResult> {
    try {
      const executor = await this.executors.findByExecutorId({ executor_id: executorId });
      return actor.role === "browser_session" && executor?.owner_user_id === actor.userId
        ? { outcome: "found", executor } : { outcome: "not-found" };
    } catch {
      return { outcome: "failed" };
    }
  }

  async rename(actor: ConnectExecutorActor, input: RenameInput): Promise<OwnerMutationResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const before = await this.detail(actor, input.executorId);
      if (before.outcome !== "found" || before.executor.state !== "active") return { outcome: "not-found" };
      const now = this.clock.now().toISOString();
      await this.executors.renameOwned({
        executor_id: input.executorId, owner_user_id: actor.userId,
        display_name: input.displayName, updated_at: now,
      });
      const after = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!after || after.owner_user_id !== actor.userId || after.display_name !== input.displayName) {
        return { outcome: "not-found" };
      }
      await this.appendAudit("executor.renamed", after.executor_id, null, actor.userId,
        after.credential_generation, input.correlationId, now);
      return { outcome: "renamed", executor: after };
    } catch (error) {
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Rename failed"));
      return { outcome: "failed" };
    }
  }

  async revoke(actor: ConnectExecutorActor, input: RevokeInput): Promise<OwnerMutationResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const before = await this.detail(actor, input.executorId);
      if (before.outcome !== "found") return { outcome: "not-found" };
      if (before.executor.state === "revoked") return { outcome: "revoked", executor: before.executor };
      const now = this.clock.now().toISOString();
      await this.executors.revokeOwned({
        executor_id: input.executorId, owner_user_id: actor.userId, updated_at: now,
      });
      await this.credentialsRepo.revokeForExecutor({ executor_id: input.executorId, revoked_at: now });
      const after = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!after || after.owner_user_id !== actor.userId || after.state !== "revoked"
        || after.credential_generation !== before.executor.credential_generation + 1) {
        throw new Error("Credential fence invariant failed");
      }
      await this.appendAudit("executor.revoked", after.executor_id, null, actor.userId,
        after.credential_generation, input.correlationId, now);
      this.connections.revoke(after.executor_id, input.correlationId);
      return { outcome: "revoked", executor: after };
    } catch (error) {
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Revoke failed"));
      return { outcome: "failed" };
    }
  }

  private claimStatus(claim: ConnectExecutorClaim): "pending" | "accepted" | "denied" | "expired" {
    return claim.status === "pending" && claim.expires_at <= this.clock.now().toISOString()
      ? "expired" : claim.status;
  }
  private challenge(
    claim: ConnectExecutorClaim,
    executor: ConnectExecutor,
    bootstrapToken: string,
  ): ClaimChallenge {
    return {
      claimId: claim.claim_id, executorId: executor.executor_id, deviceId: executor.device_id,
      claimUrl: `${this.policy.claimBaseUrl}/claim/${claim.claim_id}`,
      shortCode: this.shortCode(bootstrapToken, claim.claim_id),
      displayName: executor.display_name, platform: executor.platform,
      architecture: executor.architecture, executorVersion: executor.executor_version,
      keyFingerprint: executor.key_fingerprint, expiresAt: claim.expires_at,
    };
  }
  private shortCode(bootstrapToken: string, claimId: string): string {
    const digest = createHash("sha256")
      .update(`kazi-claim-code-v1:${bootstrapToken}:${claimId}`)
      .digest();
    const letters = Array.from(digest.subarray(0, 8), (byte) => String.fromCharCode(65 + (byte % 26))).join("");
    return `${letters.slice(0, 4)}-${letters.slice(4)}`;
  }
  private envelopeHash(input: ClaimCreateInput, tokenHash: string): string {
    return this.hash(JSON.stringify([
      input.kind, input.protocolVersion, input.claimId, input.executorId, input.deviceId,
      input.actorRole, input.displayName, input.platform, input.architecture,
      input.executorVersion, input.keyFingerprint, input.idempotencyKey, tokenHash,
    ]));
  }
  private hash(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }
  private appendAudit(
    event_kind: ConnectExecutorAuditKind, executor_id: string, claim_id: string | null,
    actor_user_id: string | null, credential_generation: number,
    correlation_id: string, occurred_at: string,
  ): Promise<void> {
    return this.audit.appendEvent({
      audit_event_id: this.ids.auditEventId(), executor_id, claim_id, actor_user_id,
      event_kind, credential_generation, occurred_at, correlation_id,
    });
  }
  private completed(action: string, correlationId: string, executorId: string, outcome: string): void {
    const context = { route: "/v1/connect/executors", action, correlationId, executorId, outcome, count: 1 };
    this.logger.info("connect.executors.completed", context);
    this.trace.info("completed", context);
  }
  private failed(action: string, correlationId: string, error: unknown): void {
    const context = { route: "/v1/connect/executors", action, correlationId, outcome: "failed",
      errorType: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
      errorCause: error instanceof Error && error.cause instanceof Error
        ? `${error.cause.name}: ${error.cause.message.slice(0, 300)}`
        : undefined };
    this.logger.error("connect.executors.failed", context);
    this.trace.error("failed", context);
  }
}
