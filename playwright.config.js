import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-gpu-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--disable-dev-shm-usage',
      ],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
