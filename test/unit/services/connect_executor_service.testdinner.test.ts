/**
 * ConnectExecutorService branches, driven directly against the real service
 * resolved from the production IoC graph (testDinner over the real executors
 * module source). Only the SQL repo boundary is stubbed.
 *
 * The service methods themselves carry no @transaction decorator (the logic
 * layer adds it), so calling them here never opens a database transaction;
 * currentTransaction() is simply absent and the rollbackOnly guard is a
 * no-op. The transactional logic wrappers stay on the database tier.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectExecutorController from '../../../src/server/controller/connect_executor.controller';
import ConnectChannelController from '../../../src/server/controller/connect_channel.controller';
import ConnectExecutorService from '../../../src/server/services/connect_executor_service';
import type { ConnectExecutorActor } from '../../../src/server/services/connect_executor_actor_resolver';
import type { ClaimCreateInput, ClaimDecisionInput } from '../../../src/server/services/connect_executor_request_parser';

// Presence must resolve through the in-process registry, not a coordinator.
delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
delete process.env.EXECUTOR_COORDINATOR;

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/executors.yaml'), 'utf8')
) as Record<string, unknown>;

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
const deploymentIdentityMethods = () => ({
  ConnectWebsiteDeploymentIdentityRepo: {
    findSingleton: returns({ website_deployment_id: DEPLOYMENT_ID }),
  },
});

const base = () =>
  testDinner(executorsSource)
    .select({ module: 'connectExecutors' })
    .controllers({
      'connect_executor.controller': ConnectExecutorController,
      'connect_channel.controller': ConnectChannelController,
    })
    .hooks({});

async function withService(
  methods: Record<string, Record<string, unknown>>,
  run: (service: ConnectExecutorService) => Promise<void>,
) {
  const env = await base().methods(methods as never).build();
  try {
    await run(await env.get<ConnectExecutorService>(ConnectExecutorService));
    await env.verify();
  } finally {
    await env.dispose();
  }
}

describe('createClaim', () => {
  it('creates a fresh executor and pending claim', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: returns(null),
        findByClaimId: control.calls([returns(null), returns(claimRow())]),
        createClaim: control.once(returns(undefined)),
      },
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([returns(null), returns(executorRow({ state: 'pending', owner_user_id: null }))]),
        createExecutor: control.once(returns(undefined)),
      },
      ConnectExecutorAuditRepo: { appendEvent: control.once(returns(undefined)) },
    }, async (service) => {
      const result = await service.createClaim(claimInput(), BOOTSTRAP_TOKEN);
      expect(result.outcome).toBe('created');
      if (result.outcome !== 'created') return;
      expect(result.challenge).toMatchObject({
        claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
        displayName: 'Build Box', expiresAt: FUTURE,
      });
      expect(result.challenge.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
      expect(result.challenge.claimUrl).toContain(`/claim/${CLAIM_ID}`);
    });
  });

  it('refreshes a still-pending registered executor and replaces its stale claim', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: returns(null),
        findByClaimId: control.calls([returns(null), returns(claimRow())]),
        deletePendingByExecutorId: control.once(returns(undefined)),
        createClaim: control.once(returns(undefined)),
      },
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(executorRow({ state: 'pending', owner_user_id: null })),
          returns(executorRow({ state: 'pending', owner_user_id: null })),
        ]),
        refreshPending: control.once(returns(undefined)),
      },
      ConnectExecutorAuditRepo: { appendEvent: control.once(returns(undefined)) },
    }, async (service) => {
      const result = await service.createClaim(claimInput(), BOOTSTRAP_TOKEN);
      expect(result.outcome).toBe('created');
    });
  });

  it('answers conflict for a registered executor that is no longer pending', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: returns(null),
        findByClaimId: returns(null),
        createClaim: control.never(),
      },
      ConnectExecutorRepo: {
        findByExecutorId: returns(executorRow({ state: 'active' })),
      },
    }, async (service) => {
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'conflict' });
    });
  });

  it('replays an identical pending claim as a retry with the same challenge', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: returns(claimRow()),
        createClaim: control.never(),
      },
      ConnectExecutorRepo: { findByExecutorId: returns(executorRow()) },
    }, async (service) => {
      const result = await service.createClaim(claimInput(), BOOTSTRAP_TOKEN);
      expect(result.outcome).toBe('retry');
    });
  });

  it('answers conflict when the replayed envelope differs from the stored claim', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: returns(claimRow({ envelope_hash: sha256('different') })),
      },
      ConnectExecutorRepo: { findByExecutorId: returns(executorRow()) },
    }, async (service) => {
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'conflict' });
    });
  });

  it('maps a unique-constraint violation to conflict', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: returns(null),
        findByClaimId: returns(null),
        createClaim: control.throws(new Error('UNIQUE constraint failed: connect_executor_claims.claim_id')),
      },
      ConnectExecutorRepo: {
        findByExecutorId: returns(null),
        createExecutor: returns(undefined),
      },
    }, async (service) => {
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'conflict' });
    });
  });

  it('maps any other repository failure to failed', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByIdempotencyKey: control.throws(new Error('boom')),
      },
    }, async (service) => {
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'failed' });
    });
  });
});

describe('status', () => {
  it('answers not-found for an unknown claim', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByClaimId: returns(null) },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'not-found' });
    });
  });

  it('answers unauthorized without a matching bootstrap token', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByClaimId: returns(claimRow()) },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, null)).toEqual({ outcome: 'unauthorized' });
      expect(await service.status(CLAIM_ID, 'X'.repeat(43))).toEqual({ outcome: 'unauthorized' });
    });
  });

  it('reports pending and expired for undecided claims', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([returns(claimRow()), returns(claimRow({ expires_at: PAST }))]),
      },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'status', status: 'pending' });
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'status', status: 'expired' });
    });
  });

  it('returns the full acceptance identity for an accepted claim', async () => {
    await withService({
      ...deploymentIdentityMethods(),
      ConnectExecutorClaimRepo: { findByClaimId: returns(claimRow({ status: 'accepted' })) },
      ConnectExecutorRepo: { findByExecutorId: returns(executorRow()) },
      ConnectExecutorCredentialRepo: { findByTokenHash: returns(credentialRow()) },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({
        outcome: 'status', status: 'accepted', websiteDeploymentId: DEPLOYMENT_ID,
        executorId: EXECUTOR_ID, deviceId: DEVICE_ID, credentialGeneration: 1,
        websiteAccountId: USER_ID,
      });
    });
  });

  it('answers unauthorized for an accepted claim with a fenced credential', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByClaimId: returns(claimRow({ status: 'accepted' })) },
      ConnectExecutorRepo: { findByExecutorId: returns(executorRow({ credential_generation: 2 })) },
      ConnectExecutorCredentialRepo: { findByTokenHash: returns(credentialRow({ generation: 1 })) },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'unauthorized' });
    });
  });

  it('answers unauthorized for an accepted claim whose executor has no owner', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByClaimId: returns(claimRow({ status: 'accepted' })) },
      ConnectExecutorRepo: { findByExecutorId: returns(executorRow({ owner_user_id: null })) },
      ConnectExecutorCredentialRepo: { findByTokenHash: returns(credentialRow()) },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'unauthorized' });
    });
  });

  it('degrades a repository failure to failed', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByClaimId: control.throws(new Error('boom')) },
    }, async (service) => {
      expect(await service.status(CLAIM_ID, BOOTSTRAP_TOKEN)).toEqual({ outcome: 'failed' });
    });
  });
});

describe('review', () => {
  it('finds a claim by short code hash', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByCodeHash: control.once(returns(claimRow())) },
      ConnectExecutorRepo: { findByExecutorId: returns(executorRow()) },
    }, async (service) => {
      const result = await service.review({ code: 'ABCD-EFGH' });
      expect(result).toMatchObject({ outcome: 'found', status: 'pending' });
    });
  });

  it('answers not-found when the claim or its executor is missing', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([returns(null), returns(claimRow())]),
      },
      ConnectExecutorRepo: { findByExecutorId: returns(null) },
    }, async (service) => {
      expect(await service.review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });
      expect(await service.review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });
    });
  });

  it('degrades a repository failure to failed', async () => {
    await withService({
      ConnectExecutorClaimRepo: { findByClaimId: control.throws(new Error('boom')) },
    }, async (service) => {
      expect(await service.review({ claimId: CLAIM_ID })).toEqual({ outcome: 'failed' });
    });
  });
});

describe('decide', () => {
  it('rejects non-browser actors as not-found', async () => {
    await withService({}, async (service) => {
      expect(await service.decide(deviceActor, decisionInput())).toEqual({ outcome: 'not-found' });
    });
  });

  it('answers not-found for an unknown claim and expired past the deadline', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([returns(null), returns(claimRow({ expires_at: PAST }))]),
      },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput())).toEqual({ outcome: 'not-found' });
      expect(await service.decide(browserActor, decisionInput())).toEqual({ outcome: 'expired' });
    });
  });

  it('replays an identical accepted decision idempotently', async () => {
    await withService({
      ...deploymentIdentityMethods(),
      ConnectExecutorClaimRepo: {
        findByClaimId: returns(claimRow({
          status: 'accepted', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
        })),
      },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput('accept'))).toEqual({
        outcome: 'accepted', websiteDeploymentId: DEPLOYMENT_ID,
      });
    });
  });

  it('replays an identical denied decision idempotently and flags foreign replays', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([
          returns(claimRow({
            status: 'denied', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
          returns(claimRow({
            status: 'denied', decided_by_user_id: 'usr_intruder', decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
        ]),
      },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'denied' });
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'replayed' });
    });
  });

  it('denies a pending claim', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([
          returns(claimRow()),
          returns(claimRow({ status: 'denied', decided_by_user_id: USER_ID })),
        ]),
        denyPending: control.once(returns(undefined)),
      },
      ConnectExecutorAuditRepo: { appendEvent: control.once(returns(undefined)) },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'denied' });
    });
  });

  it('reports replayed when the deny lost a decision race', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([
          returns(claimRow()),
          returns(claimRow({ status: 'accepted', decided_by_user_id: 'usr_intruder' })),
        ]),
        denyPending: control.once(returns(undefined)),
      },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput('deny'))).toEqual({ outcome: 'replayed' });
    });
  });

  it('accepts a pending claim, fences the owner, and mints the generation-1 credential', async () => {
    await withService({
      ...deploymentIdentityMethods(),
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([
          returns(claimRow()),
          returns(claimRow({
            status: 'accepted', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
        ]),
        acceptPending: control.once(returns(undefined)),
      },
      ConnectExecutorRepo: {
        acceptOwner: control.once(returns(undefined)),
        findByExecutorId: returns(executorRow()),
      },
      ConnectExecutorCredentialRepo: { createCredential: control.once(returns(undefined)) },
      ConnectExecutorAuditRepo: { appendEvent: control.once(returns(undefined)) },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput('accept'))).toEqual({
        outcome: 'accepted', websiteDeploymentId: DEPLOYMENT_ID,
      });
    });
  });

  it('reports replayed when the accept lost a decision race', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([
          returns(claimRow()),
          returns(claimRow({ status: 'denied', decided_by_user_id: 'usr_intruder' })),
        ]),
        acceptPending: control.once(returns(undefined)),
      },
    }, async (service) => {
      expect(await service.decide(browserActor, decisionInput('accept'))).toEqual({ outcome: 'replayed' });
    });
  });

  // The service returns acceptClaim's promise without awaiting, so this
  // invariant violation rejects out of decide (the logic @transaction wrapper
  // and controller catch own it in production) rather than mapping to failed.
  it('rejects when the owner invariant does not hold after acceptance', async () => {
    await withService({
      ConnectExecutorClaimRepo: {
        findByClaimId: control.calls([
          returns(claimRow()),
          returns(claimRow({
            status: 'accepted', decided_by_user_id: USER_ID, decision_idempotency_key: IDEMPOTENCY_KEY,
          })),
        ]),
        acceptPending: returns(undefined),
      },
      ConnectExecutorRepo: {
        acceptOwner: returns(undefined),
        findByExecutorId: returns(executorRow({ credential_generation: 7 })),
      },
    }, async (service) => {
      await expect(service.decide(browserActor, decisionInput('accept')))
        .rejects.toThrow('Claim owner invariant failed');
    });
  });
});

// Not covered here: ConnectExecutorLogic.decide's claim-decision queue and the
// @transaction wrappers (createClaim/decideTransaction/rename/revoke). The
// sqlstack @transaction decorator wraps the method beneath the .methods seam,
// so exercising them requires a real database — they belong to the database
// tier (test/integration).

describe('list / presence / detail', () => {
  it('lists owner executors for browser sessions and nothing for devices', async () => {
    await withService({
      ConnectExecutorRepo: { listByOwner: control.once(returns([executorRow()])) },
    }, async (service) => {
      expect(await service.list(browserActor)).toHaveLength(1);
      expect(await service.list(deviceActor)).toEqual([]);
    });
  });

  it('reports offline presence from the in-process registry when no coordinator routes', async () => {
    await withService({}, async (service) => {
      expect(await service.presence(EXECUTOR_ID)).toBe('offline');
    });
  });

  it('answers detail found for the owner, not-found for others, failed on errors', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(executorRow()),
          returns(executorRow({ owner_user_id: 'usr_someoneelse' })),
          control.throws(new Error('boom')),
        ]),
      },
    }, async (service) => {
      expect(await service.detail(browserActor, EXECUTOR_ID)).toMatchObject({ outcome: 'found' });
      expect(await service.detail(browserActor, EXECUTOR_ID)).toEqual({ outcome: 'not-found' });
      expect(await service.detail(browserActor, EXECUTOR_ID)).toEqual({ outcome: 'failed' });
    });
  });
});

describe('rename', () => {
  const renameInput = {
    kind: 'executor.rename.request' as const, protocolVersion: '1.0' as const,
    executorId: EXECUTOR_ID, displayName: 'New Name',
    idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  };

  it('renames an owned active executor and audits the change', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(executorRow()),
          returns(executorRow({ display_name: 'New Name' })),
        ]),
        renameOwned: control.once(returns(undefined)),
      },
      ConnectExecutorAuditRepo: { appendEvent: control.once(returns(undefined)) },
    }, async (service) => {
      const result = await service.rename(browserActor, renameInput);
      expect(result).toMatchObject({ outcome: 'renamed', executor: { display_name: 'New Name' } });
    });
  });

  it('rejects non-owners, non-active executors, and device actors as not-found', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(null),
          returns(executorRow({ state: 'revoked' })),
        ]),
        renameOwned: control.never(),
      },
    }, async (service) => {
      expect(await service.rename(deviceActor, renameInput)).toEqual({ outcome: 'not-found' });
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'not-found' });
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'not-found' });
    });
  });

  it('answers not-found when the rename did not stick and failed on write errors', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(executorRow()),
          returns(executorRow({ display_name: 'Old Name' })),
          returns(executorRow()),
        ]),
        renameOwned: control.calls([returns(undefined), control.throws(new Error('boom'))]),
      },
    }, async (service) => {
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'not-found' });
      expect(await service.rename(browserActor, renameInput)).toEqual({ outcome: 'failed' });
    });
  });
});

describe('revoke', () => {
  const revokeInput = {
    kind: 'executor.action.request' as const, protocolVersion: '1.0' as const,
    executorId: EXECUTOR_ID, action: 'revoke' as const,
    idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  };

  it('revokes an owned executor and bumps the credential fence', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(executorRow()),
          returns(executorRow({ state: 'revoked', credential_generation: 2 })),
        ]),
        revokeOwned: control.once(returns(undefined)),
      },
      ConnectExecutorCredentialRepo: { revokeForExecutor: control.once(returns(undefined)) },
      ConnectExecutorAuditRepo: { appendEvent: control.once(returns(undefined)) },
    }, async (service) => {
      const result = await service.revoke(browserActor, revokeInput);
      expect(result).toMatchObject({ outcome: 'revoked', executor: { state: 'revoked' } });
    });
  });

  it('short-circuits an already revoked executor idempotently', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: returns(executorRow({ state: 'revoked' })),
        revokeOwned: control.never(),
      },
    }, async (service) => {
      expect(await service.revoke(browserActor, revokeInput)).toMatchObject({ outcome: 'revoked' });
    });
  });

  it('rejects unknown executors and non-browser actors as not-found', async () => {
    await withService({
      ConnectExecutorRepo: { findByExecutorId: returns(null), revokeOwned: control.never() },
    }, async (service) => {
      expect(await service.revoke(deviceActor, revokeInput)).toEqual({ outcome: 'not-found' });
      expect(await service.revoke(browserActor, revokeInput)).toEqual({ outcome: 'not-found' });
    });
  });

  it('fails when the credential fence invariant does not hold', async () => {
    await withService({
      ConnectExecutorRepo: {
        findByExecutorId: control.calls([
          returns(executorRow()),
          returns(executorRow({ state: 'revoked', credential_generation: 1 })),
        ]),
        revokeOwned: returns(undefined),
      },
      ConnectExecutorCredentialRepo: { revokeForExecutor: returns(undefined) },
    }, async (service) => {
      expect(await service.revoke(browserActor, revokeInput)).toEqual({ outcome: 'failed' });
    });
  });
});
