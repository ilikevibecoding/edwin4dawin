import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 4096,
    codeSplitting: {
      groups: [
        { name: 'three', test: /node_modules[\\/]three[\\/]/ },
        { name: 'rapier', test: /node_modules[\\/]@dimforge[\\/]/ },
      ],
    },
  },
});
