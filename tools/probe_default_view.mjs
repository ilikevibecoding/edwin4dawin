// Measure draw calls at the untouched default spawn view.
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4174';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); });
await page.evaluate(([f, d]) => window.__game.step(f, d), [8, 33.34]);
console.log('default view:', JSON.stringify(await page.evaluate(() => window.__game.perf())));
await browser.close();
