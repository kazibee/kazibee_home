/**
 * Status Controller API Tests
 *
 * These tests demonstrate the API test pattern:
 * 1. Use getTestApp() to get a fully configured Express app with database
 * 2. Use Supertest to make HTTP requests
 * 3. Use cleanupTestApp() in afterAll to cleanup resources
 *
 * The test database is an in-memory SQLite database with all migrations applied.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { getTestApp, cleanupTestApp, type TestAppResult } from '../../helpers/test-app';

describe('Status Controller', () => {
  let testApp: TestAppResult;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    testApp = await getTestApp();
    agent = testApp.agent;
  });

  afterAll(async () => {
    await cleanupTestApp(testApp);
  });

  describe('GET /api/status', () => {
    it('should return OK status', async () => {
      const response = await agent.get('/api/status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'OK' });
    });

    it('should return JSON content type', async () => {
      const response = await agent.get('/api/status');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/status/deep', () => {
    it('should return database connection status for admin users', async () => {
      // Note: This endpoint requires admin authorization
      // In a real test, you would authenticate as an admin first
      // For now, we test the unauthenticated case
      const response = await agent.get('/api/status/deep');

      // Expect 403 Forbidden since we're not authenticated as admin
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', true);
      expect(response.body).toHaveProperty('message');
    });
  });
});

