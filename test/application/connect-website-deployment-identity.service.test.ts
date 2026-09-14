import { describe, expect, it } from 'vitest';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
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
    expect(firstId).toMatch(/^wdp_[A-Za-z0-9]{32}$/);
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
    await expect(rebuilt.get()).resolves.toBe(firstId);
    const repo = await rebuiltApp.get<ConnectWebsiteDeploymentIdentityRepo>(ConnectWebsiteDeploymentIdentityRepo);
    const rows = await repo.findSingleton();
    expect(rows).toMatchObject({ singleton_key: 1, website_deployment_id: firstId });
  }));
});
