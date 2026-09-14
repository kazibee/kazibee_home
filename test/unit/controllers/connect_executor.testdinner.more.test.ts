/**
 * Connect executor routes through root testApp over the original
 * configuration — mutation endpoints and error mappings (sibling of
 * connect_executor.testdinner.test.ts). Historical case names remain stable.
 *
 * Endpoints whose logic methods are @transaction-wrapped (createClaim,
 * decideClaim, rename, revoke) are driven with ConnectExecutorLogic replaced
 * through singular .method controls, so the controller mapping (success shape
 * plus every domain outcome → status) is exercised for real while no
 * transaction body ever runs. Parser 400/409s and auth 401/403s run the real
 * graph; read paths (claim status accepted branch, review by short code) stub
 * only repos. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
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

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

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

// Session-authenticated repos: a reusable replacement description (same
// tokens/slots/descriptors/order as before), not an application constructor.
const browserSession = () => testStub()
  .method(ConnectBrowserSessionRepo, 'findByTokenHash', returns(sessionRow()))
  .method(ConnectBrowserSessionRepo, 'touchSession', returns(undefined))
  .method(ConnectAccountRepo, 'findByUserId', returns(accountRow()));

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

type RequestInit = { method: string; path: string; headers?: Record<string, string>; query?: Record<string, string>; body?: unknown };
/** The built environment a caller hands in; this helper never constructs one. */
type Environment = {
  request(init: RequestInit): Promise<{ status: number; json(): Promise<unknown>; body?: { cancel(): Promise<void> } | null }>;
  verify(): Promise<void>;
};

/** Request-only helper: issues one request, owns the body, runs the verify checkpoint. */
async function request(env: Environment, init: RequestInit) {
  const response = await env.request(init);
  let payload: Record<string, unknown> | null = null;
  if (response.status === 202) {
    await response.body?.cancel(); // Status-only response still owns its HTTP body lease.
  } else {
    payload = await response.json() as Record<string, unknown>;
  }
  await env.verify();
  return { status: response.status, payload };
}

describe('POST /claims (createClaim controller mapping over stubbed logic)', () => {
  const post = (env: Environment, body: unknown, headers: Record<string, string> = { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN }) =>
    request(env, { method: 'POST', path: '/v1/connect/executors/claims', headers, body });

  it('answers 201 with the full challenge for a created claim', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.once(returns({ outcome: 'created', challenge: challenge() })))
        .build(),
      claimCreateBody(),
    );
    expect(status).toBe(201);
    expect(payload).toMatchObject({
      kind: 'executor.claim.challenge', protocolVersion: '1.0',
      claimId: CLAIM_ID, actorRole: 'claim_challenge', shortCode: 'ABCD-EFGH',
      correlationId: CORRELATION_ID,
    });
    expect(payload).not.toHaveProperty('executorId');
    expect(payload).not.toHaveProperty('deviceId');
  }));

  it('answers 200 for an idempotent retry', resourceCase(async () => {
    const { status } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.once(returns({ outcome: 'retry', challenge: challenge() })))
        .build(),
      claimCreateBody(),
    );
    expect(status).toBe(200);
  }));

  it('maps conflict, failed, and thrown unique violations onto 409/500/409', resourceCase(async () => {
    const conflict = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', returns({ outcome: 'conflict' }))
        .build(),
      claimCreateBody(),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.payload).toMatchObject({ kind: 'error', code: 'idempotency-conflict' });

    const failed = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', returns({ outcome: 'failed' }))
        .build(),
      claimCreateBody(),
    );
    expect(failed.status).toBe(500);
    expect(failed.payload).toMatchObject({ kind: 'error', code: 'invalid-envelope' });

    const unique = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.throws(new Error('UNIQUE constraint failed: claims.claim_id')))
        .build(),
      claimCreateBody(),
    );
    expect(unique.status).toBe(409);

    const thrown = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.throws(new Error('boom')))
        .build(),
      claimCreateBody(),
    );
    expect(thrown.status).toBe(500);
  }));

  it('answers 401 revoked without a bootstrap token', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.never())
        .build(),
      claimCreateBody(),
      {},
    );
    expect(status).toBe(401);
    expect(payload).toMatchObject({ kind: 'error', code: 'revoked' });
  }));

  it('answers 400 for an invalid envelope and 409 for a protocol mismatch', resourceCase(async () => {
    // windows/arm64 passes the OpenAPI schema but fails the parser's
    // platform/architecture pairing rule — reaching the controller branch.
    const invalid = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.never())
        .build(),
      claimCreateBody({ platform: 'windows', architecture: 'arm64' }),
    );
    expect(invalid.status).toBe(400);
    expect(invalid.payload).toMatchObject({ code: 'invalid-envelope', correlationId: CORRELATION_ID });

    // The OpenAPI schema pins protocolVersion to '1.0', so a mismatch is
    // rejected as schema validation before the parser runs. Over the original
    // configuration the production onRequestError shaper
    // (src/server/middleware/connect_request_error.ts, wired in
    // src/server/server.ts) maps that rejection onto the canonical 409
    // protocol-version-mismatch envelope; the earlier testDinner harness ran
    // with empty hooks and surfaced the framework's default 400 instead.
    const mismatch = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorLogic, 'createClaim', control.never())
        .build(),
      claimCreateBody({ protocolVersion: '2.0' }),
    );
    expect(mismatch.status).toBe(409);
    expect(mismatch.payload).toMatchObject({ kind: 'error', code: 'protocol-version-mismatch', correlationId: CORRELATION_ID });
  }));
});

describe('POST /claims/{claimId}/decision (decideClaim over stubbed logic)', () => {
  const post = (env: Environment, body: unknown, headers: Record<string, string> = ownerHeaders()) =>
    request(env, {
      method: 'POST', path: `/v1/connect/executors/claims/${CLAIM_ID}/decision`, headers, body,
    });

  it('answers accepted with the website deployment id', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'decide', control.once(returns({ outcome: 'accepted', websiteDeploymentId: DEPLOYMENT_ID })))
        .build(),
      decisionBody('accept'),
    );
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.claim.decision.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION_ID,
      websiteDeploymentId: DEPLOYMENT_ID,
    });
  }));

  it('answers denied without a deployment id', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'decide', control.once(returns({ outcome: 'denied' })))
        .build(),
      decisionBody('deny'),
    );
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.claim.decision.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'denied', correlationId: CORRELATION_ID,
    });
  }));

  it('maps not-found, expired, replayed, failed, and throws onto 404/409/409/500/500', resourceCase(async () => {
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'decide', returns({ outcome: 'not-found' })).build(),
      decisionBody(),
    )).status).toBe(404);
    const expired = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'decide', returns({ outcome: 'expired' })).build(),
      decisionBody(),
    );
    expect(expired.status).toBe(409);
    expect(expired.payload).toMatchObject({ code: 'revoked', message: 'Claim is no longer actionable' });
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'decide', returns({ outcome: 'replayed' })).build(),
      decisionBody(),
    )).status).toBe(409);
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'decide', returns({ outcome: 'failed' })).build(),
      decisionBody(),
    )).status).toBe(500);
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'decide', control.throws(new Error('boom'))).build(),
      decisionBody(),
    )).status).toBe(500);
  }));

  it('answers 403 CSRF for a mutation without the CSRF header', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'decide', control.never())
        .build(),
      decisionBody(),
      { cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}` },
    );
    expect(status).toBe(403);
    expect(payload).toMatchObject({ code: 'invalid-envelope', message: 'CSRF validation failed' });
  }));

  it('answers 400 for a body/path claim id mismatch', resourceCase(async () => {
    const { status } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'decide', control.never())
        .build(),
      { ...decisionBody(), claimId: 'clm_otherid1' },
    );
    expect(status).toBe(400);
  }));
});

describe('POST /{executorId}/rename (rename over stubbed logic)', () => {
  const post = (env: Environment, body: unknown, query: Record<string, string> = { sessionId: SESSION_ID, correlationId: CORRELATION_ID }) =>
    request(env, {
      method: 'POST', path: `/v1/connect/executors/${EXECUTOR_ID}/rename`,
      headers: ownerHeaders(), query, body,
    });

  it('answers the detail response for a successful rename', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'rename', control.once(returns({ outcome: 'renamed', executor: executorRow({ display_name: 'New Name' }) })))
        .build(),
      renameBody(),
    );
    expect(status).toBe(200);
    expect(payload).toMatchObject({
      kind: 'executor.detail.response', protocolVersion: '1.0',
      executor: {
        executorId: EXECUTOR_ID, displayName: 'New Name', state: 'active',
        online: false, presence: 'offline',
      },
      deviceId: DEVICE_ID, actorRole: 'executor_device', correlationId: CORRELATION_ID,
    });
  }));

  it('maps not-found, failed, and throws onto 404/500/500', resourceCase(async () => {
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'rename', returns({ outcome: 'not-found' })).build(),
      renameBody(),
    )).status).toBe(404);
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'rename', returns({ outcome: 'failed' })).build(),
      renameBody(),
    )).status).toBe(500);
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'rename', control.throws(new Error('boom'))).build(),
      renameBody(),
    )).status).toBe(500);
  }));

  it('answers 400 when the body and query correlation ids disagree', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'rename', control.never())
        .build(),
      renameBody(),
      { sessionId: SESSION_ID, correlationId: 'cor_different' },
    );
    expect(status).toBe(400);
    expect(payload).toMatchObject({ code: 'invalid-envelope', correlationId: CORRELATION_ID });
  }));

  it('answers 400 for an invalid rename envelope', resourceCase(async () => {
    const { status } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'rename', control.never())
        .build(),
      renameBody({ displayName: '' }),
    );
    expect(status).toBe(400);
  }));
});

describe('POST /{executorId}/revoke (revoke over stubbed logic)', () => {
  const post = (env: Environment, body: unknown) =>
    request(env, {
      method: 'POST', path: `/v1/connect/executors/${EXECUTOR_ID}/revoke`,
      headers: ownerHeaders(),
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID }, body,
    });

  it('answers the action response for a successful revoke', resourceCase(async () => {
    const { status, payload } = await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorLogic, 'revoke', control.once(returns({ outcome: 'revoked', executor: executorRow({ state: 'revoked' }) })))
        .build(),
      revokeBody(),
    );
    expect(status).toBe(200);
    expect(payload).toEqual({
      kind: 'executor.action.response', protocolVersion: '1.0',
      executorId: EXECUTOR_ID, state: 'revoked', correlationId: CORRELATION_ID,
    });
  }));

  it('maps not-found, failed, and throws onto 404/500/500', resourceCase(async () => {
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'revoke', returns({ outcome: 'not-found' })).build(),
      revokeBody(),
    )).status).toBe(404);
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'revoke', returns({ outcome: 'failed' })).build(),
      revokeBody(),
    )).status).toBe(500);
    expect((await post(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession()).method(ConnectExecutorLogic, 'revoke', control.throws(new Error('boom'))).build(),
      revokeBody(),
    )).status).toBe(500);
  }));
});

describe('read paths over the real graph (repo stubs only)', () => {
  it('GET claim status reports the full acceptance identity', resourceCase(async () => {
    const { status, payload } = await request(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorClaimRepo, 'findByClaimId', returns(claimRow({ status: 'accepted' })))
        .method(ConnectExecutorRepo, 'findByExecutorId', returns(executorRow()))
        .method(ConnectExecutorCredentialRepo, 'findByTokenHash', returns({
          credential_id: 'crd_abcdefgh', executor_id: EXECUTOR_ID, generation: 1,
          token_hash: sha256(BOOTSTRAP_TOKEN), status: 'active',
          created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
        }))
        .method(ConnectWebsiteDeploymentIdentityRepo, 'findSingleton', returns({ website_deployment_id: DEPLOYMENT_ID }))
        .build(),
      {
        method: 'GET',
        path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
        headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
        query: { correlationId: CORRELATION_ID },
      },
    );
    expect(status).toBe(200);
    // Canonical claimStatusResponse is closed: executorId/deviceId/
    // credentialGeneration/websiteAccountId must not leak onto the wire.
    expect(payload).toEqual({
      kind: 'executor.claim.status.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION_ID,
      websiteDeploymentId: DEPLOYMENT_ID,
    });
  }));

  it('GET claim status answers 400 for a malformed claim id', resourceCase(async () => {
    const { status } = await request(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .method(ConnectExecutorClaimRepo, 'findByClaimId', control.never())
        .build(),
      {
        method: 'GET',
        path: '/v1/connect/executors/claims/not-a-claim/status',
        headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
        query: { correlationId: CORRELATION_ID },
      },
    );
    expect(status).toBe(400);
  }));

  it('GET claim review resolves a short code lookup', resourceCase(async () => {
    const { status, payload } = await request(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorClaimRepo, 'findByCodeHash', control.once(returns(claimRow())))
        .method(ConnectExecutorRepo, 'findByExecutorId', returns(executorRow()))
        .build(),
      {
        method: 'GET',
        path: '/v1/connect/executors/claims/review/ABCD-EFGH',
        headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
        query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
      },
    );
    expect(status).toBe(200);
    expect(payload).toMatchObject({ kind: 'executor.claim.review.response', status: 'pending' });
  }));

  it('GET claim review answers 400 for a garbage lookup value', resourceCase(async () => {
    const { status } = await request(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorClaimRepo, 'findByClaimId', control.never())
        .method(ConnectExecutorClaimRepo, 'findByCodeHash', control.never())
        .build(),
      {
        method: 'GET',
        path: '/v1/connect/executors/claims/review/garbage-value',
        headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
        query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
      },
    );
    expect(status).toBe(400);
  }));

  it('GET executor detail returns the summary for the owner', resourceCase(async () => {
    const { status, payload } = await request(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorRepo, 'findByExecutorId', returns(executorRow()))
        .build(),
      {
        method: 'GET',
        path: `/v1/connect/executors/${EXECUTOR_ID}`,
        headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
        query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
      },
    );
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
  }));

  it('GET executor detail answers 404 for an executor owned by someone else', resourceCase(async () => {
    const { status, payload } = await request(
      await testApp(CONFIG).select({ server: { module: ['connectExecutors'] } })
        .use(browserSession())
        .method(ConnectExecutorRepo, 'findByExecutorId', returns(executorRow({ owner_user_id: 'usr_other0001' })))
        .build(),
      {
        method: 'GET',
        path: `/v1/connect/executors/${EXECUTOR_ID}`,
        headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
        query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
      },
    );
    expect(status).toBe(404);
    expect(payload).toMatchObject({ code: 'invalid-envelope', message: 'Executor not found' });
  }));
});
