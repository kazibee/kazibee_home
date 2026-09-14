/**
 * Connect desktop routes (connect_desktop.controller) through root testApp
 * over the original configuration (no server, no database). Historical case
 * names remain stable.
 *
 * Real production desktops.yaml module selection, real controller → logic →
 * service → policy graph. Only the @Query repos and the deterministic
 * primitives (ConnectClock) are replaced through singular method controls.
 * resourceCase owns cleanup.
 *
 * Transactional branches (createClaim success, decide, rename, revoke) run
 * under sqlstack @transaction and need a live transaction context, so those
 * success paths are exercised at service boundaries below the decorator or
 * skipped; see the non-transactional claimStatus/review/list/detail coverage.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
import ConnectDesktopLogic from '../../../src/server/logic/connect_desktop.logic';
import type { ConnectDesktopActor } from '../../../src/server/services/connect_desktop_actor_resolver';
import ConnectDesktopClaimRepo from '../../../src/server/repo/connect_desktop_claim_repo';
import ConnectDesktopDeviceRepo from '../../../src/server/repo/connect_desktop_device_repo';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['connectDesktops'] } } as const;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const NOW = new Date('2026-01-01T00:00:00.000Z');
const TOKEN = 'B'.repeat(43);
const CLAIM_ID = 'clm_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const CORRELATION = 'cor_abcdefgh';

const claim = {
  claim_id: CLAIM_ID, device_id: DEVICE_ID, bootstrap_token_hash: sha256(TOKEN),
  short_code_hash: 'x', idempotency_key: 'idem_aaaaaaaaaaaaaaaa', envelope_hash: 'y',
  status: 'pending' as const, created_at: NOW.toISOString(),
  expires_at: new Date(NOW.getTime() + 60_000).toISOString(),
  decided_at: null, decided_by_user_id: null, decision_idempotency_key: null,
};
const device = {
  device_id: DEVICE_ID, owner_user_id: 'usr_owner001', display_name: 'My Desktop',
  platform: 'macos' as const, architecture: 'arm64' as const, desktop_version: '1.2.3',
  key_fingerprint: 'a'.repeat(64), state: 'active' as const, credential_generation: 1,
  created_at: NOW.toISOString(), claimed_at: NOW.toISOString(),
  updated_at: NOW.toISOString(), last_seen_at: NOW.toISOString(),
};
const browserActor: ConnectDesktopActor = {
  role: 'browser_session', userId: 'usr_owner001', sessionId: 'ses_fixed0001',
};

describe('connect desktop routes through testDinner (no server, no database)', () => {
  it('GET /claims/{claimId}/status for an unknown claim is 404 with the request correlation id', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.once(control.returns(Promise.resolve(null))))
      .build();
    const response = await env.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': TOKEN },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      kind: 'error', code: 'invalid-envelope', message: 'Claim not found', correlationId: CORRELATION,
    });
    await env.verify();
  }));

  it('GET /claims/{claimId}/status with a wrong bootstrap token is a uniform 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.once(control.returns(Promise.resolve(claim))))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.never())
      .build();
    const response = await env.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': 'C'.repeat(43) },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
  }));

  it('GET /claims/{claimId}/status reports pending for a live claim with the right token', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.once(control.returns(Promise.resolve(claim))))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const response = await env.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': TOKEN },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      kind: 'desktop.claim.status.response', protocolVersion: '1.0',
      claimId: CLAIM_ID, status: 'pending', correlationId: CORRELATION,
    });
    await env.verify();
  }));

  it('an expired pending claim is reported as expired, straight from the clock', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.once(control.returns(Promise.resolve(claim))))
      .method(ConnectClock, 'now', control.returns(new Date(NOW.getTime() + 3_600_000)))
      .build();
    const response = await env.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': TOKEN },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'expired' });
    await env.verify();
  }));

  it('POST /claims with a malformed envelope is a 400 that never reaches the repos', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopClaimRepo, 'findByIdempotencyKey', control.never())
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.never())
      .method(ConnectDesktopClaimRepo, 'createClaim', control.never())
      .method(ConnectDesktopDeviceRepo, 'createDevice', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/desktops/claims',
      headers: { 'x-kazi-bootstrap-token': TOKEN },
      body: {
        kind: 'desktop.claim.create.request', protocolVersion: '1.0',
        claimId: CLAIM_ID, deviceId: DEVICE_ID, actorRole: 'desktop_device',
        displayName: 'My Desktop', platform: 'macos', architecture: 'arm64',
        desktopVersion: '1.2.3', keyFingerprint: 'not-a-fingerprint',
        idempotencyKey: 'idem_aaaaaaaaaaaaaaaa', correlationId: CORRELATION,
      },
    });
    expect(response.status).toBe(400);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('logic-depth list: owners see their devices; no browser session means an empty list', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopDeviceRepo, 'listByOwner', control.once(control.returns(Promise.resolve([device]))))
      .build();
    const logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
    expect(await logic.list(browserActor)).toEqual([device]);
    expect(await logic.list({ role: 'desktop_device', deviceId: DEVICE_ID, generation: 1 })).toEqual([]);
    await env.verify();
  }));

  it('logic-depth detail: ownership is enforced on the device row', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .build();
    const logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
    expect(await logic.detail(browserActor, DEVICE_ID)).toEqual({ outcome: 'found', device });
    expect(await logic.detail(
      { ...browserActor, userId: 'usr_intruder1' }, DEVICE_ID,
    )).toEqual({ outcome: 'not-found' });
  }));

  it('logic-depth review: a short code resolves through its hash to the claim and device', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectDesktopClaimRepo, 'findByCodeHash', control.once(control.returns(Promise.resolve(claim))))
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.never())
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.once(control.returns(Promise.resolve(device))))
      .method(ConnectClock, 'now', control.returns(NOW))
      .build();
    const logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
    const result = await logic.review(browserActor, { code: 'ABCD-EFGH' });
    expect(result).toEqual({ outcome: 'found', claim, device, status: 'pending' });
    await env.verify();
  }));
});
