import { defineConfig } from 'vite';
import { resolve } from 'path';

const root = import.meta.dirname;

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        lab: resolve(root, 'lab.html'),
      },
    },
  },
});
