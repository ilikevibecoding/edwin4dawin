import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds the whole showcase into one self-contained `demo/index.html` so it can be
// served straight off a CDN. Nothing is loaded at runtime — every texture is drawn
// on a canvas and every mesh is built from primitives — so inlining the bundle
// leaves a file with no external references at all.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    sourcemap: false,
    outDir: 'demo',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
