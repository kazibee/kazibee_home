/**
 * NoEgo canonical testing (root testApp + @noego/testing) for the OAuth
 * authorization/consent module (src/server/openapi/oauth/authorize.yaml),
 * built from the original root configuration (noego.config.yml).
 * Historical case names remain stable.
 *
 * Real production source, real controller -> service graph
 * (OAuthAuthorizeService, OAuthClientService, ConnectExecutorActorResolver,
 * ConnectSessionAuthService — real cookie/CSRF hashing). Only the @Query repo
 * boundaries (OAuthRepo, ConnectBrowserSessionRepo, ConnectAccountRepo) are
 * controlled; no server, no database, no global state. resourceCase owns
 * cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
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
  redirect_uris: [REDIRECT_URI],
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

// Real ConnectCredentials hashing: sha256 hex of the raw CSRF token.
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

describe('oauth authorize/consent routes through testDinner (no server, no database)', () => {
  it('GET /oauth/authorize without a client_id renders the plain error page (no redirect)', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { response_type: 'code' },
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('Authorization request failed');
    expect(html).toContain('invalid_client');
    await env.verify();
  }));

  it('a fully valid authorization request serves the consent application shell', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(dcrClient))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: validParams,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('<div id="app">');
    await env.verify();
  }));

  it('a validated client with a bad response_type gets a 302 error redirect carrying state and iss', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(dcrClient))))
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, response_type: 'token' },
    });
    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(location).toBeTruthy();
    const url = new URL(location as string);
    expect(url.origin + url.pathname).toBe(REDIRECT_URI);
    expect(url.searchParams.get('error')).toBe('unsupported_response_type');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('iss')).toBe('https://mcp-dev.kazibee.com');
    await response.body?.cancel(); // Header-only assertion still owns its HTTP body lease.
    await env.verify();
  }));

  it('GET /oauth/consent/context without a session cookie is 401 and never queries anything', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.never())
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const response = await env.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, message: 'Not signed in' });
    await env.verify();
  }));

  it('POST /oauth/consent/approve with a valid session but no CSRF token is 403', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'createConnection', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: {
        'content-type': 'application/json',
        cookie: `kazi_connect_session=${SESSION_TOKEN}`,
      },
      body: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: true,
      message: 'CSRF validation failed',
    });
    await env.verify();
  }));

  it('POST /oauth/consent/deny with real session+CSRF auth returns the access_denied redirect', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.once(control.returns(Promise.resolve(undefined))))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.once(control.returns(Promise.resolve(dcrClient))))
      .method(OAuthRepo, 'createConnection', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/deny',
      headers: {
        'content-type': 'application/json',
        cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
        'x-csrf-token': CSRF_TOKEN,
      },
      body: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const payload = await response.json();
    const url = new URL(payload.redirect_to);
    expect(url.origin + url.pathname).toBe(REDIRECT_URI);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('iss')).toBe('https://mcp-dev.kazibee.com');
    await env.verify();
  }));

  it('POST /oauth/consent/deny with authenticated user but invalid OAuth params is a 400 JSON error', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauthAuthorization'] } })
      .method(ConnectBrowserSessionRepo, 'findByTokenHash', control.once(control.returns(Promise.resolve(activeSession))))
      .method(ConnectBrowserSessionRepo, 'touchSession', control.once(control.returns(Promise.resolve(undefined))))
      .method(ConnectAccountRepo, 'findByUserId', control.once(control.returns(Promise.resolve(activeAccount))))
      .method(OAuthRepo, 'findClientById', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/consent/deny',
      headers: {
        'content-type': 'application/json',
        cookie: `kazi_connect_session=${SESSION_TOKEN}; kazi_connect_csrf=${CSRF_TOKEN}`,
        'x-csrf-token': CSRF_TOKEN,
      },
      body: { sessionId: 'ses_1', ...validParams, client_id: '' },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_client',
      message: 'Missing or invalid client_id',
    });
    await env.verify();
  }));
});
