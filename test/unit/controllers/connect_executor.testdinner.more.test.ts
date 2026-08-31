/**
 * Connect executor routes through testDinner — mutation endpoints and error
 * mappings (sibling of connect_executor.testdinner.test.ts).
 *
 * Endpoints whose logic methods are @transaction-wrapped (createClaim,
 * decideClaim, rename, revoke) are driven with ConnectExecutorLogic stubbed
 * via .methods, so the controller mapping (success shape plus every domain
 * outcome → status) is exercised for real while no transaction body ever
 * runs. Parser 400/409s and auth 401/403s run the real graph; read paths
 * (claim status accepted branch, review by short code) stub only repos.
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
import ConnectExecutorLogic from '../../../src/server/logic/connect_executor.logic';
import ConnectExecutorClaimRepo from '../../../src/server/repo/connect_executor_claim_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectWebsiteDeploymentIdentityRepo from '../../../src/server/repo/connect_website_deployment_identity_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';

// Presence must resolve through the in-process registry, not a coordinator.
delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
delete process.env.EXECUTOR_COORDINATOR;

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/executors.yaml'), 'utf8')
) as Record<string, unknown>;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const SESSION_TOKEN = 'S'.repeat(43);
const CSRF_TOKEN = 'C'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const SESSION_ID = 'ses_abcdefgh';
const CORRELATION_ID = 'cor_abcdefgh';
const IDEMPOTENCY_KEY = 'idem_0123456789abcdef';
const USER_ID = 'usr_owner001';
const FUTURE = '2999-01-01T00:00:00.000Z';
const DEPLOYMENT_ID = `wdp_${'a'.repeat(32)}`;

const returns = (value: unknown) => control.returns(Promise.resolve(value));

const executorRow = (overrides: Record<string, unknown> = {}) => ({
  executor_id: EXECUTOR_ID, device_id: DEVICE_ID, owner_user_id: USER_ID,
  display_name: 'Build Box', platform: 'macos', architecture: 'arm64',
  executor_version: '1.2.3', key_fingerprint: 'a'.repeat(64), state: 'active',
  credential_generation: 1, created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const claimRow = (overrides: Record<string, unknown> = {}) => ({
  claim_id: CLAIM_ID, executor_id: EXECUTOR_ID,
  bootstrap_token_hash: sha256(BOOTSTRAP_TOKEN), short_code_hash: sha256('ABCD-EFGH'),
  idempotency_key: IDEMPOTENCY_KEY, envelope_hash: sha256('envelope'),
  status: 'pending', created_at: '2026-01-01T00:00:00.000Z', expires_at: FUTURE,
  decided_at: null, decided_by_user_id: null, decision_idempotency_key: null,
  ...overrides,
});

const sessionRow = () => ({
  session_id: SESSION_ID, user_id: USER_ID,
  session_token_hash: sha256(SESSION_TOKEN), csrf_token_hash: sha256(CSRF_TOKEN),
  status: 'active', created_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z', idle_expires_at: FUTURE,
  absolute_expires_at: FUTURE, revoked_at: null,
});

const accountRow = () => ({
  user_id: USER_ID, username: 'owner', email: 'owner@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z', password_hash: null,
  status: 'active', created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const browserSessionMethods = (): Methods => ([
  [ConnectBrowserSessionRepo, {
    findByTokenHash: returns(sessionRow()),
    touchSession: returns(undefined),
  }],
  [ConnectAccountRepo, { findByUserId: returns(accountRow()) }],
]);

const ownerHeaders = () => ({
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

const claimCreateBody = (overrides: Record<string, unknown> = {}) => ({
  kind: 'executor.claim.create.request', protocolVersion: '1.0',
  claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  actorRole: 'executor_device', displayName: 'Build Box', platform: 'macos',
  architecture: 'arm64', executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64),
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  ...overrides,
});

const challenge = () => ({
  claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  claimUrl: `https://connect.kazibee.example/claim/${CLAIM_ID}`, shortCode: 'ABCD-EFGH',
  displayName: 'Build Box', platform: 'macos', architecture: 'arm64',
  executorVersion: '1.2.3', keyFingerprint: 'a'.repeat(64), expiresAt: FUTURE,
});

const decisionBody = (decision: 'accept' | 'deny' = 'accept') => ({
  kind: 'executor.claim.decision.request', protocolVersion: '1.0', claimId: CLAIM_ID,
  sessionId: SESSION_ID, actorRole: 'browser_session', decision,
  idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

const renameBody = (overrides: Record<string, unknown> = {}) => ({
  kind: 'executor.rename.request', protocolVersion: '1.0', executorId: EXECUTOR_ID,
  displayName: 'New Name', idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
  ...overrides,
});

const revokeBody = () => ({
  kind: 'executor.action.request', protocolVersion: '1.0', executorId: EXECUTOR_ID,
  action: 'revoke', idempotencyKey: IDEMPOTENCY_KEY, correlationId: CORRELATION_ID,
});

const base = () =>
  testDinner(executorsSource)
    .select({ module: 'connectExecutors' })
    .controllers({
      'connect_executor.controller': ConnectExecutorController,
      'connect_channel.controller': ConnectChannelController,
    })
    .hooks({});

type Methods = readonly (readonly [unknown, Record<string, unknown>])[];

async function request(
  methods: Methods,
  init: { method: string; path: string; headers?: Record<string, string>; query?: Record<string, string>; body?: unknown },
) {
  const env = await base().methods(methods as never).build();
  try {
    const response = await env.dinner.request(init);
    const payload = response.status === 202 ? null : await response.json() as Record<string, unknown>;
    await env.verify();
    return { status: response.status, payload };
  } finally {
    await env.dispose();
  }
}

describe('POST /claims (createClaim controller mapping over stubbed logic)', () => {
  const post = (methods: Methods, body: unknown, headers: Record<string, string> = { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN }) =>
    request(methods, { method: 'POST', path: '/v1/connect/executors/claims', headers, body });

  it('answers 201 with the full challenge for a created claim', async () => {
    const { status, payload } = await post([
      [ConnectExecutorLogic, {
        createClaim: control.once(returns({ outcome: 'created', challenge: challenge() })),
      }],
    ], claimCreateBody());
    expect(status).toBe(201);
    expect(payload).toMatchObject({
      kind: 'executor.claim.challenge', protocolVersion: '1.0',
      claimId: CLAIM_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
      actorRole: 'claim_challenge', shortCode: 'ABCD-EFGH',
      correlationId: CORRELATION_ID,
    });
  });

  it('answers 200 for an idempotent retry', async () => {
    const { status } = await post([
      [ConnectExecutorLogic, {
        createClaim: control.once(returns({ outcome: 'retry', challenge: challenge() })),
      }],
    ], claimCreateBody());
    expect(status).toBe(200);
  });

  it('maps conflict, failed, and thrown unique violations onto 409/500/409', async () => {
    const conflict = await post([
      [ConnectExecutorLogic, { createClaim: returns({ outcome: 'conflict' }) }],
    ], claimCreateBody());
    expect(conflict.status).toBe(409);
    expect(conflict.payload).toMatchObject({ kind: 'error', code: 'idempotency-conflict' });

    const failed = await post([
      [ConnectExecutorLogic, { createClaim: returns({ outcome: 'failed' }) }],
    ], claimCreateBody());
    expect(failed.status).toBe(500);
    expect(failed.payload).toMatchObject({ kind: 'error', code: 'invalid-envelope' });

    const unique = await post([
      [ConnectExecutorLogic, {
        createClaim: control.throws(new Error('UNIQUE constraint failed: claims.claim_id')),
      }],
    ], claimCreateBody());
    expect(unique.status).toBe(409);

    const thrown = await post([
      [ConnectExecutorLogic, { createClaim: control.throws(new Error('boom')) }],
    ], claimCreateBody());
    expect(thrown.status).toBe(500);
  });

  it('answers 401 revoked without a bootstrap token', async () => {
    const { status, payload } = await post([
      [ConnectExecutorLogic, { createClaim: control.never() }],
    ], claimCreateBody(), {});
    expect(status).toBe(401);
    expect(payload).toMatchObject({ kind: 'error', code: 'revoked' });
  });

  it('answers 400 for an invalid envelope and 409 for a protocol mismatch', async () => {
    const invalid = await post([
      [ConnectExecutorLogic, { createClaim: control.never() }],
    // windows/arm64 passes the OpenAPI schema but fails the parser's
    // platform/architecture pairing rule — reaching the controller branch.
    ], claimCreateBody({ platform: 'windows', architecture: 'arm64' }));
    expect(invalid.status).toBe(400);
    expect(invalid.payload).toMatchObject({ code: 'invalid-envelope', correlationId: CORRELATION_ID });

    // The OpenAPI schema pins protocolVersion to '1.0', so a mismatch is
    // rejected as schema validation (400) before the parser's 409 mapping
    // (which is covered directly in the parser unit tests).
    const mismatch = await post([
      [ConnectExecutorLogic, { createClaim: control.never() }],
    ], claimCreateBody({ protocolVersion: '2.0' }));
    expect(mismatch.status).toBe(400);
  });
});

describe('POST /claims/{claimId}/decision (decideClaim over stubbed logic)', () => {
  const post = (methods: Methods, body: unknown, headers = ownerHeaders()) =>
    request([ ...browserSessionMethods(), ...methods ], {
      method: 'POST', path: `/v1/connect/executors/claims/${CLAIM_ID}/decision`, headers, body,
    });

  it('answers accepted with the website deployment id', async () => {
    const { status, payload } = await post([
      [ConnectExecutorLogic, {
        decide: control.once(returns({ outcome: 'accepted', websiteDeploymentId: DEPLOYMENT_ID })),
      }],
    ], decisionBody('accept'));
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.claim.decision.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION_ID,
      websiteDeploymentId: DEPLOYMENT_ID,
    });
  });

  it('answers denied without a deployment id', async () => {
    const { status, payload } = await post([
      [ConnectExecutorLogic, { decide: control.once(returns({ outcome: 'denied' })) }],
    ], decisionBody('deny'));
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.claim.decision.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'denied', correlationId: CORRELATION_ID,
    });
  });

  it('maps not-found, expired, replayed, failed, and throws onto 404/409/409/500/500', async () => {
    expect((await post([ [ConnectExecutorLogic, { decide: returns({ outcome: 'not-found' }) }] ], decisionBody())).status).toBe(404);
    const expired = await post([ [ConnectExecutorLogic, { decide: returns({ outcome: 'expired' }) }] ], decisionBody());
    expect(expired.status).toBe(409);
    expect(expired.payload).toMatchObject({ code: 'revoked', message: 'Claim is no longer actionable' });
    expect((await post([ [ConnectExecutorLogic, { decide: returns({ outcome: 'replayed' }) }] ], decisionBody())).status).toBe(409);
    expect((await post([ [ConnectExecutorLogic, { decide: returns({ outcome: 'failed' }) }] ], decisionBody())).status).toBe(500);
    expect((await post([ [ConnectExecutorLogic, { decide: control.throws(new Error('boom')) }] ], decisionBody())).status).toBe(500);
  });

  it('answers 403 CSRF for a mutation without the CSRF header', async () => {
    const { status, payload } = await post(
      [ [ConnectExecutorLogic, { decide: control.never() }] ],
      decisionBody(),
      { cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}` },
    );
    expect(status).toBe(403);
    expect(payload).toMatchObject({ code: 'invalid-envelope', message: 'CSRF validation failed' });
  });

  it('answers 400 for a body/path claim id mismatch', async () => {
    const { status } = await post(
      [ [ConnectExecutorLogic, { decide: control.never() }] ],
      { ...decisionBody(), claimId: 'clm_otherid1' },
    );
    expect(status).toBe(400);
  });
});

describe('POST /{executorId}/rename (rename over stubbed logic)', () => {
  const post = (methods: Methods, body: unknown, query: Record<string, string> = { sessionId: SESSION_ID, correlationId: CORRELATION_ID }) =>
    request([ ...browserSessionMethods(), ...methods ], {
      method: 'POST', path: `/v1/connect/executors/${EXECUTOR_ID}/rename`,
      headers: ownerHeaders(), query, body,
    });

  it('answers the detail response for a successful rename', async () => {
    const { status, payload } = await post([
      [ConnectExecutorLogic, {
        rename: control.once(returns({ outcome: 'renamed', executor: executorRow({ display_name: 'New Name' }) })),
      }],
    ], renameBody());
    expect(status).toBe(200);
    expect(payload).toMatchObject({
      kind: 'executor.detail.response', protocolVersion: '1.0',
      executor: {
        executorId: EXECUTOR_ID, displayName: 'New Name', state: 'active',
        online: false, presence: 'offline',
      },
      deviceId: DEVICE_ID, actorRole: 'executor_device', correlationId: CORRELATION_ID,
    });
  });

  it('maps not-found, failed, and throws onto 404/500/500', async () => {
    expect((await post([ [ConnectExecutorLogic, { rename: returns({ outcome: 'not-found' }) }] ], renameBody())).status).toBe(404);
    expect((await post([ [ConnectExecutorLogic, { rename: returns({ outcome: 'failed' }) }] ], renameBody())).status).toBe(500);
    expect((await post([ [ConnectExecutorLogic, { rename: control.throws(new Error('boom')) }] ], renameBody())).status).toBe(500);
  });

  it('answers 400 when the body and query correlation ids disagree', async () => {
    const { status, payload } = await post(
      [ [ConnectExecutorLogic, { rename: control.never() }] ],
      renameBody(),
      { sessionId: SESSION_ID, correlationId: 'cor_different' },
    );
    expect(status).toBe(400);
    expect(payload).toMatchObject({ code: 'invalid-envelope', correlationId: CORRELATION_ID });
  });

  it('answers 400 for an invalid rename envelope', async () => {
    const { status } = await post(
      [ [ConnectExecutorLogic, { rename: control.never() }] ],
      renameBody({ displayName: '' }),
    );
    expect(status).toBe(400);
  });
});

describe('POST /{executorId}/revoke (revoke over stubbed logic)', () => {
  const post = (methods: Methods, body: unknown) =>
    request([ ...browserSessionMethods(), ...methods ], {
      method: 'POST', path: `/v1/connect/executors/${EXECUTOR_ID}/revoke`,
      headers: ownerHeaders(),
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID }, body,
    });

  it('answers the action response for a successful revoke', async () => {
    const { status, payload } = await post([
      [ConnectExecutorLogic, {
        revoke: control.once(returns({ outcome: 'revoked', executor: executorRow({ state: 'revoked' }) })),
      }],
    ], revokeBody());
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.action.response', protocolVersion: '1.0',
      executorId: EXECUTOR_ID, state: 'revoked', correlationId: CORRELATION_ID,
    });
  });

  it('maps not-found, failed, and throws onto 404/500/500', async () => {
    expect((await post([ [ConnectExecutorLogic, { revoke: returns({ outcome: 'not-found' }) }] ], revokeBody())).status).toBe(404);
    expect((await post([ [ConnectExecutorLogic, { revoke: returns({ outcome: 'failed' }) }] ], revokeBody())).status).toBe(500);
    expect((await post([ [ConnectExecutorLogic, { revoke: control.throws(new Error('boom')) }] ], revokeBody())).status).toBe(500);
  });
});

describe('read paths over the real graph (repo stubs only)', () => {
  it('GET claim status reports the full acceptance identity', async () => {
    const { status, payload } = await request([
      [ConnectExecutorClaimRepo, { findByClaimId: returns(claimRow({ status: 'accepted' })) }],
      [ConnectExecutorRepo, { findByExecutorId: returns(executorRow()) }],
      [ConnectExecutorCredentialRepo, {
        findByTokenHash: returns({
          credential_id: 'crd_abcdefgh', executor_id: EXECUTOR_ID, generation: 1,
          token_hash: sha256(BOOTSTRAP_TOKEN), status: 'active',
          created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
        }),
      }],
      [ConnectWebsiteDeploymentIdentityRepo, {
        findSingleton: returns({ website_deployment_id: DEPLOYMENT_ID }),
      }],
    ], {
      method: 'GET',
      path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      query: { correlationId: CORRELATION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.claim.status.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION_ID,
      websiteDeploymentId: DEPLOYMENT_ID, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
      credentialGeneration: 1, websiteAccountId: USER_ID,
    });
  });

  it('GET claim status answers 400 for a malformed claim id', async () => {
    const { status } = await request([
      [ConnectExecutorClaimRepo, { findByClaimId: control.never() }],
    ], {
      method: 'GET',
      path: '/v1/connect/executors/claims/not-a-claim/status',
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      query: { correlationId: CORRELATION_ID },
    });
    expect(status).toBe(400);
  });

  it('GET claim review resolves a short code lookup', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [ConnectExecutorClaimRepo, { findByCodeHash: control.once(returns(claimRow())) }],
      [ConnectExecutorRepo, { findByExecutorId: returns(executorRow()) }],
    ], {
      method: 'GET',
      path: '/v1/connect/executors/claims/review/ABCD-EFGH',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toMatchObject({ kind: 'executor.claim.review.response', status: 'pending' });
  });

  it('GET claim review answers 400 for a garbage lookup value', async () => {
    const { status } = await request([
      ...browserSessionMethods(),
      [ConnectExecutorClaimRepo, { findByClaimId: control.never(), findByCodeHash: control.never() }],
    ], {
      method: 'GET',
      path: '/v1/connect/executors/claims/review/garbage-value',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(status).toBe(400);
  });

  it('GET executor detail returns the summary for the owner', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [ConnectExecutorRepo, { findByExecutorId: returns(executorRow()) }],
    ], {
      method: 'GET',
      path: `/v1/connect/executors/${EXECUTOR_ID}`,
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.detail.response', protocolVersion: '1.0',
      executor: {
        executorId: EXECUTOR_ID, displayName: 'Build Box', state: 'active',
        online: false, presence: 'offline', protocolVersion: '1.0',
      },
      deviceId: DEVICE_ID, actorRole: 'executor_device',
      lastSeenAt: '2026-01-02T00:00:00.000Z', correlationId: CORRELATION_ID,
    });
  });

  it('GET executor detail answers 404 for an executor owned by someone else', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [ConnectExecutorRepo, { findByExecutorId: returns(executorRow({ owner_user_id: 'usr_other0001' })) }],
    ], {
      method: 'GET',
      path: `/v1/connect/executors/${EXECUTOR_ID}`,
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(status).toBe(404);
    expect(payload).toMatchObject({ code: 'invalid-envelope', message: 'Executor not found' });
  });
});
