/**
 * Messages API Tests — New Relay Protocol
 *
 * Tests message sending per spec section 7.3:
 * - Send, persist, ack
 * - Idempotency via requestId
 * - Target validation
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

/**
 * Helper: register a desktop, pair a mobile, create sessions for both.
 */
async function setupPairedDevices(agent: ReturnType<typeof request.agent>) {
  // Register desktop
  const regRes = await agent.post('/v1/pair/register').send({ deviceName: 'Desktop', deviceType: 'desktop' });
  const desktop = regRes.body;

  // Claim from mobile
  const claimRes = await agent.post('/v1/pair/claim').send({ pairingCode: desktop.pairingCode, deviceName: 'Phone', deviceType: 'phone' });
  const mobile = claimRes.body;

  // Create desktop session
  const desktopSession = await agent
    .post('/v1/sessions')
    .set('Authorization', `Bearer ${desktop.authToken}`)
    .send({ deviceId: desktop.deviceId, deviceType: 'desktop' });

  // Create mobile session
  const mobileSession = await agent
    .post('/v1/sessions')
    .set('Authorization', `Bearer ${mobile.authToken}`)
    .send({ deviceId: mobile.deviceId, deviceType: 'phone' });

  return {
    desktop: { ...desktop, session: desktopSession.body },
    mobile: { ...mobile, session: mobileSession.body },
  };
}

describe('Messages Controller', () => {
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

  describe('POST /v1/messages', () => {
    it('should send a device-targeted message and return ack', async () => {
      const { desktop, mobile } = await setupPairedDevices(agent);

      const response = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
          type: 'chat.send-message',
          payload: { conversationId: 1, content: 'Hello from mobile' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accepted', true);
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('createdAt');
      expect(typeof response.body.messageId).toBe('number');
    });

    it('should send a user-targeted message', async () => {
      const { desktop } = await setupPairedDevices(agent);

      const response = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${desktop.authToken}`)
        .send({
          sessionId: desktop.session.sessionId,
          target: { kind: 'user', userId: desktop.userId },
          type: 'conversations.sync',
          payload: { conversations: [] },
        });

      expect(response.status).toBe(201);
      expect(response.body.accepted).toBe(true);
    });

    it('should return the same messageId for idempotent retry', async () => {
      const { desktop, mobile } = await setupPairedDevices(agent);

      const messageBody = {
        sessionId: mobile.session.sessionId,
        target: { kind: 'device', deviceId: desktop.deviceId },
        type: 'chat.send-message',
        requestId: 'req_idempotent_001',
        payload: { conversationId: 1, content: 'Hello' },
      };

      const res1 = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send(messageBody);

      const res2 = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send(messageBody);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.messageId).toBe(res2.body.messageId);
    });

    it('should reject duplicate requestId with different content as 409 conflict', async () => {
      const { desktop, mobile } = await setupPairedDevices(agent);

      await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
          type: 'chat.send-message',
          requestId: 'req_conflict_001',
          payload: { content: 'Original' },
        });

      const res2 = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
          type: 'different.type',
          requestId: 'req_conflict_001',
          payload: { content: 'Different' },
        });

      expect(res2.status).toBe(409);
    });

    it('should reject without bearer token', async () => {
      const response = await agent
        .post('/v1/messages')
        .send({ sessionId: 'sess_x', target: { kind: 'device', deviceId: 'dev_x' }, type: 'test' });

      expect(response.status).toBe(401);
    });

    it('should reject without sessionId', async () => {
      const { mobile } = await setupPairedDevices(agent);

      const response = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({ target: { kind: 'device', deviceId: 'dev_x' }, type: 'test' });

      expect(response.status).toBe(400);
    });

    it('should reject without type', async () => {
      const { desktop, mobile } = await setupPairedDevices(agent);

      const response = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
        });

      expect(response.status).toBe(400);
    });

    it('should assign increasing messageIds', async () => {
      const { desktop, mobile } = await setupPairedDevices(agent);

      const res1 = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
          type: 'test.msg',
          payload: { seq: 1 },
        });

      const res2 = await agent
        .post('/v1/messages')
        .set('Authorization', `Bearer ${mobile.authToken}`)
        .send({
          sessionId: mobile.session.sessionId,
          target: { kind: 'device', deviceId: desktop.deviceId },
          type: 'test.msg',
          payload: { seq: 2 },
        });

      expect(res2.body.messageId).toBeGreaterThan(res1.body.messageId);
    });
  });
});
