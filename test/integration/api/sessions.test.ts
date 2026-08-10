/**
 * Relay sessions API availability tests.
 *
 * Relay transport is intentionally disabled until Kazi Connect decisions are
 * made. The route remains mounted so clients receive an explicit response.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { cleanupTestApp, getTestApp, type TestAppResult } from '../../helpers/test-app';

describe('Session Controller', () => {
  let testApp: TestAppResult;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    testApp = await getTestApp();
    agent = testApp.agent;
  });

  afterAll(async () => {
    await cleanupTestApp(testApp);
  });

  it('keeps POST /v1/sessions disabled', async () => {
    const response = await agent.post('/v1/sessions').send({});

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: true,
      message: 'Relay service is currently disabled',
    });
  });
});
