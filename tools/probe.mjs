// Quick iteration harness: load the game headless, run a scripted sequence,
// print console errors and dump screenshots. Not part of the test suite.
//
//   node tools/probe.mjs [outdir]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || 'shots/probe';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox', '--no-sandbox', '--ignore-gpu-blocklist', '--mute-audio',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack}`));

await page.goto('http://127.0.0.1:5173/?test=1&seed=4242', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

const shot = async (name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log('shot', name);
};

const info = await page.evaluate(() => {
  const g = window.__gameInstance;
  return {
    hasGame: !!window.__GAME,
    state: window.__GAME ? window.__GAME.state() : null,
    webgl: (() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return gl ? gl.getParameter(gl.VERSION) : 'none';
    })(),
  };
});
console.log(JSON.stringify(info, null, 2).slice(0, 3000));

await shot('00-boot');

await page.evaluate(() => window.__GAME.step(60));
await shot('01-day-spawn');

await page.evaluate(() => {
  window.__GAME.configure({ condition: 'day', scenario: 'single', battery: 'thaad' });
  window.__GAME.start();
});
await page.evaluate(() => window.__GAME.step(300));
const s1 = await page.evaluate(() => window.__GAME.state());
console.log('after 5s:', JSON.stringify(s1.tracks), s1.threatsActive);
await shot('02-tracks');

await page.evaluate(() => window.__GAME.autoEngage());
await page.evaluate(() => window.__GAME.step(120));
await page.evaluate(() => window.__GAME.authorize());
await page.evaluate(() => window.__GAME.step(30));
await shot('03-launch');
await page.evaluate(() => window.__GAME.step(240));
await shot('04-flight');
await page.evaluate(() => window.__GAME.step(600));
await shot('05-later');

const s2 = await page.evaluate(() => window.__GAME.state());
console.log('final:', JSON.stringify({
  results: s2.results, threatStats: s2.threatStats, roundStats: s2.roundStats,
  draws: s2.draws, tris: s2.triangles, effects: s2.effects,
}, null, 2));

const perf = await page.evaluate(() => window.__GAME.perfProbe(8));
console.log('perf:', JSON.stringify(perf));

if (errors.length) {
  console.log('\n=== CONSOLE ISSUES ===');
  for (const e of errors.slice(0, 40)) console.log(e);
} else {
  console.log('\nno console errors');
}

await browser.close();
