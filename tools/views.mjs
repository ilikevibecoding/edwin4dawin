/**
 * Multi-view capture in a single browser session.
 *
 * Booting the app and warming the shaders costs far more than a frame, so a
 * batch of viewpoints in one session is much faster than repeated `look.mjs`
 * runs. Views are given as `name:x,z:lookX,lookY,lookZ`.
 *
 *   node tools/views.mjs --cond day \
 *     vg-front:-52,-52:-62,4,-38  vg-side:-74,-30:-62,4,-38
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const cond = opt('--cond', 'day');
const scen = opt('--scen', 'single');
const settle = Number(opt('--t', '2'));
const views = args.filter((a) => a.includes(':') && !a.startsWith('--'));

fs.mkdirSync('captures', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([c, s]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.setScenario(s);
}, [cond, scen]);
await page.evaluate((sec) => window.__GAME.advance(sec, 1000 / 60, false), settle);

for (const spec of views) {
  const [name, at, look] = spec.split(':');
  const [x, z] = at.split(',').map(Number);
  await page.evaluate(([px, pz]) => window.__GAME.teleport(px, pz, 0, 0), [x, z]);
  if (look) {
    const [lx, ly, lz] = look.split(',').map(Number);
    await page.evaluate(([a, b, c]) => window.__GAME.lookAt(a, b, c), [lx, ly, lz]);
  }
  await page.evaluate(() => window.__GAME.advance(0.2, 1000 / 60, true));
  await page.screenshot({ path: `captures/${name}.png` });
  console.log('captures/' + name + '.png');
}
await browser.close();
