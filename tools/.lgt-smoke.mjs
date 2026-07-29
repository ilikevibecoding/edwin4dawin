/**
 * Scratch smoke test. Not part of the build.
 *
 * Boots the level, poses a shot and reports shader-compile errors plus the
 * rig's own numbers. Fast enough to run between edits, unlike a capture.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const SHOT = process.env.SHOT ?? 'cafe_window';
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--window-size=480,270',
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: 480, height: 270 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 400)));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || /THREE|GLSL|shader/i.test(t)) errors.push(t.slice(0, 600));
});
await page.goto('http://127.0.0.1:5173/?capture=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });
await page.waitForFunction(
  (shot) => window.__GAME__.listShots().includes(shot),
  { timeout: 300000, polling: 250 },
  SHOT,
);

const out = await page.evaluate(async (shot) => {
  const g = window.__GAME__;
  const engine = g.engine;
  g.pose(shot);
  for (let i = 0; i < 60; i++) engine.step(1 / 60);
  const lighting = engine.get('lighting');
  return { report: lighting.debugReport(), stats: g.stats?.() ?? null };
}, SHOT);

console.log(JSON.stringify(out, null, 1));
console.log('\n--- errors ---');
console.log(errors.length ? errors.slice(0, 12).join('\n') : '(none)');
await browser.close();
