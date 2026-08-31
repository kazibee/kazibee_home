/**
 * Connect client relay (Desktop-facing) routes through testDinner (no
 * server, no database).
 *
 * Real production source (src/server/openapi/connect/client-relay.yaml),
 * real controller → parser/resolver → logic → service graph, real in-memory
 * ConnectExecutorConnectionRegistry / ConnectClientRelayService. Desktop
 * credential authentication happens inside the controller from raw headers,
 * so it is fully driven at route depth by stubbing the credential/device
 * repos. The long-lived SSE success branch of GET /events is not driven
 * (it never settles in-process); its auth branch is.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectClientRelayController from '../../../src/server/controller/connect_client_relay.controller';
import ConnectClientRelayLogic from '../../../src/server/logic/connect_client_relay.logic';
import type { DesktopRelayActor } from '../../../src/server/services/connect_desktop_actor_resolver';
import type { SseSink } from '../../../src/server/services/sse_stream';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectDesktopCredentialRepo from '../../../src/server/repo/connect_desktop_credential_repo';
import ConnectWebsiteDeploymentIdentityRepo from '../../../src/server/repo/connect_website_deployment_identity_repo';
import ConnectDesktopDeviceRepo from '../../../src/server/repo/connect_desktop_device_repo';

const clientRelaySource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/client-relay.yaml'), 'utf8')
) as Record<string, unknown>;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const TOKEN = 'D'.repeat(43);
const DEVICE_ID = 'dev_desktop01';
const EXECUTOR_ID = 'exe_machine01';
const OWNER_ID = 'usr_owner001';
const CORRELATION_ID = 'cor_abcdefgh';
const WDP = `wdp_${'a'.repeat(32)}`;
const FUTURE = '2999-01-01T00:00:00.000Z';

const relayHeaders = (overrides: Record<string, string> = {}) => ({
  authorization: `Bearer ${TOKEN}`,
  'x-kazi-device-id': DEVICE_ID,
  'x-kazi-credential-generation': '1',
  'x-kazi-audience': 'desktop-relay',
  'x-kazi-protocol-version': '1.0',
  ...overrides,
});

const credentialRow = () => ({
  credential_id: 'cred_desktop01',
  device_id: DEVICE_ID,
  generation: 1,
  token_hash: sha256(TOKEN),
  audience: 'desktop-relay',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: FUTURE,
  revoked_at: null,
});

const deviceRow = () => ({
  device_id: DEVICE_ID,
  owner_user_id: OWNER_ID,
  display_name: 'Desk',
  platform: 'macos',
  architecture: 'arm64',
  desktop_version: '1.0.0',
  key_fingerprint: 'b'.repeat(64),
  state: 'active',
  credential_generation: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
});

const executorRow = () => ({
  executor_id: EXECUTOR_ID,
  device_id: 'dev_machine01',
  owner_user_id: OWNER_ID,
  display_name: 'Build Box',
  platform: 'macos',
  architecture: 'arm64',
  executor_version: '1.2.3',
  key_fingerprint: 'a'.repeat(64),
  state: 'active',
  credential_generation: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
});

const desktopAuthMethods = () => ([
  [ConnectDesktopCredentialRepo, {
    findByTokenHash: control.returns(Promise.resolve(credentialRow())),
  }],
  [ConnectDesktopDeviceRepo, {
    findByDeviceId: control.returns(Promise.resolve(deviceRow())),
  }],
] as const);

const commandFrame = () => ({
  kind: 'command.post',
  protocolVersion: '1.0',
  commandId: 'cmd_abcdefgh',
  correlationId: CORRELATION_ID,
  idempotencyKey: 'idem_0123456789abcdef',
  websiteDeploymentId: WDP,
  executorId: EXECUTOR_ID,
  deviceId: DEVICE_ID,
  actorRole: 'desktop_device',
  operation: 'workspaces.read',
  payload: { limit: 10 },
});

const fakeSink = (): SseSink => {
  let ended = false;
  return {
    write: () => !ended,
    end: () => { ended = true; },
    get writableEnded() { return ended; },
    onClose: () => {},
  };
};

const base = () =>
  testDinner(clientRelaySource)
    .select({ module: 'connectClientRelay' })
    .controllers({ 'connect_client_relay.controller': ConnectClientRelayController })
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

describe('connect client relay routes through testDinner (no server, no database)', () => {
  it('GET /executors returns the owner-filtered executor list for a valid Desktop credential', async () => {
    const env = await base()
      .methods([
        ...desktopAuthMethods(),
        [ConnectExecutorRepo, {
          listByOwner: control.once(control.returns(Promise.resolve([executorRow()]))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/client-relay/executors',
      headers: relayHeaders(),
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-kazi-protocol-version')).toBe('1.0');
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

  it('GET /executors answers 401 revoked when the credential row is unknown', async () => {
    const env = await base()
      .methods([
        [ConnectDesktopCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(null))),
        }],
        [ConnectExecutorRepo, { listByOwner: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/client-relay/executors',
      headers: relayHeaders(),
      query: { correlationId: CORRELATION_ID },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
    await env.dispose();
  });

  it('GET /executors rejects extra query keys before touching any credential repo', async () => {
    const env = await base()
      .methods([
        [ConnectDesktopCredentialRepo, { findByTokenHash: control.never() }],
        [ConnectExecutorRepo, { listByOwner: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/client-relay/executors',
      headers: relayHeaders(),
      query: { correlationId: CORRELATION_ID, extra: '1' },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      kind: 'error',
      code: 'invalid-envelope',
      correlationId: CORRELATION_ID,
    });
    await env.verify();
    await env.dispose();
  });

  it('POST /commands answers 401 revoked before parsing when authentication fails', async () => {
    const env = await base()
      .methods([
        [ConnectDesktopCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(null))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/v1/connect/client-relay/commands',
      headers: relayHeaders(),
      body: commandFrame(),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      kind: 'error',
      code: 'revoked',
      correlationId: 'cor_invalid000',
    });
    await env.verify();
    await env.dispose();
  });

  it('POST /commands rejects malformed bodies at both validation layers (400)', async () => {
    const env = await base()
      .methods(desktopAuthMethods())
      .build();
    // Layer 1: the OpenAPI request schema (dinner) rejects a body missing
    // required envelope fields before the controller runs.
    const schemaReject = await env.dinner.request({
      method: 'POST',
      path: '/v1/connect/client-relay/commands',
      headers: relayHeaders(),
      body: { kind: 'command.post', protocolVersion: '1.0', correlationId: CORRELATION_ID },
    });
    expect(schemaReject.status).toBe(400);
    expect(await schemaReject.json()).toMatchObject({ error: true, message: 'Request validation failed' });
    // Layer 2: a body that satisfies the route schema but violates the
    // canonical Kazi Connect protocol schema (workspaces.read payload must
    // carry limit) is the controller's own invalid-envelope.
    const protocolReject = await env.dinner.request({
      method: 'POST',
      path: '/v1/connect/client-relay/commands',
      headers: relayHeaders(),
      body: { ...commandFrame(), payload: {} },
    });
    expect(protocolReject.status).toBe(400);
    expect(await protocolReject.json()).toMatchObject({
      kind: 'error',
      code: 'invalid-envelope',
      correlationId: CORRELATION_ID,
    });
    await env.dispose();
  });

  it('POST /commands reports executor-offline (503, retryable) when the target executor has no live channel', async () => {
    const env = await base()
      .methods([
        ...desktopAuthMethods(),
        [ConnectWebsiteDeploymentIdentityRepo, {
          findSingleton: control.returns(Promise.resolve({
            website_deployment_id: WDP,
            created_at: '2026-01-01T00:00:00.000Z',
          })),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.returns(Promise.resolve(executorRow())),
        }],
      ])
      .build();
    // The command path requires the Desktop's own events channel to be open;
    // open it directly through the real logic/service with an inert sink.
    const logic = await env.get<ConnectClientRelayLogic>(ConnectClientRelayLogic);
    const actor: DesktopRelayActor = {
      role: 'desktop_device', deviceId: DEVICE_ID, generation: 1, ownerUserId: OWNER_ID,
      protocolVersion: '1.0', audience: 'desktop-relay', credentialState: 'active', expiresAt: FUTURE,
    };
    const fence = logic.open(actor, fakeSink());
    const response = await env.dinner.request({
      method: 'POST',
      path: '/v1/connect/client-relay/commands',
      headers: relayHeaders(),
      body: commandFrame(),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      kind: 'error',
      code: 'executor-offline',
      retryable: true,
      correlationId: CORRELATION_ID,
    });
    logic.close(DEVICE_ID, fence);
    await env.dispose();
  });

  it('GET /events answers 401 revoked instead of opening a stream when authentication fails', async () => {
    const env = await base()
      .methods([
        [ConnectDesktopCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(null))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/v1/connect/client-relay/events',
      headers: relayHeaders(),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
    await env.dispose();
  });
});
