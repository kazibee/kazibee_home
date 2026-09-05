import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { describe, expect, it } from 'vitest';
import ConnectAgentController from '../../../src/server/controller/connect_agent.controller';
import ConnectAgentSessionService from '../../../src/server/services/connect_agent_session_service';
import ConnectSessionAuthService from '../../../src/server/services/connect_session_auth_service';
import ConnectAuthPolicy from '../../../src/server/services/connect_auth_policy';
import Env from '../../../src/server/services/env';
import RawRequest from '../../../src/server/services/raw_request';

const source = parseYaml(readFileSync(path.resolve(__dirname,
  '../../../src/agent/openapi/agent.yaml'), 'utf8')) as Record<string, unknown>;

async function harness(authenticated: boolean) {
  return testDinner(source)
    .controllers({ 'connect_agent.controller': ConnectAgentController })
    .hooks({})
    .values([
      [ConnectAgentSessionService, { authenticate: async () => authenticated ? { user_id: 'test' } : null }],
      [ConnectSessionAuthService, {}],
      [ConnectAuthPolicy, {}],
      [RawRequest, { get: () => new Request('https://agent-dev.kazibee.com/') }],
      [Env, {
        string: () => undefined,
        get: () => ({ fetch: async () => new Response('<html>current build</html>', {
          headers: { 'cache-control': 'public, max-age=3600', 'etag': '"build"' },
        }) }),
      }],
    ])
    .build();
}

describe('Web Agent shell delivery', () => {
  it('does not inherit static-asset caching for authenticated HTML', async () => {
    const env = await harness(true);
    try {
      const response = await env.dinner.request({ method: 'GET', path: '/' });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      const policy = response.headers.get('content-security-policy')!;
      const scripts = policy.split(';').find(directive => directive.trim().startsWith('script-src'))!;
      expect(scripts).toContain("'wasm-unsafe-eval'");
      expect(scripts).not.toContain("'unsafe-eval'");
      expect(await response.text()).toBe('<html>current build</html>');
    } finally {
      await env.dispose();
    }
  });

  it('still requires authentication for the shell and renderer assets', async () => {
    const env = await harness(false);
    try {
      for (const url of ['/', '/assets/main-example.js']) {
        const response = await env.dinner.request({ method: 'GET', path: url });
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('https://dev.kazibee.com/connect');
      }
    } finally {
      await env.dispose();
    }
  });
});
