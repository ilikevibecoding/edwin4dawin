#!/usr/bin/env node
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5173/?capture=1&quality=fast';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('console', m.text());
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 120000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('BOOT FAIL\n' + err);
  await browser.close();
  process.exit(1);
}
const views = await page.evaluate(() => window.debugAPI.listViews());
console.log('BOOT OK views=', views.join(','));
await browser.close();
