/**
 * Remote tools routes through testDinner — MCP methods, OAuth-bearer
 * connection routing, and grant/connection management (sibling of
 * remote_tools.testdinner.test.ts).
 *
 * Real controller graph; the SQL repos are stubbed via .methods, and the
 * network-touching RemoteToolDispatchService methods are stubbed the same
 * way (its own routing branches are covered in
 * test/unit/services/remote_tool_dispatch_service.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import RemoteToolsController from '../../../src/server/controller/remote_tools.controller';
import RemoteToolDispatchService from '../../../src/server/services/remote_tool_dispatch_service';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import RemoteToolGrantRepo from '../../../src/server/repo/remote_tool_grant_repo';
import RemoteWorkspaceRepo from '../../../src/server/repo/remote_workspace_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';

// Deterministic issuer/resource and no coordinator routing, regardless of the
// shell env.
delete process.env.KAZIBEE_DEV_COORDINATOR_ORIGIN;
delete process.env.EXECUTOR_COORDINATOR;
delete process.env.KAZI_MCP_ORIGIN;

const remoteToolsSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/connect/remote-tools.yaml'), 'utf8')
) as Record<string, unknown>;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const PAT = 'G'.repeat(43);
const SESSION_TOKEN = 'S'.repeat(43);
const CSRF_TOKEN = 'C'.repeat(43);
const SESSION_ID = 'ses_abcdefgh';
const USER_ID = 'usr_owner001';
const EXECUTOR_ID = 'exe_machine01';
const EXECUTOR_ID_2 = 'exe_machine02';
const GRANT_ID = `rtg_${'a'.repeat(32)}`;
const CONNECTION_ID = `ocn_${'b'.repeat(32)}`;
const RWS_ID = `rws_${'c'.repeat(32)}`;
const FUTURE = '2999-01-01T00:00:00.000Z';

// OAuth access tokens are resource-tagged: sha256(resource) base64url, first
// 16 chars, appended to the random part (oauth_flow_service.resourceTag).
const RESOURCE = 'https://mcp-dev.kazibee.com/mcp';
const RESOURCE_TAG = createHash('sha256').update(RESOURCE, 'utf8').digest('base64url').slice(0, 16);
const OAUTH_TOKEN = `${'O'.repeat(27)}${RESOURCE_TAG}`;

const returns = (value: unknown) => control.returns(Promise.resolve(value));

const grantRow = () => ({
  grant_id: GRANT_ID, owner_user_id: USER_ID, executor_id: EXECUTOR_ID,
  workspace_id: 'wrk_workspace1', scopes: JSON.stringify(['workspace.read']),
  token_hash: sha256(PAT), state: 'active', created_at: '2026-01-01T00:00:00.000Z',
  expires_at: null, last_used_at: null, revoked_at: null,
});

const sessionRow = () => ({
  session_id: SESSION_ID, user_id: USER_ID,
  session_token_hash: sha256(SESSION_TOKEN), csrf_token_hash: sha256(CSRF_TOKEN),
  status: 'active', created_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z', idle_expires_at: FUTURE,
  absolute_expires_at: FUTURE, revoked_at: null,
});

const accountRow = () => ({
  user_id: USER_ID, username: 'owner', email: 'owner@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z', password_hash: null,
  status: 'active', created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const executorRow = (overrides: Record<string, unknown> = {}) => ({
  executor_id: EXECUTOR_ID, device_id: 'dev_machine01', owner_user_id: USER_ID,
  display_name: 'Build Box', platform: 'macos', architecture: 'arm64',
  executor_version: '1.2.3', key_fingerprint: 'a'.repeat(64), state: 'active',
  credential_generation: 1, created_at: '2026-01-01T00:00:00.000Z',
  claimed_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const tokenRecord = (overrides: Record<string, unknown> = {}) => ({
  token_hash: sha256(OAUTH_TOKEN), connection_id: CONNECTION_ID, kind: 'access',
  status: 'active', created_at: '2026-01-01T00:00:00.000Z', expires_at: FUTURE,
  revoked_at: null, rotated_from: null, user_id: USER_ID, client_id: 'cli_demo0001',
  approved_scope: 'read_write', allow_shell: true, allow_web: false,
  connection_status: 'active', connection_created_at: '2026-01-01T00:00:00.000Z',
  connection_revoked_at: null,
  ...overrides,
});

const connectionRow = (overrides: Record<string, unknown> = {}) => ({
  connection_id: CONNECTION_ID, user_id: USER_ID, client_id: 'cli_demo0001',
  approved_scope: 'read_write', allow_shell: true, allow_web: false,
  status: 'active', created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
  ...overrides,
});

const patAuthMethods = (): Methods => ([
  [RemoteToolGrantRepo, {
    findByTokenHash: returns(grantRow()),
    touchLastUsed: returns(undefined),
  }],
]);

const oauthAuthMethods = (executors: unknown[] = [executorRow()]): Methods => ([
  [OAuthRepo, {
    findActiveTokenWithConnection: returns(tokenRecord()),
  }],
  [ConnectExecutorRepo, {
    listByOwner: returns(executors),
  }],
]);

const browserSessionMethods = (): Methods => ([
  [ConnectBrowserSessionRepo, {
    findByTokenHash: returns(sessionRow()),
    touchSession: returns(undefined),
  }],
  [ConnectAccountRepo, { findByUserId: returns(accountRow()) }],
]);

const ownerHeaders = () => ({
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

const base = () =>
  testDinner(remoteToolsSource)
    .select({ module: 'remoteTools' })
    .controllers({ 'remote_tools.controller': RemoteToolsController })
    .hooks({});

type Methods = readonly (readonly [unknown, Record<string, unknown>])[];
async function request(
  methods: Methods,
  init: { method: string; path: string; headers?: Record<string, string>; query?: Record<string, string>; body?: unknown },
) {
  const env = await base().methods(methods as never).build();
  try {
    const response = await env.dinner.request(init);
    const payload = response.status === 202 ? null : await response.json() as Record<string, unknown>;
    await env.verify();
    return { status: response.status, payload };
  } finally {
    await env.dispose();
  }
}

const mcp = (methods: Methods, body: unknown, bearer: string = PAT) =>
  request(methods, {
    method: 'POST', path: '/v1/remote-tools/mcp',
    headers: { authorization: `Bearer ${bearer}` }, body,
  });

const rpc = (method: string, params?: Record<string, unknown>) =>
  ({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) });

describe('MCP protocol envelope handling', () => {
  it('rejects a malformed JSON-RPC envelope with 400 / -32600', async () => {
    const { status, payload } = await mcp(patAuthMethods(), { id: 1, method: 'initialize' });
    expect(status).toBe(400);
    expect(payload).toMatchObject({ id: 1, error: { code: -32600 } });
  });

  it('answers ping with an empty result', async () => {
    const { status, payload } = await mcp(patAuthMethods(), rpc('ping'));
    expect(status).toBe(200);
    expect(payload).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
  });

  it('falls back to the newest protocol version for an unsupported request', async () => {
    const { payload } = await mcp(patAuthMethods(), rpc('initialize', { protocolVersion: '1999-01-01' }));
    expect(payload).toMatchObject({ result: { protocolVersion: '2025-06-18' } });
  });
});

describe('MCP over a PAT grant with stubbed dispatch', () => {
  it('tools/list forwards the executor tool_help manifest unmodified', async () => {
    const tools = [
      { name: 'read_file', description: 'Read a file.', inputSchema: { type: 'object' } },
      { name: 'no_schema_tool', description: 'Bare.' },
    ];
    const { status, payload } = await mcp([
      ...patAuthMethods(),
      [RemoteToolDispatchService, {
        call: control.once(returns({ ok: true, status: 'succeeded', payload: { tools }, effectState: 'none' })),
      }],
    ], rpc('tools/list'));
    expect(status).toBe(200);
    expect((payload as { result: { tools: unknown[] } }).result.tools).toEqual([
      { name: 'read_file', description: 'Read a file.', inputSchema: { type: 'object' } },
      { name: 'no_schema_tool', description: 'Bare.', inputSchema: { type: 'object' } },
    ]);
  });

  it('tools/list maps a dispatch failure onto -32603', async () => {
    const { payload } = await mcp([
      ...patAuthMethods(),
      [RemoteToolDispatchService, {
        call: returns({ ok: false, code: 'EXECUTOR_OFFLINE', message: 'gone' }),
      }],
    ], rpc('tools/list'));
    expect(payload).toMatchObject({ error: { code: -32603, message: 'EXECUTOR_OFFLINE: gone' } });
  });

  it('tools/call wraps a successful dispatch as structured content', async () => {
    const { payload } = await mcp([
      ...patAuthMethods(),
      [RemoteToolDispatchService, {
        call: control.once(returns({ ok: true, status: 'succeeded', payload: { bytes: 9 }, effectState: 'none' })),
      }],
    ], rpc('tools/call', { name: 'read_file', arguments: { path: 'a.txt' } }));
    expect(payload).toMatchObject({
      result: { isError: false, structuredContent: { bytes: 9 } },
    });
  });

  it('tools/call demands a tool name (-32602)', async () => {
    const { payload } = await mcp(patAuthMethods(), rpc('tools/call', { arguments: {} }));
    expect(payload).toMatchObject({ error: { code: -32602 } });
  });
});

describe('MCP over an OAuth connection bearer', () => {
  it('rejects a well-shaped but unknown OAuth token with 401', async () => {
    const { status, payload } = await mcp([
      [OAuthRepo, { findActiveTokenWithConnection: control.once(returns(null)) }],
      [RemoteToolGrantRepo, { findByTokenHash: control.never() }],
    ], rpc('initialize'), OAUTH_TOKEN);
    expect(status).toBe(401);
    expect(payload).toMatchObject({ error: true });
  });

  it('initialize succeeds for a live connection token', async () => {
    const { status, payload } = await mcp(oauthAuthMethods(), rpc('initialize', { protocolVersion: '2025-03-26' }), OAUTH_TOKEN);
    expect(status).toBe(200);
    expect(payload).toMatchObject({ result: { protocolVersion: '2025-03-26' } });
  });

  it('tools/list rewrites workspace schemas and appends the gateway list_machines tool', async () => {
    const tools = [
      { name: 'read_file', description: 'Read.', inputSchema: { type: 'object', properties: { workspaceId: { type: 'string' }, path: { type: 'string' } } } },
      { name: 'list_workspaces', description: 'List.', inputSchema: { type: 'object', properties: {} } },
    ];
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({ ok: true, status: 'succeeded', payload: { tools }, effectState: 'none' })),
      }],
    ], rpc('tools/list'), OAUTH_TOKEN);
    const listed = (payload as { result: { tools: Array<{ name: string; inputSchema: { properties?: Record<string, unknown> } }> } }).result.tools;
    expect(listed.map((tool) => tool.name)).toEqual(['list_machines', 'list_workspaces', 'read_file']);
    const readFile = listed.find((tool) => tool.name === 'read_file')!;
    expect(readFile.inputSchema.properties!.workspaceId).toMatchObject({ pattern: '^rws_[a-f0-9]{32}$' });
    const listWorkspaces = listed.find((tool) => tool.name === 'list_workspaces')!;
    expect(listWorkspaces.inputSchema.properties!.machineId).toMatchObject({ pattern: '^exe_[A-Za-z0-9]{8,64}$' });
  });

  it('list_machines reports active owner machines with live presence', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods([
        executorRow(),
        executorRow({
          executor_id: EXECUTOR_ID_2,
          device_id: 'dev_machine02',
          display_name: 'Laptop',
          claimed_at: '2026-01-03T00:00:00.000Z',
        }),
      ]),
      [RemoteToolDispatchService, {
        presence: control.calls([returns('online'), returns(null)]),
      }],
    ], rpc('tools/call', { name: 'list_machines', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: {
        isError: false,
        structuredContent: {
          ok: true,
          machines: [
            { machineId: EXECUTOR_ID, name: 'Build Box', presence: 'online', workspaceAccess: 'all', scope: 'read_write' },
            { machineId: EXECUTOR_ID_2, name: 'Laptop', presence: 'offline', workspaceAccess: 'all', scope: 'read_write' },
          ],
        },
      },
    });
  });

  it('list_machines includes a machine linked after consent on the next call', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findActiveTokenWithConnection: control.times(2, returns(tokenRecord())),
        }],
        [ConnectExecutorRepo, {
          listByOwner: control.calls([
            returns([executorRow()]),
            returns([
              executorRow(),
              executorRow({
                executor_id: EXECUTOR_ID_2,
                device_id: 'dev_machine02',
                display_name: 'Laptop',
                claimed_at: '2026-01-03T00:00:00.000Z',
              }),
            ]),
          ]),
        }],
        [RemoteToolDispatchService, {
          presence: control.calls([returns('online'), returns('online'), returns('online')]),
        }],
      ])
      .build();
    try {
      const first = await env.dinner.request({
        method: 'POST',
        path: '/v1/remote-tools/mcp',
        headers: { authorization: `Bearer ${OAUTH_TOKEN}` },
        body: rpc('tools/call', { name: 'list_machines', arguments: {} }),
      });
      expect((await first.json()).result.structuredContent.machines).toHaveLength(1);

      const second = await env.dinner.request({
        method: 'POST',
        path: '/v1/remote-tools/mcp',
        headers: { authorization: `Bearer ${OAUTH_TOKEN}` },
        body: rpc('tools/call', { name: 'list_machines', arguments: {} }),
      });
      expect((await second.json()).result.structuredContent.machines).toMatchObject([
        { machineId: EXECUTOR_ID },
        { machineId: EXECUTOR_ID_2 },
      ]);
      await env.verify();
    } finally {
      await env.dispose();
    }
  });

  it('routes an rws_ workspace call to its owner machine and translates the id back', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteWorkspaceRepo, {
        findRemoteWorkspace: control.once(returns({
          remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
          local_workspace_id: 'wrk_local0001', display_name: 'Site',
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        })),
      }],
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({
          ok: true, status: 'succeeded',
          payload: { workspaceId: 'wrk_local0001', entries: 3 }, effectState: 'none',
        })),
      }],
    ], rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID, path: '.' } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: false, structuredContent: { workspaceId: RWS_ID, entries: 3 } },
    });
  });

  it('rejects an unknown rws_ workspace id as WORKSPACE_UNAVAILABLE', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteWorkspaceRepo, { findRemoteWorkspace: control.once(returns(null)) }],
      [RemoteToolDispatchService, { callTarget: control.never() }],
    ], rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { ok: false, code: 'WORKSPACE_UNAVAILABLE' } },
    });
  });

  it('rejects an rws_ workspace whose machine is no longer owned and active', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods([executorRow({ state: 'revoked' })]),
      [RemoteWorkspaceRepo, {
        findRemoteWorkspace: control.once(returns({
          remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
          local_workspace_id: 'wrk_local0001', display_name: 'Site',
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        })),
      }],
      [RemoteToolDispatchService, { callTarget: control.never() }],
    ], rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: {
        isError: true,
        structuredContent: {
          code: 'WORKSPACE_UNAVAILABLE',
          message: "That workspace's machine is no longer linked to your account.",
        },
      },
    });
  });

  it('rejects list_workspaces for a machine that is not linked to the account', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, { callTarget: control.never() }],
    ], rpc('tools/call', { name: 'list_workspaces', arguments: { machineId: 'exe_stranger01' } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { code: 'WORKSPACE_UNAVAILABLE' } },
    });
  });

  it('list_workspaces mints server-side workspace ids for the addressed machine', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({
          ok: true, status: 'succeeded',
          payload: { workspaces: [{ workspaceId: 'wrk_local0001', name: 'Site' }, { broken: true }] },
          effectState: 'none',
        })),
      }],
      [RemoteWorkspaceRepo, {
        upsertRemoteWorkspace: control.once(returns({
          remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
          local_workspace_id: 'wrk_local0001', display_name: 'Site',
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        })),
      }],
    ], rpc('tools/call', { name: 'list_workspaces', arguments: { machineId: EXECUTOR_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: {
        isError: false,
        structuredContent: {
          workspaces: [{ workspaceId: RWS_ID, name: 'Site' }, { broken: true }],
        },
      },
    });
  });

  it('routes both unbound calls and plain workspace ids through an online owner machine', async () => {
    const unbound = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })),
      }],
    ], rpc('tools/call', { name: 'tool_help', arguments: {} }), OAUTH_TOKEN);
    expect(unbound.payload).toMatchObject({ result: { isError: false } });

    const plainWorkspace = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })),
      }],
    ], rpc('tools/call', { name: 'list_files', arguments: { workspaceId: 'wrk_other00001' } }), OAUTH_TOKEN);
    expect(plainWorkspace.payload).toMatchObject({
      result: { isError: false, structuredContent: { ok: 1 } },
    });
  });

  it('reports EXECUTOR_OFFLINE when none of the owner machines is online', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods([executorRow(), executorRow({ executor_id: EXECUTOR_ID_2 })]),
      [RemoteToolDispatchService, {
        presence: control.calls([returns('offline'), returns(null)]),
        callTarget: control.never(),
      }],
    ], rpc('tools/call', { name: 'read_file', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { code: 'EXECUTOR_OFFLINE' } },
    });
  });

  it('routes to the first online owner machine in link order', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods([executorRow(), executorRow({ executor_id: EXECUTOR_ID_2 })]),
      [RemoteToolDispatchService, {
        presence: control.calls([returns('offline'), returns('online')]),
        callTarget: control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })),
      }],
    ], rpc('tools/call', { name: 'read_file', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({ result: { isError: false, structuredContent: { ok: 1 } } });
  });
});

describe('grant management', () => {
  it('GET /grants lists owner grants without tokens', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [RemoteToolGrantRepo, { listByOwner: control.once(returns([grantRow()])) }],
    ], {
      method: 'GET', path: '/v1/remote-tools/grants',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({
      grants: [{
        grantId: GRANT_ID, executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1',
        scopes: ['workspace.read'], state: 'active',
        createdAt: '2026-01-01T00:00:00.000Z', lastUsedAt: null,
      }],
    });
  });

  it('POST /grants rejects an executor the owner does not hold', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [ConnectExecutorRepo, { findByExecutorId: control.once(returns(null)) }],
      [RemoteToolGrantRepo, { createGrant: control.never() }],
    ], {
      method: 'POST', path: '/v1/remote-tools/grants',
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: { executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1', scopes: ['workspace.read'] },
    });
    expect(status).toBe(400);
    expect(payload).toMatchObject({ error: true, message: 'Grant creation failed: executor_not_owned.' });
  });

  it('POST /grants/{grantId}/revoke revokes the owner grant', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [RemoteToolGrantRepo, { revokeGrant: control.once(returns(undefined)) }],
    ], {
      method: 'POST', path: `/v1/remote-tools/grants/${GRANT_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({ ok: true });
  });

  it('POST /grants/{grantId}/revoke answers 401 for a mutation without a session', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: control.once(returns(null)) }],
      [RemoteToolGrantRepo, { revokeGrant: control.never() }],
    ], {
      method: 'POST', path: `/v1/remote-tools/grants/${GRANT_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(401);
  });
});

describe('OAuth connection management', () => {
  it('GET /connections lists connections with live owner machines', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        listConnectionsByUser: control.once(returns([
          { ...connectionRow(), client_name: 'ChatGPT' },
        ])),
      }],
      [ConnectExecutorRepo, {
        listByOwner: control.once(returns([executorRow()])),
      }],
    ], {
      method: 'GET', path: '/v1/remote-tools/connections',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({
      connections: [{
        connectionId: CONNECTION_ID, clientId: 'cli_demo0001', clientName: 'ChatGPT',
        approvedScope: 'read_write', allowShell: true, allowWeb: false,
        status: 'active', createdAt: '2026-01-01T00:00:00.000Z',
        members: [{
          executorId: EXECUTOR_ID, displayName: 'Build Box', workspaceId: '*',
          scope: 'read_write',
        }],
      }],
    });
  });

  it('GET /connections answers 401 without a live session', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: control.once(returns(null)) }],
      [OAuthRepo, { listConnectionsByUser: control.never() }],
    ], {
      method: 'GET', path: '/v1/remote-tools/connections',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(401);
  });

  it('POST update changes the owner-scoped connection capabilities', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        findActiveConnectionById: control.once(returns(connectionRow())),
        updateConnectionCapabilities: control.once(returns(undefined)),
      }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: { access: 'read', allowShell: false },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      connection: {
        connectionId: CONNECTION_ID, approvedScope: 'read',
        allowShell: false, allowWeb: false,
      },
    });
  });

  it('POST update keeps existing capabilities for an empty body', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        findActiveConnectionById: control.once(returns(connectionRow({ approved_scope: 'read' }))),
        updateConnectionCapabilities: control.once(returns(undefined)),
      }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: {},
    });
    expect(status).toBe(200);
    expect(payload).toMatchObject({ connection: { approvedScope: 'read', allowShell: true } });
  });

  it('POST update answers 404 for a connection the user does not own', async () => {
    const { status } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        findActiveConnectionById: control.once(returns(connectionRow({ user_id: 'usr_other0001' }))),
        updateConnectionCapabilities: control.never(),
      }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID }, body: {},
    });
    expect(status).toBe(404);
  });

  it('POST revoke kills the connection and all of its tokens', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        findActiveConnectionById: control.once(returns(connectionRow())),
        revokeTokensByConnection: control.once(returns(undefined)),
        revokeConnection: control.once(returns(undefined)),
      }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({ ok: true });
  });

  it('POST revoke answers 404 for an unknown connection', async () => {
    const { status } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        findActiveConnectionById: control.once(returns(null)),
        revokeConnection: control.never(),
      }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(404);
  });
});
