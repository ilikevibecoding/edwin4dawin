/**
 * Single-file build: inlines every chunk and the stylesheet into one HTML file
 * so the game can be hosted from a plain file CDN with no asset directory.
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2022',
    // Everything is already in the document; a preload of the split CSS would
    // 404 and abort the boot.
    modulePreload: false,
    outDir: 'dist-single',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
});
