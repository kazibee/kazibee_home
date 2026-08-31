/**
 * Executor channel routes (connect_channel.controller) through testDinner.
 *
 * Real production executors.yaml source; the channel controller owns
 * POST /channel-auth (shared credential verification) and
 * GET /{executorId}/channel (WebSocket upgrade admission). Only the @Query
 * repos and the per-request RawRequest holder are replaced.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import ConnectChannelController from '../../../src/server/controller/connect_channel.controller';
import ConnectExecutorCredentialRepo from '../../../src/server/repo/connect_executor_credential_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import RawRequest from '../../../src/server/services/raw_request';

const executorsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/executors.yaml'), 'utf8')
) as Record<string, unknown>;

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

// Selecting the whole module would require binding every executor controller;
// the channel controller owns exactly these two route identities.
const routeBase = (method: 'get' | 'post', routePath: string) =>
  testDinner(executorsSource)
    .select({ route: { method, path: routePath } })
    .controllers({ 'connect_channel.controller': ConnectChannelController })
    .hooks({});
const base = () => routeBase('post', '/v1/connect/executors/channel-auth');
const channelBase = () => routeBase('get', '/v1/connect/executors/{executorId}/channel');

describe('executor channel routes through testDinner (no server, no database)', () => {
  it('POST /channel-auth verifies a live credential end to end', async () => {
    const env = await base()
      .methods([
        [ConnectExecutorCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(credential))),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve(executor))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth', body: validBody,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, executorId: EXECUTOR_ID, generation: 1 });
    await env.verify();
    await env.dispose();
  });

  it('POST /channel-auth fails closed on a malformed envelope before any repo lookup', async () => {
    const env = await base()
      .methods([
        [ConnectExecutorCredentialRepo, { findByTokenHash: control.never() }],
        [ConnectExecutorRepo, { findByExecutorId: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth',
      body: { ...validBody, audience: 'desktop-relay' },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    await env.verify();
    await env.dispose();
  });

  it('POST /channel-auth with an unknown token is 401 and never touches the executor row', async () => {
    const env = await base()
      .methods([
        [ConnectExecutorCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(null))),
        }],
        [ConnectExecutorRepo, { findByExecutorId: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth', body: validBody,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    await env.verify();
    await env.dispose();
  });

  it('POST /channel-auth rejects a stale credential generation on the executor row', async () => {
    const env = await base()
      .methods([
        [ConnectExecutorCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(credential))),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve({
            ...executor, credential_generation: 2,
          }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/v1/connect/executors/channel-auth', body: validBody,
    });
    expect(response.status).toBe(401);
    await env.verify();
    await env.dispose();
  });

  it('GET /{executorId}/channel without a WebSocket upgrade is 426', async () => {
    const raw = new Request(`https://kazibee.test/v1/connect/executors/${EXECUTOR_ID}/channel`);
    const env = await channelBase()
      .methods([ [RawRequest, { get: control.returns(raw) }] ])
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/executors/${EXECUTOR_ID}/channel`,
    });
    expect(response.status).toBe(426);
    expect(await response.json()).toEqual({ error: true, code: 'UPGRADE_REQUIRED' });
    await env.dispose();
  });

  it('GET /{executorId}/channel upgrade without credential headers is 401 before any coordinator', async () => {
    const raw = new Request(`https://kazibee.test/v1/connect/executors/${EXECUTOR_ID}/channel`, {
      headers: { Upgrade: 'websocket' },
    });
    const env = await channelBase()
      .methods([
        [RawRequest, { get: control.returns(raw) }],
        [ConnectExecutorCredentialRepo, { findByTokenHash: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/executors/${EXECUTOR_ID}/channel`,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, code: 'CHANNEL_AUTH_FAILED' });
    await env.verify();
    await env.dispose();
  });

  it('GET /{executorId}/channel with valid credentials but no coordinator binding is 503', async () => {
    const raw = new Request(`https://kazibee.test/v1/connect/executors/${EXECUTOR_ID}/channel`, {
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
    const env = await channelBase()
      .methods([
        [RawRequest, { get: control.returns(raw) }],
        [ConnectExecutorCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(credential))),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve(executor))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/executors/${EXECUTOR_ID}/channel`,
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: true, code: 'COORDINATOR_UNAVAILABLE' });
    await env.verify();
    await env.dispose();
  });
});
