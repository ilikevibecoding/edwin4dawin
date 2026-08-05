import { defineConfig } from '@playwright/test';

// Headless Chromium in CI/cloud has no real GPU, so we force ANGLE/SwiftShader.
// The game detects the software rasterizer and drops to its "low" quality tier.
const GL_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--disable-frame-rate-limit',
  '--hide-scrollbars',
  '--mute-audio'
];

export default defineConfig({
  testDir: './tests',
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    launchOptions: { args: GL_ARGS }
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
