/**
 * RemoteToolGrantService validation and authentication branches over the
 * original-config root testApp (remoteTools module, no server, no database).
 *
 * The service is the real production singleton resolved from the built root,
 * together with the real, pure ConnectCredentials hasher. Its two @Query repo
 * boundaries are controlled through singular method replacements on the
 * actual tokens so every branch — including the ones the OpenAPI request
 * validator makes unreachable at route depth (empty scope list, malformed
 * workspace id) — is pinned here. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, test as control, testStub, type MethodDescriptor } from '@noego/testing';
import RemoteToolGrantService from '../../../src/server/services/remote_tool_grant_service';
import RemoteToolGrantRepo from '../../../src/server/repo/remote_tool_grant_repo';
import type { RemoteToolGrant } from '../../../src/server/repo/remote_tool_grant_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import { ConnectCredentials } from '../../../src/server/services/connect_auth_primitives';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['remoteTools'] } } as const;

const USER_ID = 'usr_owner001';
const EXECUTOR_ID = 'exe_machine01';
const WORKSPACE_ID = 'wrk_workspace1';
const FUTURE = '2999-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';

const grantRow = (overrides: Partial<RemoteToolGrant> = {}): RemoteToolGrant => ({
  grant_id: `rtg_${'a'.repeat(32)}`,
  owner_user_id: USER_ID,
  executor_id: EXECUTOR_ID,
  workspace_id: WORKSPACE_ID,
  scopes: JSON.stringify(['workspace.read']),
  token_hash: 'unused',
  state: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: null,
  last_used_at: null,
  revoked_at: null,
  ...overrides,
} as RemoteToolGrant);

const activeExecutor = () => ({
  executor_id: EXECUTOR_ID,
  owner_user_id: USER_ID,
  state: 'active',
});

type GrantMethod = 'createGrant' | 'findByTokenHash' | 'touchLastUsed' | 'listByOwner' | 'revokeGrant';
type ExecutorMethod = 'findByExecutorId';

// Repo boundaries: a reusable replacement description (singular method
// controls on the actual tokens) with per-case descriptor overrides — not an
// application constructor.
function repos(overrides: {
  grants?: Partial<Record<GrantMethod, MethodDescriptor>>;
  executors?: Partial<Record<ExecutorMethod, MethodDescriptor>>;
} = {}) {
  const grants: Record<GrantMethod, MethodDescriptor> = {
    createGrant: control.returns(Promise.resolve(undefined)),
    findByTokenHash: control.returns(Promise.resolve(null)),
    touchLastUsed: control.returns(Promise.resolve(undefined)),
    listByOwner: control.returns(Promise.resolve([])),
    revokeGrant: control.returns(Promise.resolve(undefined)),
    ...overrides.grants,
  };
  const executors: Record<ExecutorMethod, MethodDescriptor> = {
    findByExecutorId: control.returns(Promise.resolve(activeExecutor())),
    ...overrides.executors,
  };
  let stub = testStub();
  for (const [method, descriptor] of Object.entries(grants)) stub = stub.method(RemoteToolGrantRepo, method, descriptor);
  for (const [method, descriptor] of Object.entries(executors)) stub = stub.method(ConnectExecutorRepo, method, descriptor);
  return stub;
}

const createInput = (overrides: Partial<{ ownerUserId: string; executorId: string; workspaceId: string; scopes: string[] }> = {}) => ({
  ownerUserId: USER_ID,
  executorId: EXECUTOR_ID,
  workspaceId: WORKSPACE_ID,
  scopes: ['workspace.read'],
  ...overrides,
});

describe('create validation', () => {
  it('rejects an empty scope list as invalid_scopes', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos()).build());
    const service = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    const result = await service.create(createInput({ scopes: [] }));
    expect(result).toEqual({ ok: false, reason: 'invalid_scopes' });
  }));

  it('rejects an unknown scope name as invalid_scopes', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos()).build());
    const service = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    const result = await service.create(createInput({ scopes: ['workspace.read', 'nonsense.scope'] }));
    expect(result).toEqual({ ok: false, reason: 'invalid_scopes' });
  }));

  it('rejects a malformed workspace id as invalid_workspace', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos()).build());
    const service = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    const result = await service.create(createInput({ workspaceId: 'not-a-workspace' }));
    expect(result).toEqual({ ok: false, reason: 'invalid_workspace' });
  }));

  it('rejects an inactive executor as executor_not_owned', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos({
      executors: { findByExecutorId: control.returns(Promise.resolve({ ...activeExecutor(), state: 'revoked' })) },
    })).build());
    const service = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    const result = await service.create(createInput());
    expect(result).toEqual({ ok: false, reason: 'executor_not_owned' });
  }));

  it('throws when the grant row vanishes between insert and readback', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos({
      grants: {
        createGrant: control.returns(Promise.resolve(undefined)),
        findByTokenHash: control.returns(Promise.resolve(null)),
      },
    })).build());
    const service = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    await expect(service.create(createInput())).rejects.toThrow('Grant row was not persisted.');
  }));

  it('mints a token whose hash is the persisted lookup key', resourceCase(async (scope) => {
    const seen: string[] = [];
    const row = grantRow();
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos({
      grants: {
        createGrant: control.watch(() => async (input: { token_hash: string }) => { seen.push(input.token_hash); }),
        findByTokenHash: control.watch(() => async ({ token_hash }: { token_hash: string }) => {
          seen.push(token_hash);
          return row;
        }),
      },
    })).build());
    const service = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    const credentials = await env.get<ConnectCredentials>(ConnectCredentials);
    const result = await service.create(createInput());
    expect(result).toMatchObject({ ok: true, grant: row });
    const token = (result as { token: string }).token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(seen).toEqual([credentials.hashToken(token), credentials.hashToken(token)]);
  }));
});

describe('authenticate', () => {
  it('rejects a bearer with the wrong shape without touching the repo', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos({
      grants: { findByTokenHash: control.throws(new Error('must not be called')) },
    })).build());
    const svc = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    expect(await svc.authenticate(null)).toBeNull();
    expect(await svc.authenticate('short')).toBeNull();
  }));

  it('rejects an expired grant even when it is otherwise active', resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos({
      grants: {
        findByTokenHash: control.returns(Promise.resolve(grantRow({ expires_at: PAST }))),
        touchLastUsed: control.throws(new Error('must not touch an expired grant')),
      },
    })).build());
    const svc = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    expect(await svc.authenticate('G'.repeat(43))).toBeNull();
  }));

  it('accepts an unexpired dated grant and touches last_used_at', resourceCase(async (scope) => {
    let touched = 0;
    const row = grantRow({ expires_at: FUTURE });
    const env = scope.environment(await testApp(CONFIG).select(SELECT).use(repos({
      grants: {
        findByTokenHash: control.returns(Promise.resolve(row)),
        touchLastUsed: control.watch(() => async () => { touched += 1; }),
      },
    })).build());
    const svc = await env.get<RemoteToolGrantService>(RemoteToolGrantService);
    expect(await svc.authenticate('G'.repeat(43))).toEqual(row);
    expect(touched).toBe(1);
  }));
});
