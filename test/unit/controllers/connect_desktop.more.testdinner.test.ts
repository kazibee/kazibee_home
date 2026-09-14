/**
 * Extended connect desktop coverage through root testApp over the original
 * configuration. Historical case names remain stable.
 *
 * Three layers, no server, no database:
 *  - Controller HTTP branches for the mutation endpoints (createClaim /
 *    decideClaim / rename / revoke): the transactional LOGIC methods are
 *    replaced through singular method controls so the controller's parsing,
 *    auth, response mapping, and error mapping run for real without a live
 *    transaction.
 *  - ConnectDesktopService methods invoked directly (env.get) with repo
 *    controls — none of the service methods themselves carry @transaction
 *    (that decorator lives on ConnectDesktopLogic), so outside a
 *    transaction currentTransaction() is simply absent and the bodies run.
 *  - Parser and actor-resolver branches driven directly with fake requests.
 *
 * The @transaction-decorated logic bodies (createClaim/decideTransaction/
 * rename/revoke on ConnectDesktopLogic) are intentionally left to the DB
 * tier. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { testApp, type AppTestBuilder } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import type { CompatRequest } from '@noego/dinner';
import ConnectDesktopController from '../../../src/server/controller/connect_desktop.controller';
import ConnectDesktopService from '../../../src/server/services/connect_desktop_service';
import ConnectDesktopRequestParser from '../../../src/server/services/connect_desktop_request_parser';
import ConnectDesktopActorResolver, { type ConnectDesktopActor } from '../../../src/server/services/connect_desktop_actor_resolver';
import ConnectDesktopLogic from '../../../src/server/logic/connect_desktop.logic';
import ConnectDesktopDeviceRepo from '../../../src/server/repo/connect_desktop_device_repo';
import ConnectDesktopClaimRepo from '../../../src/server/repo/connect_desktop_claim_repo';
import ConnectDesktopAuditRepo from '../../../src/server/repo/connect_desktop_audit_repo';
import ConnectDesktopCredentialRepo from '../../../src/server/repo/connect_desktop_credential_repo';
import ConnectClientRelayService from '../../../src/server/services/connect_client_relay_service';
import ConnectSessionAuthService from '../../../src/server/services/connect_session_auth_service';
import { ConnectClock } from '../../../src/server/services/connect_auth_primitives';
import ConnectWebsiteDeploymentIdentityService from '../../../src/server/services/connect_website_deployment_identity_service';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['connectDesktops'] } } as const;
type Env = Awaited<ReturnType<AppTestBuilder['build']>>;

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

/** Reusable description: the browser actor resolver admits the fixed owner session. */
const okActor = testStub()
  .method(ConnectDesktopActorResolver, 'browser', control.returns(Promise.resolve({ ok: true, actor: browserActor })));

/** Sequential control: call N resolves to value N. */
const seq = <T extends readonly unknown[]>(...values: T) =>
  control.calls(values.map((value) => control.returns(Promise.resolve(value))));

/** Fake response sink for direct controller calls (below the OpenAPI validator). */
const fakeRes = () => {
  const captured: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) { captured.status = code; return this; },
    json(body: unknown) { captured.body = body; return this; },
  };
  return { captured, res };
};

describe('connect desktop controller mutation branches (logic stubbed above the transaction)', () => {
  describe('POST /claims (createClaim)', () => {
    const post = (env: Env, body: unknown, headers: Record<string, string> = { 'x-kazi-bootstrap-token': TOKEN }) =>
      env.request({ method: 'POST', path: '/v1/connect/desktops/claims', headers, body });

    it('maps a created challenge onto a 201 envelope', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'createClaim', control.once(control.returns(Promise.resolve({ outcome: 'created', challenge }))))
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
    }));

    it('maps an idempotent retry onto a 200', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'createClaim', control.returns(Promise.resolve({ outcome: 'retry', challenge })))
        .build();
      const response = await post(env, createBody);
      expect(response.status).toBe(200);
      await response.body?.cancel();
    }));

    it('maps conflict and failed outcomes onto 409 and 500', resourceCase(async () => {
      for (const [outcome, status, code] of [
        ['conflict', 409, 'idempotency-conflict'], ['failed', 500, 'invalid-envelope'],
      ] as const) {
        const env = await testApp(CONFIG).select(SELECT)
          .method(ConnectDesktopLogic, 'createClaim', control.returns(Promise.resolve({ outcome })))
          .build();
        const response = await post(env, createBody);
        expect(response.status).toBe(status);
        expect(await response.json()).toMatchObject({ kind: 'error', code, correlationId: CORRELATION });
      }
    }));

    it('maps a thrown unique-constraint error onto a 409 and anything else onto a 500', resourceCase(async () => {
      const unique = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'createClaim', control.throws(new Error('UNIQUE constraint failed: connect_desktop_claims.claim_id')))
        .build();
      const uniqueResponse = await post(unique, createBody);
      expect(uniqueResponse.status).toBe(409);
      await uniqueResponse.body?.cancel();

      const generic = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'createClaim', control.throws(new Error('database is on fire')))
        .build();
      const genericResponse = await post(generic, createBody);
      expect(genericResponse.status).toBe(500);
      await genericResponse.body?.cancel();
    }));

    it('rejects a missing bootstrap token with a uniform 401 before the logic runs', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'createClaim', control.never())
        .build();
      const response = await post(env, createBody, {});
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'revoked', correlationId: CORRELATION });
      await env.verify();
    }));

    it('maps a parser protocol mismatch onto a 409 (direct controller call, below the OpenAPI validator)', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'createClaim', control.never())
        .build();
      const controller = await env.dinner.controller<ConnectDesktopController>(ConnectDesktopController);
      const { captured, res } = fakeRes();
      await controller.createClaim({
        req: { body: { ...createBody, protocolVersion: '2.0' }, headers: {}, params: {}, query: {} },
        res,
      } as never);
      expect(captured.status).toBe(409);
      expect(captured.body).toMatchObject({
        code: 'protocol-version-mismatch', message: 'Protocol version mismatch', correlationId: CORRELATION,
      });
      await env.verify();
    }));
  });

  describe('POST /claims/{claimId}/decision (decideClaim)', () => {
    const post = (env: Env, body: unknown) =>
      env.request({ method: 'POST', path: `/v1/connect/desktops/claims/${CLAIM_ID}/decision`, body });

    it('maps an accepted decision onto the credential envelope', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopLogic, 'decide', control.once(control.returns(Promise.resolve({
          outcome: 'accepted', deviceId: DEVICE_ID, credentialExpiresAt: LATER_ISO,
          websiteAccountId: USER_ID, websiteDeploymentId: 'dep_00000001',
        }))))
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
    }));

    it('maps denied onto a plain decision response without credentials', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopLogic, 'decide', control.returns(Promise.resolve({ outcome: 'denied' })))
        .build();
      const response = await post(env, { ...decisionBody, decision: 'deny' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.claim.decision.response', protocolVersion: '1.0',
        claimId: CLAIM_ID, status: 'denied', correlationId: CORRELATION,
      });
    }));

    it('maps not-found/expired/replayed/failed outcomes and thrown errors', resourceCase(async () => {
      for (const [outcome, status] of [
        ['not-found', 404], ['expired', 409], ['replayed', 409], ['failed', 500],
      ] as const) {
        const env = await testApp(CONFIG).select(SELECT).use(okActor)
          .method(ConnectDesktopLogic, 'decide', control.returns(Promise.resolve({ outcome })))
          .build();
        const response = await post(env, decisionBody);
        expect(response.status).toBe(status);
        await response.body?.cancel();
      }
      const throwing = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopLogic, 'decide', control.throws(new Error('boom')))
        .build();
      const response = await post(throwing, decisionBody);
      expect(response.status).toBe(500);
      await response.body?.cancel();
    }));

    it('maps auth failures: unauthorized 401 and csrf 403', resourceCase(async () => {
      for (const [reason, status, code] of [
        ['unauthorized', 401, 'revoked'], ['csrf', 403, 'invalid-envelope'],
      ] as const) {
        const env = await testApp(CONFIG).select(SELECT)
          .method(ConnectDesktopActorResolver, 'browser', control.returns(Promise.resolve({ ok: false, reason })))
          .method(ConnectDesktopLogic, 'decide', control.never())
          .build();
        const response = await post(env, decisionBody);
        expect(response.status).toBe(status);
        expect(await response.json()).toMatchObject({ code, correlationId: CORRELATION });
        await env.verify();
      }
    }));

    it('rejects a body whose claimId does not match the path with a 400', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'decide', control.never())
        .build();
      const response = await post(env, { ...decisionBody, claimId: 'clm_different' });
      expect(response.status).toBe(400);
      await response.body?.cancel();
      await env.verify();
    }));
  });

  describe('POST /{deviceId}/rename and /{deviceId}/revoke', () => {
    const post = (env: Env, action: string, body: unknown, query: Record<string, string> = browserQuery) =>
      env.request({ method: 'POST', path: `/v1/connect/desktops/${DEVICE_ID}/${action}`, query, body });

    it('rename maps a renamed device onto the detail envelope', resourceCase(async () => {
      const renamed = { ...device, display_name: 'Renamed' };
      const env = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopLogic, 'rename', control.once(control.returns(Promise.resolve({ outcome: 'renamed', device: renamed }))))
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
    }));

    it('rename maps not-found/failed/thrown to 404/500/500 and correlation mismatch to 400', resourceCase(async () => {
      for (const [stub, status] of [
        [control.returns(Promise.resolve({ outcome: 'not-found' })), 404],
        [control.returns(Promise.resolve({ outcome: 'failed' })), 500],
        [control.throws(new Error('boom')), 500],
      ] as const) {
        const env = await testApp(CONFIG).select(SELECT).use(okActor)
          .method(ConnectDesktopLogic, 'rename', stub)
          .build();
        const response = await post(env, 'rename', renameBody);
        expect(response.status).toBe(status);
        await response.body?.cancel();
      }
      const mismatch = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'rename', control.never())
        .build();
      const response = await post(mismatch, 'rename', renameBody, {
        sessionId: SESSION_ID, correlationId: 'cor_different1',
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ correlationId: CORRELATION });
      await mismatch.verify();
    }));

    it('rename rejects a malformed body before auth or logic', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'rename', control.never())
        .build();
      const response = await post(env, 'rename', { ...renameBody, displayName: '   ' });
      expect(response.status).toBe(400);
      await response.body?.cancel();
      await env.verify();
    }));

    it('revoke maps a revoked device onto the action envelope', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopLogic, 'revoke', control.once(control.returns(Promise.resolve({
          outcome: 'revoked', device: { ...device, state: 'revoked', credential_generation: 2 },
        }))))
        .build();
      const response = await post(env, 'revoke', revokeBody);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.action.response', protocolVersion: '1.0',
        deviceId: DEVICE_ID, state: 'revoked', correlationId: CORRELATION,
      });
      await env.verify();
    }));

    it('revoke maps not-found/failed/thrown to 404/500/500 and correlation mismatch to 400', resourceCase(async () => {
      for (const [stub, status] of [
        [control.returns(Promise.resolve({ outcome: 'not-found' })), 404],
        [control.returns(Promise.resolve({ outcome: 'failed' })), 500],
        [control.throws(new Error('boom')), 500],
      ] as const) {
        const env = await testApp(CONFIG).select(SELECT).use(okActor)
          .method(ConnectDesktopLogic, 'revoke', stub)
          .build();
        const response = await post(env, 'revoke', revokeBody);
        expect(response.status).toBe(status);
        await response.body?.cancel();
      }
      const mismatch = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopLogic, 'revoke', control.never())
        .build();
      const response = await post(mismatch, 'revoke', revokeBody, {
        sessionId: SESSION_ID, correlationId: 'cor_different1',
      });
      expect(response.status).toBe(400);
      await response.body?.cancel();
      await mismatch.verify();
    }));
  });

  describe('read endpoints (list/detail/review/claimStatus) remaining branches', () => {
    it('GET / lists the owner devices as summaries', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopDeviceRepo, 'listByOwner', control.once(control.returns(Promise.resolve([device]))))
        .build();
      const response = await env.request({
        method: 'GET', path: '/v1/connect/desktops/', query: browserQuery,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: 'desktop.list.response', protocolVersion: '1.0',
        devices: [{ deviceId: DEVICE_ID, displayName: 'My Desktop', state: 'active', protocolVersion: '1.0' }],
        correlationId: CORRELATION,
      });
      await env.verify();
    }));

    it('list with a malformed browser query is a 400 with the fallback correlation id (direct call)', resourceCase(async () => {
      const env = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopActorResolver, 'browser', control.never())
        .build();
      const controller = await env.dinner.controller<ConnectDesktopController>(ConnectDesktopController);
      const { captured, res } = fakeRes();
      await controller.list({
        req: { query: { sessionId: SESSION_ID }, headers: {}, params: {}, body: {} }, res,
      } as never);
      expect(captured.status).toBe(400);
      expect(captured.body).toMatchObject({ correlationId: 'cor_invalid000' });
      await env.verify();
    }));

    it('GET /{deviceId} maps found, not-found, and failed detail outcomes', resourceCase(async () => {
      for (const [stub, status] of [
        [control.returns(Promise.resolve({ outcome: 'found', device })), 200],
        [control.returns(Promise.resolve({ outcome: 'not-found' })), 404],
        [control.returns(Promise.resolve({ outcome: 'failed' })), 500],
      ] as const) {
        const env = await testApp(CONFIG).select(SELECT).use(okActor)
          .method(ConnectDesktopService, 'detail', stub)
          .build();
        const response = await env.request({
          method: 'GET', path: `/v1/connect/desktops/${DEVICE_ID}`, query: browserQuery,
        });
        expect(response.status).toBe(status);
        if (status === 200) {
          expect(await response.json()).toMatchObject({
            kind: 'desktop.detail.response', deviceId: DEVICE_ID, lastSeenAt: NOW_ISO,
          });
        } else {
          await response.body?.cancel();
        }
      }
    }));

    it('GET /claims/review/{lookup} maps found, not-found, failed, and auth failure', resourceCase(async () => {
      const found = await testApp(CONFIG).select(SELECT).use(okActor)
        .method(ConnectDesktopService, 'review', control.once(control.returns(Promise.resolve({ outcome: 'found', claim, device, status: 'pending' }))))
        .build();
      const response = await found.request({
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

      for (const [outcome, status] of [['not-found', 404], ['failed', 500]] as const) {
        const env = await testApp(CONFIG).select(SELECT).use(okActor)
          .method(ConnectDesktopService, 'review', control.returns(Promise.resolve({ outcome })))
          .build();
        const outcomeResponse = await env.request({
          method: 'GET', path: `/v1/connect/desktops/claims/review/${CLAIM_ID}`, query: browserQuery,
        });
        expect(outcomeResponse.status).toBe(status);
        await outcomeResponse.body?.cancel();
      }

      const unauthorized = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopActorResolver, 'browser', control.returns(Promise.resolve({ ok: false, reason: 'unauthorized' })))
        .method(ConnectDesktopService, 'review', control.never())
        .build();
      const unauthorizedResponse = await unauthorized.request({
        method: 'GET', path: `/v1/connect/desktops/claims/review/${CLAIM_ID}`, query: browserQuery,
      });
      expect(unauthorizedResponse.status).toBe(401);
      await unauthorizedResponse.body?.cancel();
      await unauthorized.verify();
    }));

    it('GET /claims/{claimId}/status maps accepted and failed service outcomes', resourceCase(async () => {
      const accepted = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopService, 'status', control.once(control.returns(Promise.resolve({
          outcome: 'status', status: 'accepted', deviceId: DEVICE_ID,
          credentialExpiresAt: LATER_ISO, websiteAccountId: USER_ID,
          websiteDeploymentId: 'dep_00000001',
        }))))
        .build();
      const response = await accepted.request({
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

      const failed = await testApp(CONFIG).select(SELECT)
        .method(ConnectDesktopService, 'status', control.returns(Promise.resolve({ outcome: 'failed' })))
        .build();
      const failedResponse = await failed.request({
        method: 'GET', path: `/v1/connect/desktops/claims/${CLAIM_ID}/status`,
        headers: { 'x-kazi-bootstrap-token': TOKEN }, query: { correlationId: CORRELATION },
      });
      expect(failedResponse.status).toBe(500);
      await failedResponse.body?.cancel();
    }));
  });
});

describe('ConnectDesktopService directly (undecorated bodies, repos stubbed)', () => {
  // Reusable method description only. Transaction inspection has no database
  // side effect when no transaction exists; no fake Database entry is needed.
  const serviceBoundaries = testStub()
    .method(ConnectClock, 'now', control.returns(NOW))
    .method(ConnectWebsiteDeploymentIdentityService, 'get', control.returns(Promise.resolve('dep_00000001')));

  const service = (env: Env) => env.get<ConnectDesktopService>(ConnectDesktopService);

  const envelopeHash = sha256(JSON.stringify([
    createBody.kind, createBody.protocolVersion, createBody.claimId, createBody.deviceId,
    createBody.actorRole, createBody.displayName, createBody.platform, createBody.architecture,
    createBody.desktopVersion, createBody.keyFingerprint, createBody.idempotencyKey, TOKEN_HASH,
  ]));

  it('createClaim creates the device, claim, and audit trail for a fresh envelope', resourceCase(async () => {
    const created: Record<string, unknown>[] = [];
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByIdempotencyKey', control.returns(Promise.resolve(null)))
      .method(ConnectDesktopClaimRepo, 'findByClaimId', seq(null, claim))
      .method(ConnectDesktopClaimRepo, 'createClaim', control.watch(() => (input: Record<string, unknown>) => {
        created.push(input); return Promise.resolve();
      }))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopDeviceRepo, 'createDevice', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopAuditRepo, 'appendEvent', control.once(control.returns(Promise.resolve())))
      .build();
    const result = await (await service(env)).createClaim(createBody as never, TOKEN);
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
  }));

  it('createClaim replays an identical pending envelope as a retry challenge', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByIdempotencyKey', control.returns(Promise.resolve({ ...claim, envelope_hash: envelopeHash })))
      .method(ConnectDesktopClaimRepo, 'createClaim', control.never())
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopDeviceRepo, 'createDevice', control.never())
      .build();
    const result = await (await service(env)).createClaim(createBody as never, TOKEN);
    expect(result).toMatchObject({ outcome: 'retry', challenge: { claimId: CLAIM_ID } });
    await env.verify();
  }));

  it('createClaim reports conflict when the existing claim differs or the device is gone', resourceCase(async () => {
    for (const [existing, existingDevice] of [
      [{ ...claim, envelope_hash: 'different' }, device],
      [{ ...claim, envelope_hash: envelopeHash, status: 'accepted' }, device],
      [{ ...claim, envelope_hash: envelopeHash }, null],
    ] as const) {
      const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
        .method(ConnectDesktopClaimRepo, 'findByIdempotencyKey', control.returns(Promise.resolve(existing)))
        .method(ConnectDesktopClaimRepo, 'createClaim', control.never())
        .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(existingDevice)))
        .build();
      expect(await (await service(env)).createClaim(createBody as never, TOKEN)).toEqual({ outcome: 'conflict' });
    }
  }));

  it('createClaim maps unique-constraint failures to conflict and other errors to failed', resourceCase(async () => {
    const unique = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByIdempotencyKey', control.throws(new Error('UNIQUE constraint failed: claims')))
      .build();
    expect(await (await service(unique)).createClaim(createBody as never, TOKEN)).toEqual({ outcome: 'conflict' });

    const broken = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByIdempotencyKey', control.throws(new Error('disk full')))
      .build();
    expect(await (await service(broken)).createClaim(createBody as never, TOKEN)).toEqual({ outcome: 'failed' });
  }));

  it('status returns the full accepted credential payload when every guard passes', resourceCase(async () => {
    const accepted = { ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID };
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve(accepted)))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(credential)))
      .build();
    expect(await (await service(env)).status(CLAIM_ID, TOKEN)).toEqual({
      outcome: 'status', status: 'accepted', deviceId: DEVICE_ID,
      credentialExpiresAt: LATER_ISO, websiteAccountId: USER_ID,
      websiteDeploymentId: 'dep_00000001',
    });
  }));

  it('status fails closed on any accepted-claim guard: wrong owner, revoked device, dead credential', resourceCase(async () => {
    const accepted = { ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID };
    for (const [dev, cred] of [
      [{ ...device, owner_user_id: 'usr_other0001' }, credential],
      [{ ...device, state: 'revoked' }, credential],
      [device, null],
      [device, { ...credential, status: 'revoked' }],
      [device, { ...credential, expires_at: NOW_ISO }],
      [device, { ...credential, generation: 2 }],
    ] as const) {
      const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
        .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve(accepted)))
        .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(dev)))
        .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(cred)))
        .build();
      expect(await (await service(env)).status(CLAIM_ID, TOKEN)).toEqual({ outcome: 'unauthorized' });
    }
  }));

  it('status reports denied claims verbatim and repo failures as failed', resourceCase(async () => {
    const denied = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve({ ...claim, status: 'denied' })))
      .build();
    expect(await (await service(denied)).status(CLAIM_ID, TOKEN)).toEqual({ outcome: 'status', status: 'denied' });

    const broken = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.throws(new Error('boom')))
      .build();
    expect(await (await service(broken)).status(CLAIM_ID, TOKEN)).toEqual({ outcome: 'failed' });
  }));

  it('review reports not-found for a missing claim or orphaned device, failed on errors', resourceCase(async () => {
    const missing = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve(null)))
      .build();
    expect(await (await service(missing)).review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });

    const orphaned = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve(claim)))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(null)))
      .build();
    expect(await (await service(orphaned)).review({ claimId: CLAIM_ID })).toEqual({ outcome: 'not-found' });

    const broken = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByCodeHash', control.throws(new Error('boom')))
      .build();
    expect(await (await service(broken)).review({ code: 'ABCD-EFGH' })).toEqual({ outcome: 'failed' });
  }));

  it('decide accepts a pending claim end to end: accept, own, credential, audit', resourceCase(async () => {
    const decided = {
      ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', seq(claim, decided))
      .method(ConnectDesktopClaimRepo, 'acceptPending', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopDeviceRepo, 'acceptOwner', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopCredentialRepo, 'createCredential', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopAuditRepo, 'appendEvent', control.once(control.returns(Promise.resolve())))
      .build();
    const result = await (await service(env)).decide(browserActor, decisionBody as never);
    expect(result).toEqual({
      outcome: 'accepted', deviceId: DEVICE_ID,
      credentialExpiresAt: new Date(NOW.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      websiteAccountId: USER_ID, websiteDeploymentId: 'dep_00000001',
    });
    await env.verify();
  }));

  it('decide denies a pending claim and audits the denial', resourceCase(async () => {
    const decided = { ...claim, status: 'denied' as const, decided_by_user_id: USER_ID };
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', seq(claim, decided))
      .method(ConnectDesktopClaimRepo, 'denyPending', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopAuditRepo, 'appendEvent', control.once(control.returns(Promise.resolve())))
      .build();
    expect(await (await service(env)).decide(browserActor, { ...decisionBody, decision: 'deny' } as never))
      .toEqual({ outcome: 'denied' });
    await env.verify();
  }));

  it('decide refuses non-browser actors, missing claims, expired claims, and lost races', resourceCase(async () => {
    const nonBrowser = await testApp(CONFIG).select(SELECT).use(serviceBoundaries).build();
    expect(await (await service(nonBrowser)).decide(desktopActor, decisionBody as never)).toEqual({ outcome: 'not-found' });

    const missing = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve(null)))
      .build();
    expect(await (await service(missing)).decide(browserActor, decisionBody as never)).toEqual({ outcome: 'not-found' });

    const expired = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve({ ...claim, expires_at: NOW_ISO })))
      .build();
    expect(await (await service(expired)).decide(browserActor, decisionBody as never)).toEqual({ outcome: 'expired' });

    // deny raced by someone else: the re-read shows a different decider.
    const raced = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', seq(claim, { ...claim, status: 'denied', decided_by_user_id: 'usr_other0001' }))
      .method(ConnectDesktopClaimRepo, 'denyPending', control.returns(Promise.resolve()))
      .build();
    expect(await (await service(raced)).decide(browserActor, { ...decisionBody, decision: 'deny' } as never)).toEqual({ outcome: 'replayed' });

    const broken = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.throws(new Error('boom')))
      .build();
    expect(await (await service(broken)).decide(browserActor, decisionBody as never)).toEqual({ outcome: 'failed' });
  }));

  it('decide treats an already-decided claim idempotently: same decider replays accepted', resourceCase(async () => {
    const settled = {
      ...claim, status: 'accepted' as const, decided_by_user_id: USER_ID,
      decision_idempotency_key: IDEM,
    };
    const idempotent = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve(settled)))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(credential)))
      .build();
    expect(await (await service(idempotent)).decide(browserActor, decisionBody as never)).toEqual({
      outcome: 'accepted', deviceId: DEVICE_ID, credentialExpiresAt: LATER_ISO,
      websiteAccountId: USER_ID, websiteDeploymentId: 'dep_00000001',
    });

    // Different idempotency key on a settled claim is a replay.
    const replayed = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve({ ...settled, decision_idempotency_key: 'idem_bbbbbbbbbbbbbbbb' })))
      .build();
    expect(await (await service(replayed)).decide(browserActor, decisionBody as never)).toEqual({ outcome: 'replayed' });

    // Idempotent denial replays denied.
    const denied = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopClaimRepo, 'findByClaimId', control.returns(Promise.resolve({
        ...settled, status: 'denied' as const,
      })))
      .build();
    expect(await (await service(denied)).decide(browserActor, { ...decisionBody, decision: 'deny' } as never)).toEqual({ outcome: 'denied' });
  }));

  it('rename renames an owned active device and audits it', resourceCase(async () => {
    const renamed = { ...device, display_name: 'Renamed' };
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', seq(device, renamed))
      .method(ConnectDesktopDeviceRepo, 'renameOwned', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopAuditRepo, 'appendEvent', control.once(control.returns(Promise.resolve())))
      .build();
    expect(await (await service(env)).rename(browserActor, renameBody as never))
      .toEqual({ outcome: 'renamed', device: renamed });
    await env.verify();
  }));

  it('rename refuses non-browser actors, revoked devices, lost writes, and maps errors to failed', resourceCase(async () => {
    const nonBrowser = await testApp(CONFIG).select(SELECT).use(serviceBoundaries).build();
    expect(await (await service(nonBrowser)).rename(desktopActor, renameBody as never)).toEqual({ outcome: 'not-found' });

    const revoked = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve({ ...device, state: 'revoked' })))
      .method(ConnectDesktopDeviceRepo, 'renameOwned', control.never())
      .build();
    expect(await (await service(revoked)).rename(browserActor, renameBody as never)).toEqual({ outcome: 'not-found' });

    const lost = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopDeviceRepo, 'renameOwned', control.returns(Promise.resolve()))
      .build();
    expect(await (await service(lost)).rename(browserActor, renameBody as never)).toEqual({ outcome: 'not-found' });

    const broken = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .method(ConnectDesktopDeviceRepo, 'renameOwned', control.throws(new Error('boom')))
      .build();
    expect(await (await service(broken)).rename(browserActor, renameBody as never)).toEqual({ outcome: 'failed' });
  }));

  it('revoke fences the credential generation, audits, and notifies the relay', resourceCase(async () => {
    const revoked = { ...device, state: 'revoked' as const, credential_generation: 2 };
    const relayed: string[] = [];
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', seq(device, revoked))
      .method(ConnectDesktopDeviceRepo, 'revokeOwned', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopCredentialRepo, 'revokeForDevice', control.once(control.returns(Promise.resolve())))
      .method(ConnectDesktopAuditRepo, 'appendEvent', control.once(control.returns(Promise.resolve())))
      .method(ConnectClientRelayService, 'revokeDesktop', control.watch(() => (deviceId: string) => { relayed.push(deviceId); }))
      .build();
    expect(await (await service(env)).revoke(browserActor, revokeBody as never))
      .toEqual({ outcome: 'revoked', device: revoked });
    expect(relayed).toEqual([DEVICE_ID]);
    await env.verify();
  }));

  it('revoke is idempotent on an already-revoked device and fails on a broken fence', resourceCase(async () => {
    const alreadyRevoked = { ...device, state: 'revoked' as const, credential_generation: 2 };
    const idempotent = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(alreadyRevoked)))
      .method(ConnectDesktopDeviceRepo, 'revokeOwned', control.never())
      .build();
    expect(await (await service(idempotent)).revoke(browserActor, revokeBody as never)).toEqual({ outcome: 'revoked', device: alreadyRevoked });
    await idempotent.verify();

    // Fence invariant: generation did not advance → failed.
    const broken = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', seq(device, { ...device, state: 'revoked' }))
      .method(ConnectDesktopDeviceRepo, 'revokeOwned', control.returns(Promise.resolve()))
      .method(ConnectDesktopCredentialRepo, 'revokeForDevice', control.returns(Promise.resolve()))
      .build();
    expect(await (await service(broken)).revoke(browserActor, revokeBody as never)).toEqual({ outcome: 'failed' });

    const nonBrowser = await testApp(CONFIG).select(SELECT).use(serviceBoundaries).build();
    expect(await (await service(nonBrowser)).revoke(desktopActor, revokeBody as never)).toEqual({ outcome: 'not-found' });

    const missing = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(null)))
      .build();
    expect(await (await service(missing)).revoke(browserActor, revokeBody as never)).toEqual({ outcome: 'not-found' });
  }));

  it('detail maps repo failures to failed', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(serviceBoundaries)
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.throws(new Error('boom')))
      .build();
    expect(await (await service(env)).detail(browserActor, DEVICE_ID)).toEqual({ outcome: 'failed' });
  }));
});

// Note: ConnectDesktopLogic's remaining uncovered lines are exactly the
// @transaction-decorated bodies (createClaim/decideTransaction/rename/revoke)
// and decide()'s queue around decideTransaction. decideTransaction is invoked
// via `this.`, bypassing the IoC method proxy, so it cannot be replaced with
// a method control and requires a live SQLStack database — left to the DB tier.

describe('ConnectDesktopRequestParser remaining branches', () => {
  const parser = (env: Env) => env.get<ConnectDesktopRequestParser>(ConnectDesktopRequestParser);
  const asReq = (value: Record<string, unknown>) => value as unknown as CompatRequest;

  it('claimCreate: extra keys, wrong kind, windows/arm64, and bad correlation fall back', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).build();
    const p = await parser(env);
    expect(p.claimCreate(null)).toEqual({
      ok: false, reason: 'invalid-envelope', correlationId: 'cor_invalid000',
    });
    expect(p.claimCreate({ ...createBody, extra: 1 })).toMatchObject({ ok: false, correlationId: CORRELATION });
    expect(p.claimCreate({ ...createBody, kind: 'other' })).toMatchObject({ ok: false });
    expect(p.claimCreate({ ...createBody, platform: 'windows', architecture: 'arm64' }))
      .toMatchObject({ ok: false, reason: 'invalid-envelope' });
    expect(p.claimCreate({ ...createBody, platform: 'windows', architecture: 'x64' }))
      .toMatchObject({ ok: true });
    expect(p.claimCreate({ ...createBody, correlationId: 42 }))
      .toMatchObject({ ok: false, correlationId: 'cor_invalid000' });
  }));

  it('decision: protocol mismatch, wrong session shape, bad decision', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).build();
    const p = await parser(env);
    expect(p.decision({ ...decisionBody, protocolVersion: '9.9' }, CLAIM_ID))
      .toMatchObject({ ok: false, reason: 'protocol-version-mismatch', correlationId: CORRELATION });
    expect(p.decision({ ...decisionBody, sessionId: 'nope' }, CLAIM_ID)).toMatchObject({ ok: false });
    expect(p.decision({ ...decisionBody, decision: 'maybe' }, CLAIM_ID)).toMatchObject({ ok: false });
    expect(p.decision(decisionBody, CLAIM_ID)).toMatchObject({ ok: true });
  }));

  it('rename/revoke owner mutations: key sets, kinds, and protocol are enforced', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).build();
    const p = await parser(env);
    expect(p.rename(renameBody, DEVICE_ID)).toMatchObject({ ok: true });
    expect(p.rename({ ...renameBody, protocolVersion: '2.0' }, DEVICE_ID))
      .toMatchObject({ ok: false, reason: 'protocol-version-mismatch' });
    expect(p.rename({ ...renameBody, kind: 'desktop.action.request' }, DEVICE_ID)).toMatchObject({ ok: false });
    expect(p.rename(renameBody, 'dev_other0001')).toMatchObject({ ok: false });
    expect(p.rename('not-a-record', DEVICE_ID)).toMatchObject({ ok: false });
    expect(p.revoke(revokeBody, DEVICE_ID)).toMatchObject({ ok: true });
    expect(p.revoke({ ...revokeBody, action: 'pause' }, DEVICE_ID)).toMatchObject({ ok: false });
    expect(p.revoke({ ...revokeBody, kind: 'desktop.rename.request' }, DEVICE_ID)).toMatchObject({ ok: false });
  }));

  it('correlation/bootstrapToken/lookup/browserQuery edge shapes', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).build();
    const p = await parser(env);
    expect(p.correlation(asReq({ query: { correlationId: 'bad' } }))).toBe('cor_invalid000');
    expect(p.correlation(asReq({ query: {} }))).toBe('cor_invalid000');
    expect(p.correlation(asReq({ query: { correlationId: CORRELATION } }))).toBe(CORRELATION);
    expect(p.bootstrapToken(asReq({ headers: {} }))).toBeNull();
    expect(p.bootstrapToken(asReq({ headers: { 'x-kazi-bootstrap-token': 'short' } }))).toBeNull();
    expect(p.bootstrapToken(asReq({ headers: { 'x-kazi-bootstrap-token': TOKEN } }))).toBe(TOKEN);
    expect(p.lookup(42)).toBeNull();
    expect(p.lookup('nonsense')).toBeNull();
    expect(p.lookup(CLAIM_ID)).toEqual({ claimId: CLAIM_ID });
    expect(p.lookup('ABCD-EFGH')).toEqual({ code: 'ABCD-EFGH' });
    expect(p.browserQuery(asReq({ query: { sessionId: SESSION_ID } }))).toMatchObject({ ok: false });
    expect(p.browserQuery(asReq({ query: { sessionId: 'bad', correlationId: CORRELATION } })))
      .toMatchObject({ ok: false, correlationId: CORRELATION });
    expect(p.browserQuery(asReq({ query: browserQuery })))
      .toEqual({ ok: true, value: browserQuery });
  }));

  it('relayHeaders fails closed on duplicates, commas, bad values; passes a clean set', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).build();
    const p = await parser(env);
    const raw = (pairs: [string, string][]) => asReq({ rawHeaders: pairs.flat() });
    const good: [string, string][] = [
      ['Authorization', `Bearer ${TOKEN}`], ['X-Kazi-Device-Id', DEVICE_ID],
      ['X-Kazi-Credential-Generation', '1'], ['X-Kazi-Audience', 'desktop-relay'],
      ['X-Kazi-Protocol-Version', '1.0'],
    ];
    expect(p.relayHeaders(raw(good))).toEqual({
      token: TOKEN, deviceId: DEVICE_ID, generation: 1,
      audience: 'desktop-relay', protocolVersion: '1.0',
    });
    expect(p.relayHeaders(asReq({ rawHeaders: undefined }))).toBeNull();
    expect(p.relayHeaders(raw([...good, ['Authorization', `Bearer ${TOKEN}`]]))).toBeNull();
    expect(p.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Device-Id' ? [k, `${DEVICE_ID},${DEVICE_ID}`] as [string, string] : [k, v])))).toBeNull();
    expect(p.relayHeaders(raw(good.map(([k, v]) =>
      k === 'Authorization' ? [k, 'Token abc'] as [string, string] : [k, v])))).toBeNull();
    expect(p.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Credential-Generation' ? [k, '0'] as [string, string] : [k, v])))).toBeNull();
    expect(p.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Audience' ? [k, 'other'] as [string, string] : [k, v])))).toBeNull();
    expect(p.relayHeaders(raw(good.map(([k, v]) =>
      k === 'X-Kazi-Protocol-Version' ? [k, '2.0'] as [string, string] : [k, v])))).toBeNull();
  }));
});

describe('ConnectDesktopActorResolver directly', () => {
  const asReq = (value: Record<string, unknown>) => value as unknown as CompatRequest;
  const session = { session_id: SESSION_ID };
  const account = { user_id: USER_ID };
  const authed = { ok: true, value: { session, account } };

  /** Reusable description shared by every resolver case: the fixed clock. */
  const resolverBoundaries = testStub().method(ConnectClock, 'now', control.returns(NOW));
  const resolver = (env: Env) => env.get<ConnectDesktopActorResolver>(ConnectDesktopActorResolver);

  it('browser resolves a matching authenticated session into a browser actor', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(resolverBoundaries)
      .method(ConnectSessionAuthService, 'authenticate', control.returns(Promise.resolve(authed)))
      .build();
    const r = await resolver(env);
    expect(await r.browser(
      asReq({ cookies: { kazi_connect_session: 'tok' }, headers: {} }), SESSION_ID, false,
    )).toEqual({ ok: true, actor: browserActor });
    expect(await r.browser(
      asReq({ cookies: { kazi_connect_session: 'tok' }, headers: {} }), 'ses_other0001', false,
    )).toEqual({ ok: false, reason: 'unauthorized' });
  }));

  it('browser mutation path forwards csrf cookie and header to authorizeMutation', resourceCase(async () => {
    const seen: unknown[][] = [];
    const env = await testApp(CONFIG).select(SELECT).use(resolverBoundaries)
      .method(ConnectSessionAuthService, 'authorizeMutation', control.watch(() => (...args: unknown[]) => {
        seen.push(args); return Promise.resolve(authed);
      }))
      .build();
    const r = await resolver(env);
    const result = await r.browser(asReq({
      cookies: { kazi_connect_session: 'tok', kazi_connect_csrf: 'csrf-cookie' },
      headers: { 'x-csrf-token': 'csrf-header' },
    }), SESSION_ID, true);
    expect(result).toEqual({ ok: true, actor: browserActor });
    expect(seen).toEqual([['tok', 'csrf-cookie', 'csrf-header']]);
  }));

  it('browser passes auth failures through and treats malformed cookie jars as no token', resourceCase(async () => {
    const failing = await testApp(CONFIG).select(SELECT).use(resolverBoundaries)
      .method(ConnectSessionAuthService, 'authenticate', control.returns(Promise.resolve({ ok: false, reason: 'unauthorized' })))
      .build();
    const r = await resolver(failing);
    expect(await r.browser(asReq({ cookies: null, headers: {} }), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(await r.browser(asReq({ cookies: ['x'], headers: {} }), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
    expect(await r.browser(asReq({ cookies: { kazi_connect_session: 7 }, headers: {} }), SESSION_ID, false))
      .toEqual({ ok: false, reason: 'unauthorized' });
  }));

  it('relay admits only a fully matching credential and device', resourceCase(async () => {
    const rawHeaders = [
      'Authorization', `Bearer ${TOKEN}`, 'X-Kazi-Device-Id', DEVICE_ID,
      'X-Kazi-Credential-Generation', '1', 'X-Kazi-Audience', 'desktop-relay',
      'X-Kazi-Protocol-Version', '1.0',
    ];
    const env = await testApp(CONFIG).select(SELECT).use(resolverBoundaries)
      .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(credential)))
      .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(device)))
      .build();
    const r = await resolver(env);
    expect(await r.relay(asReq({ rawHeaders }))).toEqual({
      ok: true, actor: {
        role: 'desktop_device', deviceId: DEVICE_ID, generation: 1, ownerUserId: USER_ID,
        protocolVersion: '1.0', audience: 'desktop-relay',
        credentialState: 'active', expiresAt: LATER_ISO,
      },
    });
    expect(await r.relay(asReq({ rawHeaders: [] }))).toEqual({ ok: false });
  }));

  it('relay fails closed on credential or device mismatches', resourceCase(async () => {
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
      const env = await testApp(CONFIG).select(SELECT).use(resolverBoundaries)
        .method(ConnectDesktopCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(cred)))
        .method(ConnectDesktopDeviceRepo, 'findByDeviceId', control.returns(Promise.resolve(dev)))
        .build();
      expect(await (await resolver(env)).relay(asReq({ rawHeaders }))).toEqual({ ok: false });
    }
  }));
});
