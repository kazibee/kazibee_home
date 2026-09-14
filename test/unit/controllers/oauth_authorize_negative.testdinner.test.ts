/**
 * OAuth authorization negative/edge flows through root testApp over the
 * original root configuration (noego.config.yml; no server, no database).
 * Historical case names remain stable.
 *
 * Extends oauth_authorize_flows.testdinner.test.ts with the remaining
 * error arms: inactive/revoked clients (DCR and cached CIMD), malformed CIMD
 * metadata, malformed redirect URI registrations, unauthenticated and invalid
 * consent context/deny requests, scope-escalation and read_write capping in
 * approve, and the best-effort .catch() compensation arms. CIMD documents are
 * served through the app's own OAuthClientMetadataClient boundary (per-app
 * testStub; no globals are patched). resourceCase owns environment cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import OAuthAuthorizeService from '../../../src/server/services/oauth_authorize_service';
import OAuthClientMetadataClient from '../../../src/server/services/oauth_client_metadata_client';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
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

const authedHeaders = {
  'content-type': 'application/json',
  cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
};

/** A pre-handled rejected promise: safe to hand to control.returns(). */
function rejected(message: string): Promise<never> {
  const promise = Promise.reject(new Error(message));
  promise.catch(() => undefined);
  return promise;
}

/** The CIMD document the app's metadata boundary serves exactly once for the client_id URL. */
const cimdDocument = (body: unknown) => testStub()
  .method(OAuthClientMetadataClient, 'request', control.once(control.returns(Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ))));

describe('oauth authorize negative flows through testDinner', () => {
  it('a revoked DCR client and a revoked cached CIMD client are both invalid_client', resourceCase(async () => {
    const rows = [
      { ...dcrClient, status: 'revoked' },
      { ...dcrClient, client_id: 'https://client.example/oauth-client.json', kind: 'cimd', status: 'revoked' },
    ];
    for (const row of rows) {
      const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
        .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(row))))
        .build();
      const response = await env.request({
        method: 'GET',
        path: '/oauth/authorize',
        query: { ...validParams, client_id: row.client_id },
      });
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('invalid_client');
      await env.verify();
    }
  }));

  it('a CIMD document that is a JSON array is invalid_client and never cached', resourceCase(async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .use(cimdDocument(['nope']))
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
  }));

  it('a CIMD document without a client_name is cached with a null name and accepted', resourceCase(async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .use(cimdDocument({ client_id: CIMD_ID, redirect_uris: [REDIRECT_URI] }))
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
    await env.verify();
  }));

  it('a registered but non-URL redirect target is invalid_request (no redirect)', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve({
        ...dcrClient,
        redirect_uris: ['not a url'],
      }))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'not a url' },
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('invalid_request');
    await env.verify();
  }));

  it('a loopback redirect never matches an unparseable registered URI', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve({
        ...dcrClient,
        redirect_uris: ['%% not parseable %%'],
      }))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'http://127.0.0.1:53211/callback' },
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('invalid_request');
    await env.verify();
  }));

  it('GET /oauth/consent/context without a sessionId query is 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { ...validParams },
    });
    expect(response.status).toBe(401);
    await response.body?.cancel(); // Status-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('an authenticated context request with invalid OAuth params is a 400 JSON error', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { sessionId: 'ses_1', ...validParams, client_id: '' },
      headers: { cookie: `kazi_connect_session=${SESSION_TOKEN}` },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_client',
      message: 'Missing or invalid client_id',
    });
    await env.verify();
  }));

  it('POST /oauth/consent/deny without a session cookie is 401', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.never())
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/deny',
      headers: { 'content-type': 'application/json' },
      body: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, message: 'Not signed in' });
    await env.verify();
  }));

  it('a deny crash inside the service maps to the 500 JSON error', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.once(control.throws(new Error('db down'))))
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/deny',
      headers: authedHeaders,
      body: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'server_error',
      message: 'Could not deny authorization',
    });
    await env.verify();
  }));

  it('deny with an empty state omits the state parameter from the redirect', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(dcrClient))))
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/deny',
      headers: authedHeaders,
      body: { sessionId: 'ses_1', ...validParams, state: '' },
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    const url = new URL(payload.redirect_to);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.has('state')).toBe(false);
    await env.verify();
  }));

  it('an authenticated approve with invalid OAuth params is a 400 JSON error', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.never())
      .method(OAuthRepo, 'createConnection', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: { sessionId: 'ses_1', ...validParams, client_id: '' },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_client',
      message: 'Missing or invalid client_id',
    });
    await env.verify();
  }));

  it('approve rejects a parseable approved scope that escalates read to read_write', resourceCase(async () => {
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
        scope: 'kazibee:read',
        approved_scope: 'kazibee:read kazibee:write',
      },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_scope',
      message: 'Approved scope exceeds the requested scope',
    });
    await env.verify();
  }));

  it('compensation still fails safe when revoke also fails after code issuance fails', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .method(OAuthRepo, 'createConnection', control.once(control.returns(Promise.resolve(undefined))))
      .method(OAuthRepo, 'createCode', control.once(control.throws(new Error('code write failed'))))
      .method(OAuthRepo, 'revokeConnection', control.once(control.returns(rejected('revoke also failed'))))
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

  it('errorRedirect omits state entirely when the failure carries none', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } }).build();
    const service = await env.get<OAuthAuthorizeService>(OAuthAuthorizeService);
    const redirect = service.errorRedirect({
      ok: false,
      error: 'invalid_request',
      message: 'redirect only',
      redirectUri: REDIRECT_URI,
    });
    const url = new URL(redirect as string);
    expect(url.searchParams.get('error')).toBe('invalid_request');
    expect(url.searchParams.has('state')).toBe(false);
    expect(service.errorRedirect({ ok: false, error: 'invalid_client', message: 'no target' })).toBeNull();
  }));

  it('failed best-effort superseding never breaks a fresh authorization', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.returns(Promise.resolve(undefined)))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.returns(Promise.resolve(dcrClient)))
      .method(OAuthRepo, 'createConnection', control.once(control.returns(Promise.resolve(undefined))))
      .method(OAuthRepo, 'createCode', control.once(control.returns(Promise.resolve(undefined))))
      .method(OAuthRepo, 'revokeSupersededConnectionTokens', control.once(control.returns(rejected('supersede tokens failed'))))
      .method(OAuthRepo, 'revokeSupersededConnections', control.once(control.returns(rejected('supersede connections failed'))))
      .method(OAuthRepo, 'revokeConnection', control.never())
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
    expect(new URL(payload.redirect_to).searchParams.get('code')).toBeTruthy();
    await env.verify();
  }));
});
