/**
 * Executor channel routes (connect_channel.controller) through root testApp
 * over the original configuration (no server, no database). Historical case
 * names remain stable.
 *
 * Real production executors.yaml module selection (connectExecutors); the
 * channel controller owns POST /channel-auth (shared credential verification)
 * and GET /{executorId}/channel (WebSocket upgrade admission). Only the SQL
 * repo boundary and the per-request RawRequest holder's `get` are replaced
 * through singular method controls. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import RawRequest from '../../../src/server/services/raw_request';

// Original-config testApp supplies an empty Env unless this case replaces it.

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['connectExecutors'] } } as const;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const TOKEN = 'A'.repeat(43);
const EXECUTOR_ID = 'exe_abcdefgh';
const DEVICE_ID = 'dev_abcdefgh';
const NOW = '2026-01-01T00:00:00.000Z';

const credential = {
  credential_id: 'cred_fixed001', executor_id: EXECUTOR_ID, generation: 1,
  token_hash: sha256(TOKEN), status: 'active', created_at: NOW, revoked_at: null,
};
const executor = {
  executor_id: EXECUTOR_ID, device_id: DEVICE_ID, owner_user_id: 'usr_owner001',
  display_name: 'Executor', platform: 'macos', architecture: 'arm64',
  executor_version: '1.0.0', key_fingerprint: 'f'.repeat(64), state: 'active',
  credential_generation: 1, created_at: NOW, claimed_at: NOW, updated_at: NOW, last_seen_at: NOW,
};

const validBody = {
  authorization: `Bearer ${TOKEN}`, executorId: EXECUTOR_ID, deviceId: DEVICE_ID,
  generation: '1', audience: 'executor-relay', protocolVersion: '1.1',
};

const returns = (value: unknown) => control.returns(Promise.resolve(value));

// A live credential row matched by an active executor row: exactly one lookup
// each. A reusable replacement description, not an application constructor.
const liveCredential = (executorRow: Record<string, unknown> = executor) => testStub()
  .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.once(returns(credential)))
  .method(ConnectExecutorRepo, 'findByExecutorId', control.once(returns(executorRow)));

// Neither repo may be consulted.
const noLookups = () => testStub()
  .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.never())
  .method(ConnectExecutorRepo, 'findByExecutorId', control.never());

const channelPath = `/v1/connect/executors/${EXECUTOR_ID}/channel`;
const rawChannel = (init?: RequestInit) => new Request(`https://kazibee.test${channelPath}`, init);

describe('executor channel routes through testDinner (no server, no database)', () => {
  it('POST /channel-auth verifies a live credential end to end', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(liveCredential())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth', body: validBody,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, executorId: EXECUTOR_ID, generation: 1 });
    await env.verify();
  }));

  it('POST /channel-auth fails closed on a malformed envelope before any repo lookup', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(noLookups())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth',
      body: { ...validBody, audience: 'desktop-relay' },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    await env.verify();
  }));

  it('POST /channel-auth with an unknown token is 401 and never touches the executor row', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.once(returns(null)))
      .method(ConnectExecutorRepo, 'findByExecutorId', control.never())
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth', body: validBody,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    await env.verify();
  }));

  it('POST /channel-auth rejects a stale credential generation on the executor row', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(liveCredential({ ...executor, credential_generation: 2 }))
      .build();
    const response = await env.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth', body: validBody,
    });
    expect(response.status).toBe(401);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('GET /{executorId}/channel without a WebSocket upgrade is 426', resourceCase(async () => {
    const raw = rawChannel();
    const env = await testApp(CONFIG).select(SELECT)
      .method(RawRequest, 'get', control.returns(raw))
      .build();
    const response = await env.request({ method: 'GET', path: channelPath });
    expect(response.status).toBe(426);
    expect(await response.json()).toEqual({ error: true, code: 'UPGRADE_REQUIRED' });
  }));

  it('GET /{executorId}/channel upgrade without credential headers is 401 before any coordinator', resourceCase(async () => {
    const raw = rawChannel({ headers: { Upgrade: 'websocket' } });
    const env = await testApp(CONFIG).select(SELECT)
      .method(RawRequest, 'get', control.returns(raw))
      .method(ConnectExecutorCredentialRepo, 'findByTokenHash', control.never())
      .build();
    const response = await env.request({ method: 'GET', path: channelPath });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, code: 'CHANNEL_AUTH_FAILED' });
    await env.verify();
  }));

  it('GET /{executorId}/channel with valid credentials but no coordinator binding is 503', resourceCase(async () => {
    const raw = rawChannel({
      headers: {
        Upgrade: 'websocket',
        authorization: `Bearer ${TOKEN}`,
        'x-kazi-device-id': DEVICE_ID,
        'x-kazi-executor-id': EXECUTOR_ID,
        'x-kazi-credential-generation': '1',
        'x-kazi-audience': 'executor-relay',
        'x-kazi-protocol-version': '1.1',
      },
    });
    const env = await testApp(CONFIG).select(SELECT)
      .method(RawRequest, 'get', control.returns(raw))
      .use(liveCredential())
      .build();
    const response = await env.request({ method: 'GET', path: channelPath });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: true, code: 'COORDINATOR_UNAVAILABLE' });
    await env.verify();
  }));
});
