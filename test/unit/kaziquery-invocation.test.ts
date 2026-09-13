import { describe, expect, it, vi } from 'vitest';
import { createContainer, ExecutionContext } from '@noego/ioc';
import { getLogger } from '@noego/logger';
import { KaziQueryExport } from '../../src/server/observability/kaziquery_export';

describe('request-scoped satellite export', () => {
  it('isolates concurrent sites, drops unaudited satellite logs, and preserves the shared relay identity', async () => {
    const admitted: Record<string, any>[] = [];
    const work: Promise<unknown>[] = [];
    const idFromName = vi.fn((name: string) => name);
    const namespace = { idFromName, get: () => ({ fetch: async (request: Request) => {
      admitted.push(await request.json()); return new Response(null, { status: 202 });
    } }) };
    const roots = [createContainer(), createContainer()];
    try {
      await Promise.all(roots.map((scope, index) => ExecutionContext.run(scope, async () => {
        KaziQueryExport.attach(scope, { env: {
          KAZIQUERY_EXPORT_ENABLED: 'true', KAZIQUERY_ORIGIN: 'https://dev.kaziquery.com',
          KAZI_WEBSITE_ORIGIN: 'https://dev.kazibee.com', KAZIQUERY_SITE: index ? 'agent' : 'mcp',
          KAZIQUERY_EXPORT_RELAY: namespace,
        }, waitUntil: (promise: Promise<unknown>) => work.push(promise) });
        await Promise.resolve();
        getLogger('kazibee:unreviewed').info('secret sentinel', { credential: 'never-export' });
        getLogger('kazibee:gateway').info('gateway.request.completed', { requestId: 'request-' + index });
      })));
      await Promise.all(work);
      const events = admitted.filter(entry => entry.record.message === 'gateway.request.completed');
      expect(events).toHaveLength(2);
      expect(events.map(entry => [entry.record.attributes.site, entry.record.context.requestId]).sort())
        .toEqual([['agent', 'request-1'], ['mcp', 'request-0']]);
      expect(JSON.stringify(admitted)).not.toContain('never-export');
      expect(idFromName.mock.calls.every(([name]) => name === 'kazibee-dev-v1')).toBe(true);
    } finally { for (const root of roots) await root.dispose(); }
  });

  it.each([
    { KAZI_WEBSITE_ORIGIN: 'https://kazibee.com' },
    { KAZIQUERY_ORIGIN: 'https://kaziquery.com' },
    { KAZIQUERY_EXPORT_ENABLED: 'false' },
    { KAZIQUERY_SITE: 'unknown' },
  ])('does not export a disabled or invalid environment %j', async overrides => {
    const scope = createContainer();
    const get = vi.fn();
    try {
      await ExecutionContext.run(scope, async () => {
        KaziQueryExport.attach(scope, { env: {
          KAZIQUERY_EXPORT_ENABLED: 'true', KAZIQUERY_ORIGIN: 'https://dev.kaziquery.com',
          KAZI_WEBSITE_ORIGIN: 'https://dev.kazibee.com', KAZIQUERY_SITE: 'mcp',
          KAZIQUERY_EXPORT_RELAY: { get, idFromName: (name: string) => name }, ...overrides,
        }, waitUntil: vi.fn() });
        getLogger('kazibee:gateway').info('gateway.request.completed', { requestId: 'blocked' });
      });
      expect(get).not.toHaveBeenCalled();
    } finally { await scope.dispose(); }
  });
});
