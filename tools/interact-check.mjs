#!/usr/bin/env node
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:5173/?capture=1&quality=fast';
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
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 120000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error(err);
  process.exit(1);
}

await page.evaluate(() => window.debugAPI.resume());
const before = await page.evaluate(() => document.getElementById('status')?.textContent || '');
await page.evaluate(() => window.debugAPI.fire('lights'));
await page.waitForTimeout(200);
const lights = await page.evaluate(() => document.getElementById('status')?.textContent || '');
await page.evaluate(() => window.debugAPI.fire('hood'));
await page.waitForTimeout(500);
const hood = await page.evaluate(() => document.getElementById('status')?.textContent || '');
await page.evaluate(() => window.debugAPI.fire('door'));
await page.waitForTimeout(600);
const door = await page.evaluate(() => document.getElementById('status')?.textContent || '');
const fadeOn = await page.evaluate(() => document.getElementById('fade')?.classList.contains('on'));

console.log(JSON.stringify({ before, lights, hood, door, fadeOn }, null, 2));
const ok = /light/i.test(lights) && /engine|trail/i.test(hood) && /seat|dirt|climb/i.test(door);
await browser.close();
if (!ok) {
  console.error('INTERACT FAIL');
  process.exit(1);
}
console.log('INTERACT OK');
