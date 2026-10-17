import { Component, Inject, LoadAs } from "@noego/ioc";
import { createHash } from "node:crypto";
import { Result } from "@noego/trust";
import { currentAppTransaction } from "../repo/current_transaction";
import ConnectExecutorRepo, { type ConnectExecutor } from "../repo/connect_executor_repo";
import ConnectExecutorClaimRepo, { type ConnectExecutorClaim } from "../repo/connect_executor_claim_repo";
import ConnectExecutorCredentialRepo from "../repo/connect_executor_credential_repo";
import ConnectExecutorAuditRepo, { type ConnectExecutorAuditKind } from "../repo/connect_executor_audit_repo";
import type { RepoFailure } from "../repo/repo_failure";
import { ConnectClock, ConnectCredentials, ConnectIdGenerator, WebsiteLoggerAdapter, type WebsiteLoggerPort } from "./connect_auth_primitives";
import ConnectExecutorPolicy from "./connect_executor_policy";
import type { ClaimCreateInput, ClaimDecisionInput, RenameInput, RevokeInput } from "./connect_executor_request_parser";
import type { ConnectExecutorActor } from "./connect_executor_actor_resolver";
import TraceAdapter, { type TracePort } from "../observability/trace_adapter";
import ConnectExecutorConnectionRegistry, { type ExecutorPresence } from "./connect_executor_connection_registry";
import ConnectWebsiteDeploymentIdentityService, {
  type DeploymentIdentityFailure,
} from "./connect_website_deployment_identity_service";
import RemoteToolDispatchService from "./remote_tool_dispatch_service";
import ConnectClientRelayService from "./connect_client_relay_service";

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

/**
 * Executor claim and ownership flows. Repository failures are decided here,
 * into each flow's existing `failed` outcome (or `conflict` for a unique
 * violation while creating a claim), with the same logging and rollback-only
 * marking a thrown error gets in that flow.
 */
@Component({ scope: LoadAs.Singleton })
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
    @Inject(ConnectClientRelayService) private readonly clientRelay: ConnectClientRelayService,
  ) {
    this.logger = loggers.forSource("connect-executors");
    this.trace = traces.forSource("ConnectExecutorService");
  }

  async createClaim(input: ClaimCreateInput, token: string): Promise<ClaimCreateResult> {
    const tokenHash = this.credentials.hashToken(token);
    const envelopeHash = this.envelopeHash(input, tokenHash);
    try {
      const byIdempotencyKey = await this.claims.findByIdempotencyKey({ idempotency_key: input.idempotencyKey });
      if (!byIdempotencyKey.ok) return this.createFailed(input, byIdempotencyKey.error);
      let existing = byIdempotencyKey.value;
      if (!existing) {
        const byClaimId = await this.claims.findByClaimId({ claim_id: input.claimId });
        if (!byClaimId.ok) return this.createFailed(input, byClaimId.error);
        existing = byClaimId.value;
      }
      if (existing) {
        const existingExecutor = await this.executors.findByExecutorId({ executor_id: existing.executor_id });
        if (!existingExecutor.ok) return this.createFailed(input, existingExecutor.error);
        const executor = existingExecutor.value;
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
      const registeredLookup = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!registeredLookup.ok) return this.createFailed(input, registeredLookup.error);
      const registered = registeredLookup.value;
      if (registered) {
        if (registered.state !== "pending") return { outcome: "conflict" };
        const refreshed = await this.executors.refreshPending({
          executor_id: input.executorId, device_id: input.deviceId, display_name: input.displayName,
          platform: input.platform, architecture: input.architecture,
          executor_version: input.executorVersion, key_fingerprint: input.keyFingerprint,
          updated_at: createdAt, last_seen_at: createdAt,
        });
        if (!refreshed.ok) return this.createFailed(input, refreshed.error);
        const replaced = await this.claims.deletePendingByExecutorId({ executor_id: input.executorId });
        if (!replaced.ok) return this.createFailed(input, replaced.error);
      } else {
        const created = await this.executors.createExecutor({
          executor_id: input.executorId, device_id: input.deviceId, display_name: input.displayName,
          platform: input.platform, architecture: input.architecture,
          executor_version: input.executorVersion, key_fingerprint: input.keyFingerprint,
          created_at: createdAt, updated_at: createdAt, last_seen_at: createdAt,
        });
        if (!created.ok) return this.createFailed(input, created.error);
      }
      const claimCreated = await this.claims.createClaim({
        claim_id: input.claimId, executor_id: input.executorId, bootstrap_token_hash: tokenHash,
        short_code_hash: this.hash(shortCode), idempotency_key: input.idempotencyKey,
        envelope_hash: envelopeHash, created_at: createdAt, expires_at: expiresAt,
      });
      if (!claimCreated.ok) return this.createFailed(input, claimCreated.error);
      const audited = await this.appendAudit("claim.created", input.executorId, input.claimId, null, 0, input.correlationId, createdAt);
      if (!audited.ok) return this.createFailed(input, audited.error);
      this.completed("claim-create", input.correlationId, input.executorId, "created");
      const claimLookup = await this.claims.findByClaimId({ claim_id: input.claimId });
      if (!claimLookup.ok) return this.createFailed(input, claimLookup.error);
      const executorLookup = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!executorLookup.ok) return this.createFailed(input, executorLookup.error);
      const claim = claimLookup.value;
      const executor = executorLookup.value;
      if (!claim || !executor) throw new Error("Claim persistence invariant failed");
      return { outcome: "created", challenge: this.challenge(claim, executor, token) };
    } catch (error) {
      return this.claimCreateError(input, error);
    }
  }

  async status(claimId: string, token: string | null): Promise<ClaimStatusResult> {
    try {
      const claimLookup = await this.claims.findByClaimId({ claim_id: claimId });
      if (!claimLookup.ok) return this.lookupFailed("claim-status", claimLookup.error);
      const claim = claimLookup.value;
      if (!claim) return { outcome: "not-found" };
      if (!token || !this.credentials.matchesHash(token, claim.bootstrap_token_hash)) {
        return { outcome: "unauthorized" };
      }
      if (claim.status === "accepted") {
        const executorLookup = await this.executors.findByExecutorId({ executor_id: claim.executor_id });
        if (!executorLookup.ok) return this.lookupFailed("claim-status", executorLookup.error);
        const credentialLookup = await this.credentialsRepo.findByTokenHash({
          token_hash: claim.bootstrap_token_hash,
        });
        if (!credentialLookup.ok) return this.lookupFailed("claim-status", credentialLookup.error);
        const executor = executorLookup.value;
        const credential = credentialLookup.value;
        if (!executor || executor.state !== "active" || !credential
          || credential.status !== "active"
          || credential.generation !== executor.credential_generation) {
          return { outcome: "unauthorized" };
        }
        if (!executor.owner_user_id) return { outcome: "unauthorized" };
        const deployment = await this.deploymentIdentity.get();
        if (!deployment.ok) return this.lookupFailed("claim-status", deployment.error);
        return {
          outcome: "status",
          status: "accepted",
          websiteDeploymentId: deployment.value,
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
      const claimLookup = lookup.claimId
        ? await this.claims.findByClaimId({ claim_id: lookup.claimId })
        : await this.claims.findByCodeHash({ short_code_hash: this.hash(lookup.code!) });
      if (!claimLookup.ok) return this.lookupFailed("claim-review", claimLookup.error);
      const claim = claimLookup.value;
      if (!claim) return { outcome: "not-found" };
      const executorLookup = await this.executors.findByExecutorId({ executor_id: claim.executor_id });
      if (!executorLookup.ok) return this.lookupFailed("claim-review", executorLookup.error);
      const executor = executorLookup.value;
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
      const claimLookup = await this.claims.findByClaimId({ claim_id: input.claimId });
      if (!claimLookup.ok) return this.decisionFailed(input, claimLookup.error);
      const claim = claimLookup.value;
      if (!claim) return { outcome: "not-found" };
      if (claim.status !== "pending") return this.terminalDecision(claim, actor.userId, input);
      const now = this.clock.now().toISOString();
      if (new Date(claim.expires_at).getTime() <= this.clock.now().getTime()) return { outcome: "expired" };
      if (input.decision === "deny") return this.denyClaim(claim, actor.userId, input, now);
      return this.acceptClaim(claim, actor.userId, input, now);
    } catch (error) {
      return this.decisionError(input, error);
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
    if (claim.status !== "accepted") return { outcome: "denied" };
    const deployment = await this.deploymentIdentity.get();
    if (!deployment.ok) return this.decisionFailed(input, deployment.error);
    return { outcome: "accepted", websiteDeploymentId: deployment.value };
  }

  private async denyClaim(
    claim: ConnectExecutorClaim, userId: string, input: ClaimDecisionInput, now: string,
  ): Promise<ClaimDecisionResult> {
    const denied = await this.claims.denyPending({
      claim_id: claim.claim_id, decided_at: now, decided_by_user_id: userId,
      decision_idempotency_key: input.idempotencyKey,
    });
    if (!denied.ok) return this.decisionFailed(input, denied.error);
    const decidedLookup = await this.claims.findByClaimId({ claim_id: claim.claim_id });
    if (!decidedLookup.ok) return this.decisionFailed(input, decidedLookup.error);
    const decided = decidedLookup.value;
    if (!decided || decided.status !== "denied" || decided.decided_by_user_id !== userId) {
      return { outcome: "replayed" };
    }
    const audited = await this.appendAudit("claim.denied", claim.executor_id, claim.claim_id, userId, 0, input.correlationId, now);
    if (!audited.ok) return this.decisionFailed(input, audited.error);
    return { outcome: "denied" };
  }

  private async acceptClaim(
    claim: ConnectExecutorClaim, userId: string, input: ClaimDecisionInput, now: string,
  ): Promise<ClaimDecisionResult> {
      const accepted = await this.claims.acceptPending({
        claim_id: claim.claim_id, decided_at: now, decided_by_user_id: userId,
        decision_idempotency_key: input.idempotencyKey,
      });
      if (!accepted.ok) return this.decisionFailed(input, accepted.error);
      const decidedLookup = await this.claims.findByClaimId({ claim_id: claim.claim_id });
      if (!decidedLookup.ok) return this.decisionFailed(input, decidedLookup.error);
      const decided = decidedLookup.value;
      if (!decided || decided.status !== "accepted" || decided.decided_by_user_id !== userId
        || decided.decision_idempotency_key !== input.idempotencyKey) return { outcome: "replayed" };
      const owned = await this.executors.acceptOwner({
        executor_id: claim.executor_id, owner_user_id: userId, claimed_at: now,
      });
      if (!owned.ok) return this.decisionFailed(input, owned.error);
      const executorLookup = await this.executors.findByExecutorId({ executor_id: claim.executor_id });
      if (!executorLookup.ok) return this.decisionFailed(input, executorLookup.error);
      const executor = executorLookup.value;
      if (!executor || executor.owner_user_id !== userId || executor.state !== "active"
        || executor.credential_generation !== 1) throw new Error("Claim owner invariant failed");
      const credentialCreated = await this.credentialsRepo.createCredential({
        credential_id: this.ids.credentialId(), executor_id: executor.executor_id,
        generation: 1, token_hash: claim.bootstrap_token_hash, created_at: now,
      });
      if (!credentialCreated.ok) return this.decisionFailed(input, credentialCreated.error);
      const audited = await this.appendAudit("claim.accepted", executor.executor_id, claim.claim_id, userId, 1, input.correlationId, now);
      if (!audited.ok) return this.decisionFailed(input, audited.error);
      const deployment = await this.deploymentIdentity.get();
      if (!deployment.ok) return this.decisionFailed(input, deployment.error);
      return {
        outcome: "accepted",
        websiteDeploymentId: deployment.value,
      };
  }

  async list(actor: ConnectExecutorActor) {
    if (actor.role !== "browser_session") return Result.ok<ConnectExecutor[]>([]);
    return this.executors.listByOwner({ owner_user_id: actor.userId, limit: this.policy.ownerListLimit });
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
      const executorLookup = await this.executors.findByExecutorId({ executor_id: executorId });
      if (!executorLookup.ok) return this.lookupFailed("executor-detail", executorLookup.error);
      const executor = executorLookup.value;
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
      // A lookup that could not be answered is `failed` (already logged by detail), not a missing executor.
      if (before.outcome === "failed") return before;
      if (before.outcome !== "found" || before.executor.state !== "active") return { outcome: "not-found" };
      const now = this.clock.now().toISOString();
      const renamed = await this.executors.renameOwned({
        executor_id: input.executorId, owner_user_id: actor.userId,
        display_name: input.displayName, updated_at: now,
      });
      if (!renamed.ok) return this.mutationFailed(renamed.error, "Rename failed");
      const afterLookup = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!afterLookup.ok) return this.mutationFailed(afterLookup.error, "Rename failed");
      const after = afterLookup.value;
      if (!after || after.owner_user_id !== actor.userId || after.display_name !== input.displayName) {
        return { outcome: "not-found" };
      }
      const audited = await this.appendAudit("executor.renamed", after.executor_id, null, actor.userId,
        after.credential_generation, input.correlationId, now);
      if (!audited.ok) return this.mutationFailed(audited.error, "Rename failed");
      return { outcome: "renamed", executor: after };
    } catch (error) {
      return this.mutationAborted(error instanceof Error ? error : new Error("Rename failed"));
    }
  }

  async revoke(actor: ConnectExecutorActor, input: RevokeInput): Promise<OwnerMutationResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const before = await this.detail(actor, input.executorId);
      // A lookup that could not be answered is `failed` (already logged by detail), not a missing executor.
      if (before.outcome === "failed") return before;
      if (before.outcome !== "found") return { outcome: "not-found" };
      if (before.executor.state === "revoked") return { outcome: "revoked", executor: before.executor };
      const now = this.clock.now().toISOString();
      const revoked = await this.executors.revokeOwned({
        executor_id: input.executorId, owner_user_id: actor.userId, updated_at: now,
      });
      if (!revoked.ok) return this.mutationFailed(revoked.error, "Revoke failed");
      const fenced = await this.credentialsRepo.revokeForExecutor({ executor_id: input.executorId, revoked_at: now });
      if (!fenced.ok) return this.mutationFailed(fenced.error, "Revoke failed");
      const afterLookup = await this.executors.findByExecutorId({ executor_id: input.executorId });
      if (!afterLookup.ok) return this.mutationFailed(afterLookup.error, "Revoke failed");
      const after = afterLookup.value;
      if (!after || after.owner_user_id !== actor.userId || after.state !== "revoked"
        || after.credential_generation !== before.executor.credential_generation + 1) {
        throw new Error("Credential fence invariant failed");
      }
      const audited = await this.appendAudit("executor.revoked", after.executor_id, null, actor.userId,
        after.credential_generation, input.correlationId, now);
      if (!audited.ok) return this.mutationFailed(audited.error, "Revoke failed");
      this.connections.revoke(after.executor_id, input.correlationId);
      // Desktop clients admitted through this executor's credential lose their
      // relay link too, whether or not the executor channel was connected.
      this.clientRelay.revokeExecutor(after.executor_id, input.correlationId);
      return { outcome: "revoked", executor: after };
    } catch (error) {
      return this.mutationAborted(error instanceof Error ? error : new Error("Revoke failed"));
    }
  }

  /** A repository failure while creating a claim: handled exactly like a thrown one. */
  private createFailed(input: ClaimCreateInput, failure: RepoFailure) {
    return this.claimCreateError(input, failure.cause);
  }

  /** A unique violation is a lost race (conflict); anything else fails the claim. Both roll back. */
  private async claimCreateError(input: ClaimCreateInput, error: unknown): Promise<ClaimCreateResult> {
    const uniqueViolation = error instanceof Error
      && (error.message.toLowerCase().includes("unique constraint failed")
        || error.message.toLowerCase().includes("duplicate key value violates unique constraint"));
    if (uniqueViolation) {
      (await currentAppTransaction())?.rollbackOnly(error);
      return { outcome: "conflict" };
    }
    this.failed("claim-create", input.correlationId, error);
    (await currentAppTransaction())?.rollbackOnly(error instanceof Error ? error : new Error("Claim creation failed"));
    return { outcome: "failed" };
  }

  /** A failure inside the decision transaction: logged, rolled back, `failed`. */
  private decisionFailed(input: ClaimDecisionInput, failure: DeploymentIdentityFailure) {
    return this.decisionError(input, "cause" in failure ? failure.cause : new Error(failure.kind));
  }

  private async decisionError(input: ClaimDecisionInput, error: unknown): Promise<ClaimDecisionResult> {
    this.failed("claim-decision", input.correlationId, error);
    (await currentAppTransaction())?.rollbackOnly(error instanceof Error ? error : new Error("Claim decision failed"));
    return { outcome: "failed" };
  }

  /** A repository failure inside a rename/revoke transaction: rolled back, `failed`. */
  private mutationFailed(failure: RepoFailure, fallback: string) {
    return this.mutationAborted(failure.cause instanceof Error ? failure.cause : new Error(fallback));
  }

  private async mutationAborted(error: Error): Promise<OwnerMutationResult> {
    (await currentAppTransaction())?.rollbackOnly(error);
    return { outcome: "failed" };
  }

  /** A read-only lookup failed: logged once here, answered `failed`. */
  private lookupFailed(action: string, failure: DeploymentIdentityFailure) {
    this.failed(action, undefined, "cause" in failure ? failure.cause : new Error(failure.kind));
    return { outcome: "failed" as const };
  }

  private claimStatus(claim: ConnectExecutorClaim): "pending" | "accepted" | "denied" | "expired" {
    return claim.status === "pending"
      && new Date(claim.expires_at).getTime() <= this.clock.now().getTime()
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
  ) {
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
  private failed(action: string, correlationId: string | undefined, error: unknown): void {
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
