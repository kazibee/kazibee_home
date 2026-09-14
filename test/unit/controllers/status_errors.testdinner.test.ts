/** Original 3 HTTP cases migrated to root testApp and the original config.
 * Historical case names remain stable. Source routing/error handling stays real;
 * the declared method controls stop claims at the existing service/logic boundary.
 * resourceCase owns cleanup on every exit. No listening app, database, or S3 call.
 */
import { describe, it, expect } from 'vitest';

import path from 'node:path';

import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';

import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/server/errors/domain_errors';
import StatusLogic from '../../../src/server/logic/status.logic';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

describe('status controller error mapping through testDinner', () => {
  it('maps each domain error from the logic layer to its HTTP status', resourceCase(async () => {
    const cases = [
      { error: new UnauthorizedError('Sign in first'), status: 401 },
      { error: new ForbiddenError('Admins only'), status: 403 },
      { error: new NotFoundError('No such probe'), status: 404 },
      { error: new ValidationError('Bad probe name'), status: 400 },
    ];
    for (const { error, status } of cases) {
      const env = await testApp(CONFIG).select({ server: { module: ["status"] } }).method(StatusLogic, "getStatus", control.once(control.throws(error)))
        .build();
      const response = await env.request({ method: 'GET', path: '/api/status' });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: true, message: error.message });
      await env.verify();

    }
  }));

  it('an unexpected getStatus crash maps to a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["status"] } }).method(StatusLogic, "getStatus", control.once(control.throws(new Error('kaboom'))))
      .build();
    const response = await env.request({ method: 'GET', path: '/api/status' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();

  }));

  it('an unexpected getDatabaseStatus crash maps to a structured 500', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ["status"] } }).method(StatusLogic, "getDatabaseStatus", control.once(control.throws(new Error('pool exhausted'))))
      .build();
    const response = await env.request({ method: 'GET', path: '/api/status/deep' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();

  }));
});
