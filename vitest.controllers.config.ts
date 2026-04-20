import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({ hot: false }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/controllers/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
