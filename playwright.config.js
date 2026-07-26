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
];

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'test-results/html', open: 'never' }]],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1920, height: 1080 },
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
      name: 'chromium-1080p',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, launchOptions: { args: CHROME_FLAGS } },
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
