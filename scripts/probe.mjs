// Quick console-error probe for debugging page load issues.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text().slice(0, 500)));
page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 1000)));
await page.goto(`http://localhost:5173/?${process.argv[2] ?? 'shot=1&t=0.5'}`, { waitUntil: 'commit', timeout: 60000 });
await page.waitForTimeout(25000);
const ready = await page.evaluate(() => window.__SHOT_READY);
console.log('SHOT_READY =', ready);
await browser.close();
