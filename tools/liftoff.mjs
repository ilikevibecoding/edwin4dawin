/**
 * Launch sequence capture from a fixed ground vantage.
 *
 * `shoot.mjs` follows the round, which is right for judging the contrail but
 * shows nothing of the plume, the pad wash or the launcher animation. This
 * plants the camera beside the battery and holds it there through the launch.
 *
 *   node tools/liftoff.mjs --bat sentinel --cond sunset --at -70,-30 --look -52,14,-44
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const bat = opt('--bat', 'vanguard');
const cond = opt('--cond', 'day');
const prefix = opt('--prefix', `lo-${bat}`);
const seed = Number(opt('--seed', '4242'));
const at = opt('--at', '7,40').split(',').map(Number);
const look = opt('--look', null);

fs.mkdirSync('captures', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
// A close-range launch plume is heavy overdraw, and under SwiftShader one such
// frame can take the better part of a minute.
page.setDefaultTimeout(180000);
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

const shot = async (name) => {
  await page.evaluate(() => window.__GAME.advance(0.02, 1000 / 60, true));
  await page.screenshot({ path: `captures/${prefix}-${name}.png` });
  console.log(`captures/${prefix}-${name}.png`);
};

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
await shot('a-ready');
await page.evaluate(() => window.__GAME.authorize());
for (const [name, dt] of [['b-ignition', 0.22], ['c-offrail', 0.4], ['d-climb', 0.9], ['e-away', 1.6]]) {
  await page.evaluate((t) => window.__GAME.advance(t, 1000 / 60, false), dt);
  await shot(name);
}
await browser.close();
