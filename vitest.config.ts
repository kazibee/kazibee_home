import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/ui/**', 'node_modules', 'dist'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    singleFork: true, // Run tests sequentially in a single process for database isolation
    // Resolve aliases for ESM imports
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
