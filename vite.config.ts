import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const here = import.meta.dirname;

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      input: {
        main: resolve(here, 'index.html'),
        shots: resolve(here, 'shots.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
