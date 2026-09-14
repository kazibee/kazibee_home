/**
 * Executor enrollment HTTP responses validated against the canonical Kazi
 * Connect V1 schema (`@kazibee-internal/connect-protocol`), the same closed
 * definitions the CLI enforces. Regression guard for the Website drifting from
 * the shared contract: extra identity fields (executorId/deviceId on the
 * challenge; executorId/deviceId/credentialGeneration/websiteAccountId on an
 * accepted status) and a missing `x-kazi-protocol-version` response header
 * made the CLI refuse otherwise-successful enrollment answers.
 *
 * Routes run through root testApp over the original configuration. createClaim
 * (a @transaction-wrapped logic method) is driven with ConnectExecutorLogic
 * replaced through singular .method controls so the controller mapping runs for
 * real; claim status runs the real graph with only repos replaced.
 * resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import protocolSchema from '@kazibee-internal/connect-protocol/canonical/schemas/kazi-connect-v1.schema.json' with { type: 'json' };
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
import ConnectExecutorLogic from '../../../src/server/logic/connect_executor.logic';
import ConnectExecutorClaimRepo from '../../../src/server/repo/connect_executor_claim_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectWebsiteDeploymentIdentityRepo from '../../../src/server/repo/connect_website_deployment_identity_repo';

// Presence must resolve through the in-process registry, not a coordinator.
delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
delete process.env.EXECUTOR_COORDINATOR;

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const PROTOCOL_HEADER = 'x-kazi-protocol-version';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const CORRELATION_ID = 'cor_abcdefgh';
const IDEMPOTENCY_KEY = 'idem_0123456789abcdef';
const USER_ID = 'usr_owner001';
const FUTURE = '2999-01-01T00:00:00.000Z';
const DEPLOYMENT_ID = `wdp_${'a'.repeat(32)}`;

const returns = (value: unknown) => control.returns(Promise.resolve(value));

// Same compiled authority the CLI validates against: closed definitions, strict mode.
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(protocolSchema);
const schemaId = String((protocolSchema as { $id: string }).$id);
const validatorFor = (definition: 'claimChallenge' | 'claimStatusResponse') => {
  const validator = ajv.getSchema(`${schemaId}#/$defs/${definition}`);
  expect(validator, `missing canonical definition ${definition}`).toBeDefined();
  return validator!;
};
const expectCanonical = (definition: 'claimChallenge' | 'claimStatusResponse', payload: unknown) => {
  const validate = validatorFor(definition);
  expect(validate(payload), JSON.stringify(validate.errors, null, 2)).toBe(true);
};

const claimCreateBody = () => ({
  kind: 'executor.claim.create.request', protocolVersion: '1.0',
  claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  actorRole: 'executor_device', displayName: 'Build Box', platform: 'macos',
  architecture: 'arm64', executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64),
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

// The logic still hands the controller the full identity; the wire shape must drop it.
const challenge = () => ({
  claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  claimUrl: `https://connect.kazibee.example/claim/${CLAIM_ID}`, shortCode: 'ABCD-EFGH',
  displayName: 'Build Box', platform: 'macos', architecture: 'arm64',
  executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64), expiresAt: FUTURE,
});

const claimRow = (overrides: Record<string, unknown> = {}) => ({
  claim_id: CLAIM_ID, executor_id: EXECUTOR_ID,
  bootstrap_token_hash: sha256(BOOTSTRAP_TOKEN), short_code_hash: sha256('ABCD-EFGH'),
  idempotency_key: IDEMPOTENCY_KEY, envelope_hash: sha256('envelope'),
  status: 'pending', created_at: '2026-01-01T00:00:00.000Z', expires_at: FUTURE,
  decided_at: null, decided_by_user_id: null, decision_idempotency_key: null,
  ...overrides,
});

const executorRow = () => ({
  executor_id: EXECUTOR_ID, device_id: DEVICE_ID, owner_user_id: USER_ID,
  display_name: 'Build Box', platform: 'macos', architecture: 'arm64',
  executor_version: '1.2.3', key_fingerprint: 'a'.repeat(64), state: 'active',
  credential_generation: 1, created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
});

const credentialRow = () => ({
  credential_id: 'crd_abcdefgh', executor_id: EXECUTOR_ID, generation: 1,
  token_hash: sha256(BOOTSTRAP_TOKEN), status: 'active',
  created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
});

describe('executor enrollment responses match the canonical Kazi Connect V1 contract', () => {
  const createClaim = (outcome: 'created' | 'retry') =>
    testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .method(ConnectExecutorLogic, 'createClaim', control.once(returns({ outcome, challenge: challenge() })))
      .build();

  const expectChallenge = async (outcome: 'created' | 'retry', status: 201 | 200) => {
    const env = await createClaim(outcome);
    const response = await env.request({
      method: 'POST', path: '/v1/connect/executors/claims',
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN }, body: claimCreateBody(),
    });
    expect(response.status).toBe(status);
    expect(response.headers.get(PROTOCOL_HEADER)).toBe('1.0');
    const payload = await response.json() as Record<string, unknown>;
    expectCanonical('claimChallenge', payload);
    expect(payload).toEqual({
      kind: 'executor.claim.challenge', protocolVersion: '1.0',
      claimId: CLAIM_ID, actorRole: 'claim_challenge',
      claimUrl: `https://connect.kazibee.example/claim/${CLAIM_ID}`, shortCode: 'ABCD-EFGH',
      displayName: 'Build Box', platform: 'macos', architecture: 'arm64',
      executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64), expiresAt: FUTURE,
      correlationId: CORRELATION_ID,
    });
    await env.verify();
  };

  it('POST /claims (created → 201) answers a closed claimChallenge with the protocol header', resourceCase(async () => {
    await expectChallenge('created', 201);
  }));

  it('POST /claims (reused → 200) answers a closed claimChallenge with the protocol header', resourceCase(async () => {
    await expectChallenge('retry', 200);
  }));

  it('GET /claims/{claimId}/status (pending) answers a closed claimStatusResponse with the protocol header', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .method(ConnectExecutorClaimRepo, 'findByClaimId', control.once(returns(claimRow())))
      .build();
    const response = await env.request({
      method: 'GET', path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get(PROTOCOL_HEADER)).toBe('1.0');
    const payload = await response.json() as Record<string, unknown>;
    expectCanonical('claimStatusResponse', payload);
    expect(payload).toEqual({
      kind: 'executor.claim.status.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'pending', correlationId: CORRELATION_ID,
    });
    await env.verify();
  }));

  it('GET /claims/{claimId}/status (accepted) carries only websiteDeploymentId beyond the base envelope', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
      .method(ConnectExecutorClaimRepo, 'findByClaimId', returns(claimRow({ status: 'accepted' })))
      .method(ConnectExecutorRepo, 'findByExecutorId', returns(executorRow()))
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', returns(credentialRow()))
      .method(ConnectWebsiteDeploymentIdentityRepo, 'findSingleton', returns({ website_deployment_id: DEPLOYMENT_ID }))
      .build();
    const response = await env.request({
      method: 'GET', path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get(PROTOCOL_HEADER)).toBe('1.0');
    const payload = await response.json() as Record<string, unknown>;
    expectCanonical('claimStatusResponse', payload);
    expect(payload).toEqual({
      kind: 'executor.claim.status.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION_ID,
      websiteDeploymentId: DEPLOYMENT_ID,
    });
    for (const forbidden of ['executorId', 'deviceId', 'credentialGeneration', 'websiteAccountId']) {
      expect(payload).not.toHaveProperty(forbidden);
    }
    await env.verify();
  }));
});
