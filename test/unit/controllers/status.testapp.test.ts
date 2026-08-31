/**
 * testApp proof (spec 03 first slice): the product-level path.
 *
 * No source paths beyond the config, no controller or middleware bindings —
 * testApp loads the real noego.config.yml, stitches the real OpenAPI
 * documents, selects the production route, and AUTO-IMPORTS the same
 * resolved controller module production compilation uses. Compare with
 * status.testdinner.test.ts, which binds the controller by hand.
 */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { appTest } from '../../helpers/app_test';
import { test as control } from '@noego/testing';
import StatusRepo from '../../../src/server/repo/status_repo';
import ConnectAccountRepo from '../../../src/server/repo/connect_account_repo';
import { ConnectIdGenerator } from '../../../src/server/services/connect_auth_primitives';


describe('testApp over the real product config', () => {
  it('GET /api/status runs the auto-bound production controller graph', async () => {
    const app = await appTest()
      .select({ server: { route: { method: 'get', path: '/api/status' } } })
      .build();
    const response = await app.dinner.request({ method: 'GET', path: '/api/status' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'OK' });
    await app.dispose();
  });

  it('deep status: guest 403 and stubbed SQL boundary through the product path', async () => {
    const app = await appTest()
      .select({ server: { route: { method: 'get', path: '/api/status/deep' } } })
      .methods([
        [StatusRepo, {
          checkDatabase: control.never(),
        }],
      ])
      .build();
    const response = await app.dinner.request({ method: 'GET', path: '/api/status/deep' });
    expect(response.status).toBe(403);
    await app.verify();
    await app.dispose();
  });

  it('a heavier graph: connect signup resolves its full controller/logic/service chain', async () => {
    const app = await appTest()
      .select({ server: { route: { method: 'post', path: '/v1/connect/auth/signup' } } })
      // Spec 04 tuple composition binds by EXACT token identity, so the
      // auto-imported controller graph must come from the same module
      // registry as this file's imports. Node's default importer would
      // instantiate a second copy of ConnectAccountRepo/ConnectIdGenerator
      // and the stubs below would silently not apply.
      .methods([
        [ConnectAccountRepo, {
          findPasswordlessByEmail: control.once(control.returns(Promise.resolve(null))),
          createAccount: control.once(control.returns(Promise.resolve())),
        }],
        [ConnectIdGenerator, { userId: control.returns('usr_testapp01') }],
      ])
      .build();
    const response = await app.dinner.request({
      method: 'POST',
      path: '/v1/connect/auth/signup',
      body: {
        kind: 'auth.signup.request',
        protocolVersion: '1.0',
        username: 'shavyg2',
        email: 'shavyg2@gmail.com',
        password: 'a-long-password-123',
        correlationId: 'cor_testapp1',
        // The fully stitched production schema requires this (the raw
        // per-module document alone does not) — testApp proves the merged
        // contract, which is the point of the product path.
        idempotencyKey: 'idem_testapp_0000000001',
      },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ userId: 'usr_testapp01' });
    await app.verify();
    await app.dispose();
  });

  it('unknown selections fail with the available production identities', async () => {
    await expect(
      appTest()
        .select({ server: { route: { method: 'get', path: '/nope' } } })
        .build()
    ).rejects.toThrow(/available routes/);
  });
});
