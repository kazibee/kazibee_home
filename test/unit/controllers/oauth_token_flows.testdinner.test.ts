/**
 * OAuth token deep flows through testDinner (no server, no database).
 *
 * Extends oauth.testdinner.test.ts with the refresh_token grant, remaining
 * authorization_code branches, and the bearer-token authentication service
 * (OAuthTokenAuthService) at service depth. Only the @Query repo boundary
 * (OAuthRepo) is controlled.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import OAuthController from '../../../src/server/controller/oauth.controller';
import OAuthTokenAuthService, { InvalidOAuthTokenError } from '../../../src/server/services/oauth_token_auth_service';
import { tokenMatchesResource } from '../../../src/server/services/oauth_flow_service';
import formBody from '../../../src/middleware/form_body';
import OAuthRepo from '../../../src/server/repo/oauth_repo';

const oauthSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/mcp/openapi/oauth.yaml'), 'utf8')
) as Record<string, unknown>;

const RESOURCE = 'https://mcp.kazibee.com/mcp';
const RESOURCE_TAG = createHash('sha256').update(RESOURCE, 'utf8').digest('base64url').slice(0, 16);
// A syntactically valid, resource-bound refresh token (random part + audience tag).
const REFRESH_TOKEN = `${'A'.repeat(32)}${RESOURCE_TAG}`;
const CODE_VERIFIER = 'test-verifier-0123456789-0123456789-0123456789';
const CODE_CHALLENGE = createHash('sha256').update(CODE_VERIFIER, 'utf8').digest('base64url');

const base = () =>
  testDinner(oauthSource)
    .select({ module: 'oauth' })
    .controllers({ 'oauth.controller': OAuthController })
    .middleware({ form_body: formBody })
    .hooks({});

function form(fields: Record<string, string>) {
  return {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  };
}

const now = new Date();
const future = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
const past = new Date(now.getTime() - 60 * 1000).toISOString();

const refreshRow = (overrides: Record<string, unknown> = {}) => ({
  token_hash: 'hash-of-refresh',
  connection_id: 'ocn_1',
  kind: 'refresh',
  status: 'active',
  created_at: now.toISOString(),
  expires_at: future,
  revoked_at: null,
  rotated_from: null,
  user_id: 'usr_1',
  client_id: 'oac_client_1',
  approved_scope: 'read_write',
  allow_shell: true,
  allow_web: false,
  connection_status: 'active',
  connection_created_at: now.toISOString(),
  connection_revoked_at: null,
  ...overrides,
});

const refreshForm = () => form({
  grant_type: 'refresh_token',
  refresh_token: REFRESH_TOKEN,
  client_id: 'oac_client_1',
  resource: RESOURCE,
});

const codeRow = (overrides: Record<string, unknown> = {}) => ({
  code_hash: 'irrelevant-consumed-by-stub',
  connection_id: 'ocn_1',
  client_id: 'oac_client_1',
  redirect_uri: 'https://client.example/callback',
  code_challenge: CODE_CHALLENGE,
  code_challenge_method: 'S256',
  resource: RESOURCE,
  created_at: now.toISOString(),
  expires_at: future,
  consumed_at: null,
  ...overrides,
});

const exchangeForm = (overrides: Record<string, string> = {}) => form({
  grant_type: 'authorization_code',
  code: 'raw-authorization-code',
  code_verifier: CODE_VERIFIER,
  client_id: 'oac_client_1',
  redirect_uri: 'https://client.example/callback',
  resource: RESOURCE,
  ...overrides,
});

describe('oauth refresh_token grant through testDinner', () => {
  it('rotates the refresh token and mints a fresh resource-bound access token', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findActiveTokenWithConnection: control.once(control.returns(Promise.resolve(refreshRow()))),
          rotateRefreshToken: control.once(control.returns(Promise.resolve({ rotated: true }))),
          createToken: control.once(control.returns(Promise.resolve(undefined))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token', ...refreshForm(),
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'kazibee:read kazibee:write kazibee:shell',
    });
    expect(tokenMatchesResource(payload.access_token, RESOURCE)).toBe(true);
    expect(tokenMatchesResource(payload.refresh_token, RESOURCE)).toBe(true);
    await env.verify();
    await env.dispose();
  });

  it('a refresh token bound to another resource is invalid_grant before any lookup', async () => {
    const env = await base()
      .methods([ [OAuthRepo, { findActiveTokenWithConnection: control.never() }] ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token',
      ...form({
        grant_type: 'refresh_token',
        refresh_token: `${'A'.repeat(32)}wrongtagwrongtag`,
        client_id: 'oac_client_1',
        resource: RESOURCE,
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant' });
    await env.verify();
    await env.dispose();
  });

  it('a malformed refresh token is invalid_request', async () => {
    const env = await base().build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token',
      ...form({
        grant_type: 'refresh_token',
        refresh_token: 'too short!',
        client_id: 'oac_client_1',
        resource: RESOURCE,
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    await env.dispose();
  });

  it('an expired, revoked, or access-kind token is invalid_grant', async () => {
    const rows = [
      refreshRow({ expires_at: past }),
      refreshRow({ status: 'revoked' }),
      refreshRow({ kind: 'access' }),
      refreshRow({ connection_status: 'revoked' }),
      null,
    ];
    for (const row of rows) {
      const env = await base()
        .methods([
          [OAuthRepo, {
            findActiveTokenWithConnection: control.once(control.returns(Promise.resolve(row))),
            rotateRefreshToken: control.never(),
          }],
        ])
        .build();
      const response = await env.dinner.request({
        method: 'POST', path: '/oauth/token', ...refreshForm(),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_grant' });
      await env.verify();
      await env.dispose();
    }
  });

  it('a refresh token owned by another client is invalid_client', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findActiveTokenWithConnection: control.once(
            control.returns(Promise.resolve(refreshRow({ client_id: 'oac_other' }))),
          ),
          rotateRefreshToken: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token', ...refreshForm(),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_client' });
    await env.verify();
    await env.dispose();
  });

  it('a lost rotation race (rotateRefreshToken -> null) is invalid_grant with no token minted', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findActiveTokenWithConnection: control.once(control.returns(Promise.resolve(refreshRow()))),
          rotateRefreshToken: control.once(control.returns(Promise.resolve(null))),
          createToken: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token', ...refreshForm(),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant' });
    await env.verify();
    await env.dispose();
  });
});

describe('oauth authorization_code remaining branches', () => {
  it('missing required fields are invalid_request before any repo call', async () => {
    const env = await base()
      .methods([ [OAuthRepo, { consumeCode: control.never() }] ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token', ...exchangeForm({ code: '' }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    await env.verify();
    await env.dispose();
  });

  it('an unknown or consumed code is invalid_grant', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, { consumeCode: control.once(control.returns(Promise.resolve(null))) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: 'POST', path: '/oauth/token', ...exchangeForm(),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_grant' });
    await env.verify();
    await env.dispose();
  });

  it('redirect_uri mismatch and a wrong PKCE verifier are both invalid_grant', async () => {
    for (const row of [
      codeRow({ redirect_uri: 'https://other.example/callback' }),
      codeRow({ code_challenge: 'not-the-right-challenge' }),
      codeRow({ resource: 'https://other.example/mcp' }),
    ]) {
      const env = await base()
        .methods([
          [OAuthRepo, {
            consumeCode: control.once(control.returns(Promise.resolve(row))),
            findActiveConnectionById: control.never(),
          }],
        ])
        .build();
      const response = await env.dinner.request({
        method: 'POST', path: '/oauth/token', ...exchangeForm(),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_grant' });
      await env.verify();
      await env.dispose();
    }
  });

  it('a revoked or missing connection is invalid_grant; a foreign connection is invalid_client', async () => {
    const cases = [
      { connection: null, status: 400, error: 'invalid_grant' },
      {
        connection: {
          connection_id: 'ocn_1', user_id: 'usr_1', client_id: 'oac_client_1',
          approved_scope: 'read', allow_shell: false, allow_web: false,
          status: 'revoked', created_at: now.toISOString(), revoked_at: past,
        },
        status: 400, error: 'invalid_grant',
      },
      {
        connection: {
          connection_id: 'ocn_1', user_id: 'usr_1', client_id: 'oac_other',
          approved_scope: 'read', allow_shell: false, allow_web: false,
          status: 'active', created_at: now.toISOString(), revoked_at: null,
        },
        status: 401, error: 'invalid_client',
      },
    ];
    for (const { connection, status, error } of cases) {
      const env = await base()
        .methods([
          [OAuthRepo, {
            consumeCode: control.once(control.returns(Promise.resolve(codeRow()))),
            findActiveConnectionById: control.once(control.returns(Promise.resolve(connection))),
            createToken: control.never(),
          }],
        ])
        .build();
      const response = await env.dinner.request({
        method: 'POST', path: '/oauth/token', ...exchangeForm(),
      });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
      await env.verify();
      await env.dispose();
    }
  });
});

describe('OAuthTokenAuthService at service depth (real hashing, stubbed repo)', () => {
  const ACCESS_TOKEN = `${'B'.repeat(32)}${RESOURCE_TAG}`;
  const accessRow = (overrides: Record<string, unknown> = {}) =>
    refreshRow({ kind: 'access', ...overrides });
  const memberRow = (overrides: Record<string, unknown> = {}) => ({
    connection_id: 'ocn_1',
    executor_id: 'exe_1',
    workspace_id: 'ws_1',
    scope: 'read_write',
    added_at: now.toISOString(),
    executor_state: 'active',
    executor_owner_user_id: 'usr_1',
    executor_display_name: 'Work laptop',
    ...overrides,
  });

  it('looksLikeOAuthToken only accepts well-shaped, resource-tagged bearers', async () => {
    const env = await base().build();
    const service = await env.get<OAuthTokenAuthService>(OAuthTokenAuthService);
    expect(service.looksLikeOAuthToken(`Bearer ${ACCESS_TOKEN}`, RESOURCE)).toBe(true);
    expect(service.looksLikeOAuthToken(ACCESS_TOKEN, RESOURCE)).toBe(true);
    expect(service.looksLikeOAuthToken('Bearer short', RESOURCE)).toBe(false);
    expect(service.looksLikeOAuthToken(null, RESOURCE)).toBe(false);
    expect(service.looksLikeOAuthToken(`Bearer ${'C'.repeat(48)}`, RESOURCE)).toBe(false);
    await env.dispose();
  });

  it('authenticate resolves the principal with live members, capping member scopes', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findActiveTokenWithConnection: control.once(
            control.returns(Promise.resolve(accessRow({ approved_scope: 'read' }))),
          ),
          listConnectionExecutors: control.once(control.returns(Promise.resolve([
            memberRow(),
            memberRow({ executor_id: 'exe_gone', executor_state: 'revoked' }),
            memberRow({ executor_id: 'exe_foreign', executor_owner_user_id: 'usr_other' }),
          ]))),
        }],
      ])
      .build();
    const service = await env.get<OAuthTokenAuthService>(OAuthTokenAuthService);
    const principal = await service.authenticate(`Bearer ${ACCESS_TOKEN}`, RESOURCE);
    expect(principal).toMatchObject({
      user_id: 'usr_1',
      client_id: 'oac_client_1',
      connection_id: 'ocn_1',
      approved_scope: 'read',
      allow_shell: true,
      allow_web: false,
    });
    // read_write member capped to read by the connection's read ceiling; the
    // revoked and foreign executors drop out.
    expect(principal.members).toEqual([{
      executor_id: 'exe_1',
      workspace_id: 'ws_1',
      scope: 'read',
      display_name: 'Work laptop',
    }]);
    await env.verify();
    await env.dispose();
  });

  it('authenticate rejects malformed bearers, unknown tokens, and expired tokens', async () => {
    const env = await base()
      .methods([
        [OAuthRepo, {
          findActiveTokenWithConnection: control.calls([
            control.returns(Promise.resolve(null)),
            control.returns(Promise.resolve(accessRow({ expires_at: past }))),
            control.returns(Promise.resolve(accessRow({ kind: 'refresh' }))),
          ]),
          listConnectionExecutors: control.never(),
        }],
      ])
      .build();
    const service = await env.get<OAuthTokenAuthService>(OAuthTokenAuthService);
    await expect(service.authenticate('Bearer nope', RESOURCE)).rejects.toThrow(InvalidOAuthTokenError);
    await expect(service.authenticate(undefined, RESOURCE)).rejects.toThrow(InvalidOAuthTokenError);
    await expect(service.authenticate(`Bearer ${ACCESS_TOKEN}`, RESOURCE)).rejects.toThrow(InvalidOAuthTokenError);
    await expect(service.authenticate(`Bearer ${ACCESS_TOKEN}`, RESOURCE)).rejects.toThrow(InvalidOAuthTokenError);
    await expect(service.authenticate(`Bearer ${ACCESS_TOKEN}`, RESOURCE)).rejects.toThrow(InvalidOAuthTokenError);
    await env.verify();
    await env.dispose();
  });
});
