import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site runs from any sub-path (GitHub raw CDN mirrors, Pages project sites, a zip
  // opened through any static server). Runtime asset URLs go through import.meta.env.BASE_URL (see core/Assets.js).
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    // Note: public/ must stay watched so newly added assets are served (Vite indexes public files).
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    assetsDir: 'bundle', // keep hashed JS/CSS out of the copied public/assets tree
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
});
