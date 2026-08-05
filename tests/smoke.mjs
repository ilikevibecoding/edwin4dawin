// Quick standalone smoke check (not a Playwright test): boots the page,
// captures console errors, reports game state. Run: node tests/smoke.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message + '\n' + (err.stack ?? '')));
try {
  await page.goto('http://127.0.0.1:5173/?manual=1&mute=1&seed=7', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 25000 });
  const s = await page.evaluate(() => window.__game.getState());
  console.log('STATE:', JSON.stringify({ phase: s.phase, batteries: s.batteries, drawCalls: s.drawCalls, triangles: s.triangles }));
  // try starting a scenario + advancing
  await page.evaluate(() => window.__game.start('single', 'day'));
  await page.evaluate(() => window.__game.advance(8));
  const s2 = await page.evaluate(() => window.__game.getState());
  console.log('AFTER 8s:', JSON.stringify({ phase: s2.phase, threats: s2.threats.length, tracks: s2.tracks }));
  await page.screenshot({ path: 'shots/smoke.png' });
} catch (e) {
  console.error('SMOKE FAILED:', e.message);
}
console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
