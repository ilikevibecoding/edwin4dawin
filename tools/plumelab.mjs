/**
 * TEMP DEBUG: freeze one launch frame and photograph it layer by layer.
 *
 * The launch plume reads as one flat cone and it is not obvious which emitter
 * owns which part of it. This holds a single paused frame and screenshots it
 * repeatedly with one effect layer hidden at a time, so the contribution of
 * each system is measurable rather than guessed at.
 *
 *   node tools/plumelab.mjs --bat sentinel --cond day --dt 1.3
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const bat = opt('--bat', 'sentinel');
const cond = opt('--cond', 'day');
const prefix = opt('--prefix', `pl-${bat}`);
const seed = Number(opt('--seed', '4242'));
const dt = Number(opt('--dt', '1.3'));
const at = opt('--at', '7,40').split(',').map(Number);
const look = opt('--look', null);
const layers = opt('--layers', 'smoke,dust,hot,sparks,trails,glares,fire,shock').split(',');

fs.mkdirSync('captures', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(240000);
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([c, b, sd]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.setScenario('single');
  window.__GAME.selectBattery(b);
  window.__GAME.start(sd);
}, [cond, bat, seed]);

await page.evaluate(([x, z]) => window.__GAME.teleport(x, z, 0, 0.12), at);
if (look) {
  const [lx, ly, lz] = look.split(',').map(Number);
  await page.evaluate(([a, b2, c2]) => window.__GAME.lookAt(a, b2, c2), [lx, ly, lz]);
}
await page.evaluate(() => window.__GAME.advance(16, 1000 / 60, false));
const assigned = await page.evaluate((b) => window.__GAME.autoEngage(b), bat);
if (!assigned) console.log('WARN: no assignment');
for (let i = 0; i < 20; i++) {
  const s = await page.evaluate(() => window.__GAME.snapshot());
  if (s.batteries?.find((x) => x.id === bat)?.state === 'ready') break;
  await page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false));
}
await page.evaluate(() => window.__GAME.authorize());
await page.evaluate((t) => window.__GAME.advance(t, 1000 / 60, false), dt);

const shot = async (name) => {
  await page.evaluate(() => window.__GAME.advance(0.0001, 1000 / 60, true));
  await page.screenshot({ path: `captures/${prefix}-${name}.png` });
  console.log(`captures/${prefix}-${name}.png`);
};

console.log('stats', JSON.stringify(await page.evaluate(() => window.__GAME.perf().particles)));
await shot('all');
for (const l of layers) {
  const ok = await page.evaluate(([n]) => window.__GAME.fxLayer(n, false), [l]);
  if (!ok) { console.log('no layer', l); continue; }
  await shot(`no-${l}`);
  await page.evaluate(([n]) => window.__GAME.fxLayer(n, true), [l]);
}
// And the inverse: only the smoke column, nothing else.
for (const l of layers.filter((x) => x !== 'smoke')) {
  await page.evaluate(([n]) => window.__GAME.fxLayer(n, false), [l]);
}
await shot('only-smoke');

await browser.close();
