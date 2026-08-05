/**
 * Live engagement probe.
 *
 * Drives one engagement in a real browser and prints a per-second trace of the
 * threat and the round in flight. Used to diagnose cases where the in-game
 * result disagrees with the offline guidance harness.
 *
 *   node tools/probe.mjs <battery> [seed] [acquireSeconds]
 */

import { chromium } from '@playwright/test';

const battery = process.argv[2] || 'vanguard';
const seed = Number(process.argv[3] || 5001);
const acquire = Number(process.argv[4] || (battery === 'vanguard' ? 26 : 8));

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([bat, sd]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setScenario('single');
  window.__GAME.selectBattery(bat);
  window.__GAME.start(sd);
}, [battery, seed]);

const step = async (s) => page.evaluate((x) => window.__GAME.advance(x, 1000 / 60, false), s);

let snap = await step(acquire);
console.log(`t+${snap.clock}s threat`, JSON.stringify(snap.threats[0]));
const assigned = await page.evaluate((b) => window.__GAME.autoEngage(b), battery);
console.log('assign:', JSON.stringify(assigned));

for (let i = 0; i < 20; i++) {
  snap = await step(1);
  const b = snap.batteries.find((x) => x.id === battery);
  if (b.state === 'ready') break;
}
snap = await page.evaluate(() => window.__GAME.snapshot());
console.log('battery at authorize:',
  JSON.stringify(snap.batteries.find((x) => x.id === battery)));
console.log('threat at authorize:', JSON.stringify(snap.threats[0]));

const fired = await page.evaluate(() => window.__GAME.authorize());
console.log('fired:', fired);

for (let i = 0; i < 40; i++) {
  snap = await step(1);
  const m = snap.interceptors[0];
  const t = snap.threats[0];
  if (!m && !t) break;
  console.log(
    `t+${String(snap.clock).padStart(5)}  `
    + (m ? `msl age=${m.age} ${m.phase.padEnd(9)} alt=${m.alt} spd=${m.speed}`
        + ` rng=${m.range} aimAlt=${m.aimAlt} sol=${m.solTime} cut=${m.cut ? 1 : 0}`
      : 'msl --')
    + (t ? `  | tgt alt=${t.alt} rng=${t.range} tti=${t.tti}` : '  | tgt --'),
  );
  if (!m) break;
}
console.log('result:', snap.lastResult);
console.log('stats:', JSON.stringify(snap.stats));
await browser.close();
