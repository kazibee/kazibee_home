/**
 * OAuth authorization negative/edge flows through testDinner (no server, no
 * database).
 *
 * Extends oauth_authorize_flows.testdinner.test.ts with the remaining
 * error arms: inactive/revoked clients (DCR and cached CIMD), malformed CIMD
 * metadata, malformed redirect URI registrations, unauthenticated and invalid
 * consent context/deny requests, scope-escalation and read_write capping in
 * approve, and the best-effort .catch() compensation arms.
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import OAuthAuthorizeController from '../../../src/server/controller/oauth_authorize.controller';
import OAuthAuthorizeService from '../../../src/server/services/oauth_authorize_service';
import OAuthRepo from '../../../src/server/repo/oauth_repo';
import ConnectExecutorRepo from '../../../src/server/repo/connect_executor_repo';
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

const sessionStubs = () => ([
  [ConnectBrowserSessionRepo, {
    findByTokenHash: control.once(control.returns(Promise.resolve(activeSession))),
    touchSession: control.returns(Promise.resolve(undefined)),
  }],
  [ConnectAccountRepo, {
    findByUserId: control.once(control.returns(Promise.resolve(activeAccount))),
  }],
] as const);

/** A pre-handled rejected promise: safe to hand to control.returns(). */
function rejected(message: string): Promise<never> {
  const promise = Promise.reject(new Error(message));
  promise.catch(() => undefined);
  return promise;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('oauth authorize negative flows through testDinner', () => {
  it('a revoked DCR client and a revoked cached CIMD client are both invalid_client', async () => {
    const rows = [
      { ...dcrClient, status: 'revoked' },
      { ...dcrClient, client_id: 'https://client.example/oauth-client.json', kind: 'cimd', status: 'revoked' },
    ];
    for (const row of rows) {
      const env = await base()
        .methods([
          [OAuthRepo, { findClientById: control.once(control.returns(Promise.resolve(row))) }],
        ])
        .build();
      const response = await env.dinner.request({
        method: 'GET',
        path: '/oauth/authorize',
        query: { ...validParams, client_id: row.client_id },
      });
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('invalid_client');
      await env.verify();
      await env.dispose();
    }
  });

  it('a CIMD document that is a JSON array is invalid_client and never cached', async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(['nope']), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
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
  });

  it('a CIMD document without a client_name is cached with a null name and accepted', async () => {
    const CIMD_ID = 'https://client.example/oauth-client.json';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      client_id: CIMD_ID,
      redirect_uris: [REDIRECT_URI],
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
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

  it('a registered but non-URL redirect target is invalid_request (no redirect)', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findClientById: control.once(control.returns(Promise.resolve({
            ...dcrClient,
            redirect_uris: ['not a url'],
          }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'not a url' },
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('invalid_request');
    await env.verify();
    await env.dispose();
  });

  it('a loopback redirect never matches an unparseable registered URI', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findClientById: control.once(control.returns(Promise.resolve({
            ...dcrClient,
            redirect_uris: ['%% not parseable %%'],
          }))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/authorize',
      query: { ...validParams, redirect_uri: 'http://127.0.0.1:53211/callback' },
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('invalid_request');
    await env.verify();
    await env.dispose();
  });

  it('GET /oauth/consent/context without a sessionId query is 401', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, { findClientById: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'GET',
      path: '/oauth/consent/context',
      query: { ...validParams },
    });
    expect(response.status).toBe(401);
    await env.verify();
    await env.dispose();
  });

  it('an authenticated context request with invalid OAuth params is a 400 JSON error', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, { findClientById: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('POST /oauth/consent/deny without a session cookie is 401', async () => {
    const env = await base()
      .methods([
        [ConnectBrowserSessionRepo, { findByTokenHash: control.never() }],
        [OAuthRepo, { findClientById: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/deny',
      headers: { 'content-type': 'application/json' },
      body: { sessionId: 'ses_1', ...validParams },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, message: 'Not signed in' });
    await env.verify();
    await env.dispose();
  });

  it('a deny crash inside the service maps to the 500 JSON error', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, { findClientById: control.once(control.throws(new Error('db down'))) }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('deny with an empty state omits the state parameter from the redirect', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, { findClientById: control.once(control.returns(Promise.resolve(dcrClient))) }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('an authenticated approve with invalid OAuth params is a 400 JSON error', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, { findClientById: control.never(), createConnection: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
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
    await env.dispose();
  });

  it('approve rejects a parseable approved scope that escalates read to read_write', async () => {
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
        scope: 'kazibee:read',
        approved_scope: 'kazibee:read kazibee:write',
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

  it('approve without a machines field at all is invalid_request', async () => {
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
      body: { sessionId: 'ses_1', ...validParams, approved_scope: 'kazibee:read' },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid_request',
      message: 'At least one machine is required',
    });
    await env.verify();
    await env.dispose();
  });

  it('a read_write approval caps each member by its explicit choice', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(control.returns(Promise.resolve(undefined))),
          // Two members: one explicitly capped to read, one keeping read_write.
          addConnectionExecutor: control.returns(Promise.resolve(undefined)),
          createCode: control.once(control.returns(Promise.resolve(undefined))),
          revokeSupersededConnectionTokens: control.once(control.returns(Promise.resolve(undefined))),
          revokeSupersededConnections: control.once(control.returns(Promise.resolve(undefined))),
          revokeConnection: control.never(),
        }],
        [ConnectExecutorRepo, {
          findByExecutorId: control.returns(Promise.resolve(executor)),
        }],
      ])
      .build();
    const rwScope = 'kazibee:read kazibee:write';
    const response = await env.dinner.request({
      method: 'POST',
      path: '/oauth/consent/approve',
      headers: authedHeaders,
      body: {
        sessionId: 'ses_1',
        ...validParams,
        scope: rwScope,
        approved_scope: rwScope,
        machines: [
          { executor_id: 'exe_1', workspace_id: 'ws_1', scope: 'read' },
          { executor_id: 'exe_2', workspace_id: 'ws_2', scope: 'read_write' },
        ],
      },
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(new URL(payload.redirect_to).searchParams.get('code')).toBeTruthy();
    await env.verify();
    await env.dispose();
  });

  it('compensation still fails safe when the revoke itself also fails (membership arm)', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(control.returns(Promise.resolve(undefined))),
          addConnectionExecutor: control.once(control.throws(new Error('membership write failed'))),
          revokeConnection: control.once(control.returns(rejected('revoke also failed'))),
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
    await env.verify();
    await env.dispose();
  });

  it('compensation still fails safe when the revoke also fails (code-issuance arm)', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(control.returns(Promise.resolve(undefined))),
          addConnectionExecutor: control.once(control.returns(Promise.resolve(undefined))),
          createCode: control.once(control.throws(new Error('code write failed'))),
          revokeConnection: control.once(control.returns(rejected('revoke also failed'))),
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

  it('errorRedirect omits state entirely when the failure carries none', async () => {
    const env = await base().build();
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
    await env.dispose();
  });

  it('failed best-effort superseding never breaks a fresh authorization', async () => {
    const env = await base()
      .methods([
        ...sessionStubs(),
        [OAuthRepo, {
          findClientById: control.returns(Promise.resolve(dcrClient)),
          createConnection: control.once(control.returns(Promise.resolve(undefined))),
          addConnectionExecutor: control.once(control.returns(Promise.resolve(undefined))),
          createCode: control.once(control.returns(Promise.resolve(undefined))),
          revokeSupersededConnectionTokens: control.once(control.returns(rejected('supersede tokens failed'))),
          revokeSupersededConnections: control.once(control.returns(rejected('supersede connections failed'))),
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
    expect(new URL(payload.redirect_to).searchParams.get('code')).toBeTruthy();
    await env.verify();
    await env.dispose();
  });
});
