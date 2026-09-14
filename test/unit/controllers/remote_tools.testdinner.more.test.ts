/**
 * Remote tools routes through root testApp over the original configuration —
 * MCP methods, OAuth-bearer connection routing, and grant/connection
 * management (sibling of remote_tools.testdinner.test.ts). Historical case
 * names remain stable.
 *
 * Real controller graph; the SQL repos are replaced through singular method
 * controls, and the network-touching RemoteToolDispatchService methods are
 * replaced the same way (its own routing branches are covered in
 * test/unit/services/remote_tool_dispatch_service.test.ts). Every case builds
 * its own environment; the request/mcp helpers only drive a caller-built
 * environment. resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp, type AppTestBuilder } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import RemoteToolDispatchService from '../../../src/server/services/remote_tool_dispatch_service';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import RemoteToolGrantRepo from '../../../src/server/repo/remote_tool_grant_repo';
import RemoteWorkspaceRepo from '../../../src/server/repo/remote_workspace_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';

// The original application receives an empty test environment by default.

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['remoteTools'] } } as const;
type Env = Awaited<ReturnType<AppTestBuilder['build']>>;

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

// Reusable replacement descriptions (same tokens/slots/descriptors as before),
// not application constructors.
const patAuth = () => testStub()
  .method(RemoteToolGrantRepo, 'findByTokenHash', returns(grantRow()))
  .method(RemoteToolGrantRepo, 'touchLastUsed', returns(undefined));

const oauthAuth = (executors: unknown[] = [executorRow()]) => testStub()
  .method(OAuthRepo, 'findActiveTokenWithConnection', returns(tokenRecord()))
  .method(ConnectExecutorRepo, 'listByOwner', returns(executors));

const browserSession = () => testStub()
  .method(ConnectBrowserSessionRepo, 'findByTokenHash', returns(sessionRow()))
  .method(ConnectBrowserSessionRepo, 'touchSession', returns(undefined))
  .method(ConnectAccountRepo, 'findByUserId', returns(accountRow()));

const ownerHeaders = () => ({
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

// Drive one request through a CALLER-BUILT environment: consume (or cancel)
// the body, then verify the environment. Disposal belongs to resourceCase.
async function request(
  env: Env,
  init: { method: string; path: string; headers?: Record<string, string>; query?: Record<string, string>; body?: unknown },
) {
  const response = await env.request(init);
  let payload: Record<string, unknown> | null = null;
  if (response.status === 202) await response.body?.cancel();
  else payload = await response.json() as Record<string, unknown>;
  await env.verify();
  return { status: response.status, payload };
}

const mcp = (env: Env, body: unknown, bearer: string = PAT) =>
  request(env, {
    method: 'POST', path: '/v1/remote-tools/mcp',
    headers: { authorization: `Bearer ${bearer}` }, body,
  });

const rpc = (method: string, params?: Record<string, unknown>) =>
  ({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) });

describe('MCP protocol envelope handling', () => {
  it('rejects a malformed JSON-RPC envelope with 400 / -32600', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const { status, payload } = await mcp(env, { id: 1, method: 'initialize' });
    expect(status).toBe(400);
    expect(payload).toMatchObject({ id: 1, error: { code: -32600 } });
  }));

  it('answers ping with an empty result', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const { status, payload } = await mcp(env, rpc('ping'));
    expect(status).toBe(200);
    expect(payload).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
  }));

  it('falls back to the newest protocol version for an unsupported request', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const { payload } = await mcp(env, rpc('initialize', { protocolVersion: '1999-01-01' }));
    expect(payload).toMatchObject({ result: { protocolVersion: '2025-06-18' } });
  }));
});

describe('MCP over a PAT grant with stubbed dispatch', () => {
  it('tools/list forwards the executor tool_help manifest unmodified', resourceCase(async () => {
    const tools = [
      { name: 'read_file', description: 'Read a file.', inputSchema: { type: 'object' } },
      { name: 'no_schema_tool', description: 'Bare.' },
    ];
    const env = await testApp(CONFIG).select(SELECT)
      .use(patAuth())
      .method(RemoteToolDispatchService, 'call', control.once(returns({ ok: true, status: 'succeeded', payload: { tools }, effectState: 'none' })))
      .build();
    const { status, payload } = await mcp(env, rpc('tools/list'));
    expect(status).toBe(200);
    expect((payload as { result: { tools: unknown[] } }).result.tools).toEqual([
      { name: 'read_file', description: 'Read a file.', inputSchema: { type: 'object' } },
      { name: 'no_schema_tool', description: 'Bare.', inputSchema: { type: 'object' } },
    ]);
  }));

  it('tools/list maps a dispatch failure onto -32603', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(patAuth())
      .method(RemoteToolDispatchService, 'call', returns({ ok: false, code: 'EXECUTOR_OFFLINE', message: 'gone' }))
      .build();
    const { payload } = await mcp(env, rpc('tools/list'));
    expect(payload).toMatchObject({ error: { code: -32603, message: 'EXECUTOR_OFFLINE: gone' } });
  }));

  it('tools/call wraps a successful dispatch as structured content', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(patAuth())
      .method(RemoteToolDispatchService, 'call', control.once(returns({ ok: true, status: 'succeeded', payload: { bytes: 9 }, effectState: 'none' })))
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'read_file', arguments: { path: 'a.txt' } }));
    expect(payload).toMatchObject({
      result: { isError: false, structuredContent: { bytes: 9 } },
    });
  }));

  it('tools/call demands a tool name (-32602)', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const { payload } = await mcp(env, rpc('tools/call', { arguments: {} }));
    expect(payload).toMatchObject({ error: { code: -32602 } });
  }));
});

describe('MCP over an OAuth connection bearer', () => {
  it('rejects a well-shaped but unknown OAuth token with 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(OAuthRepo, 'findActiveTokenWithConnection', control.once(returns(null)))
      .method(RemoteToolGrantRepo, 'findByTokenHash', control.never())
      .build();
    const { status, payload } = await mcp(env, rpc('initialize'), OAUTH_TOKEN);
    expect(status).toBe(401);
    expect(payload).toMatchObject({ error: true });
  }));

  it('initialize succeeds for a live connection token', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(oauthAuth()).build();
    const { status, payload } = await mcp(env, rpc('initialize', { protocolVersion: '2025-03-26' }), OAUTH_TOKEN);
    expect(status).toBe(200);
    expect(payload).toMatchObject({ result: { protocolVersion: '2025-03-26' } });
  }));

  it('tools/list rewrites workspace schemas and appends the gateway list_machines tool', resourceCase(async () => {
    const tools = [
      { name: 'read_file', description: 'Read.', inputSchema: { type: 'object', properties: { workspaceId: { type: 'string' }, path: { type: 'string' } } } },
      { name: 'list_workspaces', description: 'List.', inputSchema: { type: 'object', properties: {} } },
    ];
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteToolDispatchService, 'callTarget', control.once(returns({ ok: true, status: 'succeeded', payload: { tools }, effectState: 'none' })))
      .build();
    const { payload } = await mcp(env, rpc('tools/list'), OAUTH_TOKEN);
    const listed = (payload as { result: { tools: Array<{ name: string; inputSchema: { properties?: Record<string, unknown> } }> } }).result.tools;
    expect(listed.map((tool) => tool.name)).toEqual(['list_machines', 'list_workspaces', 'read_file']);
    const readFile = listed.find((tool) => tool.name === 'read_file')!;
    expect(readFile.inputSchema.properties!.workspaceId).toMatchObject({ pattern: '^rws_[a-f0-9]{32}$' });
    const listWorkspaces = listed.find((tool) => tool.name === 'list_workspaces')!;
    expect(listWorkspaces.inputSchema.properties!.machineId).toMatchObject({ pattern: '^exe_[A-Za-z0-9]{8,64}$' });
  }));

  it('list_machines reports active owner machines with live presence', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth([
        executorRow(),
        executorRow({
          executor_id: EXECUTOR_ID_2,
          device_id: 'dev_machine02',
          display_name: 'Laptop',
          claimed_at: '2026-01-03T00:00:00.000Z',
        }),
      ]))
      .method(RemoteToolDispatchService, 'presence', control.calls([returns('online'), returns(null)]))
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'list_machines', arguments: {} }), OAUTH_TOKEN);
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
  }));

  it('list_machines includes a machine linked after consent on the next call', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(OAuthRepo, 'findActiveTokenWithConnection', control.times(2, returns(tokenRecord())))
      .method(ConnectExecutorRepo, 'listByOwner', control.calls([
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
      ]))
      .method(RemoteToolDispatchService, 'presence', control.calls([returns('online'), returns('online'), returns('online')]))
      .build();
    const first = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/mcp',
      headers: { authorization: `Bearer ${OAUTH_TOKEN}` },
      body: rpc('tools/call', { name: 'list_machines', arguments: {} }),
    });
    expect((await first.json()).result.structuredContent.machines).toHaveLength(1);

    const second = await env.request({
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
  }));

  it('routes an rws_ workspace call to its owner machine and translates the id back', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteWorkspaceRepo, 'findRemoteWorkspace', control.once(returns({
        remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
        local_workspace_id: 'wrk_local0001', display_name: 'Site',
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      })))
      .method(RemoteToolDispatchService, 'callTarget', control.once(returns({
        ok: true, status: 'succeeded',
        payload: { workspaceId: 'wrk_local0001', entries: 3 }, effectState: 'none',
      })))
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID, path: '.' } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: false, structuredContent: { workspaceId: RWS_ID, entries: 3 } },
    });
  }));

  it('rejects an unknown rws_ workspace id as WORKSPACE_UNAVAILABLE', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteWorkspaceRepo, 'findRemoteWorkspace', control.once(returns(null)))
      .method(RemoteToolDispatchService, 'callTarget', control.never())
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { ok: false, code: 'WORKSPACE_UNAVAILABLE' } },
    });
  }));

  it('rejects an rws_ workspace whose machine is no longer owned and active', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth([executorRow({ state: 'revoked' })]))
      .method(RemoteWorkspaceRepo, 'findRemoteWorkspace', control.once(returns({
        remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
        local_workspace_id: 'wrk_local0001', display_name: 'Site',
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      })))
      .method(RemoteToolDispatchService, 'callTarget', control.never())
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: {
        isError: true,
        structuredContent: {
          code: 'WORKSPACE_UNAVAILABLE',
          message: "That workspace's machine is no longer linked to your account.",
        },
      },
    });
  }));

  it('rejects list_workspaces for a machine that is not linked to the account', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteToolDispatchService, 'callTarget', control.never())
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'list_workspaces', arguments: { machineId: 'exe_stranger01' } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { code: 'WORKSPACE_UNAVAILABLE' } },
    });
  }));

  it('list_workspaces mints server-side workspace ids for the addressed machine', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteToolDispatchService, 'callTarget', control.once(returns({
        ok: true, status: 'succeeded',
        payload: { workspaces: [{ workspaceId: 'wrk_local0001', name: 'Site' }, { broken: true }] },
        effectState: 'none',
      })))
      .method(RemoteWorkspaceRepo, 'upsertRemoteWorkspace', control.once(returns({
        remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
        local_workspace_id: 'wrk_local0001', display_name: 'Site',
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      })))
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'list_workspaces', arguments: { machineId: EXECUTOR_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: {
        isError: false,
        structuredContent: {
          workspaces: [{ workspaceId: RWS_ID, name: 'Site' }, { broken: true }],
        },
      },
    });
  }));

  it('routes both unbound calls and plain workspace ids through an online owner machine', resourceCase(async () => {
    const unboundEnv = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteToolDispatchService, 'callTarget', control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })))
      .build();
    const unbound = await mcp(unboundEnv, rpc('tools/call', { name: 'tool_help', arguments: {} }), OAUTH_TOKEN);
    expect(unbound.payload).toMatchObject({ result: { isError: false } });

    const plainWorkspaceEnv = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth())
      .method(RemoteToolDispatchService, 'callTarget', control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })))
      .build();
    const plainWorkspace = await mcp(plainWorkspaceEnv, rpc('tools/call', { name: 'list_files', arguments: { workspaceId: 'wrk_other00001' } }), OAUTH_TOKEN);
    expect(plainWorkspace.payload).toMatchObject({
      result: { isError: false, structuredContent: { ok: 1 } },
    });
  }));

  it('reports EXECUTOR_OFFLINE when none of the owner machines is online', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth([executorRow(), executorRow({ executor_id: EXECUTOR_ID_2 })]))
      .method(RemoteToolDispatchService, 'presence', control.calls([returns('offline'), returns(null)]))
      .method(RemoteToolDispatchService, 'callTarget', control.never())
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'read_file', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { code: 'EXECUTOR_OFFLINE' } },
    });
  }));

  it('routes to the first online owner machine in link order', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(oauthAuth([executorRow(), executorRow({ executor_id: EXECUTOR_ID_2 })]))
      .method(RemoteToolDispatchService, 'presence', control.calls([returns('offline'), returns('online')]))
      .method(RemoteToolDispatchService, 'callTarget', control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })))
      .build();
    const { payload } = await mcp(env, rpc('tools/call', { name: 'read_file', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({ result: { isError: false, structuredContent: { ok: 1 } } });
  }));
});

describe('grant management', () => {
  it('GET /grants lists owner grants without tokens', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(RemoteToolGrantRepo, 'listByOwner', control.once(returns([grantRow()])))
      .build();
    const { status, payload } = await request(env, {
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
  }));

  it('POST /grants rejects an executor the owner does not hold', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(ConnectExecutorRepo, 'findByExecutorId', control.once(returns(null)))
      .method(RemoteToolGrantRepo, 'createGrant', control.never())
      .build();
    const { status, payload } = await request(env, {
      method: 'POST', path: '/v1/remote-tools/grants',
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: { executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1', scopes: ['workspace.read'] },
    });
    expect(status).toBe(400);
    expect(payload).toMatchObject({ error: true, message: 'Grant creation failed: executor_not_owned.' });
  }));

  it('POST /grants/{grantId}/revoke revokes the owner grant', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(RemoteToolGrantRepo, 'revokeGrant', control.once(returns(undefined)))
      .build();
    const { status, payload } = await request(env, {
      method: 'POST', path: `/v1/remote-tools/grants/${GRANT_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({ ok: true });
  }));

  it('POST /grants/{grantId}/revoke answers 401 for a mutation without a session', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(returns(null)))
      .method(RemoteToolGrantRepo, 'revokeGrant', control.never())
      .build();
    const { status } = await request(env, {
      method: 'POST', path: `/v1/remote-tools/grants/${GRANT_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(401);
  }));
});

describe('OAuth connection management', () => {
  it('GET /connections lists connections with live owner machines', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(OAuthRepo, 'listConnectionsByUser', control.once(returns([
        { ...connectionRow(), client_name: 'ChatGPT' },
      ])))
      .method(ConnectExecutorRepo, 'listByOwner', control.once(returns([executorRow()])))
      .build();
    const { status, payload } = await request(env, {
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
  }));

  it('GET /connections answers 401 without a live session', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(returns(null)))
      .method(OAuthRepo, 'listConnectionsByUser', control.never())
      .build();
    const { status } = await request(env, {
      method: 'GET', path: '/v1/remote-tools/connections',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(401);
  }));

  it('POST update changes the owner-scoped connection capabilities', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(OAuthRepo, 'findActiveConnectionById', control.once(returns(connectionRow())))
      .method(OAuthRepo, 'updateConnectionCapabilities', control.once(returns(undefined)))
      .build();
    const { status, payload } = await request(env, {
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
  }));

  it('POST update keeps existing capabilities for an empty body', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(OAuthRepo, 'findActiveConnectionById', control.once(returns(connectionRow({ approved_scope: 'read' }))))
      .method(OAuthRepo, 'updateConnectionCapabilities', control.once(returns(undefined)))
      .build();
    const { status, payload } = await request(env, {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: {},
    });
    expect(status).toBe(200);
    expect(payload).toMatchObject({ connection: { approvedScope: 'read', allowShell: true } });
  }));

  it('POST update answers 404 for a connection the user does not own', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(OAuthRepo, 'findActiveConnectionById', control.once(returns(connectionRow({ user_id: 'usr_other0001' }))))
      .method(OAuthRepo, 'updateConnectionCapabilities', control.never())
      .build();
    const { status } = await request(env, {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID }, body: {},
    });
    expect(status).toBe(404);
  }));

  it('POST revoke kills the connection and all of its tokens', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(OAuthRepo, 'findActiveConnectionById', control.once(returns(connectionRow())))
      .method(OAuthRepo, 'revokeTokensByConnection', control.once(returns(undefined)))
      .method(OAuthRepo, 'revokeConnection', control.once(returns(undefined)))
      .build();
    const { status, payload } = await request(env, {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(200);
    expect(payload).toEqual({ ok: true });
  }));

  it('POST revoke answers 404 for an unknown connection', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(OAuthRepo, 'findActiveConnectionById', control.once(returns(null)))
      .method(OAuthRepo, 'revokeConnection', control.never())
      .build();
    const { status } = await request(env, {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/revoke`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(404);
  }));
});
