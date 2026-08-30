/**
 * Extended connect desktop coverage through testDinner.
 *
 * Three layers, no server, no database:
 *  - Controller HTTP branches for the mutation endpoints (createClaim /
 *    decideClaim / rename / revoke): the transactional LOGIC methods are
 *    stubbed via .methods so the controller's parsing, auth, response
 *    mapping, and error mapping run for real without a live transaction.
 *  - ConnectDesktopService methods invoked directly (env.get) with repo
 *    stubs — none of the service methods themselves carry @transaction
 *    (that decorator lives on ConnectDesktopLogic), so outside a
 *    transaction currentTransaction() is simply absent and the bodies run.
 *  - Parser and actor-resolver branches driven directly with fake requests.
 *
 * The @transaction-decorated logic bodies (createClaim/decideTransaction/
 * rename/revoke on ConnectDesktopLogic) are intentionally left to the DB
 * tier.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import type { CompatRequest } from '@noego/dinner';
import ConnectDesktopController from '../../../src/server/controller/connect_desktop.controller';
import ConnectDesktopService from '../../../src/server/services/connect_desktop_service';
import ConnectDesktopRequestParser from '../../../src/server/services/connect_desktop_request_parser';
import ConnectDesktopActorResolver, { type ConnectDesktopActor } from '../../../src/server/services/connect_desktop_actor_resolver';

const desktopsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/desktops.yaml'), 'utf8')
) as Record<string, unknown>;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const NOW = new Date('2026-01-01T00:00:00.000Z');
const NOW_ISO = NOW.toISOString();
const LATER_ISO = new Date(NOW.getTime() + 60_000).toISOString();
const TOKEN = 'B'.repeat(43);
const TOKEN_HASH = sha256(TOKEN);
const CLAIM_ID = 'clm_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const SESSION_ID = 'ses_fixed0001';
const CORRELATION = 'cor_abcdefgh';
const USER_ID = 'usr_owner001';
const IDEM = 'idem_aaaaaaaaaaaaaaaa';

const claim = {
  claim_id: CLAIM_ID, device_id: DEVICE_ID, bootstrap_token_hash: TOKEN_HASH,
  short_code_hash: 'x', idempotency_key: IDEM, envelope_hash: 'y',
  status: 'pending' as const, created_at: NOW_ISO, expires_at: LATER_ISO,
  decided_at: null, decided_by_user_id: null, decision_idempotency_key: null,
};
const device = {
  device_id: DEVICE_ID, owner_user_id: USER_ID, display_name: 'My Desktop',
  platform: 'macos' as const, architecture: 'arm64' as const, desktop_version: '1.2.3',
  key_fingerprint: 'a'.repeat(64), state: 'active' as const, credential_generation: 1,
  created_at: NOW_ISO, claimed_at: NOW_ISO, updated_at: NOW_ISO, last_seen_at: NOW_ISO,
};
const credential = {
  credential_id: 'cred_1', device_id: DEVICE_ID, generation: 1,
  token_hash: TOKEN_HASH, audience: 'desktop-relay', status: 'active' as const,
  created_at: NOW_ISO, expires_at: LATER_ISO, revoked_at: null,
};
const browserActor: ConnectDesktopActor = {
  role: 'browser_session', userId: USER_ID, sessionId: SESSION_ID,
};
const desktopActor: ConnectDesktopActor = {
  role: 'desktop_device', deviceId: DEVICE_ID, generation: 1,
};
const challenge = {
  claimId: CLAIM_ID, claimUrl: `https://connect.kazibee.example/claim/${CLAIM_ID}`,
  shortCode: 'ABCD-EFGH', displayName: 'My Desktop', platform: 'macos',
  architecture: 'arm64', desktopVersion: '1.2.3', keyFingerprint: 'a'.repeat(64),
  expiresAt: LATER_ISO,
};

const createBody = {
  kind: 'desktop.claim.create.request', protocolVersion: '1.0',
  claimId: CLAIM_ID, deviceId: DEVICE_ID, actorRole: 'desktop_device',
  displayName: 'My Desktop', platform: 'macos', architecture: 'arm64',
  desktopVersion: '1.2.3', keyFingerprint: 'a'.repeat(64),
  idempotencyKey: IDEM, correlationId: CORRELATION,
};
const decisionBody = {
  kind: 'desktop.claim.decision.request', protocolVersion: '1.0', claimId: CLAIM_ID,
  sessionId: SESSION_ID, actorRole: 'browser_session', decision: 'accept',
  idempotencyKey: IDEM, correlationId: CORRELATION,
};
const renameBody = {
  kind: 'desktop.rename.request', protocolVersion: '1.0', deviceId: DEVICE_ID,
  displayName: 'Renamed', idempotencyKey: IDEM, correlationId: CORRELATION,
};
const revokeBody = {
  kind: 'desktop.action.request', protocolVersion: '1.0', deviceId: DEVICE_ID,
  action: 'revoke', idempotencyKey: IDEM, correlationId: CORRELATION,
};
const browserQuery = { sessionId: SESSION_ID, correlationId: CORRELATION };

const base = () =>
  testDinner(desktopsSource)
    .select({ module: 'connectDesktops' })
    .controllers({ 'connect_desktop.controller': ConnectDesktopController })
    .hooks({});

const okActor = () => ({
  ConnectDesktopActorResolver: {
    browser: control.returns(Promise.resolve({ ok: true, actor: browserActor })),
  },
});

/** Sequential stub: call N resolves to value N. */
const seq = <T>(...values: T[]) =>
  control.calls(values.map((value) => control.returns(Promise.resolve(value))));

describe('connect desktop controller mutation branches (logic stubbed above the transaction)', () => {
  describe('POST /claims (createClaim)', () => {
    const post = (env: Awaited<ReturnType<ReturnType<typeof base>['build']>>, body: unknown, headers: Record<string, string> = { 'x-kazi-bootstrap-token': TOKEN }) =>
      env.dinner.request({ method: 'POST', path: '/v1/connect/desktops/claims', headers, body });

    it('maps a created challenge onto a 201 envelope', async () => {
      const env = await base()
        .methods({ ConnectDesktopLogic: {
          createClaim: control.once(control.returns(Promise.resolve({ outcome: 'created', challenge }))),
        } })
        .build();
      const response = await post(env, createBody);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        kind: 'desktop.claim.challenge', protocolVersion: '1.0',
        claimId: CLAIM_ID, actorRole: 'claim_challenge',
        claimUrl: challenge.claimUrl, shortCode: challenge.shortCode,
        deviceId: DEVICE_ID, displayName: 'My Desktop', platform: 'macos',
        architecture: 'arm64', desktopVersion: '1.2.3',
        keyFingerprint: 'a'.repeat(64), expiresAt: LATER_ISO, correlationId: CORRELATION,
      });
      await env.verify();
      await env.dispose();
    });

    it('maps an idempotent retry onto a 200', async () => {
      const env = await base()
        .methods({ ConnectDesktopLogic: {
          createClaim: control.returns(Promise.resolve({ outcome: 'retry', challenge })),
        } })
        .build();
      const response = await post(env, createBody);
      expect(response.status).toBe(200);
      await env.dispose();
    });

    it('maps conflict and failed outcomes onto 409 and 500', async () => {
      for (const [outcome, status, code] of [
        ['conflict', 409, 'idempotency-conflict'], ['failed', 500, 'invalid-envelope'],
      ] as const) {
        const env = await base()
          .methods({ ConnectDesktopLogic: {
            createClaim: control.returns(Promise.resolve({ outcome })),
          } })
          .build();
        const response = await post(env, createBody);
        expect(response.status).toBe(status);
        expect(await response.json()).toMatchObject({ kind: 'error', code, correlationId: CORRELATION });
        await env.dispose();
      }
    });

    it('maps a thrown unique-constraint error onto a 409 and anything else onto a 500', async () => {
      const unique = await base()
        .methods({ ConnectDesktopLogic: {
          createClaim: control.throws(new Error('UNIQUE constraint failed: connect_desktop_claims.claim_id')),
        } })
        .build();
      expect((await post(unique, createBody)).status).toBe(409);
      await unique.dispose();

      const generic = await base()
        .methods({ ConnectDesktopLogic: {
          createClaim: control.throws(new Error('database is on fire')),
        } })
        .build();
      expect((await post(generic, createBody)).status).toBe(500);
      await generic.dispose();
    });

    it('rejects a missing bootstrap token with a uniform 401 before the logic runs', async () => {
      const env = await base()
        .methods({ ConnectDesktopLogic: { createClaim: control.never() } })
        .build();
      const response = await post(env, createBody, {});
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'revoked', correlationId: CORRELATION });
      await env.verify();
      await env.dispose();
    });

    it('maps a parser protocol mismatch onto a 409 (direct controller call, below the OpenAPI validator)', async () => {
      const env = await base()
        .methods({ ConnectDesktopLogic: { createClaim: control.never() } })
        .build();
      const controller = await env.get<ConnectDesktopController>(ConnectDesktopController);
      const captured: { status?: number; body?: unknown } = {};
      const res = {
        status(code: number) { captured.status = code; return this; },
        json(body: unknown) { captured.body = body; return this; },
      };
      await controller.createClaim({
        req: { body: { ...createBody, protocolVersion: '2.0' }, headers: {}, params: {}, query: {} },
        res,
      } as never);
      expect(captured.status).toBe(409);
      expect(captured.body).toMatchObject({
        code: 'protocol-version-mismatch', message: 'Protocol version mismatch', correlationId: CORRELATION,
      });
      await env.verify();
      await env.dispose();
    });
  });

  describe('POST /claims/{claimId}/decision (decideClaim)', () => {
    const post = (env: Awaited<ReturnType<ReturnType<typeof base>['build']>>, body: unknown) =>
      env.dinner.request({ method: 'POST', path: `/v1/connect/desktops/claims/${CLAIM_ID}/decision`, body });

    it('maps an accepted decision onto the credential envelope', async () => {
      const env = await base()
        .methods({
          ...okActor(),
          ConnectDesktopLogic: {
            decide: control.once(control.returns(Promise.resolve({
              outcome: 'accepted', deviceId: DEVICE_ID, credentialExpiresAt: LATER_ISO,
              websiteAccountId: USER_ID, websiteDeploymentId: 'dep_00000001',
            }))),
          },
        })
        .build();
      const response = await post(env, decisionBody);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.claim.decision.response', protocolVersion: '1.0',
        claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION,
        deviceId: DEVICE_ID, actorRole: 'desktop_device',
        credentialAudience: 'desktop-relay', credentialGeneration: 1,
        credentialExpiresAt: LATER_ISO, websiteAccountId: USER_ID,
        websiteDeploymentId: 'dep_00000001',
      });
      await env.verify();
      await env.dispose();
    });

    it('maps denied onto a plain decision response without credentials', async () => {
      const env = await base()
        .methods({
          ...okActor(),
          ConnectDesktopLogic: { decide: control.returns(Promise.resolve({ outcome: 'denied' })) },
        })
        .build();
      const response = await post(env, { ...decisionBody, decision: 'deny' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.claim.decision.response', protocolVersion: '1.0',
        claimId: CLAIM_ID, status: 'denied', correlationId: CORRELATION,
      });
      await env.dispose();
    });

    it('maps not-found/expired/replayed/failed outcomes and thrown errors', async () => {
      for (const [outcome, status] of [
        ['not-found', 404], ['expired', 409], ['replayed', 409], ['failed', 500],
      ] as const) {
        const env = await base()
          .methods({
            ...okActor(),
            ConnectDesktopLogic: { decide: control.returns(Promise.resolve({ outcome })) },
          })
          .build();
        expect((await post(env, decisionBody)).status).toBe(status);
        await env.dispose();
      }
      const throwing = await base()
        .methods({
          ...okActor(),
          ConnectDesktopLogic: { decide: control.throws(new Error('boom')) },
        })
        .build();
      expect((await post(throwing, decisionBody)).status).toBe(500);
      await throwing.dispose();
    });

    it('maps auth failures: unauthorized 401 and csrf 403', async () => {
      for (const [reason, status, code] of [
        ['unauthorized', 401, 'revoked'], ['csrf', 403, 'invalid-envelope'],
      ] as const) {
        const env = await base()
          .methods({
            ConnectDesktopActorResolver: {
              browser: control.returns(Promise.resolve({ ok: false, reason })),
            },
            ConnectDesktopLogic: { decide: control.never() },
          })
          .build();
        const response = await post(env, decisionBody);
        expect(response.status).toBe(status);
        expect(await response.json()).toMatchObject({ code, correlationId: CORRELATION });
        await env.verify();
        await env.dispose();
      }
    });

    it('rejects a body whose claimId does not match the path with a 400', async () => {
      const env = await base()
        .methods({ ConnectDesktopLogic: { decide: control.never() } })
        .build();
      const response = await post(env, { ...decisionBody, claimId: 'clm_different' });
      expect(response.status).toBe(400);
      await env.verify();
      await env.dispose();
    });
  });

  describe('POST /{deviceId}/rename and /{deviceId}/revoke', () => {
    const post = (env: Awaited<ReturnType<ReturnType<typeof base>['build']>>, action: string, body: unknown, query: Record<string, string> = browserQuery) =>
      env.dinner.request({ method: 'POST', path: `/v1/connect/desktops/${DEVICE_ID}/${action}`, query, body });

    it('rename maps a renamed device onto the detail envelope', async () => {
      const renamed = { ...device, display_name: 'Renamed' };
      const env = await base()
        .methods({
          ...okActor(),
          ConnectDesktopLogic: {
            rename: control.once(control.returns(Promise.resolve({ outcome: 'renamed', device: renamed }))),
          },
        })
        .build();
      const response = await post(env, 'rename', renameBody);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.detail.response', protocolVersion: '1.0',
        device: { deviceId: DEVICE_ID, displayName: 'Renamed', state: 'active', protocolVersion: '1.0' },
        deviceId: DEVICE_ID, actorRole: 'desktop_device', lastSeenAt: NOW_ISO,
        correlationId: CORRELATION,
      });
      await env.verify();
      await env.dispose();
    });

    it('rename maps not-found/failed/thrown to 404/500/500 and correlation mismatch to 400', async () => {
      for (const [stub, status] of [
        [control.returns(Promise.resolve({ outcome: 'not-found' })), 404],
        [control.returns(Promise.resolve({ outcome: 'failed' })), 500],
        [control.throws(new Error('boom')), 500],
      ] as const) {
        const env = await base()
          .methods({ ...okActor(), ConnectDesktopLogic: { rename: stub } })
          .build();
        expect((await post(env, 'rename', renameBody)).status).toBe(status);
        await env.dispose();
      }
      const mismatch = await base()
        .methods({ ConnectDesktopLogic: { rename: control.never() } })
        .build();
      const response = await post(mismatch, 'rename', renameBody, {
        sessionId: SESSION_ID, correlationId: 'cor_different1',
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ correlationId: CORRELATION });
      await mismatch.verify();
      await mismatch.dispose();
    });

    it('rename rejects a malformed body before auth or logic', async () => {
      const env = await base()
        .methods({ ConnectDesktopLogic: { rename: control.never() } })
        .build();
      const response = await post(env, 'rename', { ...renameBody, displayName: '   ' });
      expect(response.status).toBe(400);
      await env.verify();
      await env.dispose();
    });

    it('revoke maps a revoked device onto the action envelope', async () => {
      const env = await base()
        .methods({
          ...okActor(),
          ConnectDesktopLogic: {
            revoke: control.once(control.returns(Promise.resolve({
              outcome: 'revoked', device: { ...device, state: 'revoked', credential_generation: 2 },
            }))),
          },
        })
        .build();
      const response = await post(env, 'revoke', revokeBody);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.action.response', protocolVersion: '1.0',
        deviceId: DEVICE_ID, state: 'revoked', correlationId: CORRELATION,
      });
      await env.verify();
      await env.dispose();
    });

    it('revoke maps not-found/failed/thrown to 404/500/500 and correlation mismatch to 400', async () => {
      for (const [stub, status] of [
        [control.returns(Promise.resolve({ outcome: 'not-found' })), 404],
        [control.returns(Promise.resolve({ outcome: 'failed' })), 500],
        [control.throws(new Error('boom')), 500],
      ] as const) {
        const env = await base()
          .methods({ ...okActor(), ConnectDesktopLogic: { revoke: stub } })
          .build();
        expect((await post(env, 'revoke', revokeBody)).status).toBe(status);
        await env.dispose();
      }
      const mismatch = await base()
        .methods({ ConnectDesktopLogic: { revoke: control.never() } })
        .build();
      expect((await post(mismatch, 'revoke', revokeBody, {
        sessionId: SESSION_ID, correlationId: 'cor_different1',
      })).status).toBe(400);
      await mismatch.verify();
      await mismatch.dispose();
    });
  });

  describe('read endpoints (list/detail/review/claimStatus) remaining branches', () => {
    it('GET / lists the owner devices as summaries', async () => {
      const env = await base()
        .methods({
          ...okActor(),
          ConnectDesktopDeviceRepo: {
            listByOwner: control.once(control.returns(Promise.resolve([device]))),
          },
        })
        .build();
      const response = await env.dinner.request({
        method: 'GET', path: '/v1/connect/desktops/', query: browserQuery,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.list.response', protocolVersion: '1.0',
        devices: [{ deviceId: DEVICE_ID, displayName: 'My Desktop', state: 'active', protocolVersion: '1.0' }],
        correlationId: CORRELATION,
      });
      await env.verify();
      await env.dispose();
    });

    it('list with a malformed browser query is a 400 with the fallback correlation id (direct call)', async () => {
      const env = await base()
        .methods({ ConnectDesktopActorResolver: { browser: control.never() } })
        .build();
      const controller = await env.get<ConnectDesktopController>(ConnectDesktopController);
      const captured: { status?: number; body?: unknown } = {};
      const res = {
        status(code: number) { captured.status = code; return this; },
        json(body: unknown) { captured.body = body; return this; },
      };
      await controller.list({
        req: { query: { sessionId: SESSION_ID }, headers: {}, params: {}, body: {} }, res,
      } as never);
      expect(captured.status).toBe(400);
      expect(captured.body).toMatchObject({ correlationId: 'cor_invalid000' });
      await env.verify();
      await env.dispose();
    });

    it('GET /{deviceId} maps found, not-found, and failed detail outcomes', async () => {
      for (const [stub, status] of [
        [control.returns(Promise.resolve({ outcome: 'found', device })), 200],
        [control.returns(Promise.resolve({ outcome: 'not-found' })), 404],
        [control.returns(Promise.resolve({ outcome: 'failed' })), 500],
      ] as const) {
        const env = await base()
          .methods({ ...okActor(), ConnectDesktopService: { detail: stub } })
          .build();
        const response = await env.dinner.request({
          method: 'GET', path: `/v1/connect/desktops/${DEVICE_ID}`, query: browserQuery,
        });
        expect(response.status).toBe(status);
        if (status === 200) {
          expect(await response.json()).toMatchObject({
            kind: 'desktop.detail.response', deviceId: DEVICE_ID, lastSeenAt: NOW_ISO,
          });
        }
        await env.dispose();
      }
    });

    it('GET /claims/review/{lookup} maps found, not-found, failed, and auth failure', async () => {
      const found = await base()
        .methods({
          ...okActor(),
          ConnectDesktopService: {
            review: control.once(control.returns(Promise.resolve({ outcome: 'found', claim, device, status: 'pending' }))),
          },
        })
        .build();
      const response = await found.dinner.request({
        method: 'GET', path: `/v1/connect/desktops/claims/review/${CLAIM_ID}`, query: browserQuery,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.claim.review.response', protocolVersion: '1.0',
        claimId: CLAIM_ID, status: 'pending', displayName: 'My Desktop',
        platform: 'macos', architecture: 'arm64', desktopVersion: '1.2.3',
        keyFingerprint: 'a'.repeat(64), expiresAt: LATER_ISO, correlationId: CORRELATION,
      });
      await found.verify();
      await found.dispose();

      for (const [outcome, status] of [['not-found', 404], ['failed', 500]] as const) {
        const env = await base()
          .methods({ ...okActor(), ConnectDesktopService: { review: control.returns(Promise.resolve({ outcome })) } })
          .build();
        expect((await env.dinner.request({
          method: 'GET', path: `/v1/connect/desktops/claims/review/${CLAIM_ID}`, query: browserQuery,
        })).status).toBe(status);
        await env.dispose();
      }

      const unauthorized = await base()
        .methods({
          ConnectDesktopActorResolver: {
            browser: control.returns(Promise.resolve({ ok: false, reason: 'unauthorized' })),
          },
          ConnectDesktopService: { review: control.never() },
        })
        .build();
      expect((await unauthorized.dinner.request({
        method: 'GET', path: `/v1/connect/desktops/claims/review/${CLAIM_ID}`, query: browserQuery,
      })).status).toBe(401);
      await unauthorized.verify();
      await unauthorized.dispose();
    });

    it('GET /claims/{claimId}/status maps accepted and failed service outcomes', async () => {
      const accepted = await base()
        .methods({
          ConnectDesktopService: {
            status: control.once(control.returns(Promise.resolve({
              outcome: 'status', status: 'accepted', deviceId: DEVICE_ID,
              credentialExpiresAt: LATER_ISO, websiteAccountId: USER_ID,
              websiteDeploymentId: 'dep_00000001',
            }))),
          },
        })
        .build();
      const response = await accepted.dinner.request({
        method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
        headers: { 'x-kazi-bootstrap-token': TOKEN }, query: { correlationId: CORRELATION },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.claim.status.response', protocolVersion: '1.0',
        claimId: CLAIM_ID, status: 'accepted', correlationId: CORRELATION,
        deviceId: DEVICE_ID, actorRole: 'desktop_device',
        credentialAudience: 'desktop-relay', credentialGeneration: 1,
        credentialExpiresAt: LATER_ISO, websiteAccountId: USER_ID,
        websiteDeploymentId: 'dep_00000001',
      });
      await accepted.verify();
      await accepted.dispose();

      const failed = await base()
        .methods({
          ConnectDesktopService: { status: control.returns(Promise.resolve({ outcome: 'failed' })) },
        })
        .build();
      expect((await failed.dinner.request({
        method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
        headers: { 'x-kazi-bootstrap-token': TOKEN }, query: { correlationId: CORRELATION },
      })).status).toBe(500);
      await failed.dispose();
    });
  });
});

describe('ConnectDesktopService directly (undecorated bodies, repos stubbed)', () => {
  const serviceEnv = (methods: Record<string, Record<string, unknown>>) =>
    base()
      .methods({
        ConnectClock: { now: control.returns(NOW) },
        ConnectWebsiteDeploymentIdentityService: {
          get: control.returns(Promise.resolve('dep_00000001')),
        },
        ...methods,
      } as never)
      .build();

  const envelopeHash = sha256(JSON.stringify([
    createBody.kind, createBody.protocolVersion, createBody.claimId, createBody.deviceId,
    createBody.actorRole, createBody.displayName, createBody.platform, createBody.architecture,
    createBody.desktopVersion, createBody.keyFingerprint, createBody.idempotencyKey, TOKEN_HASH,
  ]));

  it('createClaim creates the device, claim, and audit trail for a fresh envelope', async () => {
    const created: Record<string, unknown>[] = [];
    const env = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByIdempotencyKey: control.returns(Promise.resolve(null)),
        findByClaimId: seq(null, claim),
        createClaim: control.watch(() => (input: Record<string, unknown>) => {
          created.push(input); return Promise.resolve();
        }),
      },
      ConnectDesktopDeviceRepo: {
        findByDeviceId: control.returns(Promise.resolve(device)),
        createDevice: control.once(control.returns(Promise.resolve())),
      },
      ConnectDesktopAuditRepo: { appendEvent: control.once(control.returns(Promise.resolve())) },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    const result = await service.createClaim(createBody as never, TOKEN);
    expect(result.outcome).toBe('created');
    if (result.outcome !== 'created') throw new Error('unreachable');
    expect(result.challenge).toMatchObject({
      claimId: CLAIM_ID, displayName: 'My Desktop', platform: 'macos',
      claimUrl: expect.stringContaining(`/claim/${CLAIM_ID}`),
      shortCode: expect.stringMatching(/^[A-Z]{4}-[A-Z]{4}$/),
    });
    expect(created[0]).toMatchObject({
      claim_id: CLAIM_ID, device_id: DEVICE_ID,
      bootstrap_token_hash: TOKEN_HASH, envelope_hash: envelopeHash,
      expires_at: new Date(NOW.getTime() + 10 * 60 * 1000).toISOString(),
    });
    await env.verify();
    await env.dispose();
  });

  it('createClaim replays an identical pending envelope as a retry challenge', async () => {
    const env = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByIdempotencyKey: control.returns(Promise.resolve({ ...claim, envelope_hash: envelopeHash })),
        createClaim: control.never(),
      },
      ConnectDesktopDeviceRepo: {
        findByDeviceId: control.returns(Promise.resolve(device)),
        createDevice: control.never(),
      },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    const result = await service.createClaim(createBody as never, TOKEN);
    expect(result).toMatchObject({ outcome: 'retry', challenge: { claimId: CLAIM_ID } });
    await env.verify();
    await env.dispose();
  });

  it('createClaim reports conflict when the existing claim differs or the device is gone', async () => {
    for (const [existing, existingDevice] of [
      [{ ...claim, envelope_hash: 'different' }, device],
      [{ ...claim, envelope_hash: envelopeHash, status: 'accepted' }, device],
      [{ ...claim, envelope_hash: envelopeHash }, null],
    ] as const) {
      const env = await serviceEnv({
        ConnectDesktopClaimRepo: {
          findByIdempotencyKey: control.returns(Promise.resolve(existing)),
          createClaim: control.never(),
        },
        ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(existingDevice)) },
      });
      const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
      expect(await service.createClaim(createBody as never, TOKEN)).toEqual({ outcome: 'conflict' });
      await env.dispose();
    }
  });

  it('createClaim maps unique-constraint failures to conflict and other errors to failed', async () => {
    const unique = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByIdempotencyKey: control.throws(new Error('UNIQUE constraint failed: claims')),
      },
    });
    const uniqueService = await unique.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await uniqueService.createClaim(createBody as never, TOKEN)).toEqual({ outcome: 'conflict' });
    await unique.dispose();

    const broken = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByIdempotencyKey: control.throws(new Error('disk full')),
      },
    });
    const brokenService = await broken.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await brokenService.createClaim(createBody as never, TOKEN)).toEqual({ outcome: 'failed' });
    await broken.dispose();
  });

  it('status returns the full accepted credential payload when every guard passes', async () => {
    const accepted = { ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID };
    const env = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.returns(Promise.resolve(accepted)) },
      ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(device)) },
      ConnectDesktopCredentialRepo: { findByTokenHash: control.returns(Promise.resolve(credential)) },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await service.status(CLAIM_ID, TOKEN)).toEqual({
      outcome: 'status', status: 'accepted', deviceId: DEVICE_ID,
      credentialExpiresAt: LATER_ISO, websiteAccountId: USER_ID,
      websiteDeploymentId: 'dep_00000001',
    });
    await env.dispose();
  });

  it('status fails closed on any accepted-claim guard: wrong owner, revoked device, dead credential', async () => {
    const accepted = { ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID };
    for (const [dev, cred] of [
      [{ ...device, owner_user_id: 'usr_other0001' }, credential],
      [{ ...device, state: 'revoked' }, credential],
      [device, null],
      [device, { ...credential, status: 'revoked' }],
      [device, { ...credential, expires_at: NOW_ISO }],
      [device, { ...credential, generation: 2 }],
    ] as const) {
      const env = await serviceEnv({
        ConnectDesktopClaimRepo: { findByClaimId: control.returns(Promise.resolve(accepted)) },
        ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(dev)) },
        ConnectDesktopCredentialRepo: { findByTokenHash: control.returns(Promise.resolve(cred)) },
      });
      const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
      expect(await service.status(CLAIM_ID, TOKEN)).toEqual({ outcome: 'unauthorized' });
      await env.dispose();
    }
  });

  it('status reports denied claims verbatim and repo failures as failed', async () => {
    const denied = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: control.returns(Promise.resolve({ ...claim, status: 'denied' })),
      },
    });
    const deniedService = await denied.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await deniedService.status(CLAIM_ID, TOKEN)).toEqual({ outcome: 'status', status: 'denied' });
    await denied.dispose();

    const broken = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.throws(new Error('boom')) },
    });
    const brokenService = await broken.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await brokenService.status(CLAIM_ID, TOKEN)).toEqual({ outcome: 'failed' });
    await broken.dispose();
  });

  it('review reports not-found for a missing claim or orphaned device, failed on errors', async () => {
    const missing = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.returns(Promise.resolve(null)) },
    });
    expect(await (await missing.get<ConnectDesktopService>(ConnectDesktopService))
      .review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });
    await missing.dispose();

    const orphaned = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.returns(Promise.resolve(claim)) },
      ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(null)) },
    });
    expect(await (await orphaned.get<ConnectDesktopService>(ConnectDesktopService))
      .review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });
    await orphaned.dispose();

    const broken = await serviceEnv({
      ConnectDesktopClaimRepo: { findByCodeHash: control.throws(new Error('boom')) },
    });
    expect(await (await broken.get<ConnectDesktopService>(ConnectDesktopService))
      .review({ code: 'ABCD-EFGH' })).toEqual({ outcome: 'failed' });
    await broken.dispose();
  });

  it('decide accepts a pending claim end to end: accept, own, credential, audit', async () => {
    const decided = {
      ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const env = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: seq(claim, decided),
        acceptPending: control.once(control.returns(Promise.resolve())),
      },
      ConnectDesktopDeviceRepo: {
        acceptOwner: control.once(control.returns(Promise.resolve())),
        findByDeviceId: control.returns(Promise.resolve(device)),
      },
      ConnectDesktopCredentialRepo: { createCredential: control.once(control.returns(Promise.resolve())) },
      ConnectDesktopAuditRepo: { appendEvent: control.once(control.returns(Promise.resolve())) },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    const result = await service.decide(browserActor, decisionBody as never);
    expect(result).toEqual({
      outcome: 'accepted', deviceId: DEVICE_ID,
      credentialExpiresAt: new Date(NOW.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      websiteAccountId: USER_ID, websiteDeploymentId: 'dep_00000001',
    });
    await env.verify();
    await env.dispose();
  });

  it('decide denies a pending claim and audits the denial', async () => {
    const decided = { ...claim, status: 'denied' as const, decided_by_user_id: USER_ID };
    const env = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: seq(claim, decided),
        denyPending: control.once(control.returns(Promise.resolve())),
      },
      ConnectDesktopAuditRepo: { appendEvent: control.once(control.returns(Promise.resolve())) },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await service.decide(browserActor, { ...decisionBody, decision: 'deny' } as never))
      .toEqual({ outcome: 'denied' });
    await env.verify();
    await env.dispose();
  });

  it('decide refuses non-browser actors, missing claims, expired claims, and lost races', async () => {
    const nonBrowser = await serviceEnv({});
    expect(await (await nonBrowser.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(desktopActor, decisionBody as never)).toEqual({ outcome: 'not-found' });
    await nonBrowser.dispose();

    const missing = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.returns(Promise.resolve(null)) },
    });
    expect(await (await missing.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, decisionBody as never)).toEqual({ outcome: 'not-found' });
    await missing.dispose();

    const expired = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: control.returns(Promise.resolve({ ...claim, expires_at: NOW_ISO })),
      },
    });
    expect(await (await expired.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, decisionBody as never)).toEqual({ outcome: 'expired' });
    await expired.dispose();

    // deny raced by someone else: the re-read shows a different decider.
    const raced = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: seq(claim, { ...claim, status: 'denied', decided_by_user_id: 'usr_other0001' }),
        denyPending: control.returns(Promise.resolve()),
      },
    });
    expect(await (await raced.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, { ...decisionBody, decision: 'deny' } as never)).toEqual({ outcome: 'replayed' });
    await raced.dispose();

    const broken = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.throws(new Error('boom')) },
    });
    expect(await (await broken.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, decisionBody as never)).toEqual({ outcome: 'failed' });
    await broken.dispose();
  });

  it('decide treats an already-decided claim idempotently: same decider replays accepted', async () => {
    const settled = {
      ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const idempotent = await serviceEnv({
      ConnectDesktopClaimRepo: { findByClaimId: control.returns(Promise.resolve(settled)) },
      ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(device)) },
      ConnectDesktopCredentialRepo: { findByTokenHash: control.returns(Promise.resolve(credential)) },
    });
    expect(await (await idempotent.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, decisionBody as never)).toEqual({
      outcome: 'accepted', deviceId: DEVICE_ID, credentialExpiresAt: LATER_ISO,
      websiteAccountId: USER_ID, websiteDeploymentId: 'dep_00000001',
    });
    await idempotent.dispose();

    // Different idempotency key on a settled claim is a replay.
    const replayed = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: control.returns(Promise.resolve({ ...settled, decision_idempotency_key: 'idem_bbbbbbbbbbbbbbbb' })),
      },
    });
    expect(await (await replayed.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, decisionBody as never)).toEqual({ outcome: 'replayed' });
    await replayed.dispose();

    // Idempotent denial replays denied.
    const denied = await serviceEnv({
      ConnectDesktopClaimRepo: {
        findByClaimId: control.returns(Promise.resolve({
          ...settled, status: 'denied' as const,
        })),
      },
    });
    expect(await (await denied.get<ConnectDesktopService>(ConnectDesktopService))
      .decide(browserActor, { ...decisionBody, decision: 'deny' } as never)).toEqual({ outcome: 'denied' });
    await denied.dispose();
  });

  it('rename renames an owned active device and audits it', async () => {
    const renamed = { ...device, display_name: 'Renamed' };
    const env = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: seq(device, renamed),
        renameOwned: control.once(control.returns(Promise.resolve())),
      },
      ConnectDesktopAuditRepo: { appendEvent: control.once(control.returns(Promise.resolve())) },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await service.rename(browserActor, renameBody as never))
      .toEqual({ outcome: 'renamed', device: renamed });
    await env.verify();
    await env.dispose();
  });

  it('rename refuses non-browser actors, revoked devices, lost writes, and maps errors to failed', async () => {
    const nonBrowser = await serviceEnv({});
    expect(await (await nonBrowser.get<ConnectDesktopService>(ConnectDesktopService))
      .rename(desktopActor, renameBody as never)).toEqual({ outcome: 'not-found' });
    await nonBrowser.dispose();

    const revoked = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: control.returns(Promise.resolve({ ...device, state: 'revoked' })),
        renameOwned: control.never(),
      },
    });
    expect(await (await revoked.get<ConnectDesktopService>(ConnectDesktopService))
      .rename(browserActor, renameBody as never)).toEqual({ outcome: 'not-found' });
    await revoked.dispose();

    const lost = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: control.returns(Promise.resolve(device)),
        renameOwned: control.returns(Promise.resolve()),
      },
    });
    expect(await (await lost.get<ConnectDesktopService>(ConnectDesktopService))
      .rename(browserActor, renameBody as never)).toEqual({ outcome: 'not-found' });
    await lost.dispose();

    const broken = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: control.returns(Promise.resolve(device)),
        renameOwned: control.throws(new Error('boom')),
      },
    });
    expect(await (await broken.get<ConnectDesktopService>(ConnectDesktopService))
      .rename(browserActor, renameBody as never)).toEqual({ outcome: 'failed' });
    await broken.dispose();
  });

  it('revoke fences the credential generation, audits, and notifies the relay', async () => {
    const revoked = { ...device, state: 'revoked' as const, credential_generation: 2 };
    const relayed: string[] = [];
    const env = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: seq(device, revoked),
        revokeOwned: control.once(control.returns(Promise.resolve())),
      },
      ConnectDesktopCredentialRepo: { revokeForDevice: control.once(control.returns(Promise.resolve())) },
      ConnectDesktopAuditRepo: { appendEvent: control.once(control.returns(Promise.resolve())) },
      ConnectClientRelayService: {
        revokeDesktop: control.watch(() => (deviceId: string) => { relayed.push(deviceId); }),
      },
    });
    const service = await env.get<ConnectDesktopService>(ConnectDesktopService);
    expect(await service.revoke(browserActor, revokeBody as never))
      .toEqual({ outcome: 'revoked', device: revoked });
    expect(relayed).toEqual([DEVICE_ID]);
    await env.verify();
    await env.dispose();
  });

  it('revoke is idempotent on an already-revoked device and fails on a broken fence', async () => {
    const alreadyRevoked = { ...device, state: 'revoked' as const, credential_generation: 2 };
    const idempotent = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: control.returns(Promise.resolve(alreadyRevoked)),
        revokeOwned: control.never(),
      },
    });
    expect(await (await idempotent.get<ConnectDesktopService>(ConnectDesktopService))
      .revoke(browserActor, revokeBody as never)).toEqual({ outcome: 'revoked', device: alreadyRevoked });
    await idempotent.verify();
    await idempotent.dispose();

    // Fence invariant: generation did not advance → failed.
    const broken = await serviceEnv({
      ConnectDesktopDeviceRepo: {
        findByDeviceId: seq(device, { ...device, state: 'revoked' }),
        revokeOwned: control.returns(Promise.resolve()),
      },
      ConnectDesktopCredentialRepo: { revokeForDevice: control.returns(Promise.resolve()) },
    });
    expect(await (await broken.get<ConnectDesktopService>(ConnectDesktopService))
      .revoke(browserActor, revokeBody as never)).toEqual({ outcome: 'failed' });
    await broken.dispose();

    const nonBrowser = await serviceEnv({});
    expect(await (await nonBrowser.get<ConnectDesktopService>(ConnectDesktopService))
      .revoke(desktopActor, revokeBody as never)).toEqual({ outcome: 'not-found' });
    await nonBrowser.dispose();

    const missing = await serviceEnv({
      ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(null)) },
    });
    expect(await (await missing.get<ConnectDesktopService>(ConnectDesktopService))
      .revoke(browserActor, revokeBody as never)).toEqual({ outcome: 'not-found' });
    await missing.dispose();
  });

  it('detail maps repo failures to failed', async () => {
    const env = await serviceEnv({
      ConnectDesktopDeviceRepo: { findByDeviceId: control.throws(new Error('boom')) },
    });
    expect(await (await env.get<ConnectDesktopService>(ConnectDesktopService))
      .detail(browserActor, DEVICE_ID)).toEqual({ outcome: 'failed' });
    await env.dispose();
  });
});

// Note: ConnectDesktopLogic's remaining uncovered lines are exactly the
// @transaction-decorated bodies (createClaim/decideTransaction/rename/revoke)
// and decide()'s queue around decideTransaction. decideTransaction is invoked
// via `this.`, bypassing the IoC method proxy, so it cannot be stubbed with
// .methods and requires a live SQLStack database — left to the DB tier.

describe('ConnectDesktopRequestParser remaining branches', () => {
  const parserEnv = () => base().build();
  const asReq = (value: Record<string, unknown>) => value as unknown as CompatRequest;

  it('claimCreate: extra keys, wrong kind, windows/arm64, and bad correlation fall back', async () => {
    const env = await parserEnv();
    const parser = await env.get<ConnectDesktopRequestParser>(ConnectDesktopRequestParser);
    expect(parser.claimCreate(null)).toEqual({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000',
    });
    expect(parser.claimCreate({ ...createBody, extra: 1 })).toMatchObject({ ok: false, correlationId: CORRELATION });
    expect(parser.claimCreate({ ...createBody, kind: 'other' })).toMatchObject({ ok: false });
    expect(parser.claimCreate({ ...createBody, platform: 'windows', architecture: 'arm64' }))
      .toMatchObject({ ok: false, reason: 'invalid-envelope' });
    expect(parser.claimCreate({ ...createBody, platform: 'windows', architecture: 'x64' }))
      .toMatchObject({ ok: true });
    expect(parser.claimCreate({ ...createBody, correlationId: 42 }))
      .toMatchObject({ ok: false, correlationId: 'cor_invalid000' });
    await env.dispose();
  });

  it('decision: protocol mismatch, wrong session shape, bad decision', async () => {
    const env = await parserEnv();
    const parser = await env.get<ConnectDesktopRequestParser>(ConnectDesktopRequestParser);
    expect(parser.decision({ ...decisionBody, protocolVersion: '9.9' }, CLAIM_ID))
      .toMatchObject({ ok: false, reason: 'protocol-version-mismatch', correlationId: CORRELATION });
    expect(parser.decision({ ...decisionBody, sessionId: 'nope' }, CLAIM_ID)).toMatchObject({ ok: false });
    expect(parser.decision({ ...decisionBody, decision: 'maybe' }, CLAIM_ID)).toMatchObject({ ok: false });
    expect(parser.decision(decisionBody, CLAIM_ID)).toMatchObject({ ok: true });
    await env.dispose();
  });

  it('rename/revoke owner mutations: key sets, kinds, and protocol are enforced', async () => {
    const env = await parserEnv();
    const parser = await env.get<ConnectDesktopRequestParser>(ConnectDesktopRequestParser);
    expect(parser.rename(renameBody, DEVICE_ID)).toMatchObject({ ok: true });
    expect(parser.rename({ ...renameBody, protocolVersion: '2.0' }, DEVICE_ID))
      .toMatchObject({ ok: false, reason: 'protocol-version-mismatch' });
    expect(parser.rename({ ...renameBody, kind: 'desktop.action.request' }, DEVICE_ID)).toMatchObject({ ok: false });
    expect(parser.rename(renameBody, 'dev_other0001')).toMatchObject({ ok: false });
    expect(parser.rename('not-a-record', DEVICE_ID)).toMatchObject({ ok: false });
    expect(parser.revoke(revokeBody, DEVICE_ID)).toMatchObject({ ok: true });
    expect(parser.revoke({ ...revokeBody, action: 'pause' }, DEVICE_ID)).toMatchObject({ ok: false });
    expect(parser.revoke({ ...revokeBody, kind: 'desktop.rename.request' }, DEVICE_ID)).toMatchObject({ ok: false });
    await env.dispose();
  });

  it('correlation/bootstrapToken/lookup/browserQuery edge shapes', async () => {
    const env = await parserEnv();
    const parser = await env.get<ConnectDesktopRequestParser>(ConnectDesktopRequestParser);
    expect(parser.correlation(asReq({ query: { correlationId: 'bad' } }))).toBe('cor_invalid000');
    expect(parser.correlation(asReq({ query: {} }))).toBe('cor_invalid000');
    expect(parser.correlation(asReq({ query: { correlationId: CORRELATION } }))).toBe(CORRELATION);
    expect(parser.bootstrapToken(asReq({ headers: {} }))).toBeNull();
    expect(parser.bootstrapToken(asReq({ headers: { 'x-kazi-bootstrap-token': 'short' } }))).toBeNull();
    expect(parser.bootstrapToken(asReq({ headers: { 'x-kazi-bootstrap-token': TOKEN } }))).toBe(TOKEN);
    expect(parser.lookup(42)).toBeNull();
    expect(parser.lookup('nonsense')).toBeNull();
    expect(parser.lookup(CLAIM_ID)).toEqual({ claimId: CLAIM_ID });
    expect(parser.lookup('ABCD-EFGH')).toEqual({ code: 'ABCD-EFGH' });
    expect(parser.browserQuery(asReq({ query: { sessionId: SESSION_ID } }))).toMatchObject({ ok: false });
    expect(parser.browserQuery(asReq({ query: { sessionId: 'bad', correlationId: CORRELATION } })))
      .toMatchObject({ ok: false, correlationId: CORRELATION });
    expect(parser.browserQuery(asReq({ query: browserQuery })))
      .toEqual({ ok: true, value: browserQuery });
    await env.dispose();
  });

  it('relayHeaders fails closed on duplicates, commas, bad values; passes a clean set', async () => {
    const env = await parserEnv();
    const parser = await env.get<ConnectDesktopRequestParser>(ConnectDesktopRequestParser);
    const raw = (pairs: [string, string][]) => asReq({ rawHeaders: pairs.flat() });
    const good: [string, string][] = [
      ['Authorization', `Bearer ${TOKEN}`], ['X-Kazi-Device-Id', DEVICE_ID],
      ['X-Kazi-Credential-Generation', '1'], ['X-Kazi-Audience', 'desktop-relay'],
      ['X-Kazi-Protocol-Version', '1.0'],
    ];
    expect(parser.relayHeaders(raw(good))).toEqual({
      token: TOKEN, deviceId: DEVICE_ID, generation: 1,
      audience: 'desktop-relay', protocolVersion: '1.0',
    });
    expect(parser.relayHeaders(asReq({ rawHeaders: undefined }))).toBeNull();
    expect(parser.relayHeaders(raw([...good, ['Authorization', `Bearer ${TOKEN}`]]))).toBeNull();
    expect(parser.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Device-Id' ? [k, `${DEVICE_ID},${DEVICE_ID}`] as [string, string] : [k, v])))).toBeNull();
    expect(parser.relayHeaders(raw(good.map(([k, v]) =>
      k === 'Authorization' ? [k, 'Token abc'] as [string, string] : [k, v])))).toBeNull();
    expect(parser.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Credential-Generation' ? [k, '0'] as [string, string] : [k, v])))).toBeNull();
    expect(parser.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Audience' ? [k, 'other'] as [string, string] : [k, v])))).toBeNull();
    expect(parser.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Protocol-Version' ? [k, '2.0'] as [string, string] : [k, v])))).toBeNull();
    await env.dispose();
  });
});

describe('ConnectDesktopActorResolver directly', () => {
  const asReq = (value: Record<string, unknown>) => value as unknown as CompatRequest;
  const session = { session_id: SESSION_ID };
  const account = { user_id: USER_ID };
  const authed = { ok: true, value: { session, account } };

  const resolverEnv = (methods: Record<string, Record<string, unknown>>) =>
    base()
      .methods({
        ConnectClock: { now: control.returns(NOW) },
        ...methods,
      } as never)
      .build();

  it('browser resolves a matching authenticated session into a browser actor', async () => {
    const env = await resolverEnv({
      ConnectSessionAuthService: { authenticate: control.returns(Promise.resolve(authed)) },
    });
    const resolver = await env.get<ConnectDesktopActorResolver>(ConnectDesktopActorResolver);
    expect(await resolver.browser(
      asReq({ cookies: { kazi_connect_session: 'tok' }, headers: {} }), SESSION_ID, false,
    )).toEqual({ ok: true, actor: browserActor });
    expect(await resolver.browser(
      asReq({ cookies: { kazi_connect_session: 'tok' }, headers: {} }), 'ses_other0001', false,
    )).toEqual({ ok: false, reason: 'unauthorized' });
    await env.dispose();
  });

  it('browser mutation path forwards csrf cookie and header to authorizeMutation', async () => {
    const seen: unknown[][] = [];
    const env = await resolverEnv({
      ConnectSessionAuthService: {
        authorizeMutation: control.watch(() => (...args: unknown[]) => {
          seen.push(args); return Promise.resolve(authed);
        }),
      },
    });
    const resolver = await env.get<ConnectDesktopActorResolver>(ConnectDesktopActorResolver);
    const result = await resolver.browser(asReq({
      cookies: { kazi_connect_session: 'tok', kazi_connect_csrf: 'csrf-cookie' },
      headers: { 'x-csrf-token': 'csrf-header' },
    }), SESSION_ID, true);
    expect(result).toEqual({ ok: true, actor: browserActor });
    expect(seen).toEqual([['tok', 'csrf-cookie', 'csrf-header']]);
    await env.dispose();
  });

  it('browser passes auth failures through and treats malformed cookie jars as no token', async () => {
    const failing = await resolverEnv({
      ConnectSessionAuthService: {
        authenticate: control.returns(Promise.resolve({ ok: false, reason: 'unauthorized' })),
      },
    });
    const resolver = await failing.get<ConnectDesktopActorResolver>(ConnectDesktopActorResolver);
    expect(await resolver.browser(asReq({ cookies: null, headers: {} }), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(await resolver.browser(asReq({ cookies: ['x'], headers: {} }), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(await resolver.browser(asReq({ cookies: { kazi_connect_session: 7 }, headers: {} }), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    await failing.dispose();
  });

  it('relay admits only a fully matching credential and device', async () => {
    const rawHeaders = [
      'Authorization', `Bearer ${TOKEN}`, 'X-Kazi-Device-Id', DEVICE_ID,
      'X-Kazi-Credential-Generation', '1', 'X-Kazi-Audience', 'desktop-relay',
      'X-Kazi-Protocol-Version', '1.0',
    ];
    const env = await resolverEnv({
      ConnectDesktopCredentialRepo: { findByTokenHash: control.returns(Promise.resolve(credential)) },
      ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(device)) },
    });
    const resolver = await env.get<ConnectDesktopActorResolver>(ConnectDesktopActorResolver);
    expect(await resolver.relay(asReq({ rawHeaders }))).toEqual({
      ok: true, actor: {
        role: 'desktop_device', deviceId: DEVICE_ID, generation: 1, ownerUserId: USER_ID,
        protocolVersion: '1.0', audience: 'desktop-relay',
        credentialState: 'active', expiresAt: LATER_ISO,
      },
    });
    expect(await resolver.relay(asReq({ rawHeaders: [] }))).toEqual({ ok: false });
    await env.dispose();
  });

  it('relay fails closed on credential or device mismatches', async () => {
    const rawHeaders = [
      'Authorization', `Bearer ${TOKEN}`, 'X-Kazi-Device-Id', DEVICE_ID,
      'X-Kazi-Credential-Generation', '1', 'X-Kazi-Audience', 'desktop-relay',
      'X-Kazi-Protocol-Version', '1.0',
    ];
    for (const [cred, dev] of [
      [null, device],
      [{ ...credential, status: 'revoked' }, device],
      [{ ...credential, device_id: 'dev_other0001' }, device],
      [{ ...credential, expires_at: NOW_ISO }, device],
      [credential, null],
      [credential, { ...device, owner_user_id: null }],
      [credential, { ...device, state: 'revoked' }],
      [credential, { ...device, credential_generation: 2 }],
    ] as const) {
      const env = await resolverEnv({
        ConnectDesktopCredentialRepo: { findByTokenHash: control.returns(Promise.resolve(cred)) },
        ConnectDesktopDeviceRepo: { findByDeviceId: control.returns(Promise.resolve(dev)) },
      });
      const resolver = await env.get<ConnectDesktopActorResolver>(ConnectDesktopActorResolver);
      expect(await resolver.relay(asReq({ rawHeaders }))).toEqual({ ok: false });
      await env.dispose();
    }
  });
});
