/**
 * RemoteToolDispatchService routing branches, in isolation.
 *
 * Every subject is the real production instance resolved from the
 * original-config root testApp (remoteTools module, no server, no database).
 * Environment data comes from a caller-built Env loaded with exactly the
 * case's bindings (process.env is never mutated), and the outbound HTTP
 * boundary is the injectable RemoteToolCoordinatorClient, replaced per case
 * through immutable method controls; no globals are stubbed. resourceCase
 * owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, testStub, test as control } from '@noego/testing';
import Env from '../../../src/server/services/env';
import RemoteToolDispatchService, { type DispatchResult } from '../../../src/server/services/remote_tool_dispatch_service';
import RemoteToolCoordinatorClient from '../../../src/server/services/remote_tool_coordinator_client';
import type { RemoteToolGrant } from '../../../src/server/repo/remote_tool_grant_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['remoteTools'] } } as const;

const DEV_ORIGIN = 'http://127.0.0.1:9999';
const EXECUTOR_ID = 'exe_machine01';

// Environment data for one case: a caller-built Env loaded with exactly the
// case's bindings; process.env is never mutated.
const envWith = (bindings: Record<string, unknown>) => () => {
  const env = new Env();
  env.load(bindings);
  return env;
};

/** Coordinator HTTP behavior for one case: a handler over the outbound Request, recorded by the environment. */
const coordinatorHttp = (handler: (request: Request) => Promise<Response> | Response) =>
  control.watch(() => async (request: Request) => handler(request));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const target = () => ({
  executorId: EXECUTOR_ID,
  workspaceId: 'wrk_workspace1',
  scopes: ['workspace.read'],
  grantId: 'rtg_grant0001',
  toolSessionId: 'rts_grant0001',
});

/** A fake Durable Object namespace speaking the coordinator contract. */
function coordinatorNamespace(handler: (request: Request) => Promise<Response> | Response) {
  return {
    idFromName: (name: string) => ({ name }),
    get: () => ({ fetch: async (request: Request) => handler(request) }),
  };
}

describe('presence / presenceDetail', () => {
  it('returns null when this deployment has no coordinator routing at all', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({}))
      .method(RemoteToolCoordinatorClient, 'fetch', control.never())
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presence(EXECUTOR_ID)).toBeNull();
    expect(await dispatch.presenceDetail(EXECUTOR_ID)).toBeNull();
  }));

  it('reports online state and workspace projection through the dev coordinator origin', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp((request) => {
        expect(request.url).toBe(`${DEV_ORIGIN}/executors/${EXECUTOR_ID}/presence`);
        return jsonResponse({
          state: 'online',
          workspaces: { workspaces: [
            { workspaceId: 'wrk_workspace1', displayName: 'Site', state: 'available' },
            { workspaceId: 'wrk_workspace2' },
            { notAWorkspace: true },
          ] },
        });
      }))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presenceDetail(EXECUTOR_ID)).toEqual({
      state: 'online',
      workspaces: [
        { workspaceId: 'wrk_workspace1', displayName: 'Site', state: 'available' },
        { workspaceId: 'wrk_workspace2', displayName: 'wrk_workspace2', state: 'unavailable' },
      ],
    });
    expect(await dispatch.presence(EXECUTOR_ID)).toBe('online');
    expect(control.inspect(env, RemoteToolCoordinatorClient, 'fetch').count).toBe(2);
  }));

  it('degrades a non-OK presence response to offline with no workspaces', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(() => jsonResponse({ error: true }, 503)))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presenceDetail(EXECUTOR_ID)).toEqual({ state: 'offline', workspaces: [] });
  }));

  it('degrades a network failure to offline', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', control.throws(new Error('ECONNREFUSED')))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presence(EXECUTOR_ID)).toBe('offline');
  }));

  it('maps an unrecognized state string to offline', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(() => jsonResponse({ state: 'weird' })))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presence(EXECUTOR_ID)).toBe('offline');
  }));

  it('routes presence through an EXECUTOR_COORDINATOR namespace when bound', resourceCase(async () => {
    const namespace = coordinatorNamespace((request) => {
      expect(request.url).toBe('https://coordinator/presence');
      return jsonResponse({ state: 'stale' });
    });
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ EXECUTOR_COORDINATOR: namespace }))
      .method(RemoteToolCoordinatorClient, 'fetch', control.never())
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presence(EXECUTOR_ID)).toBe('stale');
  }));

  it('ignores a binding that does not implement the namespace contract', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ EXECUTOR_COORDINATOR: { not: 'a namespace' } }))
      .method(RemoteToolCoordinatorClient, 'fetch', control.never())
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.presence(EXECUTOR_ID)).toBeNull();
  }));
});

describe('callTarget / call', () => {
  it('reports EXECUTOR_OFFLINE when no routing exists', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({}))
      .method(RemoteToolCoordinatorClient, 'fetch', control.never())
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    const outcome = await dispatch.callTarget(target(), 'read_file', { path: 'x' });
    expect(outcome).toMatchObject({ ok: false, code: 'EXECUTOR_OFFLINE' });
  }));

  it('dispatches a command.post frame to the dev coordinator and unwraps success', resourceCase(async () => {
    let seenFrame: Record<string, unknown> | null = null;
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(async (request) => {
        expect(request.url).toBe(`${DEV_ORIGIN}/executors/${EXECUTOR_ID}/dispatch`);
        expect(request.method).toBe('POST');
        seenFrame = await request.json() as Record<string, unknown>;
        return jsonResponse({
          result: { status: 'succeeded', payload: { bytes: 12 }, effectState: 'none' },
        });
      }))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    const outcome = await dispatch.callTarget(target(), 'read_file', { path: 'README.md' });
    expect(outcome).toEqual({ ok: true, status: 'succeeded', payload: { bytes: 12 }, effectState: 'none' });
    expect(seenFrame).toMatchObject({
      kind: 'command.post',
      protocolVersion: '1.1',
      operation: 'remote_tool.call',
      executorId: EXECUTOR_ID,
      actorRole: 'remote_tool_gateway',
      payload: {
        toolName: 'read_file',
        arguments: { path: 'README.md' },
        scopes: ['workspace.read'],
        workspaceId: 'wrk_workspace1',
        toolSessionId: 'rts_grant0001',
        grantId: 'rtg_grant0001',
        grantGeneration: 1,
      },
    });
  }));

  it('unwraps a failed command.result frame into a structured failure', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(() => jsonResponse({
        result: {
          status: 'failed',
          error: { code: 'SCOPE_DENIED', message: 'no', retryable: false, requiredAction: 'Re-grant.' },
          effectState: 'none',
        },
      })))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    const outcome = await dispatch.callTarget(target(), 'write_file', {});
    expect(outcome).toEqual({
      ok: false, code: 'SCOPE_DENIED', message: 'no',
      retryable: false, requiredAction: 'Re-grant.', effectState: 'none',
    });
  }));

  it('maps a non-OK coordinator response onto its code and message', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch',
        coordinatorHttp(() => jsonResponse({ code: 'EXECUTOR_OFFLINE', message: 'gone' }, 503)))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.callTarget(target(), 't', {})).toEqual({
      ok: false, code: 'EXECUTOR_OFFLINE', message: 'gone',
    });
  }));

  it('defaults a non-OK response without a body shape to INTERNAL_ERROR', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(() => jsonResponse({}, 500)))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.callTarget(target(), 't', {})).toEqual({
      ok: false, code: 'INTERNAL_ERROR', message: 'Dispatch failed.',
    });
  }));

  it('reports EXECUTOR_OFFLINE when the dispatch fetch itself fails', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', control.throws(new Error('ECONNREFUSED')))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.callTarget(target(), 't', {})).toEqual({
      ok: false, code: 'EXECUTOR_OFFLINE', message: 'Executor routing failed.',
    });
  }));

  it('reports INTERNAL_ERROR for a malformed coordinator response body', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(() => new Response('not json', { status: 200 })))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.callTarget(target(), 't', {})).toEqual({
      ok: false, code: 'INTERNAL_ERROR', message: 'Malformed coordinator response.',
    });
  }));

  it('reports INTERNAL_ERROR when an OK response carries no result frame', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(() => jsonResponse({ unrelated: true })))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    expect(await dispatch.callTarget(target(), 't', {})).toEqual({
      ok: false, code: 'INTERNAL_ERROR', message: 'Coordinator returned no result.',
    });
  }));

  it('routes dispatch through the EXECUTOR_COORDINATOR namespace when bound', resourceCase(async () => {
    const namespace = coordinatorNamespace((request) => {
      expect(request.url).toBe('https://coordinator/dispatch');
      return jsonResponse({ result: { status: 'succeeded', payload: null, effectState: 'none' } });
    });
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ EXECUTOR_COORDINATOR: namespace }))
      .method(RemoteToolCoordinatorClient, 'fetch', control.never())
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    const outcome = await dispatch.callTarget(target(), 't', {});
    expect(outcome).toMatchObject({ ok: true, status: 'succeeded' });
  }));

  it('call() derives the dispatch target from a grant row', resourceCase(async () => {
    let seenFrame: Record<string, unknown> | null = null;
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, envWith({ KAZIBEE_DEV_COORDINATOR_ORIGIN: DEV_ORIGIN }))
      .method(RemoteToolCoordinatorClient, 'fetch', coordinatorHttp(async (request) => {
        seenFrame = await request.json() as Record<string, unknown>;
        return jsonResponse({ result: { status: 'succeeded', payload: { ok: 1 }, effectState: 'none' } });
      }))
      .build();
    const dispatch = await env.get<RemoteToolDispatchService>(RemoteToolDispatchService);
    const grant = {
      grant_id: 'rtg_grant0001',
      owner_user_id: 'usr_owner001',
      executor_id: EXECUTOR_ID,
      workspace_id: 'wrk_workspace1',
      scopes: JSON.stringify(['workspace.read', 'workspace.write']),
      token_hash: 'x',
      state: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      expires_at: null,
      last_used_at: null,
      revoked_at: null,
    } as unknown as RemoteToolGrant;
    const outcome: DispatchResult = await dispatch.call(grant, 'read_file', { path: 'a' });
    expect(outcome).toMatchObject({ ok: true });
    expect(seenFrame).toMatchObject({
      executorId: EXECUTOR_ID,
      payload: {
        scopes: ['workspace.read', 'workspace.write'],
        grantId: 'rtg_grant0001',
        toolSessionId: 'rts_grant0001',
      },
    });
  }));
});
