import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import path from 'path';
import { serverOnlyStub } from '@noego/forge/plugins';


export default defineConfig({
  root: path.join(__dirname, 'src/ui'),
  resolve: {
    alias: {
      '$lib': path.join(__dirname, 'src/ui/lib')
    }
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
      compilerOptions: {
        dev: true,
      },
    }),
    serverOnlyStub({ include: [path.join(__dirname, 'src/server')] })
  ],
  optimizeDeps: {
    exclude: ['svelte', 'svelte/internal', 'svelte/internal/client', 'svelte/internal/disclose-version'],
  },
  server: {
    middlewareMode: 'ssr',
    ssr: true,
    allowedHosts: true,
    hmr: {},
    watch: {},
    port: 5173,
    open: false,
  },
  ssr: {
    external: [
      '@noego/forge',
      'sqlstack',
      '@noego/ioc'
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  css: {
    devSourcemap: true,
  },
});
