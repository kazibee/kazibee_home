import { Component, Inject, LoadAs } from "@noego/ioc";
import { createHash } from "node:crypto";
import { currentTransaction } from "sqlstack";
import ConnectDesktopDeviceRepo, { type ConnectDesktopDevice } from "../repo/connect_desktop_device_repo";
import ConnectDesktopClaimRepo, { type ConnectDesktopClaim } from "../repo/connect_desktop_claim_repo";
import ConnectDesktopCredentialRepo from "../repo/connect_desktop_credential_repo";
import ConnectDesktopAuditRepo, { type ConnectDesktopAuditKind } from "../repo/connect_desktop_audit_repo";
import { ConnectClock, ConnectCredentials, ConnectIdGenerator, WebsiteLoggerAdapter, type WebsiteLoggerPort } from "./connect_auth_primitives";
import ConnectDesktopPolicy from "./connect_desktop_policy";
import type {
  DesktopClaimCreateInput, DesktopClaimDecisionInput, DesktopRenameInput, DesktopRevokeInput,
} from "./connect_desktop_request_parser";
import type { ConnectDesktopActor } from "./connect_desktop_actor_resolver";
import TraceAdapter, { type TracePort } from "../observability/trace_adapter";
import ConnectClientRelayService from "./connect_client_relay_service";
import ConnectWebsiteDeploymentIdentityService from "./connect_website_deployment_identity_service";

export interface ClaimChallenge {
  claimId: string; claimUrl: string; shortCode: string; displayName: string;
  platform: string; architecture: string; desktopVersion: string;
  keyFingerprint: string; expiresAt: string;
}
export type ClaimCreateResult =
  | { outcome: "created" | "retry"; challenge: ClaimChallenge }
  | { outcome: "conflict" }
  | { outcome: "failed" };
export type ClaimStatusResult =
  | { outcome: "status"; status: "pending" | "denied" | "expired" }
  | { outcome: "status"; status: "accepted"; deviceId: string; credentialExpiresAt: string; websiteAccountId: string; websiteDeploymentId: string }
  | { outcome: "unauthorized" }
  | { outcome: "not-found" }
  | { outcome: "failed" };
export type ClaimReviewResult =
  | { outcome: "found"; claim: ConnectDesktopClaim; device: ConnectDesktopDevice; status: "pending" | "accepted" | "denied" | "expired" }
  | { outcome: "not-found" }
  | { outcome: "failed" };
export type ClaimDecisionResult =
  | { outcome: "accepted"; deviceId: string; credentialExpiresAt: string; websiteAccountId: string; websiteDeploymentId: string }
  | { outcome: "denied" | "expired" | "replayed" | "not-found" | "failed" };
export type OwnerResult =
  | { outcome: "found"; device: ConnectDesktopDevice }
  | { outcome: "not-found" }
  | { outcome: "failed" };
export type OwnerMutationResult =
  | { outcome: "renamed" | "revoked"; device: ConnectDesktopDevice }
  | { outcome: "not-found" }
  | { outcome: "failed" };

@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopService {
  private readonly logger: WebsiteLoggerPort;
  private readonly trace: TracePort;

  constructor(
    @Inject(ConnectDesktopDeviceRepo) private readonly devices: ConnectDesktopDeviceRepo,
    @Inject(ConnectDesktopClaimRepo) private readonly claims: ConnectDesktopClaimRepo,
    @Inject(ConnectDesktopCredentialRepo) private readonly credentialsRepo: ConnectDesktopCredentialRepo,
    @Inject(ConnectDesktopAuditRepo) private readonly audit: ConnectDesktopAuditRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectIdGenerator) private readonly ids: ConnectIdGenerator,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectDesktopPolicy) private readonly policy: ConnectDesktopPolicy,
    @Inject(WebsiteLoggerAdapter) loggers: WebsiteLoggerAdapter,
    @Inject(TraceAdapter) traces: TraceAdapter,
    @Inject(ConnectClientRelayService) private readonly relay: ConnectClientRelayService,
    @Inject(ConnectWebsiteDeploymentIdentityService)
    private readonly deploymentIdentity: ConnectWebsiteDeploymentIdentityService,
  ) {
    this.logger = loggers.forSource("connect-devices");
    this.trace = traces.forSource("ConnectDesktopService");
  }

  async createClaim(input: DesktopClaimCreateInput, token: string): Promise<ClaimCreateResult> {
    const tokenHash = this.credentials.hashToken(token);
    const envelopeHash = this.envelopeHash(input, tokenHash);
    try {
      const existing = await this.claims.findByIdempotencyKey({ idempotency_key: input.idempotencyKey })
        ?? await this.claims.findByClaimId({ claim_id: input.claimId });
      if (existing) {
        const device = await this.devices.findByDeviceId({ device_id: existing.device_id });
        if (!device || existing.envelope_hash !== envelopeHash || existing.bootstrap_token_hash !== tokenHash
          || existing.claim_id !== input.claimId || existing.device_id !== input.deviceId
          || existing.status !== "pending") return { outcome: "conflict" };
        return { outcome: "retry", challenge: this.challenge(existing, device, token) };
      }
      const now = this.clock.now();
      const createdAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + this.policy.claimLifetimeMs).toISOString();
      const shortCode = this.shortCode(token, input.claimId);
      await this.devices.createDevice({
        device_id: input.deviceId, display_name: input.displayName,
        platform: input.platform, architecture: input.architecture,
        desktop_version: input.desktopVersion, key_fingerprint: input.keyFingerprint,
        created_at: createdAt, updated_at: createdAt, last_seen_at: createdAt,
      });
      await this.claims.createClaim({
        claim_id: input.claimId, device_id: input.deviceId, bootstrap_token_hash: tokenHash,
        short_code_hash: this.hash(shortCode), idempotency_key: input.idempotencyKey,
        envelope_hash: envelopeHash, created_at: createdAt, expires_at: expiresAt,
      });
      await this.appendAudit("claim.created", input.deviceId, input.claimId, null, 0, input.correlationId, createdAt);
      this.completed("claim-create", input.correlationId, input.deviceId, "created");
      const claim = await this.claims.findByClaimId({ claim_id: input.claimId });
      const device = await this.devices.findByDeviceId({ device_id: input.deviceId });
      if (!claim || !device) throw new Error("Claim persistence invariant failed");
      return { outcome: "created", challenge: this.challenge(claim, device, token) };
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique constraint failed")) {
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
        const device = await this.devices.findByDeviceId({ device_id: claim.device_id });
        const credential = await this.credentialsRepo.findByTokenHash({
          token_hash: claim.bootstrap_token_hash,
        });
        if (!device || !this.websiteAccountId(device.owner_user_id)
          || device.owner_user_id !== claim.decided_by_user_id || device.state !== "active"
          || !credential || credential.status !== "active"
          || new Date(credential.expires_at).getTime() <= this.clock.now().getTime()
          || credential.generation !== device.credential_generation) {
          return { outcome: "unauthorized" };
        }
        return {
          outcome: "status", status: "accepted", deviceId: claim.device_id,
          credentialExpiresAt: credential.expires_at, websiteAccountId: device.owner_user_id,
          websiteDeploymentId: await this.deploymentIdentity.get(),
        };
      }
      return { outcome: "status", status: claim.status === "pending"
        && new Date(claim.expires_at).getTime() <= this.clock.now().getTime() ? "expired" : claim.status };
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
      const device = await this.devices.findByDeviceId({ device_id: claim.device_id });
      return device
        ? { outcome: "found", claim, device, status: this.claimStatus(claim) }
        : { outcome: "not-found" };
    } catch {
      return { outcome: "failed" };
    }
  }

  async decide(actor: ConnectDesktopActor, input: DesktopClaimDecisionInput): Promise<ClaimDecisionResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const claim = await this.claims.findByClaimId({ claim_id: input.claimId });
      if (!claim) return { outcome: "not-found" };
      if (claim.status !== "pending") return this.terminalDecision(claim, actor.userId, input);
      const now = this.clock.now().toISOString();
      if (new Date(claim.expires_at).getTime() <= this.clock.now().getTime()) return { outcome: "expired" };
      if (input.decision === "deny") return this.denyClaim(claim, actor.userId, input, now);
      return this.acceptClaim(claim, actor.userId, input, now);
    } catch (error) {
      this.failed("claim-decision", input.correlationId, error);
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Claim decision failed"));
      return { outcome: "failed" };
    }
  }

  private async terminalDecision(
    claim: ConnectDesktopClaim, userId: string, input: DesktopClaimDecisionInput,
  ): Promise<ClaimDecisionResult> {
    const expected = input.decision === "accept" ? "accepted" : "denied";
    const idempotent = claim.decided_by_user_id === userId
      && claim.decision_idempotency_key === input.idempotencyKey
      && claim.status === expected;
    if (!idempotent) return { outcome: "replayed" };
    if (claim.status === "denied") return { outcome: "denied" };
    const credential = await this.credentialsRepo.findByTokenHash({ token_hash: claim.bootstrap_token_hash });
    const device = await this.devices.findByDeviceId({ device_id: claim.device_id });
    const ownerUserId = device?.owner_user_id ?? null;
    const websiteAccountId = this.websiteAccountId(ownerUserId) && ownerUserId === userId
      ? ownerUserId : null;
    return credential && websiteAccountId
      ? {
        outcome: "accepted", deviceId: claim.device_id,
        credentialExpiresAt: credential.expires_at, websiteAccountId,
        websiteDeploymentId: await this.deploymentIdentity.get(),
      }
      : { outcome: "failed" };
  }

  private async denyClaim(
    claim: ConnectDesktopClaim, userId: string, input: DesktopClaimDecisionInput, now: string,
  ): Promise<ClaimDecisionResult> {
    await this.claims.denyPending({
      claim_id: claim.claim_id, decided_at: now, decided_by_user_id: userId,
      decision_idempotency_key: input.idempotencyKey,
    });
    const decided = await this.claims.findByClaimId({ claim_id: claim.claim_id });
    if (!decided || decided.status !== "denied" || decided.decided_by_user_id !== userId) {
      return { outcome: "replayed" };
    }
    await this.appendAudit("claim.denied", claim.device_id, claim.claim_id, userId, 0, input.correlationId, now);
    return { outcome: "denied" };
  }

  private async acceptClaim(
    claim: ConnectDesktopClaim, userId: string, input: DesktopClaimDecisionInput, now: string,
  ): Promise<ClaimDecisionResult> {
      await this.claims.acceptPending({
        claim_id: claim.claim_id, decided_at: now, decided_by_user_id: userId,
        decision_idempotency_key: input.idempotencyKey,
      });
      const decided = await this.claims.findByClaimId({ claim_id: claim.claim_id });
      if (!decided || decided.status !== "accepted" || decided.decided_by_user_id !== userId
        || decided.decision_idempotency_key !== input.idempotencyKey) return { outcome: "replayed" };
      await this.devices.acceptOwner({
        device_id: claim.device_id, owner_user_id: userId, claimed_at: now,
      });
      const device = await this.devices.findByDeviceId({ device_id: claim.device_id });
      if (!device || device.owner_user_id !== userId || device.state !== "active"
        || device.credential_generation !== 1) throw new Error("Claim owner invariant failed");
      const credentialExpiresAt = new Date(
        new Date(now).getTime() + this.policy.credentialLifetimeMs,
      ).toISOString();
      await this.credentialsRepo.createCredential({
        credential_id: this.ids.credentialId(), device_id: device.device_id,
        generation: 1, token_hash: claim.bootstrap_token_hash, created_at: now,
        expires_at: credentialExpiresAt,
      });
      await this.appendAudit("claim.accepted", device.device_id, claim.claim_id, userId, 1, input.correlationId, now);
      return {
        outcome: "accepted", deviceId: device.device_id, credentialExpiresAt,
        websiteAccountId: userId,
        websiteDeploymentId: await this.deploymentIdentity.get(),
      };
  }

  async list(actor: ConnectDesktopActor): Promise<ConnectDesktopDevice[]> {
    return actor.role === "browser_session"
      ? this.devices.listByOwner({ owner_user_id: actor.userId, limit: this.policy.ownerListLimit })
      : [];
  }

  async detail(actor: ConnectDesktopActor, deviceId: string): Promise<OwnerResult> {
    try {
      const device = await this.devices.findByDeviceId({ device_id: deviceId });
      return actor.role === "browser_session" && device?.owner_user_id === actor.userId
        ? { outcome: "found", device } : { outcome: "not-found" };
    } catch {
      return { outcome: "failed" };
    }
  }

  async rename(actor: ConnectDesktopActor, input: DesktopRenameInput): Promise<OwnerMutationResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const before = await this.detail(actor, input.deviceId);
      if (before.outcome !== "found" || before.device.state !== "active") return { outcome: "not-found" };
      const now = this.clock.now().toISOString();
      await this.devices.renameOwned({
        device_id: input.deviceId, owner_user_id: actor.userId,
        display_name: input.displayName, updated_at: now,
      });
      const after = await this.devices.findByDeviceId({ device_id: input.deviceId });
      if (!after || after.owner_user_id !== actor.userId || after.display_name !== input.displayName) {
        return { outcome: "not-found" };
      }
      await this.appendAudit("desktop.renamed", after.device_id, null, actor.userId,
        after.credential_generation, input.correlationId, now);
      return { outcome: "renamed", device: after };
    } catch (error) {
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Rename failed"));
      return { outcome: "failed" };
    }
  }

  async revoke(actor: ConnectDesktopActor, input: DesktopRevokeInput): Promise<OwnerMutationResult> {
    if (actor.role !== "browser_session") return { outcome: "not-found" };
    try {
      const before = await this.detail(actor, input.deviceId);
      if (before.outcome !== "found") return { outcome: "not-found" };
      if (before.device.state === "revoked") return { outcome: "revoked", device: before.device };
      const now = this.clock.now().toISOString();
      await this.devices.revokeOwned({
        device_id: input.deviceId, owner_user_id: actor.userId, updated_at: now,
      });
      await this.credentialsRepo.revokeForDevice({ device_id: input.deviceId, revoked_at: now });
      const after = await this.devices.findByDeviceId({ device_id: input.deviceId });
      if (!after || after.owner_user_id !== actor.userId || after.state !== "revoked"
        || after.credential_generation !== before.device.credential_generation + 1) {
        throw new Error("Credential fence invariant failed");
      }
      await this.appendAudit("desktop.revoked", after.device_id, null, actor.userId,
        after.credential_generation, input.correlationId, now);
      this.relay.revokeDesktop(after.device_id, input.correlationId);
      return { outcome: "revoked", device: after };
    } catch (error) {
      currentTransaction()?.rollbackOnly(error instanceof Error ? error : new Error("Revoke failed"));
      return { outcome: "failed" };
    }
  }

  /** Accepted claim responses expose only the persisted opaque account identifier. */
  private websiteAccountId(ownerUserId: string | null): ownerUserId is string {
    return ownerUserId !== null && /^usr_[A-Za-z0-9]{8,64}$/.test(ownerUserId);
  }

  private claimStatus(claim: ConnectDesktopClaim): "pending" | "accepted" | "denied" | "expired" {
    return claim.status === "pending"
      && new Date(claim.expires_at).getTime() <= this.clock.now().getTime()
      ? "expired" : claim.status;
  }
  private challenge(
    claim: ConnectDesktopClaim,
    device: ConnectDesktopDevice,
    bootstrapToken: string,
  ): ClaimChallenge {
    return {
      claimId: claim.claim_id, claimUrl: `${this.policy.claimBaseUrl}/claim/${claim.claim_id}`,
      shortCode: this.shortCode(bootstrapToken, claim.claim_id),
      displayName: device.display_name, platform: device.platform,
      architecture: device.architecture, desktopVersion: device.desktop_version,
      keyFingerprint: device.key_fingerprint, expiresAt: claim.expires_at,
    };
  }
  private shortCode(bootstrapToken: string, claimId: string): string {
    const digest = createHash("sha256")
      .update(`kazi-claim-code-v1:${bootstrapToken}:${claimId}`)
      .digest();
    const letters = Array.from(digest.subarray(0, 8), (byte) => String.fromCharCode(65 + (byte % 26))).join("");
    return `${letters.slice(0, 4)}-${letters.slice(4)}`;
  }
  private envelopeHash(input: DesktopClaimCreateInput, tokenHash: string): string {
    return this.hash(JSON.stringify([
      input.kind, input.protocolVersion, input.claimId, input.deviceId,
      input.actorRole, input.displayName, input.platform, input.architecture,
      input.desktopVersion, input.keyFingerprint, input.idempotencyKey, tokenHash,
    ]));
  }
  private hash(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }
  private appendAudit(
    event_kind: ConnectDesktopAuditKind, device_id: string, claim_id: string | null,
    actor_user_id: string | null, credential_generation: number,
    correlation_id: string, occurred_at: string,
  ): Promise<void> {
    return this.audit.appendEvent({
      audit_event_id: this.ids.auditEventId(), device_id, claim_id, actor_user_id,
      event_kind, credential_generation, occurred_at, correlation_id,
    });
  }
  private completed(action: string, correlationId: string, deviceId: string, outcome: string): void {
    const context = { route: "/v1/connect/desktops", action, correlationId, deviceId, outcome, count: 1 };
    this.logger.info("connect.desktops.completed", context);
    this.trace.info("completed", context);
  }
  private failed(action: string, correlationId: string, error: unknown): void {
    const context = { route: "/v1/connect/desktops", action, correlationId, outcome: "failed",
      errorType: error instanceof Error ? error.name : "unknown" };
    this.logger.error("connect.desktops.failed", context);
    this.trace.error("failed", context);
  }
}
