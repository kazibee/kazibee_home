/**
 * Executor channel negative and forwarding paths (connect_channel.controller)
 * through testDinner. Complements connect_channel.testdinner.test.ts with the
 * branches it leaves open: executor-id validation below the route envelope,
 * the missing raw-request guard, credential rejection on the upgrade path,
 * malformed coordinator bindings, and the successful Durable Object forward.
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
import Env from '../../../src/server/services/env';

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

const upgradeHeaders = {
  Upgrade: 'websocket',
  authorization: `Bearer ${TOKEN}`,
  'x-kazi-device-id': DEVICE_ID,
  'x-kazi-executor-id': EXECUTOR_ID,
  'x-kazi-credential-generation': '1',
  'x-kazi-audience': 'executor-relay',
  'x-kazi-protocol-version': '1.1',
};

const channelBase = () =>
  testDinner(executorsSource)
    .select({ route: { method: 'get', path: '/v1/connect/executors/{executorId}/channel' } })
    .controllers({ 'connect_channel.controller': ConnectChannelController })
    .hooks({});

const rawUpgrade = () =>
  new Request(`https://kazibee.test/v1/connect/executors/${EXECUTOR_ID}/channel`, {
    headers: upgradeHeaders,
  });

/** Minimal CompatResponse capturing status/json for direct controller calls. */
function fakeRes() {
  const captured: { status: number | null; body: unknown } = { status: null, body: null };
  const res = {
    status(code: number) { captured.status = code; return res; },
    json(body: unknown) { captured.body = body; return res; },
  };
  return { res: res as never, captured };
}

describe('executor channel negative paths through testDinner (no server, no database)', () => {
  it('a malformed or missing executorId is rejected before touching the raw request', async () => {
    const env = await channelBase()
      .methods([ [RawRequest, { get: control.never() }] ])
      .build();
    const controller = await env.get<ConnectChannelController>(ConnectChannelController);

    for (const params of [undefined, {}, { executorId: 'bad' }, { executorId: 'dev_abcdefgh' }]) {
      const { res, captured } = fakeRes();
      await controller.connect({ req: { params } as never, res });
      expect(captured.status).toBe(400);
      expect(captured.body).toEqual({ error: true, code: 'INVALID_EXECUTOR_ID' });
    }
    await env.verify();
    await env.dispose();
  });

  it('a request context without a captured raw request is a 500, fail closed', async () => {
    const env = await channelBase()
      .methods([ [RawRequest, { get: control.returns(null) }] ])
      .build();
    const response = await env.dinner.request({
      method: 'GET', path: `/v1/connect/executors/${EXECUTOR_ID}/channel`,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, code: 'RAW_REQUEST_UNAVAILABLE' });
    await env.dispose();
  });

  it('an upgrade with well-formed headers but an unknown credential is 401', async () => {
    const env = await channelBase()
      .methods([
        [RawRequest, { get: control.returns(rawUpgrade()) }],
        [ConnectExecutorCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(null))),
        }],
        [ConnectExecutorRepo, { findByExecutorId: control.never() }],
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

  it('a binding that is not a coordinator namespace is 503, whatever its shape', async () => {
    for (const binding of ['not-a-namespace', {}, { idFromName: () => 'id', get: 'nope' }]) {
      const env = await channelBase()
        .methods([
          [RawRequest, { get: control.returns(rawUpgrade()) }],
          [Env, { get: control.returns(binding) }],
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
    }
  });

  it('an authenticated upgrade is forwarded untouched to the coordinator Durable Object', async () => {
    const seen: { name?: string; forwarded?: globalThis.Request } = {};
    const coordinator = {
      idFromName(name: string) { seen.name = name; return { name }; },
      get(_id: unknown) {
        return {
          async fetch(request: globalThis.Request) {
            seen.forwarded = request;
            return new Response(JSON.stringify({ ok: true, upgraded: true }), {
              status: 200, headers: { 'content-type': 'application/json' },
            });
          },
        };
      },
    };
    const raw = rawUpgrade();
    const env = await channelBase()
      .methods([
        [RawRequest, { get: control.returns(raw) }],
        [Env, { get: control.returns(coordinator) }],
        [ConnectExecutorCredentialRepo, {
          findByTokenHash: control.once(control.returns(Promise.resolve(credential))),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve(executor))),
        }],
      ])
      .build();
    const controller = await env.get<ConnectChannelController>(ConnectChannelController);
    const { res } = fakeRes();
    const result = await controller.connect({
      req: { params: { executorId: EXECUTOR_ID } } as never, res,
    });
    expect(seen.name).toBe(EXECUTOR_ID);
    expect(seen.forwarded).toBe(raw);
    expect(result).toBeInstanceOf(Response);
    expect(await (result as Response).json()).toEqual({ ok: true, upgraded: true });
    await env.verify();
    await env.dispose();
  });
});
