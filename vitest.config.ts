import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createRequire } from 'node:module';
import { vitestCoverage } from '@noego/testing';

const require = createRequire(import.meta.url);
const coveragePreset = vitestCoverage({
  runnerVersion: require('vitest/package.json').version,
  providerVersion: require('@vitest/coverage-v8/package.json').version,
  include: ['src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,svelte}'],
});
export const coverageProvenance = coveragePreset.provenance;

/**
 * Unit/contract tests, original-config application cases, explicit native
 * lifecycle probes and Proper-only migrations have separate native lanes.
 * The retired db lane's cases moved to application/lifecycle/migrations.
 * Integration cases own fresh SQLStack fixtures; native listeners use isolated artifacts.
 */
export default defineConfig({
  envDir: false,
  plugins: [
    // Compile rune-backed `.svelte.ts` PageControllers in the same way as the app.
    svelte({ hot: false }),
  ],
  test: {
    globals: true,
    environment: 'node',
    // One module instance per @noego package regardless of whether it is a
    // published copy under node_modules or a workspace symlink: vitest would
    // otherwise inline symlinked packages (resolved outside node_modules) and
    // externalize published ones, so `instanceof` checks across them (e.g.
    // @noego/app's testStub guard against @noego/testing) see two classes.
    server: { deps: { inline: [/\/@noego\//] } },
    coverage: {
      // UI, MCP, Agent, loaders and maintained entrypoints remain accountable.
      // A project-filtered run is scoped evidence, not a full-product result.
      ...coveragePreset.options,
      reporter: [...coveragePreset.options.reporter, 'html'],
      reportsDirectory: './coverage',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'lifecycle',
          include: ['test/lifecycle/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          // Explicit native lifecycle probes own a fresh process and fixture per case.
          globalSetup: ['./test/global-pg-server.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
      {
        extends: true,
        test: {
          name: 'migrations',
          include: ['test/migrations/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          // Migration subjects only; never feed these databases into product fixtures.
          globalSetup: ['./test/global-pg-server.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
      {
        extends: true,
        test: {
          name: 'application',
          include: ['test/application/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          // Infrastructure only: each case creates its own SQLStack schema/data.
          // No migrated-template global setup or listening application server.
          globalSetup: ['./test/global-pg-server.ts'],
          pool: 'forks',
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
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
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          globalSetup: ['./test/global-pg-server.ts'],
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
