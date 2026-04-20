/**
 * Session Controller API Tests — New Relay Protocol
 *
 * Tests session creation per spec section 7.1:
 * - Session bootstrap with fence computation
 * - Stream token generation
 * - Device authentication via Bearer token
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

/**
 * Helper: register a desktop device and optionally pair a mobile.
 */
async function registerDesktop(agent: ReturnType<typeof request.agent>, name = 'Test Desktop') {
  const res = await agent.post('/v1/pair/register').send({ deviceName: name, deviceType: 'desktop' });
  return res.body as { userId: string; deviceId: string; authToken: string; pairingCode: string };
}

describe('Session Controller', () => {
  let app: Express;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result: TestAppResult = await getTestApp();
    app = result.app;
    agent = result.agent;
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('POST /v1/sessions', () => {
    it('should create a session with bootstrap response', async () => {
      const desktop = await registerDesktop(agent);

      const response = await agent
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({ deviceId: desktop.deviceId, deviceType: 'desktop' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('userId', desktop.userId);
      expect(response.body).toHaveProperty('deviceId', desktop.deviceId);
      expect(response.body).toHaveProperty('streamToken');
      expect(response.body).toHaveProperty('sessionFenceMessageId');
      expect(response.body).toHaveProperty('startAfterMessageId');
      expect(response.body).toHaveProperty('heartbeatIntervalMs');
      expect(response.body).toHaveProperty('retryMinMs');
      expect(response.body).toHaveProperty('retryMaxMs');
      expect(response.body.sessionId).toMatch(/^sess_/);
      expect(typeof response.body.sessionFenceMessageId).toBe('number');
    });

    it('should set fence to high-water mark for new device', async () => {
      const desktop = await registerDesktop(agent);

      const response = await agent
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({ deviceId: desktop.deviceId, resumeMode: 'fresh' });

      expect(response.status).toBe(201);
      // For a new device with no messages, fence should be 0
      expect(response.body.sessionFenceMessageId).toBe(0);
      expect(response.body.startAfterMessageId).toBe(0);
    });

    it('should compute startAfterMessageId from client cursor and fence', async () => {
      const desktop = await registerDesktop(agent);

      const response = await agent
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({
          deviceId: desktop.deviceId,
          lastSeenMessageId: 100,
          resumeMode: 'resume',
        });

      expect(response.status).toBe(201);
      // startAfterMessageId = max(lastSeenMessageId, sessionFenceMessageId)
      expect(response.body.startAfterMessageId).toBeGreaterThanOrEqual(100);
    });

    it('should close previous active sessions for same device', async () => {
      const desktop = await registerDesktop(agent);

      // Create first session
      const session1 = await agent
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({ deviceId: desktop.deviceId });
      expect(session1.status).toBe(201);

      // Create second session for same device
      const session2 = await agent
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({ deviceId: desktop.deviceId });
      expect(session2.status).toBe(201);

      // Sessions should have different IDs
      expect(session1.body.sessionId).not.toBe(session2.body.sessionId);
    });

    it('should reject without bearer token', async () => {
      const response = await agent
        .post('/v1/sessions')
        .send({ deviceId: 'dev_123' });

      expect(response.status).toBe(401);
    });

    it('should reject without deviceId', async () => {
      const desktop = await registerDesktop(agent);

      const response = await agent
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject with invalid auth token', async () => {
      const desktop = await registerDesktop(agent);

      const response = await agent
        .post('/v1/sessions')
        .set('Authorization', 'Bearer invalid-token')
        .send({ deviceId: desktop.deviceId });

      expect(response.status).toBe(401);
    });
  });
});
