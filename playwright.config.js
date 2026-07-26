import { defineConfig } from '@playwright/test';

// ---------------------------------------------------------------------------
// Playwright configuration.  (owner: opus4)
//
// Headless WebGL comes from SwiftShader, so:
//   * ANGLE has to be pointed at the software backend explicitly,
//   * the suite runs on a single worker (software rasterisation does not share
//     a machine well, and parallel GL contexts make frame times meaningless),
//   * every timeout is generous, because a single frame can take tens of
//     milliseconds and the specs drive hundreds of simulated frames.
//
// Tests never sleep on the wall clock for simulation: they call
// `window.advanceTime(ms)`, which steps the deterministic fixed-step loop.
// ---------------------------------------------------------------------------

export const CHROMIUM_GL_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-lcd-text',
];

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    channel: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    launchOptions: {
      args: CHROMIUM_GL_ARGS,
    },
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
