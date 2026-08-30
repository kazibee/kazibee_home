/**
 * Connect desktop routes (connect_desktop.controller) through testDinner.
 *
 * Real production desktops.yaml source, real controller → logic → service →
 * policy graph. Only the @Query repos and the deterministic primitives
 * (ConnectClock) are replaced.
 *
 * Transactional branches (createClaim success, decide, rename, revoke) run
 * under sqlstack @transaction and need a live transaction context, so those
 * success paths are exercised at service boundaries below the decorator or
 * skipped; see the non-transactional claimStatus/review/list/detail coverage.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectDesktopController from '../../../src/server/controller/connect_desktop.controller';
import ConnectDesktopLogic from '../../../src/server/logic/connect_desktop.logic';
import type { ConnectDesktopActor } from '../../../src/server/services/connect_desktop_actor_resolver';

const desktopsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/desktops.yaml'), 'utf8')
) as Record<string, unknown>;

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

const base = () =>
  testDinner(desktopsSource)
    .select({ module: 'connectDesktops' })
    .controllers({ 'connect_desktop.controller': ConnectDesktopController })
    .hooks({});

describe('connect desktop routes through testDinner (no server, no database)', () => {
  it('GET /claims/{claimId}/status for an unknown claim is 404 with the request correlation id', async () => {
    const env = await base()
      .methods({
        ConnectDesktopClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(null))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': TOKEN },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      kind: 'error', code: 'invalid-envelope', message: 'Claim not found', correlationId: CORRELATION,
    });
    await env.verify();
    await env.dispose();
  });

  it('GET /claims/{claimId}/status with a wrong bootstrap token is a uniform 401', async () => {
    const env = await base()
      .methods({
        ConnectDesktopClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(claim))),
        },
        ConnectDesktopDeviceRepo: { findByDeviceId: control.never() },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': 'C'.repeat(43) },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
    await env.dispose();
  });

  it('GET /claims/{claimId}/status reports pending for a live claim with the right token', async () => {
    const env = await base()
      .methods({
        ConnectDesktopClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(claim))),
        },
        ConnectClock: { now: control.returns(NOW) },
      })
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('an expired pending claim is reported as expired, straight from the clock', async () => {
    const env = await base()
      .methods({
        ConnectDesktopClaimRepo: {
          findByClaimId: control.once(control.returns(Promise.resolve(claim))),
        },
        ConnectClock: { now: control.returns(new Date(NOW.getTime() + 3_600_000)) },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
      headers: { 'x-kazi-bootstrap-token': TOKEN },
      query: { correlationId: CORRELATION },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'expired' });
    await env.verify();
    await env.dispose();
  });

  it('POST /claims with a malformed envelope is a 400 that never reaches the repos', async () => {
    const env = await base()
      .methods({
        ConnectDesktopClaimRepo: {
          findByIdempotencyKey: control.never(), findByClaimId: control.never(),
          createClaim: control.never(),
        },
        ConnectDesktopDeviceRepo: { createDevice: control.never() },
      })
      .build();
    const response = await env.dinner.request({
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
    await env.verify();
    await env.dispose();
  });

  it('logic-depth list: owners see their devices; no browser session means an empty list', async () => {
    const env = await base()
      .methods({
        ConnectDesktopDeviceRepo: {
          listByOwner: control.once(control.returns(Promise.resolve([device]))),
        },
      })
      .build();
    const logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
    expect(await logic.list(browserActor)).toEqual([device]);
    expect(await logic.list({ role: 'desktop_device', deviceId: DEVICE_ID, generation: 1 })).toEqual([]);
    await env.verify();
    await env.dispose();
  });

  it('logic-depth detail: ownership is enforced on the device row', async () => {
    const env = await base()
      .methods({
        ConnectDesktopDeviceRepo: {
          findByDeviceId: control.returns(Promise.resolve(device)),
        },
      })
      .build();
    const logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
    expect(await logic.detail(browserActor, DEVICE_ID)).toEqual({ outcome: 'found', device });
    expect(await logic.detail(
      { ...browserActor, userId: 'usr_intruder1' }, DEVICE_ID,
    )).toEqual({ outcome: 'not-found' });
    await env.dispose();
  });

  it('logic-depth review: a short code resolves through its hash to the claim and device', async () => {
    const env = await base()
      .methods({
        ConnectDesktopClaimRepo: {
          findByCodeHash: control.once(control.returns(Promise.resolve(claim))),
          findByClaimId: control.never(),
        },
        ConnectDesktopDeviceRepo: {
          findByDeviceId: control.once(control.returns(Promise.resolve(device))),
        },
        ConnectClock: { now: control.returns(NOW) },
      })
      .build();
    const logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
    const result = await logic.review(browserActor, { code: 'ABCD-EFGH' });
    expect(result).toEqual({ outcome: 'found', claim, device, status: 'pending' });
    await env.verify();
    await env.dispose();
  });
});
