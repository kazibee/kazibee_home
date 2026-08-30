/**
 * Connect executor routes through testDinner (no server, no database).
 *
 * Real production source (src/server/openapi/connect/executors.yaml), the
 * real controller → parser/resolver → logic → service graph, executed
 * in-process. Only the SQL repo boundary is stubbed. Endpoints whose success
 * path runs inside a sqlstack @transaction (createClaim, decideClaim,
 * rename, revoke) are exercised elsewhere against a migrated database and
 * are intentionally not driven to their transactional branch here.
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

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/executors.yaml'), 'utf8')
) as Record<string, unknown>;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const BOOTSTRAP_TOKEN = 'B'.repeat(43);
const SESSION_TOKEN = 'S'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const SESSION_ID = 'ses_abcdefgh';
const CORRELATION_ID = 'cor_abcdefgh';
const USER_ID = 'usr_owner001';
const FUTURE = '2999-01-01T00:00:00.000Z';

const pendingClaim = (overrides: Record<string, unknown> = {}) => ({
  claim_id: CLAIM_ID,
  executor_id: EXECUTOR_ID,
  bootstrap_token_hash: sha256(BOOTSTRAP_TOKEN),
  short_code_hash: sha256('code'),
  idempotency_key: 'idem_0123456789abcdef',
  envelope_hash: sha256('envelope'),
  status: 'pending',
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: FUTURE,
  decided_at: null,
  decided_by_user_id: null,
  decision_idempotency_key: null,
  ...overrides,
});

const executorRow = (overrides: Record<string, unknown> = {}) => ({
  executor_id: EXECUTOR_ID,
  device_id: DEVICE_ID,
  owner_user_id: USER_ID,
  display_name: 'Build Box',
  platform: 'macos',
  architecture: 'arm64',
  executor_version: '1.2.3',
  key_fingerprint: 'a'.repeat(64),
  state: 'active',
  credential_generation: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-02T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
});

const sessionRow = () => ({
  session_id: SESSION_ID,
  user_id: USER_ID,
  session_token_hash: sha256(SESSION_TOKEN),
  csrf_token_hash: sha256('C'.repeat(43)),
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
  idle_expires_at: FUTURE,
  absolute_expires_at: FUTURE,
  revoked_at: null,
});

const accountRow = () => ({
  user_id: USER_ID,
  username: 'owner',
  email: 'owner@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z',
  password_hash: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

// Session-authenticated repos: cookie hash → session row → account row.
const browserSessionMethods = () => ({
  ConnectBrowserSessionRepo: {
    findByTokenHash: control.returns(Promise.resolve(sessionRow())),
    touchSession: control.returns(Promise.resolve(undefined)),
  },
  ConnectAccountRepo: {
    findByUserId: control.returns(Promise.resolve(accountRow())),
  },
});

const base = () =>
  testDinner(executorsSource)
    .select({ module: 'connectExecutors' })
    .controllers({
      'connect_executor.controller': ConnectExecutorController,
      'connect_channel.controller': ConnectChannelController,
    })
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

describe('connect executor routes through testDinner (no server, no database)', () => {
  it('GET claim status reports pending when the bootstrap token matches the claim', async () => {
    const env = await base()
      .methods({
        ConnectExecutorClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(pendingClaim()))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: 'executor.claim.status.response',
      protocolVersion: '1.0',
      claimId: CLAIM_ID,
      status: 'pending',
      correlationId: CORRELATION_ID,
    });
    await env.verify();
    await env.dispose();
  });

  it('GET claim status answers 401 revoked when the bootstrap token does not match', async () => {
    const env = await base()
      .methods({
        ConnectExecutorClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(pendingClaim()))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': 'X'.repeat(43) },
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
    await env.dispose();
  });

  it('GET claim status answers 404 for an unknown claim', async () => {
    const env = await base()
      .methods({
        ConnectExecutorClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(null))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: `/v1/connect/executors/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': BOOTSTRAP_TOKEN },
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'invalid-envelope' });
    await env.verify();
    await env.dispose();
  });

  it('GET claim review returns the safe review payload for a signed-in owner', async () => {
    const env = await base()
      .methods({
        ...browserSessionMethods(),
        ConnectExecutorClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(pendingClaim()))),
        },
        ConnectExecutorRepo: {
          findByExecutorId: control.once(control.returns(Promise.resolve(executorRow()))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: `/v1/connect/executors/claims/review/${CLAIM_ID}`,
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: 'executor.claim.review.response',
      protocolVersion: '1.0',
      claimId: CLAIM_ID,
      status: 'pending',
      displayName: 'Build Box',
      platform: 'macos',
      architecture: 'arm64',
      executorVersion: '1.2.3',
      keyFingerprint: 'a'.repeat(64),
      expiresAt: FUTURE,
      correlationId: CORRELATION_ID,
    });
    await env.verify();
    await env.dispose();
  });

  it('GET executor list returns owner executors with live (offline) presence', async () => {
    const env = await base()
      .methods({
        ...browserSessionMethods(),
        ConnectExecutorRepo: {
          listByOwner: control.once(control.returns(Promise.resolve([executorRow()]))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/executors/',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: 'executor.list.response',
      protocolVersion: '1.0',
      executors: [{
        executorId: EXECUTOR_ID,
        displayName: 'Build Box',
        state: 'active',
        online: false,
        presence: 'offline',
        protocolVersion: '1.0',
      }],
      correlationId: CORRELATION_ID,
    });
    await env.verify();
    await env.dispose();
  });

  it('GET executor list answers 401 revoked when the session cookie resolves to nothing', async () => {
    const env = await base()
      .methods({
        ConnectBrowserSessionRepo: {
          findByTokenHash: control.once(control.returns(Promise.resolve(null))),
        },
        ConnectExecutorRepo: {
          listByOwner: control.never(),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/executors/',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID, correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
    await env.dispose();
  });

  it('GET executor list rejects a malformed sessionId as an invalid envelope (400)', async () => {
    const env = await base()
      .methods({
        ConnectBrowserSessionRepo: { findByTokenHash: control.never() },
        ConnectExecutorRepo: { listByOwner: control.never() },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/executors/',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: 'not-a-session', correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(400);
    await env.verify();
    await env.dispose();
  });
});
