import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--disable-gpu-vsync',
        '--mute-audio',
        '--js-flags=--max-old-space-size=4096',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
