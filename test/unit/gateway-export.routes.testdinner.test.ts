import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
import type { ExportRecord } from '../../src/server/observability/kaziquery_record';

describe('dev gateway route to durable admission', () => {
  it.each([
    { site: 'mcp', route: '/mcp', method: 'POST', body: '{"jsonrpc":"2.0","id":1,"method":"initialize"}', status: 401 },
    { site: 'mcp', route: '/mcp', method: 'POST', body: '{invalid', status: 400 },
    { site: 'mcp', route: '/.well-known/oauth-protected-resource', method: 'GET', body: undefined, status: 200 },
    { site: 'agent', route: '/v1/agent/session', method: 'GET', body: undefined, status: 426 },
  ])('$site $route produces correlated HTTP $status diagnostics', async ({ site, route, method, body, status }) => resourceCase(async () => {
    const records: ExportRecord[] = [];
    const work: Promise<unknown>[] = [];
    const app = await testApp(path.resolve(__dirname, `../../apps/${site}/noego.config.yml`)).build();
    const request = new Request(`https://${site}-dev.kazibee.com${route}`, {
      method, headers: { 'content-type': 'application/json', 'cf-ray': 'abc123def4567890-YYZ' },
      ...(body === undefined ? {} : { body }),
    });
    const response = await app.host.handle(request, {
      env: {
        KAZIQUERY_EXPORT_ENABLED: 'true', KAZIQUERY_SITE: site,
        KAZI_WEBSITE_ORIGIN: 'https://dev.kazibee.com', KAZIQUERY_ORIGIN: 'https://dev.kaziquery.com',
        KAZIQUERY_EXPORT_RELAY: {
          idFromName: (name: string) => { expect(name).toBe('kazibee-dev-v1'); return name; },
          get: () => ({ fetch: async (request: Request) => {
            const body = await request.json() as { record: ExportRecord };
            records.push(body.record);
            return new Response(null, { status: 202 });
          } }),
        },
      },
      waitUntil: promise => { work.push(promise); },
    });
    expect(response.status).toBe(status);
    await response.body?.cancel();
    await Promise.all(work);
    await app.verify();
    const events = records.filter(record => record.attributes.logger === 'kazibee:gateway');
    expect(events.map(record => record.message)).toEqual(['gateway.request.started', 'gateway.request.completed']);
    expect(events[1].context).toMatchObject({ status, site, cfRay: 'abc123def4567890-YYZ' });
    expect((events[0].context as Record<string, unknown>).requestId).toBe((events[1].context as Record<string, unknown>).requestId);
  })());
});
