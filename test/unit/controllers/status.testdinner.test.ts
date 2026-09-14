/**
 * Original five status route/logic cases migrated from testDinner to root
 * testApp over the original configuration. Historical case names remain stable.
 * SQL methods are controlled only in cases whose claim stops above SQL; real
 * repository/database behavior is covered by test/application/status-repo-sql.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, resourceCase } from '@noego/testing';
import StatusLogic from '../../../src/server/logic/status.logic';
import { GUEST_ACTOR, createActor } from '../../../src/server/types/actor';
import { ForbiddenError } from '../../../src/server/errors/domain_errors';
import StatusRepo from '../../../src/server/repo/status_repo';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');

describe('status routes through testDinner (no server, no database)', () => {
  it('GET /api/status returns OK through the real controller/logic/service graph', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['status'] } }).build();
    const response = await env.request({ method: 'GET', path: '/api/status' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type') ?? '').toMatch(/application\/json/);
    expect(await response.json()).toEqual({ status: 'OK' });
  }));

  it('GET /api/status/deep is forbidden for guests — real authorization, zero database', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['status'] } }).build();
    const response = await env.request({ method: 'GET', path: '/api/status/deep' });
    expect(response.status).toBe(403);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ error: true });
    expect(body).toHaveProperty('message');
  }));

  it('admin deep status reports connected when the SQL boundary reports 1', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['status'] } })
      .method(StatusRepo, 'checkDatabase', control.once(control.returns(Promise.resolve({ result: 1 }))))
      .build();
    // Logic-depth surface for the admin branch (auth middleware owns req.user
    // in production; the authorization rule itself lives in StatusLogic).
    const logic = await env.get<StatusLogic>(StatusLogic);
    const result = await logic.getDatabaseStatus(createActor({ id: 1, role: 'admin' }));
    expect(result).toEqual({ status: 'OK', database: 'connected' });
    await env.verify();
  }));

  it('guest actors cannot reach the database status at all', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['status'] } })
      .method(StatusRepo, 'checkDatabase', control.never())
      .build();
    const logic = await env.get<StatusLogic>(StatusLogic);
    await expect(logic.getDatabaseStatus(GUEST_ACTOR)).rejects.toThrow(ForbiddenError);
    await env.verify();
  }));

  it('database failures degrade to a structured ERROR payload', resourceCase(async () => {
    const env = await testApp(CONFIG).select({ server: { module: ['status'] } })
      .method(StatusRepo, 'checkDatabase', control.once(control.throws(new Error('connection refused'))))
      .build();
    const logic = await env.get<StatusLogic>(StatusLogic);
    const result = await logic.getDatabaseStatus(createActor({ id: 1, role: 'admin' }));
    expect(result).toMatchObject({ status: 'ERROR', database: 'disconnected' });
    await env.verify();
  }));
});
