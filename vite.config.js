import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  // NO_HMR=1 gives a reload-free server, so headless screenshot runs are not
  // interrupted when another process is editing source files.
  server: { host: '127.0.0.1', strictPort: false, hmr: !process.env.NO_HMR },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
});
