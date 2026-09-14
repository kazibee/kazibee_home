/**
 * Connect executor relay routes through root testApp over the original
 * configuration (no server, no database). Historical case names remain stable.
 *
 * Real production relay.yaml module selection (connectRelay), real
 * controller → parser → verifier → logic → service graph, real in-memory
 * ConnectExecutorConnectionRegistry. Executor device authentication happens
 * inside the controller from raw headers + credential repos, so 401/409
 * branches and the channel.hello/heartbeat acknowledgement path are all
 * driven at route depth. Only the SQL repo boundary is replaced through
 * singular method controls. The long-lived SSE success branch of GET /events
 * is not driven (it never settles in-process); its auth branch is.
 * resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const TOKEN = 'E'.repeat(43);
const EXECUTOR_ID = 'exe_machine01';
const DEVICE_ID = 'dev_machine01';
const CORRELATION_ID = 'cor_abcdefgh';

const relayHeaders = (overrides: Record<string, string> = {}) => ({
  authorization: `Bearer ${TOKEN}`,
  'x-kazi-executor-id': EXECUTOR_ID,
  'x-kazi-device-id': DEVICE_ID,
  'x-kazi-credential-generation': '1',
  'x-kazi-audience': 'executor-relay',
  'x-kazi-protocol-version': '1.0',
  ...overrides,
});

const credentialRow = () => ({
  credential_id: 'cred_machine01',
  executor_id: EXECUTOR_ID,
  generation: 1,
  token_hash: sha256(TOKEN),
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  revoked_at: null,
});

const executorRow = () => ({
  executor_id: EXECUTOR_ID,
  device_id: DEVICE_ID,
  owner_user_id: 'usr_owner001',
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

// Executor-device-authenticated repos: token hash → credential row → executor
// row (+ presence touch). A reusable replacement description (same
// tokens/slots/descriptors/order as before), not an application constructor.
const executorAuth = () => testStub()
  .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.returns(Promise.resolve(credentialRow())))
  .method(ConnectExecutorRepo, 'findByExecutorId', control.returns(Promise.resolve(executorRow())))
  .method(ConnectExecutorRepo, 'updatePresence', control.returns(Promise.resolve(undefined)));

const heartbeat = (overrides: Record<string, unknown> = {}) => ({
  kind: 'channel.heartbeat',
  protocolVersion: '1.0',
  executorId: EXECUTOR_ID,
  deviceId: DEVICE_ID,
  actorRole: 'executor_device',
  state: 'idle',
  sentAt: '2026-01-01T00:00:00.000Z',
  correlationId: CORRELATION_ID,
  ...overrides,
});

describe('connect relay routes through testDinner (no server, no database)', () => {
  it('POST / acknowledges a heartbeat from an authenticated executor device', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } }).use(executorAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders(),
      body: heartbeat(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-kazi-protocol-version')).toBe('1.0');
    expect(await response.json()).toEqual({
      kind: 'channel.ack',
      protocolVersion: '1.0',
      executorId: EXECUTOR_ID,
      acknowledgedKind: 'channel.heartbeat',
      correlationId: CORRELATION_ID,
    });
  }));

  it('POST / acknowledges channel.hello', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } }).use(executorAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders(),
      body: {
        kind: 'channel.hello',
        protocolVersion: '1.0',
        executorId: EXECUTOR_ID,
        deviceId: DEVICE_ID,
        actorRole: 'executor_device',
        correlationId: CORRELATION_ID,
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'channel.ack',
      acknowledgedKind: 'channel.hello',
      correlationId: CORRELATION_ID,
    });
  }));

  it('POST / answers 401 revoked when the audience header is wrong, without touching the repos', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } })
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders({ 'x-kazi-audience': 'wrong-audience' }),
      body: heartbeat(),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
  }));

  it('POST / answers 409 protocol-version-mismatch for an unknown protocol header', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } }).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders({ 'x-kazi-protocol-version': '2.0' }),
      body: heartbeat(),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'protocol-version-mismatch' });
  }));

  it('POST / answers 401 when the frame claims a different executor identity than the credential', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } }).use(executorAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders(),
      body: heartbeat({ executorId: 'exe_impostor1' }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      kind: 'error',
      code: 'revoked',
      correlationId: CORRELATION_ID,
    });
  }));

  it('POST / rejects malformed frames at both validation layers (400)', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } }).use(executorAuth()).build();
    // Layer 1: dinner's OpenAPI oneOf rejects an unknown frame kind before the
    // controller runs. Over the original configuration the production
    // onRequestError shaper (src/server/middleware/connect_request_error.ts,
    // wired in src/server/server.ts) maps that rejection onto the canonical
    // invalid-envelope error envelope; the earlier testDinner harness ran with
    // empty hooks and surfaced the framework's default validation payload.
    const schemaReject = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders(),
      body: { kind: 'channel.unknown', protocolVersion: '1.0', correlationId: CORRELATION_ID },
    });
    expect(schemaReject.status).toBe(400);
    expect(await schemaReject.json()).toMatchObject({
      kind: 'error',
      code: 'invalid-envelope',
      correlationId: CORRELATION_ID,
    });
    // Layer 2: a conversation.create result without its execution-binding
    // receipt passes the route schema but is the parser's invalid-envelope.
    const protocolReject = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders(),
      body: {
        kind: 'command.result', protocolVersion: '1.0', commandId: 'cmd_abcdefgh',
        correlationId: CORRELATION_ID, executorId: EXECUTOR_ID, actorRole: 'executor_device',
        operation: 'conversation.create', completedAt: '2026-01-01T00:00:00.000Z', result: {},
      },
    });
    expect(protocolReject.status).toBe(400);
    expect(await protocolReject.json()).toMatchObject({
      kind: 'error',
      code: 'invalid-envelope',
      correlationId: CORRELATION_ID,
    });
  }));

  it('POST / answers 413 for oversized frames', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } }).use(executorAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/connect/relay/',
      headers: relayHeaders(),
      body: {
        kind: 'command.result', protocolVersion: '1.0', commandId: 'cmd_abcdefgh',
        correlationId: CORRELATION_ID, executorId: EXECUTOR_ID, actorRole: 'executor_device',
        operation: 'workspaces.read', completedAt: '2026-01-01T00:00:00.000Z',
        result: { filler: 'x'.repeat(300 * 1024) },
      },
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      kind: 'error',
      code: 'invalid-envelope',
      correlationId: CORRELATION_ID,
    });
  }));

  it('GET /events answers 401 revoked instead of opening a stream when authentication fails', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['connectRelay'] } })
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(null))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/v1/connect/relay/events',
      headers: relayHeaders(),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ kind: 'error', code: 'revoked' });
    await env.verify();
  }));
});
