/**
 * OAuth authorization deep flows through testDinner (no server, no database).
 *
 * Extends oauth_authorize.testdinner.test.ts with the consent APPROVE happy
 * path (createConnection -> memberships -> code issuance), its compensation
 * branches, the consent context projection, remaining validate() branches, and
 * the CIMD https client-id resolution path (global fetch stubbed via
 * vi.stubGlobal; restored after every test).
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import OAuthAuthorizeController from '../../../src/server/controller/oauth_authorize.controller';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import RemoteToolDispatchService from '../../../src/server/services/remote_tool_dispatch_service';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';

const authorizeSource = parseYaml(
  readFileSync(
    path.resolve(__dirname, '../../../src/server/openapi/oauth/authorize.yaml'),
    'utf8',
  )
) as Record<string, unknown>;

const RESOURCE = 'https://mcp.kazibee.com/mcp';
const REDIRECT_URI = 'https://client.example/callback';

const base = () =>
  testDinner(authorizeSource)
    .select({ module: 'oauthAuthorization' })
    .controllers({ 'oauth_authorize.controller': OAuthAuthorizeController })
    .hooks({});

const dcrClient = {
  client_id: 'oac_client_1',
  kind: 'dcr',
  client_name: 'Test MCP Client',
  redirect_uris: [REDIRECT_URI, 'http://127.0.0.1/callback'],
  metadata: {},
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const validParams = {
  response_type: 'code',
  client_id: 'oac_client_1',
  redirect_uri: REDIRECT_URI,
  state: 'state-123',
  code_challenge: 'a'.repeat(43),
  code_challenge_method: 'S256',
  scope: 'kazibee:read',
  resource: RESOURCE,
};

const CSRF_TOKEN = 'csrf-raw-token-value';
const CSRF_HASH = createHash('sha256').update(CSRF_TOKEN, 'utf8').digest('hex');
const SESSION_TOKEN = 'session-raw-token-value';
const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const activeSession = {
  session_id: 'ses_1',
  user_id: 'usr_1',
  status: 'active',
  csrf_token_hash: CSRF_HASH,
  idle_expires_at: future,
  absolute_expires_at: future,
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  revoked_at: null,
};

const activeAccount = {
  user_id: 'usr_1',
  status: 'active',
  username: 'shavyg2',
  email: 'shavyg2@gmail.com',
};

const executor = {
  executor_id: 'exe_1',
  display_name: 'Work laptop',
  state: 'active',
  owner_user_id: 'usr_1',
};

const authedHeaders = {
  'content-type': 'application/json',
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
};

/** Session + account stubs shared by every authenticated consent request. */
const sessionStubs = () => ([
  [ConnectBrowserSessionRepo, {
    findByTokenHash: control.once(control.returns(Promise.resolve(activeSession))),
    touchSession: control.returns(Promise.resolve(undefined)),
  }],
  [ConnectAccountRepo, {
    findByUserId: control.once(control.returns(Promise.resolve(activeAccount))),
  }],
] as const);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('oauth authorize deep flows through testDinner', () => {
  it('POST /oauth/consent/approve happy path persists connection, memberships, code — in order', async () => {
    const written: string[] = [];
    const recorded = <T>(name: string, value: T) =>
      control.returns((async () => { written.push(name); return value; })());
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(recorded('connection', undefined)),
          addConnectionExecutor: control.once(recorded('member', undefined)),
          createCode: control.once(recorded('code', undefined)),
          revokeSupersededConnectionTokens: control.once(recorded('supersede-tokens', undefined)),
          revokeSupersededConnections: control.once(recorded('supersede-connections', undefined)),
          revokeConnection: control.never(),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve(executor))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
        machines: [{ executor_id: 'exe_1', workspace_id: 'ws_1' }],
      },
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    const url = new URL(payload.redirect_to);
    expect(url.origin + url.pathname).toBe(REDIRECT_URI);
    expect(url.searchParams.get('code')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('iss')).toBe('https://mcp.kazibee.com');
    expect(written).toEqual([
      'connection', 'member', 'code', 'supersede-tokens', 'supersede-connections',
    ]);
    await env.verify();
    await env.dispose();
  });

  it('approve compensates: a failed membership write revokes the connection and maps to 500', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(control.returns(Promise.resolve(undefined))),
          addConnectionExecutor: control.once(control.throws(new Error('membership write failed'))),
          revokeConnection: control.once(control.returns(Promise.resolve(undefined))),
          createCode: control.never(),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve(executor))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
        machines: [{ executor_id: 'exe_1', workspace_id: 'ws_1' }],
      },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'server_error',
      message: 'Could not approve authorization',
    });
    await env.verify();
    await env.dispose();
  });

  it('approve compensates: a failed code issuance also revokes the fresh connection', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(control.returns(Promise.resolve(undefined))),
          addConnectionExecutor: control.once(control.returns(Promise.resolve(undefined))),
          createCode: control.once(control.throws(new Error('code write failed'))),
          revokeConnection: control.once(control.returns(Promise.resolve(undefined))),
          revokeSupersededConnections: control.never(),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve(executor))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
        machines: [{ executor_id: 'exe_1', workspace_id: 'ws_1' }],
      },
    });
    expect(response.status).toBe(500);
    await env.verify();
    await env.dispose();
  });

  it('approve rejects an approved scope that escalates read to read_write', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read_write',
        machines: [{ executor_id: 'exe_1', workspace_id: 'ws_1' }],
      },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_scope',
      message: 'Approved scope exceeds the requested scope',
    });
    await env.verify();
    await env.dispose();
  });

  it('approve without any machine selection is invalid_request', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
        machines: [{ executor_id: '', workspace_id: 'ws_1' }, 'garbage', { executor_id: 42 }],
      },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_request',
      message: 'At least one machine is required',
    });
    await env.verify();
    await env.dispose();
  });

  it('approve rejects a machine the user does not own', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.never(),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.once(control.returns(Promise.resolve({
            ...executor,
            owner_user_id: 'usr_someone_else',
          }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
        machines: [{ executor_id: 'exe_1', workspace_id: 'ws_1', scope: 'read' }],
      },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_scope',
      message: 'No access to a selected machine',
    });
    await env.verify();
    await env.dispose();
  });

  it('GET /oauth/consent/context projects the client and live executor presence', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
        }],
        [ConnectExecutorRepo, {
          listByOwner: control.once(control.returns(Promise.resolve([
            executor,
            { ...executor, executor_id: 'exe_pending', state: 'pending' },
          ]))),
        }],
        [RemoteToolDispatchService, {
          presenceDetail: control.once(control.returns(Promise.resolve({
            state: 'online',
            workspaces: [{ workspaceId: 'ws_1', displayName: 'Repo', state: 'ready' }],
          }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { sessionId: 'ses_1', ...validParams },
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      client: { id: 'oac_client_1', name: 'Test MCP Client' },
      requested_scope: 'kazibee:read',
      requested_access: 'read',
      requested_shell: false,
      requested_web: false,
      executors: [{
        executor_id: 'exe_1',
        display_name: 'Work laptop',
        presence: 'online',
        workspaces: [{ workspace_id: 'ws_1', display_name: 'Repo', state: 'ready' }],
      }],
    });
    await env.verify();
    await env.dispose();
  });

  it('context with a null presence detail degrades the executor to offline', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, { findClientById: control.returns(Promise.resolve({ ...dcrClient, client_name: '  ' })) }],
        [ConnectExecutorRepo, {
          listByOwner: control.once(control.returns(Promise.resolve([executor]))),
        }],
        [RemoteToolDispatchService, {
          presenceDetail: control.once(control.returns(Promise.resolve(null))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { sessionId: 'ses_1', ...validParams },
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    // A blank client_name falls back to the client_id.
    expect(payload.client).toEqual({ id: 'oac_client_1', name: 'oac_client_1' });
    expect(payload.executors).toEqual([{
      executor_id: 'exe_1',
      display_name: 'Work laptop',
      presence: 'offline',
      workspaces: [],
    }]);
    await env.verify();
    await env.dispose();
  });

  it('context failures inside the service map to a 500 JSON error', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, { findClientById: control.once(control.throws(new Error('db down'))) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { sessionId: 'ses_1', ...validParams },
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'server_error',
      message: 'Could not load authorization context',
    });
    await env.verify();
    await env.dispose();
  });

  it('validate: missing code_challenge, bad method, bad resource, bad scope each redirect with the right error', async () => {
    const cases = [
      { override: { code_challenge: '' }, error: 'invalid_request' },
      { override: { code_challenge_method: 'plain' }, error: 'invalid_request' },
      { override: { resource: 'https://evil.example/mcp' }, error: 'invalid_request' },
      { override: { scope: 'kazibee:admin' }, error: 'invalid_scope' },
    ];
    for (const { override, error } of cases) {
      const env = await base()
        .methods([
          [OAuthRepo, { findClientById: control.returns(Promise.resolve(dcrClient)) }],
        ])
        .build();
      const response = await env.dinner.request({
        method: 'GET',
        path: '/oauth/authorize',
        query: { ...validParams, ...override },
      });
      expect(response.status).toBe(302);
      const url = new URL(response.headers.get('location') as string);
      expect(url.searchParams.get('error')).toBe(error);
      expect(url.searchParams.get('state')).toBe('state-123');
      await env.dispose();
    }
  });

  it('validate: an unregistered redirect_uri renders the plain 400 page, never a redirect', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, { findClientById: control.returns(Promise.resolve(dcrClient)) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'https://evil.example/callback' },
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('invalid_request');
    await env.dispose();
  });

  it('validate: a loopback redirect matches its registration ignoring the ephemeral port', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, { findClientById: control.returns(Promise.resolve(dcrClient)) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'http://127.0.0.1:53211/callback' },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="app">');
    await env.dispose();
  });

  it('an https client_id is resolved via CIMD fetch, cached, and serves the consent shell', async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const metadata = {
      client_id: CIMD_ID,
      client_name: 'CIMD Client',
      redirect_uris: [REDIRECT_URI],
    };
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      expect(String(input)).toBe(CIMD_ID);
      return new Response(JSON.stringify(metadata), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));
    const env = await base()
      .methods([
        [OAuthRepo, {
          findClientById: control.once(control.returns(Promise.resolve(null))),
          createClient: control.once(control.returns(Promise.resolve(undefined))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, client_id: CIMD_ID },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="app">');
    await env.verify();
    await env.dispose();
  });

  it('CIMD resolution failures (non-2xx, mismatched id, thrown fetch) are all invalid_client', async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const attempts: Array<() => Promise<Response>> = [
      async () => new Response('nope', { status: 404 }),
      async () => new Response(JSON.stringify({ client_id: 'https://other.example', redirect_uris: [REDIRECT_URI] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
      async () => { throw new Error('network unreachable'); },
    ];
    for (const attempt of attempts) {
      vi.stubGlobal('fetch', vi.fn(attempt));
      const env = await base()
        .methods([
          [OAuthRepo, {
            findClientById: control.once(control.returns(Promise.resolve(null))),
            createClient: control.never(),
          }],
        ])
        .build();
      const response = await env.dinner.request({
        method: 'GET',
        path: '/oauth/authorize',
        query: { ...validParams, client_id: CIMD_ID },
      });
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('invalid_client');
      await env.verify();
      await env.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('a cached CIMD client resolves without any fetch; a non-oac non-https id never queries', async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('must not fetch'); }));
    const env = await base()
      .methods([
        [OAuthRepo, {
          findClientById: control.once(control.returns(Promise.resolve({
            ...dcrClient,
            client_id: CIMD_ID,
            kind: 'cimd',
          }))),
        }],
      ])
      .build();
    const cached = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, client_id: CIMD_ID },
    });
    expect(cached.status).toBe(200);
    await env.verify();
    await env.dispose();

    const env2 = await base()
      .methods([ [OAuthRepo, { findClientById: control.never() }] ])
      .build();
    const bad = await env2.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, client_id: 'ftp://weird' },
    });
    expect(bad.status).toBe(400);
    expect(await bad.text()).toContain('invalid_client');
    await env2.verify();
    await env2.dispose();
  });

  it('a validate() crash on GET /oauth/authorize renders the plain 500 error page', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, { findClientById: control.once(control.throws(new Error('db down'))) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: validParams,
    });
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('server_error');
    await env.dispose();
  });
});
