/**
 * Pairing API availability tests.
 *
 * Pairing routes are intentionally present but disabled until Kazi Connect
 * account and transport behavior is decided.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { cleanupTestApp, getTestApp, type TestAppResult } from '../../helpers/test-app';

describe('Pairing Controller', () => {
  let testApp: TestAppResult;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    testApp = await getTestApp();
    agent = testApp.agent;
  });

  afterAll(async () => {
    await cleanupTestApp(testApp);
  });

  it.each([
    ['POST', '/v1/pair/register'],
    ['POST', '/v1/pair/claim'],
    ['GET', '/v1/devices'],
  ] as const)('keeps %s %s disabled', async (method, path) => {
    const response = method === 'POST'
      ? await agent.post(path).send({})
      : await agent.get(path);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: true,
      message: 'Pairing service is currently disabled',
    });
  });
});
