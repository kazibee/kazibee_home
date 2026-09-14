/**
 * NoEgo canonical testing (root testApp + @noego/testing) for the OAuth
 * token/metadata/registration module (src/mcp/openapi/oauth.yaml), built
 * from the original MCP satellite configuration (apps/mcp/noego.config.yml).
 * Historical case names remain stable.
 *
 * Real production source, real controller -> service graph (OAuthFlowService,
 * OAuthClientService, OAuthOrigins), real form_body middleware bound by the
 * original configuration's x-middleware identity. Only the @Query repo
 * boundary (OAuthRepo) is controlled; no server, no database, no global
 * state. resourceCase owns cleanup.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
import OAuthRepo from '../../../src/server/repo/oauth_repo';

const CONFIG = path.resolve(__dirname, '../../../apps/mcp/noego.config.yml');

const RESOURCE = 'https://mcp-dev.kazibee.com/mcp';
const CODE_VERIFIER = 'test-verifier-0123456789-0123456789-0123456789';
const CODE_CHALLENGE = createHash('sha256')
  .update(CODE_VERIFIER, 'utf8')
  .digest('base64url');

function form(fields: Record<string, string>): {
  headers: Record<string, string>;
  body: string;
} {
  return {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  };
}

const codeRow = (overrides: Record<string, unknown> = {}) => ({
  code_hash: 'irrelevant-consumed-by-stub',
  connection_id: 'ocn_1',
  client_id: 'oac_client_1',
  redirect_uri: 'https://client.example/callback',
  code_challenge: CODE_CHALLENGE,
  code_challenge_method: 'S256',
  resource: RESOURCE,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  consumed_at: null,
  ...overrides,
});

const activeConnection = {
  connection_id: 'ocn_1',
  user_id: 'usr_1',
  client_id: 'oac_client_1',
  approved_scope: 'read',
  allow_shell: false,
  allow_web: false,
  status: 'active',
  created_at: new Date().toISOString(),
  revoked_at: null,
};

describe('oauth token/metadata/register routes through testDinner (no server, no database)', () => {
  it('GET /.well-known/oauth-protected-resource returns the resource metadata', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } }).build();
    const response = await env.request({
      method: 'GET',
      path: '/.well-known/oauth-protected-resource',
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      resource: RESOURCE,
      authorization_servers: ['https://mcp-dev.kazibee.com'],
      bearer_methods_supported: ['header'],
    });
    expect(payload.scopes_supported).toContain('kazibee:read');
  }));

  it('GET /.well-known/oauth-authorization-server advertises the code+PKCE server', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } }).build();
    const response = await env.request({
      method: 'GET',
      path: '/.well-known/oauth-authorization-server',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      issuer: 'https://mcp-dev.kazibee.com',
      authorization_endpoint: 'https://dev.kazibee.com/oauth/authorize',
      token_endpoint: 'https://mcp-dev.kazibee.com/oauth/token',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      authorization_response_iss_parameter_supported: true,
    });
  }));

  it('POST /oauth/token without grant_type is invalid_request and never reaches the repo', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'consumeCode', control.never())
      .method(OAuthRepo, 'findActiveTokenWithConnection', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/token',
      ...form({ client_id: 'oac_client_1', resource: RESOURCE }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    await env.verify();
  }));

  it('POST /oauth/token with an unknown grant_type is unsupported_grant_type', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } }).build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/token',
      ...form({ grant_type: 'password', client_id: 'oac_client_1', resource: RESOURCE }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unsupported_grant_type' });
  }));

  it('authorization_code exchange mints a Bearer token pair (real PKCE, real form_body)', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'consumeCode', control.once(control.returns(Promise.resolve(codeRow()))))
      .method(OAuthRepo, 'findActiveConnectionById', control.once(
        control.returns(Promise.resolve(activeConnection)),
      ))
      // Access token + refresh token: two writes.
      .method(OAuthRepo, 'createToken', control.returns(Promise.resolve(undefined)))
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/token',
      ...form({
        grant_type: 'authorization_code',
        code: 'raw-authorization-code',
        code_verifier: CODE_VERIFIER,
        client_id: 'oac_client_1',
        redirect_uri: 'https://client.example/callback',
        resource: RESOURCE,
      }),
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'kazibee:read',
    });
    expect(typeof payload.access_token).toBe('string');
    expect(typeof payload.refresh_token).toBe('string');
    await env.verify();
  }));

  it('authorization_code exchange for the wrong client is a 401 invalid_client', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'consumeCode', control.once(
        control.returns(Promise.resolve(codeRow({ client_id: 'oac_someone_else' }))),
      ))
      .method(OAuthRepo, 'createToken', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/token',
      ...form({
        grant_type: 'authorization_code',
        code: 'raw-authorization-code',
        code_verifier: CODE_VERIFIER,
        client_id: 'oac_client_1',
        redirect_uri: 'https://client.example/callback',
        resource: RESOURCE,
      }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_client' });
    await env.verify();
  }));

  it('POST /oauth/register registers a dynamic client and echoes its metadata', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'createClient', control.once(control.returns(Promise.resolve(undefined))))
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/register',
      headers: { 'content-type': 'application/json' },
      body: {
        client_name: 'Test MCP Client',
        redirect_uris: ['https://client.example/callback', 'http://127.0.0.1/callback'],
        application_type: 'native',
      },
    });
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.client_id).toMatch(/^oac_[0-9a-f]{32}$/);
    expect(payload).toMatchObject({
      client_name: 'Test MCP Client',
      redirect_uris: ['https://client.example/callback', 'http://127.0.0.1/callback'],
    });
    await env.verify();
  }));

  it('POST /oauth/register rejects non-loopback http redirect URIs without touching the repo', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'createClient', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/register',
      headers: { 'content-type': 'application/json' },
      body: { redirect_uris: ['http://evil.example/callback'] },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_client_metadata' });
    await env.verify();
  }));
});
