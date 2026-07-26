// Quick boot verification: loads the game, waits for title, reports console errors + state.
// Usage: node tools/boot-check.js [url-suffix e.g. "?qa=1"] [script-file]
import { chromium } from '@playwright/test';

const suffix = process.argv[2] || '';
const scriptFile = process.argv[3] || null;

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push('console.error: ' + msg.text());
});

try {
  await page.goto('http://127.0.0.1:5173/' + suffix, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => window.__game && window.__game.state !== 'boot', null, { timeout: 30000 });
  const state = await page.evaluate(() => window.render_game_to_text());
  console.log('STATE:', state);
  const errs = await page.evaluate(() => window.__consoleErrors);
  console.log('CAPTURED_ERRORS:', JSON.stringify(errs, null, 1));
  console.log('PAGE_ERRORS:', JSON.stringify(pageErrors, null, 1));
  const warns = await page.evaluate(() => window.__consoleWarnings.slice(0, 12));
  console.log('WARNINGS:', JSON.stringify(warns, null, 1));
  if (scriptFile) {
    const mod = await import(process.cwd() + '/' + scriptFile);
    await mod.run(page);
  }
  await page.screenshot({ path: 'artifacts/boot.png' });
  console.log('screenshot saved: artifacts/boot.png');
} catch (e) {
  console.error('BOOT-CHECK FAILED:', e.message);
  console.log('PAGE_ERRORS:', JSON.stringify(pageErrors, null, 1));
  try { await page.screenshot({ path: 'artifacts/boot-fail.png' }); } catch {}
  process.exitCode = 1;
}
await browser.close();
