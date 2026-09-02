/**
 * RemoteToolGrantService validation and authentication branches, in
 * isolation.
 *
 * The service's dependencies are two repos and the pure ConnectCredentials
 * hasher; the repos are replaced with in-memory fakes so every branch —
 * including the ones the OpenAPI request validator makes unreachable at
 * route depth (empty scope list, malformed workspace id) — is pinned here.
 */
import { describe, it, expect } from 'vitest';
import RemoteToolGrantService from '../../../src/server/services/remote_tool_grant_service';
import type RemoteToolGrantRepo from '../../../src/server/repo/remote_tool_grant_repo';
import type { RemoteToolGrant } from '../../../src/server/repo/remote_tool_grant_repo';
import type ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import { ConnectCredentials } from '../../../src/server/services/connect_auth_primitives';

const USER_ID = 'usr_owner001';
const EXECUTOR_ID = 'exe_machine01';
const WORKSPACE_ID = 'wrk_workspace1';
const FUTURE = '2999-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';

const credentials = new ConnectCredentials();

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

function service(overrides: {
  grants?: Partial<Record<keyof RemoteToolGrantRepo, unknown>>;
  executors?: Partial<Record<keyof ConnectExecutorRepo, unknown>>;
} = {}) {
  const grants = {
    createGrant: async () => undefined,
    findByTokenHash: async () => null,
    touchLastUsed: async () => undefined,
    listByOwner: async () => [],
    revokeGrant: async () => undefined,
    ...overrides.grants,
  } as unknown as RemoteToolGrantRepo;
  const executors = {
    findByExecutorId: async () => activeExecutor(),
    ...overrides.executors,
  } as unknown as ConnectExecutorRepo;
  return new RemoteToolGrantService(grants, executors, credentials);
}

const createInput = (overrides: Partial<{ ownerUserId: string; executorId: string; workspaceId: string; scopes: string[] }> = {}) => ({
  ownerUserId: USER_ID,
  executorId: EXECUTOR_ID,
  workspaceId: WORKSPACE_ID,
  scopes: ['workspace.read'],
  ...overrides,
});

describe('create validation', () => {
  it('rejects an empty scope list as invalid_scopes', async () => {
    const result = await service().create(createInput({ scopes: [] }));
    expect(result).toEqual({ ok: false, reason: 'invalid_scopes' });
  });

  it('rejects an unknown scope name as invalid_scopes', async () => {
    const result = await service().create(createInput({ scopes: ['workspace.read', 'nonsense.scope'] }));
    expect(result).toEqual({ ok: false, reason: 'invalid_scopes' });
  });

  it('rejects a malformed workspace id as invalid_workspace', async () => {
    const result = await service().create(createInput({ workspaceId: 'not-a-workspace' }));
    expect(result).toEqual({ ok: false, reason: 'invalid_workspace' });
  });

  it('rejects an inactive executor as executor_not_owned', async () => {
    const result = await service({
      executors: { findByExecutorId: async () => ({ ...activeExecutor(), state: 'revoked' }) },
    }).create(createInput());
    expect(result).toEqual({ ok: false, reason: 'executor_not_owned' });
  });

  it('throws when the grant row vanishes between insert and readback', async () => {
    await expect(service({
      grants: { createGrant: async () => undefined, findByTokenHash: async () => null },
    }).create(createInput())).rejects.toThrow('Grant row was not persisted.');
  });

  it('mints a token whose hash is the persisted lookup key', async () => {
    const seen: string[] = [];
    const row = grantRow();
    const result = await service({
      grants: {
        createGrant: async (input: { token_hash: string }) => { seen.push(input.token_hash); },
        findByTokenHash: async ({ token_hash }: { token_hash: string }) => {
          seen.push(token_hash);
          return row;
        },
      },
    }).create(createInput());
    expect(result).toMatchObject({ ok: true, grant: row });
    const token = (result as { token: string }).token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(seen).toEqual([credentials.hashToken(token), credentials.hashToken(token)]);
  });
});

describe('authenticate', () => {
  it('rejects a bearer with the wrong shape without touching the repo', async () => {
    const svc = service({
      grants: { findByTokenHash: async () => { throw new Error('must not be called'); } },
    });
    expect(await svc.authenticate(null)).toBeNull();
    expect(await svc.authenticate('short')).toBeNull();
  });

  it('rejects an expired grant even when it is otherwise active', async () => {
    const svc = service({
      grants: {
        findByTokenHash: async () => grantRow({ expires_at: PAST }),
        touchLastUsed: async () => { throw new Error('must not touch an expired grant'); },
      },
    });
    expect(await svc.authenticate('G'.repeat(43))).toBeNull();
  });

  it('accepts an unexpired dated grant and touches last_used_at', async () => {
    let touched = 0;
    const row = grantRow({ expires_at: FUTURE });
    const svc = service({
      grants: {
        findByTokenHash: async () => row,
        touchLastUsed: async () => { touched += 1; },
      },
    });
    expect(await svc.authenticate('G'.repeat(43))).toEqual(row);
    expect(touched).toBe(1);
  });
});
