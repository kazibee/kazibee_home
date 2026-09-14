/** Original StatusRepo SQL round-trip case, now using an original-config app
 * and a fresh SQLStack resource instead of a migrated template/global default. */
import { describe, expect, it } from 'vitest';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
import { testPostgres, DEFAULT_ADMIN_URL } from 'sqlstack/testing';
import StatusRepo from '../../src/server/repo/status_repo';
import Env from '../../src/server/services/env';

describe('StatusRepo', () => {
  it('checkDatabase round-trips a literal through the connection', resourceCase(async () => {
    // The health query needs no tables. This explicitly empty fixture executes
    // only a harmless literal; it does not read or apply a migration/schema template.
    const fixture = await testPostgres({
      version: 1, dialect: 'postgres', sql: ['SELECT 1;'],
    }, { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL }).build();
    const bindings = new Env(); bindings.load({ DATABASE_URL: fixture.url });
    const app = await testApp('./noego.config.yml')
      .select({ server: { path: ['/api/status'] } }).value(Env, bindings).build();
    const statusRepo = await app.get<StatusRepo>(StatusRepo);
    const result = await statusRepo.checkDatabase() as unknown as Array<{ result: number }>;
    expect(result).toEqual([{ result: 1 }]);
  }));
});
