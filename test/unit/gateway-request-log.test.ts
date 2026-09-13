import { describe, expect, it } from 'vitest';
import { getManager, type LogRecord } from '@noego/logger';
import GatewayRequestLog from '../../src/server/observability/gateway_request_log';

const runtime = { env: { KAZIQUERY_EXPORT_ENABLED: 'true', KAZI_WEBSITE_ORIGIN: 'https://dev.kazibee.com', KAZIQUERY_SITE: 'agent' } };

describe('safe gateway request diagnostics', () => {
  it('records one start and terminal status without leaking handoff token, query, headers or body', () => {
    const records: LogRecord[] = [];
    const sub = getManager().records$.subscribe(record => { if(record.logger === 'kazibee:gateway') records.push(record); });
    try {
      const request = new Request('https://agent-dev.kazibee.com/handoff/private-sentinel?token=query-sentinel', {
        method: 'POST', headers: { authorization: 'Bearer auth-sentinel', cookie: 'cookie-sentinel', 'cf-ray': 'abc123def4567890-YYZ' },
        body: 'body-sentinel',
      });
      const subject = new GatewayRequestLog();
      subject.start(request, runtime);
      subject.finish(new Response(null, { status: 401 }));
      subject.finish(new Response(null, { status: 500 }));
      expect(records.map(record => record.message)).toEqual(['gateway.request.started', 'gateway.request.completed']);
      expect(records[0].context).toMatchObject({ site: 'agent', route: '/handoff/:token', method: 'POST', cfRay: 'abc123def4567890-YYZ' });
      expect(records[1].context).toMatchObject({ status: 401, outcome: 'rejected', responseReturned: true });
      expect((records[1].context as Record<string, unknown>).requestId).toBe((records[0].context as Record<string, unknown>).requestId);
      expect(JSON.stringify(records)).not.toContain('sentinel');
      expect(request.bodyUsed).toBe(false);
    } finally { sub.unsubscribe(); }
  });

  it('reports a thrown failure without exposing its message and does not consume streaming responses', () => {
    const records: LogRecord[] = [];
    const sub = getManager().records$.subscribe(record => { if(record.logger === 'kazibee:gateway') records.push(record); });
    try {
      const subject = new GatewayRequestLog();
      subject.start(new Request('https://mcp-dev.kazibee.com/mcp'), { env: { ...runtime.env, KAZIQUERY_SITE: 'mcp' } });
      subject.finish(undefined, new Error('database password secret-sentinel'));
      expect(records.at(-1)?.context).toMatchObject({ status: null, outcome: 'failed', responseReturned: false, errorKind: 'Error' });
      expect(JSON.stringify(records)).not.toContain('secret-sentinel');
      const response = new Response(new ReadableStream());
      const streaming = new GatewayRequestLog();
      streaming.start(new Request('https://agent-dev.kazibee.com/assets?path=/private/file'), runtime);
      streaming.finish(response);
      expect(response.bodyUsed).toBe(false);
      void response.body?.cancel();
    } finally { sub.unsubscribe(); }
  });

  it('does not log production or unrelated main-site traffic', () => {
    const records: LogRecord[] = [];
    const sub = getManager().records$.subscribe(record => { if(record.logger === 'kazibee:gateway') records.push(record); });
    try {
      for(const candidate of [
        { env: { ...runtime.env, KAZI_WEBSITE_ORIGIN: 'https://kazibee.com' } },
        { env: { ...runtime.env, KAZIQUERY_SITE: 'website' } },
      ]) {
        const subject = new GatewayRequestLog();
        subject.start(new Request('https://dev.kazibee.com/download/private'), candidate);
        subject.finish(new Response());
      }
      expect(records).toHaveLength(0);
    } finally { sub.unsubscribe(); }
  });
});
