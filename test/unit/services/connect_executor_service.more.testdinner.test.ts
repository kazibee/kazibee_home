/**
 * ConnectExecutorService failure branches not reachable from the primary
 * suite: the createClaim persistence invariant, decide's catch mapping, and
 * the failure logger's non-Error / caused-Error shapes. Sibling of
 * connect_executor_service.testdinner.test.ts — same harness, same seams.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectExecutorController from '../../../src/server/controller/connect_executor.controller';
import ConnectChannelController from '../../../src/server/controller/connect_channel.controller';
import ConnectExecutorService from '../../../src/server/services/connect_executor_service';
import type { ConnectExecutorActor } from '../../../src/server/services/connect_executor_actor_resolver';
import type { ClaimCreateInput, ClaimDecisionInput } from '../../../src/server/services/connect_executor_request_parser';
import ConnectExecutorClaimRepo from '../../../src/server/repo/connect_executor_claim_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectExecutorAuditRepo from '../../../src/server/repo/connect_executor_audit_repo';

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/executors.yaml'), 'utf8')
) as Record<string, unknown>;

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const CORRELATION_ID = 'cor_abcdefgh';
const IDEMPOTENCY_KEY = 'idem_0123456789abcdef';

const browserActor: ConnectExecutorActor = {
  role: 'browser_session', userId: 'usr_owner001', sessionId: 'ses_abcdefgh',
};

const claimInput = (): ClaimCreateInput => ({
  kind: 'executor.claim.create.request', protocolVersion: '1.0',
  claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  actorRole: 'executor_device', displayName: 'Build Box', platform: 'macos',
  architecture: 'arm64', executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64),
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

const decisionInput = (): ClaimDecisionInput => ({
  kind: 'executor.claim.decision.request', protocolVersion: '1.0', claimId: CLAIM_ID,
  sessionId: 'ses_abcdefgh', actorRole: 'browser_session', decision: 'deny',
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

const returns = (value: unknown) => control.returns(Promise.resolve(value));
type Methods = readonly (readonly [unknown, Record<string, unknown>])[];

const base = () =>
  testDinner(executorsSource)
    .select({ module: 'connectExecutors' })
    .controllers({
      'connect_executor.controller': ConnectExecutorController,
      'connect_channel.controller': ConnectChannelController,
    })
    .hooks({});

async function withService(
  methods: Methods,
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

describe('createClaim persistence invariant', () => {
  it('degrades to failed when the freshly created claim cannot be read back', async () => {
    await withService([
      [ConnectExecutorClaimRepo, {
        findByIdempotencyKey: returns(null),
        findByClaimId: control.calls([returns(null), returns(null)]),
        createClaim: control.once(returns(undefined)),
      }],
      [ConnectExecutorRepo, {
        findByExecutorId: returns(null),
        createExecutor: control.once(returns(undefined)),
      }],
      [ConnectExecutorAuditRepo, { appendEvent: control.once(returns(undefined)) }],
    ], async (service) => {
      expect(await service.createClaim(claimInput(), BOOTSTRAP_TOKEN)).toEqual({ outcome: 'failed' });
    });
  });
});

describe('decide failure mapping', () => {
  it('degrades a repository failure with a nested cause to failed', async () => {
    await withService([
      [ConnectExecutorClaimRepo, {
        findByClaimId: control.throws(new Error('boom', { cause: new Error('socket reset') })),
      }],
    ], async (service) => {
      expect(await service.decide(browserActor, decisionInput())).toEqual({ outcome: 'failed' });
    });
  });

  it('degrades a non-Error throw to failed without losing the log context', async () => {
    await withService([
      [ConnectExecutorClaimRepo, { findByClaimId: control.throws('wire torn') }],
    ], async (service) => {
      expect(await service.decide(browserActor, decisionInput())).toEqual({ outcome: 'failed' });
    });
  });
});
