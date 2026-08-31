/**
 * Proof of concept: NoEgo canonical testing (testDinner + @noego/testing)
 * against real kazibee production source.
 *
 * Compare with test/integration/api/status.test.ts, which proves the same
 * behavior by booting a listening HTTP server (serve()), a migrated test
 * database, supertest, resetContainer(), and process-global SQLStack
 * resolver/default switching — forcing the whole suite into a single
 * sequential fork.
 *
 * Here: the REAL production status module source (src/server/openapi/
 * status/status.yaml), the REAL controller → logic → service → repo IoC
 * graph, executed in-process. No listener, no database, no global state —
 * parallel-safe by construction. Only the SQL boundary is replaced, and
 * only in the one test whose claim stops above SQL.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { testDinner } from '@noego/dinner/testing';
import { test as control } from '@noego/testing';
import StatusController from '../../../src/server/controller/status.controller';
import StatusLogic from '../../../src/server/logic/status.logic';
import { GUEST_ACTOR, createActor } from '../../../src/server/types/actor';
import { ForbiddenError } from '../../../src/server/errors/domain_errors';
import StatusRepo from '../../../src/server/repo/status_repo';

// Real production source — the same document production stitching includes.
const statusSource = parseYaml(
  readFileSync(path.resolve(__dirname, '../../../src/server/openapi/status/status.yaml'), 'utf8')
) as Record<string, unknown>;

const base = () =>
  testDinner(statusSource)
    .select({ module: 'status' })
    .controllers({ 'status.controller': StatusController })
    // Legacy {req,res} controllers: compat hooks with default real-IoC
    // construction (per-request child scope, disposed after the request).
    .hooks({});

describe('status routes through testDinner (no server, no database)', () => {
  it('GET /api/status returns OK through the real controller/logic/service graph', async () => {
    const env = await base().build();
    const response = await env.dinner.request({ method: 'GET', path: '/api/status' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type') ?? '').toMatch(/application\/json/);
    expect(await response.json()).toEqual({ status: 'OK' });
    await env.dispose();
  });

  it('GET /api/status/deep is forbidden for guests — real authorization, zero database', async () => {
    const env = await base().build();
    const response = await env.dinner.request({ method: 'GET', path: '/api/status/deep' });
    expect(response.status).toBe(403);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ error: true });
    expect(body).toHaveProperty('message');
    await env.dispose();
  });

  it('admin deep status reports connected when the SQL boundary reports 1', async () => {
    const env = await base()
      .methods([
        [StatusRepo, {
          checkDatabase: control.once(control.returns(Promise.resolve({ result: 1 }))),
        }],
      ])
      .build();
    // Logic-depth surface for the admin branch (auth middleware owns req.user
    // in production; the authorization rule itself lives in StatusLogic).
    const logic = await env.get<StatusLogic>(StatusLogic);
    const result = await logic.getDatabaseStatus(createActor({ id: 1, role: 'admin' }));
    expect(result).toEqual({ status: 'OK', database: 'connected' });
    await env.verify();
    await env.dispose();
  });

  it('guest actors cannot reach the database status at all', async () => {
    const env = await base()
      .methods([
        [StatusRepo, {
          checkDatabase: control.never(),
        }],
      ])
      .build();
    const logic = await env.get<StatusLogic>(StatusLogic);
    await expect(logic.getDatabaseStatus(GUEST_ACTOR)).rejects.toThrow(ForbiddenError);
    await env.verify();
    await env.dispose();
  });

  it('database failures degrade to a structured ERROR payload', async () => {
    const env = await base()
      .methods([
        [StatusRepo, {
          checkDatabase: control.once(control.throws(new Error('connection refused'))),
        }],
      ])
      .build();
    const logic = await env.get<StatusLogic>(StatusLogic);
    const result = await logic.getDatabaseStatus(createActor({ id: 1, role: 'admin' }));
    expect(result).toMatchObject({ status: 'ERROR', database: 'disconnected' });
    await env.verify();
    await env.dispose();
  });
});
