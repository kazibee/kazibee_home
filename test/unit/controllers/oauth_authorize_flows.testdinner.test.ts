/**
 * OAuth authorization deep flows through root testApp over the original
 * root configuration (noego.config.yml; no server, no database). Historical
 * case names remain stable.
 *
 * Extends oauth_authorize.testdinner.test.ts with the consent APPROVE happy
 * path (connection -> code issuance), its compensation branch, the consent
 * context projection, remaining validate() branches, and the CIMD https
 * client-id resolution path (documents served through the app's own
 * OAuthClientMetadataClient boundary via per-app testStub; no globals are
 * patched). resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import OAuthClientMetadataClient from '../../../src/server/services/oauth_client_metadata_client';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
import RemoteToolDispatchService from '../../../src/server/services/remote_tool_dispatch_service';
import ConnectBrowserSessionRepo from '../../../src/server/repo/connect_browser_session_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

const RESOURCE = 'https://mcp-dev.kazibee.com/mcp';
const REDIRECT_URI = 'https://client.example/callback';

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

/** The app's CIMD metadata boundary answers exactly once with the given HTTP response. */
const cimdResponse = (response: Response) => testStub()
  .method(OAuthClientMetadataClient, 'request', control.once(control.returns(Promise.resolve(response))));

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

describe('oauth authorize deep flows through testDinner', () => {
  it('POST /oauth/consent/approve succeeds with zero linked machines and writes connection then code', resourceCase(async () => {
    const written: string[] = [];
    const recorded = <T>(name: string, value: T) =>
      control.returns((async () => { written.push(name); return value; })());
    // Session + account stubs shared by every authenticated consent request.
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .method(OAuthRepo, 'createConnection', control.once(recorded('connection', undefined)))
      .method(OAuthRepo, 'createCode', control.once(recorded('code', undefined)))
      .method(OAuthRepo, 'revokeSupersededConnectionTokens', control.once(recorded('supersede-tokens', undefined)))
      .method(OAuthRepo, 'revokeSupersededConnections', control.once(recorded('supersede-connections', undefined)))
      .method(OAuthRepo, 'revokeConnection', control.never())
      .method(ConnectExecutorRepo, 'findByExecutorId', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
      },
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    const url = new URL(payload.redirect_to);
    expect(url.origin + url.pathname).toBe(REDIRECT_URI);
    expect(url.searchParams.get('code')).toBeTruthy();
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('iss')).toBe('https://mcp-dev.kazibee.com');
    expect(written).toEqual([
      'connection', 'code', 'supersede-tokens', 'supersede-connections',
    ]);
    await env.verify();
  }));

  it('approve compensates: a failed code issuance revokes the fresh connection', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .method(OAuthRepo, 'createConnection', control.once(control.returns(Promise.resolve(undefined))))
      .method(OAuthRepo, 'createCode', control.once(control.throws(new Error('code write failed'))))
      .method(OAuthRepo, 'revokeConnection', control.once(control.returns(Promise.resolve(undefined))))
      .method(OAuthRepo, 'revokeSupersededConnections', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read',
      },
    });
    expect(response.status).toBe(500);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('approve rejects an approved scope that escalates read to read_write', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .method(OAuthRepo, 'createConnection', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        approved_scope: 'kazibee:read_write',
      },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_scope',
      message: 'Approved scope exceeds the requested scope',
    });
    await env.verify();
  }));

  it('GET /oauth/consent/context projects the client and live executor presence', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .method(ConnectExecutorRepo, 'listByOwner', control.once(control.returns(Promise.resolve([
        executor,
        { ...executor, executor_id: 'exe_pending', state: 'pending' },
      ]))))
      .method(RemoteToolDispatchService, 'presenceDetail', control.once(control.returns(Promise.resolve({
        state: 'online',
        workspaces: [{ workspaceId: 'ws_1', displayName: 'Repo', state: 'ready' }],
      }))))
      .build();
    const response = await env.request({
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
  }));

  it('context with a null presence detail degrades the executor to offline', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve({ ...dcrClient, client_name: '  ' })))
      .method(ConnectExecutorRepo, 'listByOwner', control.once(control.returns(Promise.resolve([executor]))))
      .method(RemoteToolDispatchService, 'presenceDetail', control.once(control.returns(Promise.resolve(null))))
      .build();
    const response = await env.request({
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
  }));

  it('context failures inside the service map to a 500 JSON error', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.once(control.throws(new Error('db down'))))
      .build();
    const response = await env.request({
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
  }));

  it('validate: missing code_challenge, bad method, bad resource, bad scope each redirect with the right error', resourceCase(async () => {
    const cases = [
      { override: { code_challenge: '' }, error: 'invalid_request' },
      { override: { code_challenge_method: 'plain' }, error: 'invalid_request' },
      { override: { resource: 'https://evil.example/mcp' }, error: 'invalid_request' },
      { override: { scope: 'kazibee:admin' }, error: 'invalid_scope' },
    ];
    for (const { override, error } of cases) {
      const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
        .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
        .build();
      const response = await env.request({
        method: 'GET',
        path: '/oauth/authorize',
        query: { ...validParams, ...override },
      });
      expect(response.status).toBe(302);
      const url = new URL(response.headers.get('location') as string);
      expect(url.searchParams.get('error')).toBe(error);
      expect(url.searchParams.get('state')).toBe('state-123');
      await response.body?.cancel();
    }
  }));

  it('validate: an unregistered redirect_uri renders the plain 400 page, never a redirect', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'https://evil.example/callback' },
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('invalid_request');
  }));

  it('validate: a loopback redirect matches its registration ignoring the ephemeral port', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'http://127.0.0.1:53211/callback' },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="app">');
  }));

  it('an https client_id is resolved via CIMD fetch, cached, and serves the consent shell', resourceCase(async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const metadata = {
      client_id: CIMD_ID,
      client_name: 'CIMD Client',
      redirect_uris: [REDIRECT_URI],
    };
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .use(cimdResponse(jsonResponse(metadata)))
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(null))))
      .method(OAuthRepo, 'createClient', control.once(control.returns(Promise.resolve(undefined))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, client_id: CIMD_ID },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="app">');
    expect(control.inspect(env, OAuthClientMetadataClient, 'request').calls.map((call) => String(call.args[0])))
      .toEqual([CIMD_ID]);
    await env.verify();
  }));

  it('CIMD resolution failures (non-2xx, mismatched id, thrown fetch) are all invalid_client', resourceCase(async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const attempts = [
      cimdResponse(new Response('nope', { status: 404 })),
      cimdResponse(jsonResponse({ client_id: 'https://other.example', redirect_uris: [REDIRECT_URI] })),
      testStub().method(OAuthClientMetadataClient, 'request', control.once(control.throws(new Error('network unreachable')))),
    ];
    for (const attempt of attempts) {
      const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
        .use(attempt)
        .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(null))))
        .method(OAuthRepo, 'createClient', control.never())
        .build();
      const response = await env.request({
        method: 'GET',
        path: '/oauth/authorize',
        query: { ...validParams, client_id: CIMD_ID },
      });
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('invalid_client');
      await env.verify();
    }
  }));

  it('a cached CIMD client resolves without any fetch; a non-oac non-https id never queries', resourceCase(async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthClientMetadataClient, 'request', control.never())
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve({
        ...dcrClient,
        client_id: CIMD_ID,
        kind: 'cimd',
      }))))
      .build();
    const cached = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, client_id: CIMD_ID },
    });
    expect(cached.status).toBe(200);
    await cached.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();

    const env2 = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthClientMetadataClient, 'request', control.never())
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const bad = await env2.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, client_id: 'ftp://weird' },
    });
    expect(bad.status).toBe(400);
    expect(await bad.text()).toContain('invalid_client');
    await env2.verify();
  }));

  it('a validate() crash on GET /oauth/authorize renders the plain 500 error page', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.once(control.throws(new Error('db down'))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: validParams,
    });
    expect(response.status).toBe(500);
    expect(await response.text()).toContain('server_error');
  }));
});
