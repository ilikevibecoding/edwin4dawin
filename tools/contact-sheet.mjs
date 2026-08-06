/**
 * Shot audit.
 *
 * A full capture of the demo is hours of software rasterising, so reviewing the
 * look by watching the output is far too slow a feedback loop. Simulating a
 * frame without drawing it costs about five milliseconds, though, so the whole
 * playthrough can be walked in a couple of minutes and drawn only at intervals.
 * The result is a contact sheet: one still every few seconds of story, covering
 * every shot in the script, cheap enough to regenerate after each fix.
 *
 *   node tools/contact-sheet.mjs --every 4 --out .render/sheet
 *   node tools/contact-sheet.mjs --at 37.5,92,140 --out /tmp/checks
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './shot.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};

const OUT = arg('out', '.render/sheet');
const FPS = Number(arg('fps', 24));
const W = Number(arg('w', 960));
const H = Number(arg('h', 540));
const TIER = arg('tier', 'video');
const EVERY = Number(arg('every', 4));
const UNTIL = Number(arg('until', 700));
const AT = arg('at', '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length)
  .map(Number)
  .filter((n) => Number.isFinite(n));
const BASE = process.env.BASE_URL || 'http://localhost:5173';

fs.mkdirSync(OUT, { recursive: true });

// Story seconds at which to draw. Either an explicit list or a regular cadence.
const marks = AT.length ? AT.slice().sort((a, b) => a - b) : [];
if (!marks.length) for (let t = 1; t < UNTIL; t += EVERY) marks.push(t);

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 300)));
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning') console.log(`console.${t}:`, m.text().slice(0, 240));
});

const url = `${BASE}/index.html?render=1&tier=${TIER}&w=${W}&h=${H}&fps=${FPS}`;
console.log('loading', url);
await page.goto(url, { waitUntil: 'load', timeout: 600000 });
await page.waitForFunction('window.__ready === true', { timeout: 600000 });

const t0 = Date.now();
let frame = 0;
let shots = 0;
for (const mark of marks) {
  const target = Math.round(mark * FPS);
  while (frame < target - 1) {
    const batch = Math.min(240, target - 1 - frame);
    await page.evaluate(async (n) => { await window.__skip(n); }, batch);
    frame += batch;
  }
  await page.evaluate(async () => { await window.__step(1); });
  frame++;
  const p = await page.evaluate(() => window.__progress());
  const name = `t${String(Math.round(p.time)).padStart(3, '0')}.jpg`;
  await page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 90, optimizeForSpeed: true });
  shots++;
  console.log(`${name}  story ${p.time.toFixed(1)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
  if (p.finished) {
    console.log('story finished at', p.time.toFixed(1));
    break;
  }
}

await browser.close();
console.log(`wrote ${shots} stills to ${OUT}`);
