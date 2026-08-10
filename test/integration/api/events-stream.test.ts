/**
 * Relay event stream API availability tests.
 *
 * SSE transport is intentionally disabled until Kazi Connect decisions are
 * made. The route remains mounted so clients receive an explicit response.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { cleanupTestApp, getTestApp, type TestAppResult } from '../../helpers/test-app';

describe('Events Stream Controller', () => {
  let testApp: TestAppResult;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    testApp = await getTestApp();
    agent = testApp.agent;
  });

  afterAll(async () => {
    await cleanupTestApp(testApp);
  });

  it('keeps GET /v1/events disabled', async () => {
    const response = await agent.get('/v1/events');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: true,
      message: 'Relay service is currently disabled',
    });
  });
});
