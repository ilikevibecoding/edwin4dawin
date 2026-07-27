import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    // Source maps are useful locally but quadruple the size of the distributed
    // build, so `npm run build:cdn` turns them off.
    sourcemap: process.env.NS_NO_SOURCEMAP !== '1',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // One chunk keeps the single-file bundle honest: an inline module script
        // cannot resolve a sibling chunk by URL.
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
});
