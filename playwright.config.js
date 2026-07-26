// Playwright configuration for the Northstar Rescue regression matrix (Opus 4 domain).
//
// Environment notes that drive these numbers:
//  * Rendering goes through ANGLE/SwiftShader (software WebGL2). A single frame at 1080p costs
//    tens of milliseconds and freshly compiled shader permutations can cost seconds, so timeouts
//    are far more generous than a GPU box would need.
//  * The map build takes a few seconds (nav bake ~0.2 s of that), and `advanceTime(60000)` steps
//    7200 fixed sim ticks, which is ~10 s of wall time when the machine is not contended.
//  * Specs drive time exclusively through `window.advanceTime()` once the game is in `playing`,
//    so test duration scales with CPU availability, not with wall-clock waits.
import { defineConfig, devices } from '@playwright/test';

const PORT = 5187;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['line']],
  use: {
    baseURL: BASE_URL,
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    launchOptions: {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  },
  projects: [{ name: 'chromium-swiftshader' }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `${BASE_URL}/`,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
