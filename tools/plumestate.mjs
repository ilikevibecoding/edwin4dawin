/**
 * TEMP DEBUG: dump where the launch plume particles actually are.
 *
 * Fast: no screenshots, so it runs in seconds instead of minutes.
 *
 *   node tools/plumestate.mjs --bat sentinel
 */

import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const bat = opt('--bat', 'sentinel');
const seed = Number(opt('--seed', '4242'));

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(180000);
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([b, sd]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setScenario('single');
  window.__GAME.selectBattery(b);
  window.__GAME.start(sd);
}, [bat, seed]);

await page.evaluate(() => window.__GAME.advance(16, 1000 / 60, false));
await page.evaluate((b) => window.__GAME.autoEngage(b), bat);
for (let i = 0; i < 20; i++) {
  const s = await page.evaluate(() => window.__GAME.snapshot());
  if (s.batteries?.find((x) => x.id === bat)?.state === 'ready') break;
  await page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false));
}
await page.evaluate(() => window.__GAME.teleport(7, 40, 0, 0.12));
await page.evaluate(() => window.__GAME.authorize());
for (const dt of [0.25, 0.75, 2.0, 3.0]) {
  await page.evaluate((t) => window.__GAME.advance(t, 1000 / 60, false), dt);
  const t = await page.evaluate(() => window.__GAME.snapshot().clock);
  for (const which of ['smoke', 'dust']) {
    const d = await page.evaluate((w) => window.__GAME.particleDebug(w), which);
    console.log(`t=${t} ${which}`, JSON.stringify(d));
  }
}

// Render the frozen frame with nothing but the smoke column, then with the
// smoke hidden too, so the difference is unambiguous.
for (const l of ['dust', 'hot', 'sparks', 'trails', 'glares', 'fire', 'shock']) {
  await page.evaluate(([n]) => window.__GAME.fxLayer(n, false), [l]);
}
await page.evaluate(() => window.__GAME.renderOnce());
await page.screenshot({ path: 'captures/ps-only-smoke.png' });
await page.evaluate(() => window.__GAME.fxLayer('smoke', false));
await page.evaluate(() => window.__GAME.renderOnce());
await page.screenshot({ path: 'captures/ps-no-fx.png' });
console.log('captures/ps-only-smoke.png captures/ps-no-fx.png');
await browser.close();
