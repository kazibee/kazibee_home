/**
 * ConnectExecutorService branches, driven directly against the real service
 * resolved from the original-config testApp production IoC graph. Only the SQL repo boundary is stubbed.
 *
 * The service methods themselves carry no @transaction decorator (the logic
 * layer adds it), so calling them here never opens a database transaction;
 * currentTransaction() is simply absent and the rollbackOnly guard is a
 * no-op. The transactional logic wrappers stay on the database tier.
 */
import { describe, it, expect } from 'vitest';

import { createHash } from 'node:crypto';
import path from 'node:path';

import { testApp } from "@noego/app";
import { resourceCase, testStub, test as control } from "@noego/testing";

import ConnectExecutorService from '../../../src/server/services/connect_executor_service';
import type { ConnectExecutorActor } from '../../../src/server/services/connect_executor_actor_resolver';
import type { ClaimCreateInput, ClaimDecisionInput } from '../../../src/server/services/connect_executor_request_parser';
import ConnectExecutorClaimRepo from '../../../src/server/repo/connect_executor_claim_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectExecutorAuditRepo from '../../../src/server/repo/connect_executor_audit_repo';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectWebsiteDeploymentIdentityRepo from '../../../src/server/repo/connect_website_deployment_identity_repo';

// Original-config testApp supplies an empty environment; presence stays in process.

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const USER_ID = 'usr_owner001';
const CORRELATION_ID = 'cor_abcdefgh';
const IDEMPOTENCY_KEY = 'idem_0123456789abcdef';
const FUTURE = '2999-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';
const DEPLOYMENT_ID = `wdp_${'a'.repeat(32)}`;

const browserActor: ConnectExecutorActor = {
  role: 'browser_session', userId: USER_ID, sessionId: 'ses_abcdefgh',
};
const deviceActor: ConnectExecutorActor = {
  role: 'executor_device', executorId: EXECUTOR_ID, deviceId: DEVICE_ID, generation: 0,
};

const claimInput = (): ClaimCreateInput => ({
  kind: 'executor.claim.create.request', protocolVersion: '1.0',
  claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  actorRole: 'executor_device', displayName: 'Build Box', platform: 'macos',
  architecture: 'arm64', executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64),
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

const decisionInput = (decision: 'accept' | 'deny' = 'accept'): ClaimDecisionInput => ({
  kind: 'executor.claim.decision.request', protocolVersion: '1.0', claimId: CLAIM_ID,
  sessionId: 'ses_abcdefgh', actorRole: 'browser_session', decision,
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

const envelopeHash = () => sha256(JSON.stringify([
  'executor.claim.create.request', '1.0', CLAIM_ID, EXECUTOR_ID, DEVICE_ID,
  'executor_device', 'Build Box', 'macos', 'arm64', '1.2.3', 'a'.repeat(64),
  IDEMPOTENCY_KEY, sha256(BOOTSTRAP_TOKEN),
]));

const claimRow = (overrides: Record<string, unknown> = {}) => ({
  claim_id: CLAIM_ID, executor_id: EXECUTOR_ID,
  bootstrap_token_hash: sha256(BOOTSTRAP_TOKEN), short_code_hash: sha256('code'),
  idempotency_key: IDEMPOTENCY_KEY, envelope_hash: envelopeHash(),
  status: 'pending', created_at: '2026-01-01T00:00:00.000Z', expires_at: FUTURE,
  decided_at: null, decided_by_user_id: null, decision_idempotency_key: null,
  ...overrides,
});

const executorRow = (overrides: Record<string, unknown> = {}) => ({
  executor_id: EXECUTOR_ID, device_id: DEVICE_ID, owner_user_id: USER_ID,
  display_name: 'Build Box', platform: 'macos', architecture: 'arm64',
  executor_version: '1.2.3', key_fingerprint: 'a'.repeat(64), state: 'active',
  credential_generation: 1, created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const credentialRow = (overrides: Record<string, unknown> = {}) => ({
  credential_id: 'crd_abcdefgh', executor_id: EXECUTOR_ID, generation: 1,
  token_hash: sha256(BOOTSTRAP_TOKEN), status: 'active',
  created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
  ...overrides,
});

const returns = (value: unknown) => control.returns(Promise.resolve(value));

const deploymentIdentity = testStub().method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", returns({ website_deployment_id: DEPLOYMENT_ID }));

describe('createClaim', () => {
  it('creates a fresh executor and pending claim', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", returns(null))
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([returns(null), returns(claimRow())]))
      .method(ConnectExecutorClaimRepo, "createClaim", control.once(returns(undefined)))
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([returns(null), returns(executorRow({ state: 'pending', owner_user_id: null }))]))
      .method(ConnectExecutorRepo, "createExecutor", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      const result = await service.createClaim(claimInput(), BOOTSTRAP_TOKEN);
      expect(result.outcome).toBe('created');
      if (result.outcome !== 'created') return;
      expect(result.challenge).toMatchObject({
        claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
        displayName: 'Build Box', expiresAt: FUTURE,
      });
      expect(result.challenge.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
      expect(result.challenge.claimUrl).toContain(`/claim/${CLAIM_ID}`);

    await env.verify();
  }));

  it('refreshes a still-pending registered executor and replaces its stale claim', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", returns(null))
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([returns(null), returns(claimRow())]))
      .method(ConnectExecutorClaimRepo, "deletePendingByExecutorId", control.once(returns(undefined)))
      .method(ConnectExecutorClaimRepo, "createClaim", control.once(returns(undefined)))
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(executorRow({ state: 'pending', owner_user_id: null })),
          returns(executorRow({ state: 'pending', owner_user_id: null })),
        ]))
      .method(ConnectExecutorRepo, "refreshPending", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      const result = await service.createClaim(claimInput(), BOOTSTRAP_TOKEN);
      expect(result.outcome).toBe('created');

    await env.verify();
  }));

  it('answers conflict for a registered executor that is no longer pending', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", returns(null))
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(null))
      .method(ConnectExecutorClaimRepo, "createClaim", control.never())
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow({ state: 'active' })))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'conflict' });

    await env.verify();
  }));

  it('replays an identical pending claim as a retry with the same challenge', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", returns(claimRow()))
      .method(ConnectExecutorClaimRepo, "createClaim", control.never())
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow()))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      const result = await service.createClaim(claimInput(), BOOTSTRAP_TOKEN);
      expect(result.outcome).toBe('retry');

    await env.verify();
  }));

  it('answers conflict when the replayed envelope differs from the stored claim', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", returns(claimRow({ envelope_hash: sha256('different') })))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow()))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'conflict' });

    await env.verify();
  }));

  it('maps a unique-constraint violation to conflict', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", returns(null))
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(null))
      .method(ConnectExecutorClaimRepo, "createClaim", control.throws(new Error('UNIQUE constraint failed: connect_executor_claims.claim_id')))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(null))
      .method(ConnectExecutorRepo, "createExecutor", returns(undefined))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'conflict' });

    await env.verify();
  }));

  it('maps any other repository failure to failed', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByIdempotencyKey", control.throws(new Error('boom')))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'failed' });

    await env.verify();
  }));
});

describe('status', () => {
  it('answers not-found for an unknown claim', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(null))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'not-found' });

    await env.verify();
  }));

  it('answers unauthorized without a matching bootstrap token', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(claimRow()))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, null)).toEqual({ outcome: 'unauthorized' });
      expect(await service.status(CLAIM_ID, 'X'.repeat(43))).toEqual({ outcome: 'unauthorized' });

    await env.verify();
  }));

  it('reports pending and expired for undecided claims', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([returns(claimRow()), returns(claimRow({ expires_at: PAST }))]))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'status', status: 'pending' });
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'status', status: 'expired' });

    await env.verify();
  }));

  it('returns the full acceptance identity for an accepted claim', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .use(deploymentIdentity)
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(claimRow({ status: 'accepted' })))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow()))
      .method(ConnectExecutorCredentialRepo, "findByTokenHash", returns(credentialRow()))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({
        outcome: 'status', status: 'accepted', websiteDeploymentId: DEPLOYMENT_ID,
        executorId: EXECUTOR_ID, deviceId: DEVICE_ID, credentialGeneration: 1,
        websiteAccountId: USER_ID,
      });

    await env.verify();
  }));

  it('answers unauthorized for an accepted claim with a fenced credential', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(claimRow({ status: 'accepted' })))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow({ credential_generation: 2 })))
      .method(ConnectExecutorCredentialRepo, "findByTokenHash", returns(credentialRow({ generation: 1 })))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'unauthorized' });

    await env.verify();
  }));

  it('answers unauthorized for an accepted claim whose executor has no owner', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(claimRow({ status: 'accepted' })))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow({ owner_user_id: null })))
      .method(ConnectExecutorCredentialRepo, "findByTokenHash", returns(credentialRow()))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'unauthorized' });

    await env.verify();
  }));

  it('degrades a repository failure to failed', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.throws(new Error('boom')))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'failed' });

    await env.verify();
  }));
});

describe('review', () => {
  it('finds a claim by short code hash', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByCodeHash", control.once(returns(claimRow())))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow()))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      const result = await service.review({ code: 'ABCD-EFGH' });
      expect(result).toMatchObject({ outcome: 'found', status: 'pending' });

    await env.verify();
  }));

  it('answers not-found when the claim or its executor is missing', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([returns(null), returns(claimRow())]))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(null))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });
      expect(await service.review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });

    await env.verify();
  }));

  it('degrades a repository failure to failed', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.throws(new Error('boom')))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.review({ claimId: CLAIM_ID })).toEqual({ outcome: 'failed' });

    await env.verify();
  }));
});

describe('decide', () => {
  it('rejects non-browser actors as not-found', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })

      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(deviceActor, decisionInput())).toEqual({ outcome: 'not-found' });

    await env.verify();
  }));

  it('answers not-found for an unknown claim and expired past the deadline', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([returns(null), returns(claimRow({ expires_at: PAST }))]))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput())).toEqual({ outcome: 'not-found' });
      expect(await service.decide(browserActor, decisionInput())).toEqual({ outcome: 'expired' });

    await env.verify();
  }));

  it('replays an identical accepted decision idempotently', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .use(deploymentIdentity)
      .method(ConnectExecutorClaimRepo, "findByClaimId", returns(claimRow({
          status: 'accepted', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
        })))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput('accept'))).toEqual({
        outcome: 'accepted', websiteDeploymentId: DEPLOYMENT_ID,
      });

    await env.verify();
  }));

  it('replays an identical denied decision idempotently and flags foreign replays', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
          returns(claimRow({
            status: 'denied', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
          returns(claimRow({
            status: 'denied', decided_by_user_id: 'usr_intruder', decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
        ]))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'denied' });
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'replayed' });

    await env.verify();
  }));

  it('denies a pending claim', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
          returns(claimRow()),
          returns(claimRow({ status: 'denied', decided_by_user_id: USER_ID })),
        ]))
      .method(ConnectExecutorClaimRepo, "denyPending", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'denied' });

    await env.verify();
  }));

  it('reports replayed when the deny lost a decision race', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
          returns(claimRow()),
          returns(claimRow({ status: 'accepted', decided_by_user_id: 'usr_intruder' })),
        ]))
      .method(ConnectExecutorClaimRepo, "denyPending", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'replayed' });

    await env.verify();
  }));

  it('accepts a pending claim, fences the owner, and mints the generation-1 credential', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .use(deploymentIdentity)
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
          returns(claimRow()),
          returns(claimRow({
            status: 'accepted', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
        ]))
      .method(ConnectExecutorClaimRepo, "acceptPending", control.once(returns(undefined)))
      .method(ConnectExecutorRepo, "acceptOwner", control.once(returns(undefined)))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow()))
      .method(ConnectExecutorCredentialRepo, "createCredential", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput('accept'))).toEqual({
        outcome: 'accepted', websiteDeploymentId: DEPLOYMENT_ID,
      });

    await env.verify();
  }));

  it('reports replayed when the accept lost a decision race', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
          returns(claimRow()),
          returns(claimRow({ status: 'denied', decided_by_user_id: 'usr_intruder' })),
        ]))
      .method(ConnectExecutorClaimRepo, "acceptPending", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.decide(browserActor, decisionInput('accept'))).toEqual({ outcome: 'replayed' });

    await env.verify();
  }));

  // The service returns acceptClaim's promise without awaiting, so this
  // invariant violation rejects out of decide (the logic @transaction wrapper
  // and controller catch own it in production) rather than mapping to failed.
  it('rejects when the owner invariant does not hold after acceptance', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorClaimRepo, "findByClaimId", control.calls([
          returns(claimRow()),
          returns(claimRow({
            status: 'accepted', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
        ]))
      .method(ConnectExecutorClaimRepo, "acceptPending", returns(undefined))
      .method(ConnectExecutorRepo, "acceptOwner", returns(undefined))
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow({ credential_generation: 7 })))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      await expect(service.decide(browserActor, decisionInput('accept')))
        .rejects.toThrow('Claim owner invariant failed');

    await env.verify();
  }));
});

// Not covered here: ConnectExecutorLogic.decide's claim-decision queue and the
// @transaction wrappers (createClaim/decideTransaction/rename/revoke). The
// sqlstack @transaction decorator wraps the method beneath the .method seam,
// so exercising them requires a real database — they belong to the database
// tier (test/integration).

describe('list / presence / detail', () => {
  it('lists owner executors for browser sessions and nothing for devices', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "listByOwner", control.once(returns([executorRow()])))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.list(browserActor)).toHaveLength(1);
      expect(await service.list(deviceActor)).toEqual([]);

    await env.verify();
  }));

  it('reports offline presence from the in-process registry when no coordinator routes', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })

      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.presence(EXECUTOR_ID)).toBe('offline');

    await env.verify();
  }));

  it('answers detail found for the owner, not-found for others, failed on errors', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(executorRow()),
          returns(executorRow({ owner_user_id: 'usr_someoneelse' })),
          control.throws(new Error('boom')),
        ]))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.detail(browserActor, EXECUTOR_ID)).toMatchObject({ outcome: 'found' });
      expect(await service.detail(browserActor, EXECUTOR_ID)).toEqual({ outcome: 'not-found' });
      expect(await service.detail(browserActor, EXECUTOR_ID)).toEqual({ outcome: 'failed' });

    await env.verify();
  }));
});

describe('rename', () => {
  const renameInput = {
    kind: 'executor.rename.request' as const, protocolVersion: '1.0' as const,
    executorId: EXECUTOR_ID, displayName: 'New Name',
    idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  };

  it('renames an owned active executor and audits the change', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(executorRow()),
          returns(executorRow({ display_name: 'New Name' })),
        ]))
      .method(ConnectExecutorRepo, "renameOwned", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      const result = await service.rename(browserActor, renameInput);
      expect(result).toMatchObject({ outcome: 'renamed', executor: { display_name: 'New Name' } });

    await env.verify();
  }));

  it('rejects non-owners, non-active executors, and device actors as not-found', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(null),
          returns(executorRow({ state: 'revoked' })),
        ]))
      .method(ConnectExecutorRepo, "renameOwned", control.never())
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.rename(deviceActor, renameInput)).toEqual({ outcome: 'not-found' });
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'not-found' });
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'not-found' });

    await env.verify();
  }));

  it('answers not-found when the rename did not stick and failed on write errors', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(executorRow()),
          returns(executorRow({ display_name: 'Old Name' })),
          returns(executorRow()),
        ]))
      .method(ConnectExecutorRepo, "renameOwned", control.calls([returns(undefined), control.throws(new Error('boom'))]))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'not-found' });
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'failed' });

    await env.verify();
  }));
});

describe('revoke', () => {
  const revokeInput = {
    kind: 'executor.action.request' as const, protocolVersion: '1.0' as const,
    executorId: EXECUTOR_ID, action: 'revoke' as const,
    idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  };

  it('revokes an owned executor and bumps the credential fence', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(executorRow()),
          returns(executorRow({ state: 'revoked', credential_generation: 2 })),
        ]))
      .method(ConnectExecutorRepo, "revokeOwned", control.once(returns(undefined)))
      .method(ConnectExecutorCredentialRepo, "revokeForExecutor", control.once(returns(undefined)))
      .method(ConnectExecutorAuditRepo, "appendEvent", control.once(returns(undefined)))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      const result = await service.revoke(browserActor, revokeInput);
      expect(result).toMatchObject({ outcome: 'revoked', executor: { state: 'revoked' } });

    await env.verify();
  }));

  it('short-circuits an already revoked executor idempotently', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", returns(executorRow({ state: 'revoked' })))
      .method(ConnectExecutorRepo, "revokeOwned", control.never())
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.revoke(browserActor, revokeInput)).toMatchObject({ outcome: 'revoked' });

    await env.verify();
  }));

  it('rejects unknown executors and non-browser actors as not-found', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", returns(null))
      .method(ConnectExecutorRepo, "revokeOwned", control.never())
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.revoke(deviceActor, revokeInput)).toEqual({ outcome: 'not-found' });
      expect(await service.revoke(browserActor, revokeInput)).toEqual({ outcome: 'not-found' });

    await env.verify();
  }));

  it('fails when the credential fence invariant does not hold', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["connectExecutors"] } })
      .method(ConnectExecutorRepo, "findByExecutorId", control.calls([
          returns(executorRow()),
          returns(executorRow({ state: 'revoked', credential_generation: 1 })),
        ]))
      .method(ConnectExecutorRepo, "revokeOwned", returns(undefined))
      .method(ConnectExecutorCredentialRepo, "revokeForExecutor", returns(undefined))
      .build();
    const service = await env.get<ConnectExecutorService>(ConnectExecutorService);
      expect(await service.revoke(browserActor, revokeInput)).toEqual({ outcome: 'failed' });

    await env.verify();
  }));
});
