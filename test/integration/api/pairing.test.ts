/**
 * Pairing Controller API Tests — New Relay Protocol
 *
 * Tests the device pairing lifecycle per spec section 12:
 * 1. Desktop registers → gets userId, deviceId, authToken, pairingCode
 * 2. Mobile claims pairing code → gets its own userId, deviceId, authToken
 * 3. GET /v1/devices lists all devices for a user
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

describe('Pairing Controller', () => {
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

  describe('POST /v1/pair/register', () => {
    it('should register a new device and return credentials per spec', async () => {
      const response = await agent
        .post('/v1/pair/register')
        .send({ deviceName: 'Test Desktop', deviceType: 'desktop' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('deviceId');
      expect(response.body).toHaveProperty('authToken');
      expect(response.body).toHaveProperty('pairingCode');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.userId).toMatch(/^user_/);
      expect(response.body.deviceId).toMatch(/^dev_/);
      expect(response.body.authToken).toMatch(/^sk_/);
      expect(response.body.pairingCode).toHaveLength(6);
    });

    it('should register a device without a name', async () => {
      const response = await agent
        .post('/v1/pair/register')
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('deviceId');
      expect(response.body).toHaveProperty('authToken');
      expect(response.body).toHaveProperty('pairingCode');
    });

    it('should generate unique device IDs for each registration', async () => {
      const res1 = await agent.post('/v1/pair/register').send({});
      const res2 = await agent.post('/v1/pair/register').send({});

      expect(res1.body.deviceId).not.toBe(res2.body.deviceId);
      expect(res1.body.userId).not.toBe(res2.body.userId);
      expect(res1.body.pairingCode).not.toBe(res2.body.pairingCode);
    });
  });

  describe('POST /v1/pair/claim', () => {
    it('should claim a valid pairing code and return mobile credentials', async () => {
      const registerRes = await agent
        .post('/v1/pair/register')
        .send({ deviceName: 'Claim Test Desktop' });

      const { pairingCode, userId: desktopUserId, deviceId: desktopDeviceId } = registerRes.body;

      const claimRes = await agent
        .post('/v1/pair/claim')
        .send({ pairingCode, deviceName: 'My iPhone', deviceType: 'phone' });

      expect(claimRes.status).toBe(200);
      expect(claimRes.body).toHaveProperty('userId', desktopUserId);
      expect(claimRes.body).toHaveProperty('deviceId');
      expect(claimRes.body).toHaveProperty('authToken');
      expect(claimRes.body).toHaveProperty('desktopDeviceId', desktopDeviceId);
      expect(claimRes.body).toHaveProperty('desktopDeviceName', 'Claim Test Desktop');
      // Mobile gets its own distinct deviceId
      expect(claimRes.body.deviceId).not.toBe(desktopDeviceId);
      expect(claimRes.body.deviceId).toMatch(/^dev_/);
      expect(claimRes.body.authToken).toMatch(/^sk_/);
    });

    it('should reject an invalid pairing code', async () => {
      const response = await agent
        .post('/v1/pair/claim')
        .send({ pairingCode: 'ZZZZZZ' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject claiming the same code twice (single-use)', async () => {
      const registerRes = await agent
        .post('/v1/pair/register')
        .send({ deviceName: 'Double Claim' });

      const { pairingCode } = registerRes.body;

      const claim1 = await agent
        .post('/v1/pair/claim')
        .send({ pairingCode });
      expect(claim1.status).toBe(200);

      const claim2 = await agent
        .post('/v1/pair/claim')
        .send({ pairingCode });
      expect(claim2.status).toBe(404);
    });

    it('should require pairingCode in body', async () => {
      const response = await agent
        .post('/v1/pair/claim')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should be case-insensitive for pairing codes', async () => {
      const registerRes = await agent
        .post('/v1/pair/register')
        .send({ deviceName: 'Case Test' });

      const { pairingCode } = registerRes.body;

      const claimRes = await agent
        .post('/v1/pair/claim')
        .send({ pairingCode: pairingCode.toLowerCase() });

      expect(claimRes.status).toBe(200);
      expect(claimRes.body).toHaveProperty('authToken');
    });
  });

  describe('GET /v1/devices', () => {
    it('should list all devices for the authenticated user', async () => {
      // Register desktop
      const registerRes = await agent
        .post('/v1/pair/register')
        .send({ deviceName: 'Work Laptop', deviceType: 'desktop' });
      const { userId, deviceId, authToken, pairingCode } = registerRes.body;

      // Claim from mobile
      const claimRes = await agent
        .post('/v1/pair/claim')
        .send({ pairingCode, deviceName: 'My Phone', deviceType: 'phone' });

      // List devices
      const devicesRes = await agent
        .get('/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Device-Id', deviceId);

      expect(devicesRes.status).toBe(200);
      expect(devicesRes.body.devices).toBeInstanceOf(Array);
      expect(devicesRes.body.devices).toHaveLength(2);

      const desktop = devicesRes.body.devices.find((d: any) => d.deviceType === 'desktop');
      const phone = devicesRes.body.devices.find((d: any) => d.deviceType === 'phone');

      expect(desktop).toBeDefined();
      expect(desktop.deviceName).toBe('Work Laptop');
      expect(desktop.isCurrentDevice).toBe(true);

      expect(phone).toBeDefined();
      expect(phone.deviceName).toBe('My Phone');
      expect(phone.isCurrentDevice).toBe(false);
    });

    it('should reject without bearer token', async () => {
      const response = await agent.get('/v1/devices');
      expect(response.status).toBe(401);
    });

    it('should reject without X-Device-Id header', async () => {
      const registerRes = await agent.post('/v1/pair/register').send({});
      const response = await agent
        .get('/v1/devices')
        .set('Authorization', `Bearer ${registerRes.body.authToken}`);
      expect(response.status).toBe(400);
    });
  });
});
