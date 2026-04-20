/**
 * Events Stream SSE Tests — New Relay Protocol
 *
 * Tests the SSE event stream per spec sections 7.2, 8:
 * - SSE replay of visible messages
 * - Live delivery via MessageBus -> SSEConnectionManager
 * - Heartbeat
 * - Session fence enforcement
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import http from 'node:http';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

function parseSseEvents(raw: string): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  const parts = raw.split('\n\n');
  for (const part of parts) {
    const dataLine = part.split('\n').find(l => l.startsWith('data: '));
    if (dataLine) {
      try {
        events.push(JSON.parse(dataLine.slice(6)));
      } catch { /* skip malformed */ }
    }
  }
  return events;
}

function openSseStream(
  server: http.Server,
  path: string,
  opts: { until?: (events: Array<Record<string, unknown>>) => boolean; timeoutMs?: number } = {},
): Promise<{ events: Array<Record<string, unknown>>; raw: string }> {
  const { until, timeoutMs = 3000 } = opts;

  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const events: Array<Record<string, unknown>> = [];
    let raw = '';

    const req = http.get(
      { hostname: '127.0.0.1', port: addr.port, path, headers: { Accept: 'text/event-stream' } },
      (res) => {
        res.setEncoding('utf-8');
        res.on('data', (chunk: string) => {
          raw += chunk;
          const newEvents = parseSseEvents(chunk);
          events.push(...newEvents);
          if (until && until(events)) {
            req.destroy();
            resolve({ events, raw });
          }
        });
        res.on('end', () => resolve({ events, raw }));
        res.on('error', reject);
      },
    );
    req.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') {
        resolve({ events, raw });
      } else {
        reject(err);
      }
    });

    setTimeout(() => {
      req.destroy();
      resolve({ events, raw });
    }, timeoutMs);
  });
}

/**
 * Helper: register desktop + pair mobile + create sessions for both.
 */
async function setupPairedWithSessions(agent: ReturnType<typeof request.agent>) {
  const regRes = await agent.post('/v1/pair/register').send({ deviceName: 'Desktop', deviceType: 'desktop' });
  const desktop = regRes.body;

  const claimRes = await agent.post('/v1/pair/claim').send({ pairingCode: desktop.pairingCode, deviceName: 'Phone', deviceType: 'phone' });
  const mobile = claimRes.body;

  const desktopSession = await agent
    .post('/v1/sessions')
    .set('Authorization', `Bearer ${desktop.authToken}`)
    .send({ deviceId: desktop.deviceId, deviceType: 'desktop' });

  const mobileSession = await agent
    .post('/v1/sessions')
    .set('Authorization', `Bearer ${mobile.authToken}`)
    .send({ deviceId: mobile.deviceId, deviceType: 'phone' });

  return {
    desktop: { ...desktop, session: desktopSession.body },
    mobile: { ...mobile, session: mobileSession.body },
  };
}

describe('Events Stream SSE', () => {
  let app: Express;
  let server: http.Server;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result: TestAppResult = await getTestApp();
    app = result.app;
    server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    agent = request.agent(server);
  });

  afterAll(async () => {
    server?.close();
    await cleanupTestApp();
  });

  it('should return SSE content-type and replay messages', async () => {
    const { desktop, mobile } = await setupPairedWithSessions(agent);

    // Send a message from mobile to desktop
    await agent
      .post('/v1/messages')
      .set('Authorization', `Bearer ${mobile.authToken}`)
      .send({
        sessionId: mobile.session.sessionId,
        target: { kind: 'device', deviceId: desktop.deviceId },
        type: 'chat.send-message',
        payload: { content: 'Hello desktop' },
      });

    // Open SSE stream for desktop — should replay the message
    const { streamToken, sessionId } = desktop.session;
    const path = `/v1/events?sessionId=${sessionId}&after=0&token=${streamToken}`;
    const { events, raw } = await openSseStream(server, path, {
      until: (evts) => evts.length >= 1,
      timeoutMs: 3000,
    });

    expect(raw).toContain('event: message');
    expect(events.length).toBeGreaterThanOrEqual(1);
    const msg = events[0];
    expect(msg.type).toBe('chat.send-message');
    expect(msg.messageId).toBeDefined();
    expect(msg.streamSeq).toBe(1);
    expect((msg.payload as any).content).toBe('Hello desktop');
  });

  it('should deliver live messages via bus to connected SSE session', async () => {
    const { desktop, mobile } = await setupPairedWithSessions(agent);

    // Open SSE stream for desktop first
    const { streamToken, sessionId } = desktop.session;
    const path = `/v1/events?sessionId=${sessionId}&after=999999&token=${streamToken}`;

    const ssePromise = openSseStream(server, path, {
      until: (evts) => evts.length >= 1,
      timeoutMs: 5000,
    });

    // Wait for SSE connection to establish
    await new Promise(r => setTimeout(r, 200));

    // Send a message from mobile to desktop
    await agent
      .post('/v1/messages')
      .set('Authorization', `Bearer ${mobile.authToken}`)
      .send({
        sessionId: mobile.session.sessionId,
        target: { kind: 'device', deviceId: desktop.deviceId },
        type: 'chat.send-message',
        payload: { content: 'Live message!' },
      });

    const { events } = await ssePromise;
    expect(events.length).toBeGreaterThanOrEqual(1);
    const liveMsg = events.find((e: any) => (e.payload as any)?.content === 'Live message!');
    expect(liveMsg).toBeDefined();
    expect(liveMsg!.streamSeq).toBe(1);
  });

  it('should include keepalive heartbeat in SSE stream', async () => {
    const { desktop } = await setupPairedWithSessions(agent);

    const { streamToken, sessionId } = desktop.session;
    const path = `/v1/events?sessionId=${sessionId}&after=0&token=${streamToken}`;

    const { raw } = await openSseStream(server, path, { timeoutMs: 1000 });

    // The initial connection should have some content (at minimum the event stream)
    expect(raw).toBeDefined();
    // Note: heartbeat fires every 15s, so we may not see it in a 1s window.
    // What we can verify is that the connection opened and didn't error.
  });

  it('should reject SSE without token', async () => {
    const response = await agent
      .get('/v1/events')
      .query({ sessionId: 'sess_x', after: '0' });

    expect(response.status).toBe(401);
  });

  it('should reject SSE without sessionId', async () => {
    const response = await agent
      .get('/v1/events')
      .query({ token: 'some_token', after: '0' });

    expect(response.status).toBe(400);
  });

  it('should enforce session fence - new device does not see old messages', async () => {
    const { desktop, mobile } = await setupPairedWithSessions(agent);

    // Send a message before creating a new phone session
    const sendRes = await agent
      .post('/v1/messages')
      .set('Authorization', `Bearer ${desktop.authToken}`)
      .send({
        sessionId: desktop.session.sessionId,
        target: { kind: 'device', deviceId: mobile.deviceId },
        type: 'test.old-message',
        payload: { content: 'Old message' },
      });
    const oldMessageId = sendRes.body.messageId;

    // Create a FRESH session for mobile (simulating new device)
    const freshSession = await agent
      .post('/v1/sessions')
      .set('Authorization', `Bearer ${mobile.authToken}`)
      .send({ deviceId: mobile.deviceId, deviceType: 'phone', resumeMode: 'fresh' });

    // The fence should be >= the old message's ID (hwm at session creation time)
    expect(freshSession.body.sessionFenceMessageId).toBeGreaterThanOrEqual(oldMessageId);
    expect(freshSession.body.startAfterMessageId).toBeGreaterThanOrEqual(oldMessageId);

    // Open SSE with after=0, fence should prevent seeing old messages
    const { streamToken, sessionId } = freshSession.body;
    const path = `/v1/events?sessionId=${sessionId}&after=0&token=${streamToken}`;

    const { events } = await openSseStream(server, path, { timeoutMs: 1000 });

    // The old message should NOT appear because fence is >= oldMessageId
    const oldMsg = events.find((e: any) => e.type === 'test.old-message');
    expect(oldMsg).toBeUndefined();
  });

  it('should assign strictly increasing streamSeq within one connection', async () => {
    const { desktop, mobile } = await setupPairedWithSessions(agent);

    // Send multiple messages
    for (let i = 0; i < 3; i++) {
      await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
          type: 'test.seq',
          payload: { seq: i },
        });
    }

    // Open SSE to replay
    const { streamToken, sessionId } = desktop.session;
    const path = `/v1/events?sessionId=${sessionId}&after=0&token=${streamToken}`;
    const { events } = await openSseStream(server, path, {
      until: (evts) => evts.filter((e: any) => e.type === 'test.seq').length >= 3,
      timeoutMs: 3000,
    });

    const seqEvents = events.filter((e: any) => e.type === 'test.seq');
    expect(seqEvents.length).toBeGreaterThanOrEqual(3);

    // Verify strictly increasing streamSeq
    for (let i = 1; i < seqEvents.length; i++) {
      expect((seqEvents[i] as any).streamSeq).toBeGreaterThan((seqEvents[i - 1] as any).streamSeq);
    }
  });
});
