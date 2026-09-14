import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { getManager, type LogEntry } from '@noego/logger';
import { resourceCase } from '@noego/testing';

/**
 * Ambient log context, end to end through the real App host + Dinner:
 *   requestScope   → requestId / method / host / cfRay
 *   onRouteMatched → route (RAW pattern) / action
 *   controller     → correlationId once the envelope is parsed
 * Every kazibee log line emitted inside the request carries them without
 * any signature threading. Uses env.host.handle() — `.controller()` builds
 * instances outside a request and deliberately gets no ambient fields.
 */
describe('ambient log context on kazibee routes', () => {
  it('stamps requestId, route pattern, action, and correlationId on every log line of a request', async () => resourceCase(async () => {
    const entries: LogEntry[] = [];
    // Capture-only transport on the shared manager; it records and never
    // interferes with the console transport, so it can stay attached.
    getManager().addTransport({ log: (entry: LogEntry) => { entries.push(entry); } });
    const app = await testApp(path.resolve(__dirname, '../../noego.config.yml')).build();
    try {
      const body = {
        kind: 'auth.login.request',
        protocolVersion: '1.0',
        username: 'someone@example.com',
        password: 'correct-horse-battery-staple',
        idempotencyKey: 'idem_0123456789abcdefXYZ',
        correlationId: 'cor_logctx0123456789',
      };
      const request = new Request('https://dev.kazibee.com/v1/connect/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-ray': 'abc123def4567890-YYZ' },
        body: JSON.stringify(body),
      });
      // No database is bound: the login reaches the controller, is parsed, and
      // then fails downstream. Both outcomes (500 response or rejection) are
      // fine here — the assertions are about what was logged on the way.
      const response = await app.host.handle(request, { env: {}, waitUntil() {} }).catch(() => undefined);
      await response?.body?.cancel();
      await app.host.drain(1000).catch(() => undefined);

      const started = entries.find(entry => entry.message === 'connect.auth.started');
      expect(started, `expected a connect.auth.started line; saw ${entries.map(e => e.message).join(', ')}`).toBeDefined();
      const ctx = started!.context as Record<string, unknown>;
      expect(ctx).toMatchObject({
        route: '/v1/connect/auth/login',
        action: 'login',
        method: 'POST',
        host: 'dev.kazibee.com',
        cfRay: 'abc123def4567890-YYZ',
        outcome: 'started',
      });
      expect(typeof ctx.requestId).toBe('string');
      // Before the body is parsed there is no correlationId yet.
      expect(ctx.correlationId).toBeUndefined();

      // After parsing, every later kazibee line of THIS request carries the
      // same requestId plus the envelope's correlationId — services included.
      const later = entries.filter(entry =>
        entry !== started
        && String(entry.logger).startsWith('kazibee:')
        && (entry.context as Record<string, unknown> | undefined)?.requestId === ctx.requestId);
      expect(later.length, `expected later kazibee lines; saw ${entries.map(e => `${e.logger}:${e.message}`).join(', ')}`).toBeGreaterThan(0);
      for (const entry of later) {
        expect(entry.context, `${entry.logger} ${entry.message}`).toMatchObject({
          requestId: ctx.requestId,
          host: 'dev.kazibee.com',
          route: '/v1/connect/auth/login',
          action: 'login',
          correlationId: body.correlationId,
        });
      }
    } finally {
      await app.dispose();
    }
  })());
});
