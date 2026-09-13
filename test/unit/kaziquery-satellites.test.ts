import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { KaziQueryRecordPolicy } from '../../src/server/observability/kaziquery_record';

describe('dev satellite logging wiring', () => {
  it.each(['mcp', 'agent'])('routes %s through the existing single sequence owner without ingest credentials', site => {
    const config = parse(readFileSync(new URL(`../../apps/${site}/noego.config.yml`, import.meta.url), 'utf8'));
    const environments = config.deploy.cloudflare.environments;
    expect(environments.dev.wrangler.vars).toMatchObject({
      KAZIQUERY_EXPORT_ENABLED: 'true',
      KAZIQUERY_ORIGIN: 'https://dev.kaziquery.com',
      KAZIQUERY_SITE: site,
    });
    expect(environments.dev.wrangler.durable_objects.bindings).toContainEqual({
      name: 'KAZIQUERY_EXPORT_RELAY', class_name: 'KaziQueryExportRelay', script_name: 'kazibee-dev',
    });
    expect(JSON.stringify(environments.production)).not.toContain('KAZIQUERY');
    expect(JSON.stringify(config)).not.toContain('KAZIQUERY_INGEST_KEY');
    expect(JSON.stringify(config)).not.toContain('KAZIQUERY_PRODUCER_ID');
  });

  it('retains the logger identity separately from unchanged application context', () => {
    const context = { requestId: 'request-1', outcome: 'unauthorized' };
    const record = new KaziQueryRecordPolicy().log({
      id: 'record-1', occurredAtMs: 1, producerId: 'p', sequence: 1,
      logger: 'kazibee:gateway', level: 'INFO', message: 'gateway.request.completed',
      service: 'test', environment: 'test', context,
    });
    expect(record?.attributes).toMatchObject({ logger: 'kazibee:gateway' });
    expect(record?.context).toEqual(context);
  });
});
