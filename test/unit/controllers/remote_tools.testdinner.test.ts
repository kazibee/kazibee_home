/**
 * Remote tools (MCP + grant management) routes through root testApp over the
 * original configuration (no server, no database). Historical case names
 * remain stable.
 *
 * Real production remote-tools.yaml module selection (remoteTools), real
 * controller → grant/dispatch/session service graph. Bearer authentication
 * happens inside the controller, so the MCP surface is fully driven at route
 * depth by replacing only the grant repo boundary through singular method
 * controls; dispatch runs real and reports EXECUTOR_OFFLINE because this
 * deployment has no coordinator routing (no EXECUTOR_COORDINATOR binding, no
 * dev coordinator origin) — no network is ever touched. resourceCase owns
 * environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import RemoteToolGrantRepo from '../../../src/server/repo/remote_tool_grant_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';

// Force the "no coordinator routing" branch regardless of the shell env.

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
const SELECT = { server: { module: ['remoteTools'] } } as const;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const PAT = 'G'.repeat(43);
const SESSION_TOKEN = 'S'.repeat(43);
const CSRF_TOKEN = 'C'.repeat(43);
const SESSION_ID = 'ses_abcdefgh';
const USER_ID = 'usr_owner001';
const EXECUTOR_ID = 'exe_machine01';
const GRANT_ID = `rtg_${'a'.repeat(32)}`;
const FUTURE = '2999-01-01T00:00:00.000Z';

const grantRow = () => ({
  grant_id: GRANT_ID,
  owner_user_id: USER_ID,
  executor_id: EXECUTOR_ID,
  workspace_id: 'wrk_workspace1',
  scopes: JSON.stringify(['workspace.read']),
  token_hash: sha256(PAT),
  state: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: null,
  last_used_at: null,
  revoked_at: null,
});

const sessionRow = () => ({
  session_id: SESSION_ID,
  user_id: USER_ID,
  session_token_hash: sha256(SESSION_TOKEN),
  csrf_token_hash: sha256(CSRF_TOKEN),
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-01T00:00:00.000Z',
  idle_expires_at: FUTURE,
  absolute_expires_at: FUTURE,
  revoked_at: null,
});

const accountRow = () => ({
  user_id: USER_ID,
  username: 'owner',
  email: 'owner@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z',
  password_hash: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const executorRow = () => ({
  executor_id: EXECUTOR_ID,
  device_id: 'dev_machine01',
  owner_user_id: USER_ID,
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

// A live PAT grant: reusable replacement description, not an application
// constructor (same tokens/slots/descriptors as before).
const patAuth = () => testStub()
  .method(RemoteToolGrantRepo, 'findByTokenHash', control.returns(Promise.resolve(grantRow())))
  .method(RemoteToolGrantRepo, 'touchLastUsed', control.returns(Promise.resolve(undefined)));

// A live browser session resolving to an active account.
const browserSession = () => testStub()
  .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.returns(Promise.resolve(sessionRow())))
  .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
  .method(ConnectAccountRepo, 'findByUserId', control.returns(Promise.resolve(accountRow())));

const ownerHeaders = () => ({
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

describe('remote tools routes through testDinner (no server, no database)', () => {
  it('POST /mcp without a bearer answers 401 with RFC 9728 resource metadata', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(RemoteToolGrantRepo, 'findByTokenHash', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/mcp',
      body: { jsonrpc: '2.0', id: 1, method: 'initialize' },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('oauth-protected-resource');
    expect(await response.json()).toMatchObject({ error: true });
    await env.verify();
  }));

  it('POST /mcp initialize negotiates the protocol for a valid PAT bearer', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/mcp',
      headers: { authorization: `Bearer ${PAT}` },
      body: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as { id: number; result: Record<string, unknown> };
    expect(payload.id).toBe(1);
    expect(payload.result).toMatchObject({
      protocolVersion: '2025-03-26',
      serverInfo: { name: 'Kazibee Remote Tool Service' },
    });
  }));

  it('POST /mcp acknowledges notifications with 202 and no body', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/mcp',
      headers: { authorization: `Bearer ${PAT}` },
      body: { jsonrpc: '2.0', method: 'notifications/initialized' },
    });
    expect(response.status).toBe(202);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
  }));

  it('POST /mcp tools/call surfaces EXECUTOR_OFFLINE as an isError tool result when no routing exists', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/mcp',
      headers: { authorization: `Bearer ${PAT}` },
      body: {
        jsonrpc: '2.0', id: 7, method: 'tools/call',
        params: { name: 'read_file', arguments: { path: 'README.md' } },
      },
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as { result: { isError: boolean; structuredContent: Record<string, unknown> } };
    expect(payload.result.isError).toBe(true);
    expect(payload.result.structuredContent).toMatchObject({ ok: false, code: 'EXECUTOR_OFFLINE' });
  }));

  it('POST /mcp answers -32601 for unknown methods', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(patAuth()).build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/mcp',
      headers: { authorization: `Bearer ${PAT}` },
      body: { jsonrpc: '2.0', id: 2, method: 'resources/list' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 2, error: { code: -32601 } });
  }));

  it('POST /grants mints a grant and returns the raw token exactly once', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(ConnectExecutorRepo, 'findByExecutorId', control.once(control.returns(Promise.resolve(executorRow()))))
      .method(RemoteToolGrantRepo, 'createGrant', control.once(control.returns(Promise.resolve(undefined))))
      .method(RemoteToolGrantRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(grantRow()))))
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/grants',
      headers: ownerHeaders(),
      query: { sessionId: SESSION_ID },
      body: { executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1', scopes: ['workspace.read'] },
    });
    expect(response.status).toBe(201);
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toMatchObject({
      grantId: GRANT_ID,
      executorId: EXECUTOR_ID,
      workspaceId: 'wrk_workspace1',
      scopes: ['workspace.read'],
    });
    expect(typeof payload.token).toBe('string');
    await env.verify();
  }));

  it('POST /grants rejects an invalid scope closure with 400', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .use(browserSession())
      .method(RemoteToolGrantRepo, 'createGrant', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/v1/remote-tools/grants',
      headers: ownerHeaders(),
      query: { sessionId: SESSION_ID },
      // workspace.write requires workspace.read in the same grant.
      body: { executorId: EXECUTOR_ID, workspaceId: 'wrk_workspace1', scopes: ['workspace.write'] },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: true,
      message: 'Grant creation failed: invalid_scopes.',
    });
    await env.verify();
  }));

  it('GET /grants answers 401 when the session cookie resolves to nothing', resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT)
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(null))))
      .method(RemoteToolGrantRepo, 'listByOwner', control.never())
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/v1/remote-tools/grants',
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
      query: { sessionId: SESSION_ID },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: true, message: 'Not signed in.' });
    await env.verify();
  }));
});
