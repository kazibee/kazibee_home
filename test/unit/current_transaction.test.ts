import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@noego/ioc';
import { testApp } from '@noego/app';
import { resourceCase } from '@noego/testing';
import { SqlStack } from 'sqlstack';
import { currentAppTransaction } from '../../src/server/repo/current_transaction';

describe('current application transaction inspection', () => {
  it('does not resolve a database provider when there is no transaction context', resourceCase(async () => {
    let providers = 0;
    const app = await testApp(path.resolve(__dirname, '../../noego.config.yml'))
      .select({ server: { module: ['status'] } })
      .function(SqlStack, () => { providers++; throw new Error('transaction inspection must not allocate a database'); })
      .build();
    await expect(ExecutionContext.run(app.root, () => currentAppTransaction())).resolves.toBeUndefined();
    expect(providers).toBe(0);
  }));
});
