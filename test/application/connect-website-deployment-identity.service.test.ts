import { describe, expect, it } from 'vitest';
import { testApp } from '@noego/app';
import { resourceCase, test as control } from '@noego/testing';
import { Result } from '@noego/trust';
import { testPostgres, DEFAULT_ADMIN_URL } from 'sqlstack/testing';
import ConnectWebsiteDeploymentIdentityRepo from '../../src/server/repo/connect_website_deployment_identity_repo';
import ConnectWebsiteDeploymentIdentityService from '../../src/server/services/connect_website_deployment_identity_service';
import Env from '../../src/server/services/env';

// Independently authored fixture DDL for the repository's three-column singleton
// contract; no production migration files, migrated templates or seed services.
const schema = { version: 1, dialect: 'postgres', sql: [`
  CREATE TABLE connect_website_deployment_identity (
    singleton_key SMALLINT PRIMARY KEY CHECK (singleton_key = 1),
    website_deployment_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );
`] };

describe('ConnectWebsiteDeploymentIdentityService', () => {
  it('mints one strict persisted singleton and reuses it in a rebuilt service', resourceCase(async () => {
    const fixture = await testPostgres(schema, {
      adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL,
    }).build();
    const env = new Env(); env.load({ DATABASE_URL: fixture.url });
    const firstApp = await testApp('./noego.config.yml')
      .select({ server: { module: ['connectDesktops', 'connectExecutors'] } })
      .value(Env, env).build();
    const first = await firstApp.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    const firstId = await first.get();
    if (!firstId.ok) throw new Error(`Deployment identity unavailable: ${firstId.error.kind}`);
    expect(firstId.value).toMatch(/^wdp_[A-Za-z0-9]{32}$/);
    await expect(first.get()).resolves.toBe(firstId);
    await firstApp.dispose();

    // Actual new root and new application connections, same outer fixture in
    // this one restart case. Closing A must not drop its borrowed database.
    const secondEnv = new Env(); secondEnv.load({ DATABASE_URL: fixture.url });
    const rebuiltApp = await testApp('./noego.config.yml')
      .select({ server: { module: ['connectDesktops', 'connectExecutors'] } })
      .value(Env, secondEnv).build();
    const rebuilt = await rebuiltApp.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    expect(rebuilt).not.toBe(first);
    await expect(rebuilt.get()).resolves.toEqual(firstId);
    const repo = await rebuiltApp.get<ConnectWebsiteDeploymentIdentityRepo>(ConnectWebsiteDeploymentIdentityRepo);
    const rows = await repo.findSingleton();
    expect(rows).toMatchObject({ ok: true, value: { singleton_key: 1, website_deployment_id: firstId.value } });
  }));

  it('does not keep a failed lookup: the next call looks up again, and its success is then reused', resourceCase(async () => {
    const row = { singleton_key: 1, website_deployment_id: `wdp_${'a'.repeat(32)}`, created_at: '2026-01-01T00:00:00.000Z' };
    const app = await testApp('./noego.config.yml')
      .select({ server: { module: ['connectDesktops', 'connectExecutors'] } })
      .method(ConnectWebsiteDeploymentIdentityRepo, 'findSingleton', control.calls([
        control.returns(Promise.resolve(Result.err({ kind: 'query_failed', cause: new Error('db down') }))),
        control.returns(Promise.resolve(Result.ok(row))),
      ]))
      .method(ConnectWebsiteDeploymentIdentityRepo, 'createIfMissing', control.never())
      .build();
    const service = await app.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);

    // Concurrent callers share the one lookup in flight, failure included.
    const [failedA, failedB] = await Promise.all([service.get(), service.get()]);
    expect(failedA).toMatchObject({ ok: false, error: { kind: 'query_failed' } });
    expect(failedB).toBe(failedA);

    const recovered = await service.get();
    expect(recovered).toMatchObject({ ok: true, value: row.website_deployment_id });
    await expect(service.get()).resolves.toBe(recovered);
    await app.verify();
  }));
});
