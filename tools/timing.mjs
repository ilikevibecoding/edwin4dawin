/**
 * Wall-clock timing probe.
 *
 * Runs one engagement and reports how long each simulated second costs, split
 * between simulation and render, plus live particle counts. Used to find which
 * part of a scenario is responsible for a slow capture run.
 *
 *   node tools/timing.mjs [condition] [battery]
 */

import { chromium } from '@playwright/test';

const cond = process.argv[2] || 'sunset';
const bat = process.argv[3] || 'sentinel';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('crash', () => console.log('PAGE CRASHED'));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([c, b]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.setScenario('single');
  window.__GAME.selectBattery(b);
  window.__GAME.start(90210);
  window.__GAME.teleport(20, -70, 0);
}, [cond, bat]);

const time = async (label, fn) => {
  const t0 = Date.now();
  const r = await fn();
  console.log(`${label.padEnd(22)} ${String(Date.now() - t0).padStart(6)} ms`);
  return r;
};

await time('advance 9s', () => page.evaluate(() => window.__GAME.advance(9, 1000 / 60, false)));
await time('autoEngage', () => page.evaluate((b) => window.__GAME.autoEngage(b), bat));
for (let i = 0; i < 20; i++) {
  const s = await time(`ready wait ${i}`,
    () => page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false)));
  if (s.batteries.find((x) => x.id === bat).state === 'ready') break;
}
await time('authorize', () => page.evaluate(() => window.__GAME.authorize()));
for (let i = 0; i < 40; i++) {
  const s = await time(`flight ${i}`,
    () => page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false)));
  const p = await page.evaluate(() => window.__GAME.perf());
  console.log('   particles', JSON.stringify(p.particles), 'calls', p.calls);
  if (!s.interceptors.length) break;
}
await time('render', () => page.evaluate(() => window.__GAME.renderOnce()));
await time('screenshot', () => page.screenshot({ path: 'test-results/timing.png' }));
console.log('mem', JSON.stringify(await page.evaluate(() => ({
  used: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6),
  limit: Math.round((performance.memory?.jsHeapSizeLimit || 0) / 1e6),
}))));
await browser.close();
