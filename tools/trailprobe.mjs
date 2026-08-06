/**
 * Contrail probe.
 *
 * Runs a real engagement and reports, per step, how many spine points each live
 * ribbon holds and how much sky it spans. A ribbon that looks like a stub in a
 * capture is either short, faded, or drawn with a stale draw range, and the
 * numbers say which.
 *
 *   node tools/trailprobe.mjs --bat highlance
 */

import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const bat = opt('--bat', 'highlance');
const cond = opt('--cond', 'day');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(([c, b]) => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition(c);
  window.__GAME.setScenario('single');
  window.__GAME.selectBattery(b);
  window.__GAME.start(4242);
}, [cond, bat]);

await page.evaluate(() => window.__GAME.advance(16, 1000 / 60, false));
const assigned = await page.evaluate((b) => window.__GAME.autoEngage(b), bat);
console.log('assigned:', assigned);
for (let i = 0; i < 20; i++) {
  const s = await page.evaluate(() => window.__GAME.snapshot());
  if (s.batteries?.find((x) => x.id === bat)?.state === 'ready') break;
  await page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false));
}
await page.evaluate(() => window.__GAME.authorize());

console.log('  t   ribbons(count/span-km/age-s)                       interceptor');
for (let i = 0; i < 16; i++) {
  await page.evaluate(() => window.__GAME.advance(1, 1000 / 60, false));
  const row = await page.evaluate(() => {
    const g = window.__GAME;
    const fx = g.__fx ?? null;
    const d = g.trailDebug ? g.trailDebug() : null;
    return { t: g.snapshot().clock, d, snap: g.snapshot().interceptors };
  });
  if (!row.d) { console.log('no trailDebug hook'); break; }
  const ribbons = row.d.map((r) => `${r.count}/${r.span.toFixed(1)}/${r.oldest.toFixed(1)}${r.dead ? 'D' : ''}`).join(' ');
  const m = row.snap[0];
  console.log(
    `${String(row.t).padStart(5)}  ${ribbons.padEnd(50)} `
    + (m ? `alt=${Math.round(m.alt)} spd=${Math.round(m.speed)} ph=${m.phase}` : '-'),
  );
}
await browser.close();
