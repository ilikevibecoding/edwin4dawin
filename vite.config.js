import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so a build can be served from any subdirectory,
  // including a raw CDN path like githack or statically.
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 2048 },
});
