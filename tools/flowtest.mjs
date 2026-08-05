/**
 * Story flow test.
 *
 * Plays the whole demo at the lowest tier and a small frame size, stepping the
 * fixed clock as fast as the software renderer allows. Nothing here is meant to
 * look good — the point is to prove the script runs end to end without stalling
 * on a choice, a quick-time prompt or an investigation beat, and to report how
 * long the finished playthrough actually is.
 *
 *   node tools/flowtest.mjs [--fps 12] [--w 480] [--h 270] [--shots 12]
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './shot.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};

const FPS = Number(arg('fps', 12));
const W = Number(arg('w', 480));
const H = Number(arg('h', 270));
const SHOT_EVERY = Number(arg('shot-every', 30));
const OUT_DIR = arg('out', '.render/flow');
const MAX_STORY = Number(arg('max', 900));
const BASE = process.env.BASE_URL || 'http://localhost:5173';

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 400)));
page.on('console', (m) => {
  const type = m.type();
  if (type === 'error' || type === 'warning') {
    const text = m.text();
    if (!/favicon|404|Failed to load resource/.test(text)) console.log(`console.${type}:`, text.slice(0, 300));
  }
});

const SPEED = Number(arg('speed', 1));
await page.goto(`${BASE}/index.html?render=1&tier=low&w=${W}&h=${H}&fps=${FPS}&speed=${SPEED}`, {
  waitUntil: 'load',
  timeout: 600000,
});
await page.waitForFunction('window.__ready === true', { timeout: 600000 });
console.log('ready');

const t0 = Date.now();
let lastShotAt = -SHOT_EVERY;
let progress = { time: 0, frame: 0, finished: false };
let stalledFor = 0;
let lastTime = -1;

while (!progress.finished && progress.time < MAX_STORY) {
  await page.evaluate((n) => window.__step(n), 6);
  progress = await page.evaluate(() => window.__progress());
  if (progress.time > lastTime + 0.001) {
    lastTime = progress.time;
    stalledFor = 0;
  } else {
    stalledFor++;
    if (stalledFor > 40) {
      console.log('STALLED at story time', progress.time.toFixed(1));
      break;
    }
  }
  if (progress.time - lastShotAt >= SHOT_EVERY) {
    lastShotAt = progress.time;
    const file = path.join(OUT_DIR, `t${String(Math.round(progress.time)).padStart(4, '0')}.png`);
    await page.screenshot({ path: file });
    const wall = (Date.now() - t0) / 1000;
    console.log(`story ${progress.time.toFixed(1)}s · frame ${progress.frame} · wall ${wall.toFixed(0)}s · ${file}`);
  }
}

const cues = await page.evaluate(() => window.__cues());
fs.writeFileSync('.render/flow-cues.json', JSON.stringify(cues, null, 1));
console.log(
  `finished=${progress.finished} story=${progress.time.toFixed(1)}s frames=${progress.frame} cues=${cues.length}`
);
await browser.close();
