import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
page.on('console', (m) => console.log(`[${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message, '\n', e.stack));
page.on('requestfailed', (r) => console.log('[reqfail]', r.url(), r.failure()?.errorText));
await page.goto('http://127.0.0.1:5173/?test=1&quality=medium', { waitUntil: 'load', timeout: 120000 });
const ok = await page
  .waitForFunction('window.__READY === true', null, { timeout: Number(process.argv[2] || 60000) })
  .then(() => true)
  .catch(() => false);
console.log('READY =', ok);
console.log('modules?', await page.evaluate(() => typeof window.__GAME));
await browser.close();
