import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Tiered test projects:
 *
 *  - unit      test/unit       parallel forks; no server, no database, no
 *                              process-global state (testDinner/testIoc envs
 *                              are fresh per build and parallel-safe).
 *  - contract  test/contract   parallel forks; pure protocol contracts.
 *  - db        test/db         parallel forks; each FILE gets its own fresh
 *                              database(s) on the disposable RAM-backed
 *                              PostgreSQL (global-pg-server.ts) via
 *                              sqlstack/testing's testPostgres. Fork-per-file
 *                              isolation makes per-file SqlStackDB
 *                              registration safe.
 *  - integration  test/integration  the legacy booted-server tier: shares a
 *                              migrated database and process-global SqlStack
 *                              state, so it stays serialized (single fork)
 *                              until those tests are modernized.
 */
export default defineConfig({
  plugins: [
    // Compile rune-backed `.svelte.ts` PageControllers in the same way as the app.
    svelte({ hot: false }),
  ],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/server/**/*.ts', 'src/middleware/**/*.ts'],
      exclude: ['src/server/openapi/**', 'src/server/types/**'],
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // Pre-existing failures must not suppress the report.
      reportOnFailure: true,
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
      {
        extends: true,
        test: {
          name: 'contract',
          include: ['test/contract/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['test/db/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          // Disposable RAM-backed server for testPostgres, plus the legacy
          // migrated-template setup the moved helper-based tests still use.
          globalSetup: ['./test/global-pg-server.ts', './test/global-setup.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          globalSetup: ['./test/global-pg-server.ts', './test/global-setup.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
    ],
    // Resolve aliases for ESM imports
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
