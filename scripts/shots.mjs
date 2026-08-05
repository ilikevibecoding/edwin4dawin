/**
 * Quick visual check: boots the game, drives it through a short scripted
 * engagement and writes a set of screenshots. Used during development to
 * eyeball the result without running the full Playwright suite.
 *
 *   node scripts/shots.mjs [prefix] [--sky day|sunset|night] [--scn single|saturation|nightraid]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const prefix = args.find((a) => !a.startsWith('--')) || 'dev';
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const sky = arg('sky', 'day');
const scenario = arg('scn', 'single');
const quality = arg('quality', 'low');
const outDir = arg('out', 'artifacts');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--mute-audio'
  ]
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') console.log(`[error] ${m.text()}`);
});

await page.goto(`http://127.0.0.1:4173/?test=1&quality=${quality}&seed=4242&skipintro=1`, {
  waitUntil: 'domcontentloaded'
});
await page.waitForFunction(() => !!window.__GAME, null, { timeout: 180000 });

const frames = (n = 2) =>
  page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let left = count;
        const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    n
  );

const advance = async (seconds, slice = 0.5) => {
  let left = seconds;
  while (left > 0) {
    const s = Math.min(slice, left);
    await page.evaluate((x) => window.__GAME.fastForward(x, 1 / 60), s);
    await frames(1);
    left -= s;
  }
};

const snap = async (name) => {
  await frames(2);
  const p = `${outDir}/${prefix}_${name}.png`;
  await page.screenshot({ path: p });
  console.log('shot', p, JSON.stringify(await page.evaluate(() => window.__GAME.counts())));
};

await page.evaluate((s) => window.__GAME.setSky(s), sky);
await page.evaluate((s) => window.__GAME.setScenario(s), scenario);
await advance(2.5);
await snap('01_spawn');

// Walk out to look at the batteries.
await page.evaluate(() => {
  window.__GAME.teleport(-38, 6, 0);
  window.__GAME.lookAt(-54, 6, -22);
});
await advance(1.2);
await snap('02_patriot');

await page.evaluate(() => {
  window.__GAME.teleport(32, -8, 0);
  window.__GAME.lookAt(46, 8, -30);
});
await advance(1.2);
await snap('03_thaad');

await page.evaluate(() => {
  window.__GAME.teleport(-4, -44, 0);
  window.__GAME.lookAt(-4, 12, -66);
});
await advance(1.2);
await snap('04_sentinel');

await page.evaluate(() => {
  window.__GAME.teleport(14, 22, 0);
  window.__GAME.lookAt(30, 8, 12);
});
await advance(1.2);
await snap('05_radar');

// Console.
await page.evaluate(() => window.__GAME.enterConsole());
await advance(1.5);
await snap('06_console');

// Run an engagement.
await page.evaluate(() => window.__GAME.begin());
await advance(14);
await snap('07_console_tracks');

await page.evaluate(() => window.__GAME.exitConsole());
await advance(1.5);
await page.evaluate(() => {
  window.__GAME.teleport(-8, 30, 0);
});
await advance(1);

let fired = false;
for (let i = 0; i < 60; i++) {
  const ok = await page.evaluate(() => window.__GAME.autoEngage());
  if (ok) {
    fired = true;
    break;
  }
  await advance(1);
}
console.log('autoEngage fired:', fired);
await advance(2.5);
await snap('08_launch');

await advance(4);
await snap('09_climb');

for (let i = 0; i < 40; i++) {
  await advance(1);
  const st = await page.evaluate(() => window.__GAME.state());
  if (st.stats.intercepted > 0 || st.stats.misses > 0) break;
}
await snap('10_intercept');

await advance(3);
await snap('11_after');

console.log('final:', JSON.stringify(await page.evaluate(() => window.__GAME.state())));
await browser.close();
