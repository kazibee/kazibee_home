import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase, test as control } from '@noego/testing';
import { describe, expect, it, vi } from 'vitest';
import ConnectAgentSessionService from '../../../src/server/services/connect_agent_session_service';
import Env from '../../../src/server/services/env';

const CONFIG = path.resolve(__dirname, '../../../apps/agent/noego.config.yml');

describe('Web Agent shell delivery', () => {
  it('does not inherit static-asset caching for authenticated HTML', resourceCase(async () => {
    const fetchAsset = vi.fn(async (_request: Request) => new Response('<html>current build</html>', {
      headers: { 'cache-control': 'public, max-age=3600', etag: '"build"' },
    }));
    const app = await testApp(CONFIG).select({ server: { module: ['agent'] } })
      .method(ConnectAgentSessionService, 'authenticate', control.once(control.returns({ user_id: 'test' })))
      .function(Env, () => {
        const env = new Env(); env.load({ ASSETS: { fetch: fetchAsset } }); return env;
      }).build();
    const response = await app.request({ method: 'GET', path: 'https://agent-dev.kazibee.com/' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    const policy = response.headers.get('content-security-policy')!;
    const scripts = policy.split(';').find(directive => directive.trim().startsWith('script-src'))!;
    expect(scripts).toContain("'wasm-unsafe-eval'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(await response.text()).toBe('<html>current build</html>');
    // Original request holders are populated by App, not a replacement RawRequest.
    expect(fetchAsset).toHaveBeenCalledTimes(1);
    expect(fetchAsset.mock.calls[0][0].url).toBe('https://agent-dev.kazibee.com/index.html');
  }));

  it('still requires authentication for the shell and renderer assets', resourceCase(async () => {
    const fetchAsset = vi.fn(async () => new Response('must not be served'));
    const app = await testApp(CONFIG).select({ server: { module: ['agent'] } })
      .method(ConnectAgentSessionService, 'authenticate', control.times(2, control.returns(null)))
      .function(Env, () => {
        const env = new Env(); env.load({ ASSETS: { fetch: fetchAsset } }); return env;
      }).build();
    for (const url of ['/', '/assets/main-example.js']) {
      const response = await app.request({ method: 'GET', path: 'https://agent-dev.kazibee.com' + url });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('https://dev.kazibee.com/connect');
      await response.body?.cancel();
    }
    expect(fetchAsset).not.toHaveBeenCalled();
  }));
});
