/**
 * StatusController error-mapping branches through testDinner.
 *
 * Extends status.testdinner.test.ts: the logic boundary (StatusLogic) is
 * controlled via .methods so every domain error the controller maps
 * (401/403/404/400) and the unexpected-error 500 fallback run through the
 * real HTTP surface.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import StatusController from '../../../src/server/controller/status.controller';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/server/errors/domain_errors';

const statusSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/status/status.yaml'), 'utf8')
) as Record<string, unknown>;

const base = () =>
  testDinner(statusSource)
    .select({ module: 'status' })
    .controllers({ 'status.controller': StatusController })
    .hooks({});

describe('status controller error mapping through testDinner', () => {
  it('maps each domain error from the logic layer to its HTTP status', async () => {
    const cases = [
      { error: new UnauthorizedError('Sign in first'), status: 401 },
      { error: new ForbiddenError('Admins only'), status: 403 },
      { error: new NotFoundError('No such probe'), status: 404 },
      { error: new ValidationError('Bad probe name'), status: 400 },
    ];
    for (const { error, status } of cases) {
      const env = await base()
        .methods({
          StatusLogic: { getStatus: control.once(control.throws(error)) },
        })
        .build();
      const response = await env.dinner.request({ method: 'GET', path: '/api/status' });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: true, message: error.message });
      await env.verify();
      await env.dispose();
    }
  });

  it('an unexpected getStatus crash maps to a structured 500', async () => {
    const env = await base()
      .methods({
        StatusLogic: { getStatus: control.once(control.throws(new Error('kaboom'))) },
      })
      .build();
    const response = await env.dinner.request({ method: 'GET', path: '/api/status' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });

  it('an unexpected getDatabaseStatus crash maps to a structured 500', async () => {
    const env = await base()
      .methods({
        StatusLogic: {
          getDatabaseStatus: control.once(control.throws(new Error('pool exhausted'))),
        },
      })
      .build();
    const response = await env.dinner.request({ method: 'GET', path: '/api/status/deep' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: true, message: 'Internal server error' });
    await env.verify();
    await env.dispose();
  });
});
