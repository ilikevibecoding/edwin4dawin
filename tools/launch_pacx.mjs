import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://127.0.0.1:5173/?test=1&seed=42');
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 40000 });
const res = await page.evaluate(() => {
  const g = window.__game;
  g.startScenario('single', 42);
  g.step(36); // threat descending into terminal window
  g.selectBattery('patriot');
  g.selectTrack();
  const okA = g.assign();
  const okF = g.authorize();
  g.step(0.9);
  g.flyCam(-30, 3, -18, -58, 22, -36);
  g.step(0.12);
  return { okA, okF, birds: g.state().birds };
});
console.log(JSON.stringify(res));
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/launch_pacx.png' });
console.log('saved shots/launch_pacx.png');
await browser.close();
