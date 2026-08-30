/**
 * NoEgo canonical testing (testDinner + @noego/testing) for the OAuth
 * authorization/consent module (src/server/openapi/oauth/authorize.yaml).
 *
 * Real production source, real controller -> service graph
 * (OAuthAuthorizeService, OAuthClientService, ConnectExecutorActorResolver,
 * ConnectSessionAuthService — real cookie/CSRF hashing). Only the @Query repo
 * boundaries (OAuthRepo, ConnectBrowserSessionRepo, ConnectAccountRepo) are
 * controlled; no server, no database, no global state.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import OAuthAuthorizeController from '../../../src/server/controller/oauth_authorize.controller';

// Real production source — the same document production stitching includes.
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
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

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
  it('GET /oauth/authorize without a client_id renders the plain error page (no redirect)', async () => {
    const env = await base()
      .methods({
        OAuthRepo: { findClientById: control.never() },
      })
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('a fully valid authorization request serves the consent application shell', async () => {
    const env = await base()
      .methods({
        OAuthRepo: {
          findClientById: control.once(control.returns(Promise.resolve(dcrClient))),
        },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: validParams,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('<div id="app">');
    await env.verify();
    await env.dispose();
  });

  it('a validated client with a bad response_type gets a 302 error redirect carrying state and iss', async () => {
    const env = await base()
      .methods({
        OAuthRepo: {
          findClientById: control.once(control.returns(Promise.resolve(dcrClient))),
        },
      })
      .build();
    const response = await env.dinner.request({
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
    expect(url.searchParams.get('iss')).toBe('https://mcp.kazibee.com');
    await env.verify();
    await env.dispose();
  });

  it('GET /oauth/consent/context without a session cookie is 401 and never queries anything', async () => {
    const env = await base()
      .methods({
        ConnectBrowserSessionRepo: { findByTokenHash: control.never() },
        OAuthRepo: { findClientById: control.never() },
      })
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, message: 'Not signed in' });
    await env.verify();
    await env.dispose();
  });

  it('POST /oauth/consent/approve with a valid session but no CSRF token is 403', async () => {
    const env = await base()
      .methods({
        ConnectBrowserSessionRepo: {
          findByTokenHash: control.once(control.returns(Promise.resolve(activeSession))),
        },
        ConnectAccountRepo: {
          findByUserId: control.once(control.returns(Promise.resolve(activeAccount))),
        },
        OAuthRepo: { createConnection: control.never() },
      })
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('POST /oauth/consent/deny with real session+CSRF auth returns the access_denied redirect', async () => {
    const env = await base()
      .methods({
        ConnectBrowserSessionRepo: {
          findByTokenHash: control.once(control.returns(Promise.resolve(activeSession))),
          touchSession: control.once(control.returns(Promise.resolve(undefined))),
        },
        ConnectAccountRepo: {
          findByUserId: control.once(control.returns(Promise.resolve(activeAccount))),
        },
        OAuthRepo: {
          findClientById: control.once(control.returns(Promise.resolve(dcrClient))),
          createConnection: control.never(),
        },
      })
      .build();
    const response = await env.dinner.request({
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
    expect(url.searchParams.get('iss')).toBe('https://mcp.kazibee.com');
    await env.verify();
    await env.dispose();
  });

  it('POST /oauth/consent/deny with authenticated user but invalid OAuth params is a 400 JSON error', async () => {
    const env = await base()
      .methods({
        ConnectBrowserSessionRepo: {
          findByTokenHash: control.once(control.returns(Promise.resolve(activeSession))),
          touchSession: control.once(control.returns(Promise.resolve(undefined))),
        },
        ConnectAccountRepo: {
          findByUserId: control.once(control.returns(Promise.resolve(activeAccount))),
        },
        OAuthRepo: { findClientById: control.never() },
      })
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });
});
