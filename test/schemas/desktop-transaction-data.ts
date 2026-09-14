/**
 * Plain starting-state rows for the desktop transaction scenarios.
 * Rows are inserted with raw SQL against the connectDesktopSchema tables;
 * no production service, migration or seeded builder is involved. Hashes are
 * derived from the plain inputs with node:crypto following the persisted
 * envelope contract of ConnectDesktopService (sha256 hex of the token, of the
 * JSON envelope array, and of the derived short code).
 */
import { createHash } from "node:crypto";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { DesktopClaimCreateInput } from "../../src/server/services/connect_desktop_request_parser";

const PASSWORD_HASH = "$2a$12$mNZq4pezRTG8xgASJtIRPuauRl3fxLPmzHx7Abc3DOgQsGtGj17jy";

export const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const envelopeHash = (input: DesktopClaimCreateInput, tokenHash: string): string =>
  sha256(JSON.stringify([
    input.kind, input.protocolVersion, input.claimId, input.deviceId,
    input.actorRole, input.displayName, input.platform, input.architecture,
    input.desktopVersion, input.keyFingerprint, input.idempotencyKey, tokenHash,
  ]));

export const shortCode = (bootstrapToken: string, claimId: string): string => {
  const digest = createHash("sha256").update(`kazi-claim-code-v1:${bootstrapToken}:${claimId}`).digest();
  const letters = Array.from(digest.subarray(0, 8), (byte) => String.fromCharCode(65 + (byte % 26))).join("");
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
};

export const insertAccount = (fixture: TestPostgresDatabase, userId: string) =>
  fixture.query(
    "INSERT INTO connect_accounts (user_id, username, email, password_hash, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', now(), now())",
    [userId, userId, `${userId}@example.com`, PASSWORD_HASH],
  );

/**
 * A registered desktop device with one pending claim (the state createClaim
 * leaves behind), including its claim.created audit row.
 */
export const insertPendingClaim = async (
  fixture: TestPostgresDatabase, input: DesktopClaimCreateInput, token: string,
  at = new Date(),
) => {
  const createdAt = at.toISOString();
  const expiresAt = new Date(at.getTime() + 10 * 60_000).toISOString();
  const tokenHash = sha256(token);
  await fixture.query(
    `INSERT INTO connect_desktop_devices (device_id, owner_user_id, display_name, platform,
       architecture, desktop_version, key_fingerprint, state, credential_generation,
       created_at, claimed_at, updated_at, last_seen_at)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, 'pending', 0, $7, NULL, $7, $7)`,
    [input.deviceId, input.displayName, input.platform, input.architecture,
      input.desktopVersion, input.keyFingerprint, createdAt],
  );
  await fixture.query(
    `INSERT INTO connect_desktop_claims (claim_id, device_id, bootstrap_token_hash, short_code_hash,
       idempotency_key, envelope_hash, status, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)`,
    [input.claimId, input.deviceId, tokenHash, sha256(shortCode(token, input.claimId)),
      input.idempotencyKey, envelopeHash(input, tokenHash), createdAt, expiresAt],
  );
  await fixture.query(
    `INSERT INTO connect_desktop_audit_events (audit_event_id, device_id, claim_id, actor_user_id,
       event_kind, credential_generation, occurred_at, correlation_id)
     VALUES ($1, $2, $3, NULL, 'claim.created', 0, $4, $5)`,
    [`aud_${input.claimId}_created`, input.deviceId, input.claimId, createdAt, input.correlationId],
  );
};

/**
 * A desktop whose claim was already accepted by `userId` with
 * `decisionIdempotencyKey`: active device at generation 1, one active
 * generation-1 'desktop-relay' credential bound to the bootstrap token, and
 * the claim.created + claim.accepted audit trail. `displayName` overrides the
 * persisted device name (e.g. a desktop already renamed by its owner).
 */
export const insertAcceptedDesktop = async (
  fixture: TestPostgresDatabase, input: DesktopClaimCreateInput, token: string,
  userId: string, decisionIdempotencyKey: string,
  options: { displayName?: string; at?: Date } = {},
) => {
  const at = options.at ?? new Date();
  const createdAt = new Date(at.getTime() - 1_000);
  await insertPendingClaim(fixture, input, token, createdAt);
  const decidedAt = at.toISOString();
  const credentialExpiresAt = new Date(at.getTime() + 24 * 60 * 60_000).toISOString();
  await fixture.query(
    `UPDATE connect_desktop_claims
     SET status = 'accepted', decided_at = $2, decided_by_user_id = $3, decision_idempotency_key = $4
     WHERE claim_id = $1`,
    [input.claimId, decidedAt, userId, decisionIdempotencyKey],
  );
  await fixture.query(
    `UPDATE connect_desktop_devices
     SET owner_user_id = $2, state = 'active', credential_generation = 1, claimed_at = $3, updated_at = $3,
         display_name = $4
     WHERE device_id = $1`,
    [input.deviceId, userId, decidedAt, options.displayName ?? input.displayName],
  );
  await fixture.query(
    `INSERT INTO connect_desktop_credentials (credential_id, device_id, generation, token_hash,
       audience, status, created_at, expires_at)
     VALUES ($1, $2, 1, $3, 'desktop-relay', 'active', $4, $5)`,
    [`cred_${input.deviceId}_1`, input.deviceId, sha256(token), decidedAt, credentialExpiresAt],
  );
  await fixture.query(
    `INSERT INTO connect_desktop_audit_events (audit_event_id, device_id, claim_id, actor_user_id,
       event_kind, credential_generation, occurred_at, correlation_id)
     VALUES ($1, $2, $3, $4, 'claim.accepted', 1, $5, $6)`,
    [`aud_${input.claimId}_accepted`, input.deviceId, input.claimId, userId, decidedAt, `cor_dbdeskdec${input.claimId.slice(-3)}`],
  );
};
