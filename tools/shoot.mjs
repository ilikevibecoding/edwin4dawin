/**
 * Engagement capture.
 *
 * Runs a real engagement and grabs frames at named moments, all in one browser
 * session. Used to judge launcher animation, plume, contrail and intercept
 * readability without paying the boot cost per frame.
 *
 *   node tools/shoot.mjs --bat vanguard --cond day --prefix eng \
 *     --at -50,-26 --acquire 20
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const has = (f) => args.includes(f);

const bat = opt('--bat', 'vanguard');
const cond = opt('--cond', 'day');
const scen = opt('--scen', 'single');
const prefix = opt('--prefix', 'eng');
const seed = Number(opt('--seed', '4242'));
const acquire = Number(opt('--acquire', '18'));
const at = opt('--at', '7,40').split(',').map(Number);

fs.mkdirSync('captures', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

const shot = async (name) => {
  await page.evaluate(() => window.__GAME.advance(0.02, 1000 / 60, true));
  await page.screenshot({ path: `captures/${prefix}-${name}.png` });
  console.log(`captures/${prefix}-${name}.png`);
};

await page.evaluate(([c, s, b, sd]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.setScenario(s);
  window.__GAME.selectBattery(b);
  window.__GAME.start(sd);
}, [cond, scen, bat, seed]);

await page.evaluate(([x, z]) => window.__GAME.teleport(x, z, 0, 0.15), at);
await page.evaluate((t) => window.__GAME.advance(t, 1000 / 60, false), acquire);

// Assign and wait for the launcher to finish training and elevating.
const assigned = await page.evaluate((b) => window.__GAME.autoEngage(b), bat);
if (!assigned) console.log('WARN: no assignment');
for (let i = 0; i < 20; i++) {
  const s = await page.evaluate(() => window.__GAME.snapshot());
  const st = s.batteries?.find((x) => x.id === bat);
  if (st && st.state === 'ready') break;
  await page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false));
}
await page.evaluate(() => window.__GAME.lookAtSolution?.());
await shot('01-elevated');

await page.evaluate(() => window.__GAME.authorize());
await page.evaluate(() => window.__GAME.advance(0.5, 1000 / 60, false));
await shot('02-launch');
await page.evaluate(() => window.__GAME.advance(2.0, 1000 / 60, false));
await page.evaluate(() => window.__GAME.lookAtInterceptor?.());
await shot('03-climb');
await page.evaluate(() => window.__GAME.advance(5.0, 1000 / 60, false));
await page.evaluate(() => window.__GAME.lookAtInterceptor?.());
await shot('04-midcourse');

// Run to resolution; the camera ends up on the detonation point.
const res = await page.evaluate(() => window.__GAME.flyToResolution(40));
console.log('resolved at', JSON.stringify(res.killPoint), 'after', res.t, 's');
await shot('05-intercept');
await page.evaluate(() => window.__GAME.advance(2.5, 1000 / 60, false));
await shot('06-aftermath');

const snap = await page.evaluate(() => window.__GAME.snapshot());
console.log('result:', snap.lastResult, '| stats:', JSON.stringify(snap.stats));
if (has('--keep')) await new Promise((r) => setTimeout(r, 2000));
await browser.close();
