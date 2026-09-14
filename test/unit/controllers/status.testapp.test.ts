/**
 * Original-config testApp cases. SQL methods are replaced; no database claim.
 * Cases retained: basic status, guest denial, signup graph, invalid selection.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { testApp } from '@noego/app';
import { test as control, testStub, resourceCase } from '@noego/testing';
import { SqlStack, SqlStackDB } from 'sqlstack';
import Env from '../../../src/server/services/env';
import StatusRepo from '../../../src/server/repo/status_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';

const CONFIG = path.resolve(__dirname, '../../../noego.config.yml');
// A reusable description, not an application constructor or a live DB fixture.
// Each build owns its own empty stack. Unexpected SQL fails instead of opening a DB.
const boundaries = testStub()
  .function(SqlStack, () => new SqlStack())
  .function(Env, () => { const env = new Env(); env.load({}); return env; });

describe('testApp over the real product config', () => {
  it('GET /api/status runs the auto-bound production controller graph', resourceCase(async scope => {
    const app = scope.environment(await testApp(CONFIG).use(boundaries)
      .select({server: {path: ['/api/status']}}).build());
    const response = await app.request({method: 'GET', path: '/api/status'});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({status: 'OK'});
    expect(() => SqlStackDB.get()).toThrow();
  }));

  it('deep status: guest 403 and stubbed SQL boundary through the product path', resourceCase(async scope => {
    const app = scope.environment(await testApp(CONFIG).use(boundaries)
      .select({server: {path: ['/api/status/deep']}})
      .method(StatusRepo, 'checkDatabase', control.never()).build());
    const response = await app.request({method: 'GET', path: '/api/status/deep'});
    expect(response.status).toBe(403);
    await response.text();
  }));

  it('a heavier graph: connect signup resolves its full controller/logic/service chain', resourceCase(async scope => {
    const app = scope.environment(await testApp(CONFIG).use(boundaries)
      .select({server: {path: ['/v1/connect/auth/signup']}})
      .method(ConnectAccountRepo, 'findPasswordlessByEmail', control.once(control.returns(Promise.resolve(null))))
      .method(ConnectAccountRepo, 'createAccount', control.once(control.returns(Promise.resolve())))
      .method(ConnectIdGenerator, 'userId', control.returns('usr_testapp01'))
      .build());
    const response = await app.request({
      method: 'POST', path: '/v1/connect/auth/signup',
      body: {
        kind: 'auth.signup.request', protocolVersion: '1.0',
        username: 'shavyg2', email: 'shavyg2@gmail.com', password: 'a-long-password-123',
        correlationId: 'cor_testapp1', idempotencyKey: 'idem_testapp_0000000001',
      },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({userId: 'usr_testapp01'});
  }));

  it('unknown selections fail with the available production identities', async () => {
    await expect(testApp(CONFIG).use(boundaries)
      .select({server: {path: ['/nope']}}).build())
      .rejects.toThrow(/unknown path "\/nope"; available: .*\/api\/status/);
  });

  it('paths outside the selected list are not routable (omitted-route control)', resourceCase(async scope => {
    const app = scope.environment(await testApp(CONFIG).use(boundaries)
      .select({server: {path: ['/api/status']}}).build());
    const outside = await app.request({method: 'GET', path: '/api/status/deep'});
    expect(outside.status).toBe(404);
    await outside.body?.cancel();
  }));
});
