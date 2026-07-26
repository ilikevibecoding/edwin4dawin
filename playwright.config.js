import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 * Owner: Opus 4.
 *
 * The suite drives the real game client at 1920×1080 in Chromium with WebGL
 * enabled (SwiftShader in CI). Every spec asserts on both the rendered frame
 * (screenshots) and `render_game_to_text()` so the two can never silently
 * disagree.
 */

const CHROME_FLAGS = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=3072',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
];

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  timeout: 600_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'test-results/html', open: 'never' }]],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    // Gameplay specs run at 720p because CI has no GPU: SwiftShader needs tens
    // of seconds per 1080p frame. The resolution spec overrides this to 1920x1080
    // so the 1080p requirement is still verified for real.
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    launchOptions: { args: CHROME_FLAGS },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, launchOptions: { args: CHROME_FLAGS } },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
