// Measure page.screenshot latency on the title screen (SwiftShader diagnostics).
import { chromium } from '@playwright/test';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5184';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
let t = Date.now();
await page.goto(SERVER + '/?qa=1&test=1' + (process.env.NOTEX ? '&notex=1' : ''), { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120000 });
console.log('title ready in', Date.now() - t, 'ms');
for (let i = 0; i < 3; i++) {
  t = Date.now();
  await page.screenshot({ path: `/tmp/title-shot-${i}.png`, timeout: 240000 });
  console.log(`shot ${i}:`, Date.now() - t, 'ms');
}
await browser.close();
