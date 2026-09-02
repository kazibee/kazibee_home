/**
 * Remote tools routes through testDinner — negative paths and rare branches
 * (sibling of remote_tools.testdinner.test.ts / .more.test.ts).
 *
 * Real controller graph; SQL repos and network-touching services are stubbed
 * via .methods. Covers the error arms the happy-path suites skip: OAuth
 * authenticator crashes, empty connections, expired grants, invalid ids,
 * missing sessions, and result-translation edge cases.
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
import OAuthTokenAuthService from '../../../src/server/services/oauth_token_auth_service';
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
const GRANT_ID = `rtg_${'a'.repeat(32)}`;
const CONNECTION_ID = `ocn_${'b'.repeat(32)}`;
const RWS_ID = `rws_${'c'.repeat(32)}`;
const FUTURE = '2999-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';

// OAuth access tokens are resource-tagged: sha256(resource) base64url, first
// 16 chars, appended to the random part (oauth_flow_service.resourceTag).
const RESOURCE = 'https://mcp.kazibee.com/mcp';
const RESOURCE_TAG = createHash('sha256').update(RESOURCE, 'utf8').digest('base64url').slice(0, 16);
const OAUTH_TOKEN = `${'O'.repeat(27)}${RESOURCE_TAG}`;

const returns = (value: unknown) => control.returns(Promise.resolve(value));

const grantRow = (overrides: Record<string, unknown> = {}) => ({
  grant_id: GRANT_ID, owner_user_id: USER_ID, executor_id: EXECUTOR_ID,
  workspace_id: 'wrk_workspace1', scopes: JSON.stringify(['workspace.read']),
  token_hash: sha256(PAT), state: 'active', created_at: '2026-01-01T00:00:00.000Z',
  expires_at: null, last_used_at: null, revoked_at: null,
  ...overrides,
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

const tokenRecord = () => ({
  token_hash: sha256(OAUTH_TOKEN), connection_id: CONNECTION_ID, kind: 'access',
  status: 'active', created_at: '2026-01-01T00:00:00.000Z', expires_at: FUTURE,
  revoked_at: null, rotated_from: null, user_id: USER_ID, client_id: 'cli_demo0001',
  approved_scope: 'read_write', allow_shell: true, allow_web: false,
  connection_status: 'active', connection_created_at: '2026-01-01T00:00:00.000Z',
  connection_revoked_at: null,
});

const connectionRow = (overrides: Record<string, unknown> = {}) => ({
  connection_id: CONNECTION_ID, user_id: USER_ID, client_id: 'cli_demo0001',
  approved_scope: 'read_write', allow_shell: true, allow_web: false,
  status: 'active', created_at: '2026-01-01T00:00:00.000Z', revoked_at: null,
  ...overrides,
});

const remoteWorkspaceRow = (overrides: Record<string, unknown> = {}) => ({
  remote_workspace_id: RWS_ID, user_id: USER_ID, executor_id: EXECUTOR_ID,
  local_workspace_id: 'wrk_local0001', display_name: 'Site',
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
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
    const payload = response.status === 202 ? null : await response.json().catch(() => null) as Record<string, unknown> | null;
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

describe('MCP bearer resolution edge cases', () => {
  it('rethrows an unexpected OAuth authenticator failure as a server error', async () => {
    const { status } = await mcp([
      [OAuthTokenAuthService, {
        looksLikeOAuthToken: control.returns(true),
        authenticate: control.throws(new Error('backing store exploded')),
      }],
      [RemoteToolGrantRepo, { findByTokenHash: control.never() }],
    ], rpc('ping'), OAUTH_TOKEN);
    expect(status).toBeGreaterThanOrEqual(500);
  });

  it('rejects an expired but otherwise active PAT grant with 401', async () => {
    const { status, payload } = await mcp([
      [RemoteToolGrantRepo, {
        findByTokenHash: control.once(returns(grantRow({ expires_at: PAST }))),
        touchLastUsed: control.never(),
      }],
    ], rpc('ping'));
    expect(status).toBe(401);
    expect(payload).toMatchObject({ error: true });
  });

  it('nulls the JSON-RPC id when a malformed envelope carries none', async () => {
    const { status, payload } = await mcp(patAuthMethods(), { method: 'initialize' });
    expect(status).toBe(400);
    expect(payload).toMatchObject({ id: null, error: { code: -32600 } });
  });

  it('initialize without params negotiates the newest protocol version', async () => {
    const { payload } = await mcp(patAuthMethods(), rpc('initialize'));
    expect(payload).toMatchObject({ result: { protocolVersion: '2025-06-18' } });
  });
});

describe('MCP dispatch result edge cases over a PAT grant', () => {
  it('tools/list treats a manifest without a tools array as empty', async () => {
    const { payload } = await mcp([
      ...patAuthMethods(),
      [RemoteToolDispatchService, {
        call: control.once(returns({ ok: true, status: 'succeeded', payload: {}, effectState: 'none' })),
      }],
    ], rpc('tools/list'));
    expect(payload).toMatchObject({ result: { tools: [] } });
  });

  it('tools/call defaults missing arguments to an empty object', async () => {
    const { payload } = await mcp([
      ...patAuthMethods(),
      [RemoteToolDispatchService, {
        call: control.once(returns({ ok: true, status: 'succeeded', payload: { ok: 1 }, effectState: 'none' })),
      }],
    ], rpc('tools/call', { name: 'tool_help' }));
    expect(payload).toMatchObject({ result: { isError: false, structuredContent: { ok: 1 } } });
  });

  it('tools/call surfaces requiredAction in the failure text', async () => {
    const { payload } = await mcp([
      ...patAuthMethods(),
      [RemoteToolDispatchService, {
        call: control.once(returns({
          ok: false, code: 'APPROVAL_REQUIRED', message: 'Blocked.',
          requiredAction: 'Approve the tool in the dashboard.',
        })),
      }],
    ], rpc('tools/call', { name: 'shell_execute', arguments: {} }));
    expect(payload).toMatchObject({
      result: {
        isError: true,
        content: [{ type: 'text', text: 'APPROVAL_REQUIRED: Blocked. Approve the tool in the dashboard.' }],
        structuredContent: { ok: false, code: 'APPROVAL_REQUIRED' },
      },
    });
  });
});

describe('OAuth connection routing edge cases', () => {
  it('reports EXECUTOR_OFFLINE when the owner has no active machines', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods([]),
      [RemoteToolDispatchService, { callTarget: control.never() }],
    ], rpc('tools/call', { name: 'read_file', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { code: 'EXECUTOR_OFFLINE' } },
    });
  });

  it('routes an rws_ workspace to its active owner machine', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods([executorRow()]),
      [RemoteWorkspaceRepo, { findRemoteWorkspace: control.once(returns(remoteWorkspaceRow())) }],
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({
          ok: true, status: 'succeeded',
          payload: { workspaceId: 'wrk_local0001', entries: 1 }, effectState: 'none',
        })),
      }],
    ], rpc('tools/call', { name: 'list_files', arguments: { workspaceId: RWS_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: false, structuredContent: { workspaceId: RWS_ID, entries: 1 } },
    });
  });

  it('passes a dispatch failure through untranslated', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({ ok: false, code: 'EXECUTOR_OFFLINE', message: 'gone' })),
      }],
    ], rpc('tools/call', { name: 'read_file', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: { isError: true, structuredContent: { code: 'EXECUTOR_OFFLINE' } },
    });
  });

  it('leaves a null tool payload untranslated', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({ ok: true, status: 'succeeded', payload: null, effectState: 'none' })),
      }],
    ], rpc('tools/call', { name: 'tool_help', arguments: {} }), OAUTH_TOKEN);
    expect(payload).toMatchObject({ result: { isError: false, structuredContent: null } });
  });

  it('list_workspaces falls back to the workspace id as display name and keeps entries the upsert loses', async () => {
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({
          ok: true, status: 'succeeded',
          payload: { workspaces: [{ workspaceId: 'wrk_local0001' }, { workspaceId: 'wrk_local0002' }] },
          effectState: 'none',
        })),
      }],
      [RemoteWorkspaceRepo, {
        upsertRemoteWorkspace: control.calls([
          returns(remoteWorkspaceRow({ display_name: 'wrk_local0001' })),
          returns(null),
        ]),
      }],
    ], rpc('tools/call', { name: 'list_workspaces', arguments: { machineId: EXECUTOR_ID } }), OAUTH_TOKEN);
    expect(payload).toMatchObject({
      result: {
        isError: false,
        structuredContent: {
          workspaces: [{ workspaceId: RWS_ID }, { workspaceId: 'wrk_local0002' }],
        },
      },
    });
  });

  it('tools/list skips schema rewriting for tools without properties', async () => {
    const tools = [
      { name: 'zz_tool', description: 'Bare.', inputSchema: { type: 'object' } },
      { name: 'aa_tool', description: 'Also bare.', inputSchema: { type: 'object' } },
    ];
    const { payload } = await mcp([
      ...oauthAuthMethods(),
      [RemoteToolDispatchService, {
        callTarget: control.once(returns({ ok: true, status: 'succeeded', payload: { tools }, effectState: 'none' })),
      }],
    ], rpc('tools/list'), OAUTH_TOKEN);
    const listed = (payload as { result: { tools: Array<{ name: string; inputSchema: unknown }> } }).result.tools;
    expect(listed.map((tool) => tool.name)).toEqual(['aa_tool', 'list_machines', 'zz_tool']);
    expect(listed.find((tool) => tool.name === 'zz_tool')!.inputSchema).toEqual({ type: 'object' });
  });
});

describe('grant management negative paths', () => {
  it('POST /grants answers 401 without a sessionId query', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: returns(null) }],
      [RemoteToolGrantRepo, { createGrant: control.never() }],
    ], {
      method: 'POST', path: '/v1/remote-tools/grants',
      headers: ownerHeaders(),
      body: { executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1', scopes: ['workspace.read'] },
    });
    expect(status).toBe(401);
  });

  it('POST /grants surfaces a vanished grant row as a server error', async () => {
    const { status } = await request([
      ...browserSessionMethods(),
      [ConnectExecutorRepo, { findByExecutorId: control.once(returns(executorRow())) }],
      [RemoteToolGrantRepo, {
        createGrant: control.once(returns(undefined)),
        findByTokenHash: control.once(returns(null)),
      }],
    ], {
      method: 'POST', path: '/v1/remote-tools/grants',
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: { executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1', scopes: ['workspace.read'] },
    });
    expect(status).toBeGreaterThanOrEqual(500);
  });

  it('POST /grants/{grantId}/revoke answers 401 without a sessionId query', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: returns(null) }],
      [RemoteToolGrantRepo, { revokeGrant: control.never() }],
    ], {
      method: 'POST', path: `/v1/remote-tools/grants/${GRANT_ID}/revoke`,
      headers: ownerHeaders(),
    });
    expect(status).toBe(401);
  });

  it('GET /grants answers 401 without a sessionId query', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: returns(null) }],
    ], {
      method: 'GET', path: '/v1/remote-tools/grants',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
    });
    expect(status).toBe(401);
  });
});

describe('OAuth connection management negative paths', () => {
  it('GET /connections answers 401 without a sessionId query', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: returns(null) }],
    ], {
      method: 'GET', path: '/v1/remote-tools/connections',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
    });
    expect(status).toBe(401);
  });

  it('POST update answers 401 without a sessionId query', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: returns(null) }],
      [OAuthRepo, { updateConnectionCapabilities: control.never() }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), body: {},
    });
    expect(status).toBe(401);
  });

  it('POST update accepts an explicit allowWeb flag', async () => {
    const { status, payload } = await request([
      ...browserSessionMethods(),
      [OAuthRepo, {
        findActiveConnectionById: control.once(returns(connectionRow())),
        updateConnectionCapabilities: control.once(returns(undefined)),
      }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/update`,
      headers: ownerHeaders(), query: { sessionId: SESSION_ID },
      body: { allowWeb: true },
    });
    expect(status).toBe(200);
    expect(payload).toMatchObject({ connection: { allowWeb: true, allowShell: true } });
  });

  it('POST revoke answers 401 without a sessionId query', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, { findByTokenHash: returns(null) }],
      [OAuthRepo, { revokeConnection: control.never() }],
    ], {
      method: 'POST', path: `/v1/remote-tools/connections/${CONNECTION_ID}/revoke`,
      headers: ownerHeaders(),
    });
    expect(status).toBe(401);
  });

  it('GET /connections answers 401 when the account row is gone', async () => {
    const { status } = await request([
      [ConnectBrowserSessionRepo, {
        findByTokenHash: returns(sessionRow()),
        touchSession: returns(undefined),
      }],
      [ConnectAccountRepo, { findByUserId: control.once(returns(null)) }],
      [OAuthRepo, { listConnectionsByUser: control.never() }],
    ], {
      method: 'GET', path: '/v1/remote-tools/connections',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID },
    });
    expect(status).toBe(401);
  });
});