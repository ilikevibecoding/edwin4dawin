import { defineConfig, devices } from '@playwright/test';

/**
 * Northstar Rescue automation config.
 *
 * Headless Chromium has no GPU, so we force ANGLE's SwiftShader software
 * rasteriser. That gives us a real WebGL2 context (identical code path to a
 * GPU machine) at a lower frame rate, which is fine because every timing
 * sensitive test drives the simulation through `window.advanceTime()`.
 */
const CHROMIUM_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--disable-dev-shm-usage',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'artifacts/playwright-report' }]],
  outputDir: 'artifacts/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    launchOptions: { args: CHROMIUM_ARGS },
  },
  projects: [
    {
      name: 'chromium-1080p',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
