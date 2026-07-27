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
    outDir: process.env.NS_OUTDIR || 'dist',
    emptyOutDir: true,
    // Source maps are useful locally but quadruple the size of the distributed
    // build, so `npm run build:cdn` turns them off.
    sourcemap: process.env.NS_NO_SOURCEMAP !== '1',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Chromium will not run module scripts inside an XML document
        // (crbug.com/717643), and `application/xhtml+xml` is the only content
        // type a pure CDN serves renderable. So the CDN twin is built as a
        // classic IIFE; the normal build stays an ES module.
        format: process.env.NS_FORMAT === 'iife' ? 'iife' : 'es',
        // One chunk keeps the single-file bundle honest: an inline script
        // cannot resolve a sibling chunk by URL.
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
});
