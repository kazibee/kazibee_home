/**
 * OAuth registration/token negative edges through root testApp over the
 * original MCP satellite configuration (apps/mcp/noego.config.yml; no
 * server, no database). Extends oauth.testdinner.test.ts with the remaining
 * registration-metadata arms and the OAuthFlowService PKCE-method guard.
 * Historical case names remain stable; resourceCase owns cleanup.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
import OAuthClientService from '../../../src/server/services/oauth_client_service';
import OAuthFlowService from '../../../src/server/services/oauth_flow_service';
import OAuthRepo from '../../../src/server/repo/oauth_repo';

const CONFIG = path.resolve(__dirname, '../../../apps/mcp/noego.config.yml');

describe('oauth registration negative metadata arms', () => {
  it('rejects a redirect_uris list containing a non-string entry (service depth)', resourceCase(async () => {
    // The OpenAPI schema already rejects this shape at the HTTP boundary, so
    // the service-level guard is exercised directly.
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'createClient', control.never())
      .build();
    const clients = await env.get<OAuthClientService>(OAuthClientService);
    const result = await clients.registerClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redirect_uris: ['https://client.example/callback', 42] as any,
    });
    expect(result).toEqual({ ok: false, error: 'invalid_client_metadata' });
    await env.verify();
  }));

  it('rejects an unparseable redirect URI string', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'createClient', control.never())
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/register',
      headers: { 'content-type': 'application/json' },
      body: { redirect_uris: ['%% not a uri %%'] },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_client_metadata' });
    await env.verify();
  }));

  it('registers a client without a client_name (stored name is null)', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'createClient', control.once(control.returns(Promise.resolve(undefined))))
      .build();
    const response = await env.request({
      method: 'POST',
      path: '/oauth/register',
      headers: { 'content-type': 'application/json' },
      body: { redirect_uris: ['https://client.example/callback'] },
    });
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.client_id).toMatch(/^oac_[0-9a-f]{32}$/);
    expect(payload.redirect_uris).toEqual(['https://client.example/callback']);
    await env.verify();
  }));
});

describe('OAuthFlowService PKCE method guard', () => {
  it('createAuthorizationCode refuses any method other than S256', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['oauth'] } })
      .method(OAuthRepo, 'createCode', control.never())
      .build();
    const service = await env.get<OAuthFlowService>(OAuthFlowService);
    await expect(service.createAuthorizationCode({
      connectionId: 'ocn_1',
      clientId: 'oac_client_1',
      redirectUri: 'https://client.example/callback',
      codeChallenge: 'a'.repeat(43),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      codeChallengeMethod: 'plain' as any,
      resource: 'https://mcp-dev.kazibee.com/mcp',
    })).rejects.toThrow(RangeError);
    await env.verify();
  }));
});
