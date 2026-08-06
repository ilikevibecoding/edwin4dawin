/**
 * Fast single-frame capture.
 *
 * Boots the game, places the camera and takes one screenshot - about twenty
 * seconds, versus minutes for a full capture spec. Used for tight iteration on
 * a specific view.
 *
 *   node tools/look.mjs <name> --cond night --at 10,26 --look 0,3,-40 [--scen night --start --t 8]
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const args = process.argv.slice(2);
const name = args[0] || 'look';
const opt = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const has = (flag) => args.includes(flag);
const nums = (s) => s.split(',').map(Number);

const cond = opt('--cond', 'day');
const scen = opt('--scen', 'single');
const at = nums(opt('--at', '7,40'));
const look = opt('--look', null);
const yaw = Number(opt('--yaw', '0.05'));
const pitch = Number(opt('--pitch', '0'));
const t = Number(opt('--t', '2'));

fs.mkdirSync('captures', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([c, s, start]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.setScenario(s);
  if (start) window.__GAME.start(31415);
}, [cond, scen, has('--start')]);

await page.evaluate(([x, z, y, p]) => window.__GAME.teleport(x, z, y, p), [at[0], at[1], yaw, pitch]);
await page.evaluate((sec) => window.__GAME.advance(sec, 1000 / 60, false), t);
if (look) {
  const l = nums(look);
  await page.evaluate(([x, y, z]) => window.__GAME.lookAt(x, y, z), l);
}
await page.evaluate(() => window.__GAME.advance(0.2, 1000 / 60, true));
await page.screenshot({ path: `captures/${name}.png` });
console.log('captures/' + name + '.png');
await browser.close();
