import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@noego/ioc';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
import { SqlStack, withTransaction, hasTransactionContext } from 'sqlstack';
import { testPostgres, DEFAULT_ADMIN_URL } from 'sqlstack/testing';
import Env from '../../src/server/services/env';
import IdentityRepo from '../../src/server/repo/connect_website_deployment_identity_repo';
import { currentAppTransaction } from '../../src/server/repo/current_transaction';

const schema = { version: 1, dialect: 'postgres', sql: [`
  CREATE TABLE connect_website_deployment_identity (
    singleton_key SMALLINT PRIMARY KEY CHECK (singleton_key = 1),
    website_deployment_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );
`] };

describe('current application transaction ownership', () => {
  it('marks the actual root transaction rollback-only without borrowing a sibling root transaction', resourceCase(async () => {
    const options = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };
    const first = await testPostgres(schema, options).build();
    const second = await testPostgres(schema, options).build();
    const firstEnv = new Env(); firstEnv.load({ DATABASE_URL: first.url });
    const secondEnv = new Env(); secondEnv.load({ DATABASE_URL: second.url });
    const a = await testApp('./noego.config.yml').select({ server: { module: ['connectDesktops'] } }).value(Env, firstEnv).build();
    const b = await testApp('./noego.config.yml').select({ server: { module: ['connectDesktops'] } }).value(Env, secondEnv).build();
    const stack = await a.get<SqlStack>(SqlStack);
    await b.get(SqlStack);
    const repo = await a.get<IdentityRepo>(IdentityRepo);
    const failure = new Error('rollback selected owner');
    expect(hasTransactionContext()).toBe(false);
    await expect(ExecutionContext.run(a.root, () => withTransaction(async () => {
      expect(hasTransactionContext()).toBe(true);
      await repo.createIfMissing({ website_deployment_id: 'wdp_' + 'a'.repeat(32), created_at: '2026-01-01T00:00:00Z' });
      const transaction = await currentAppTransaction();
      expect(transaction?.entry.stack).toBe(stack);
      expect(await ExecutionContext.run(b.root, () => currentAppTransaction())).toBeUndefined();
      transaction!.rollbackOnly(failure);
    }))).rejects.toBe(failure);
    expect(hasTransactionContext()).toBe(false);
    expect(await first.query('SELECT * FROM connect_website_deployment_identity')).toEqual([]);
    expect(await second.query('SELECT * FROM connect_website_deployment_identity')).toEqual([]);
  }));
});
