import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    // Compile rune-backed `.svelte.ts` PageControllers in the same way as the app.
    svelte({ hot: false }),
  ],
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
    fileParallelism: false,
    // Resolve aliases for ESM imports
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
