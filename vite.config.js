import { defineConfig } from 'vite';
import { buildDefine } from './vite.build-id.js';

export default defineConfig({
  define: buildDefine(),
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
