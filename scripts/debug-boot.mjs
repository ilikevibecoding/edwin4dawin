/**
 * Fast boot diagnostic: loads the built game in headless Chromium, prints every
 * console message and page error, and reports how long the world takes to
 * construct. Much quicker to iterate on than the full Playwright suite.
 *
 *   node scripts/debug-boot.mjs [querystring] [--shot out.png] [--wait ms]
 */
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const query = args.find((a) => !a.startsWith('--')) || 'test=1&quality=low&seed=1&skipintro=1';
const shotIdx = args.indexOf('--shot');
const shotPath = shotIdx >= 0 ? args[shotIdx + 1] : null;
const waitIdx = args.indexOf('--wait');
const waitMs = waitIdx >= 0 ? Number(args[waitIdx + 1]) : 60000;

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--mute-audio'
  ]
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

if (args.includes('--trace')) {
  await page.addInitScript(() => {
    const original = console.error;
    console.error = (...a) => original(...a, '\nSTACK:', new Error('trace').stack);
  });
}

page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.stack || e.message}`));

const t0 = Date.now();
await page.goto(`http://127.0.0.1:4173/?${query}`, { waitUntil: 'domcontentloaded' });
console.log(`domcontentloaded in ${Date.now() - t0} ms`);

try {
  await page.waitForFunction(() => !!window.__GAME, null, { timeout: waitMs });
  console.log(`__GAME ready in ${Date.now() - t0} ms`);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
  console.log('counts:', JSON.stringify(await page.evaluate(() => window.__GAME.counts())));
  console.log('state:', JSON.stringify(await page.evaluate(() => window.__GAME.state())));
} catch (err) {
  console.log(`FAILED to boot: ${err.message}`);
  console.log(
    'progress marks:',
    await page.evaluate(() => JSON.stringify(window.__BOOT_MARKS || null))
  );
}

if (shotPath) {
  await page.screenshot({ path: shotPath });
  console.log(`screenshot -> ${shotPath}`);
}

await browser.close();
