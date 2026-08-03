#!/usr/bin/env node
/**
 * Offline film render.
 *
 * The show is a pure function of its clock, so it does not have to be captured
 * in real time. This steps `App.frame(dt)` at a fixed timestep, grabs each
 * composited frame and pipes it straight into ffmpeg. The result runs at the
 * intended speed no matter how slowly the machine draws — which is the only way
 * to get an honest recording out of a box with no GPU.
 *
 *   node scripts/render-film.mjs                      # the whole show
 *   node scripts/render-film.mjs --from 78 --to 168   # one chapter
 *   node scripts/render-film.mjs --fps 24 --width 1280 --out qa/film.mp4
 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const FPS = Number(flag('fps', 30));
const WIDTH = Number(flag('width', 1280));
const HEIGHT = Math.round((WIDTH * 9) / 16);
const FROM = Number(flag('from', 0));
const TO = Number(flag('to', 0)) || null;
const QUALITY = flag('quality', 'high');
const PORT = Number(flag('port', has('preview') ? 4173 : 5173));
const OUT = path.resolve(root, flag('out', 'qa/film.mp4'));
const SHOW_HUD = has('hud');

const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].find(
  (c) => c && existsSync(c),
);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--mute-audio',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
  ],
  protocolTimeout: 600000,
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(`http://127.0.0.1:${PORT}/?qa=1&quality=${QUALITY}&autoplay=0`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForFunction('window.__STARFALL && window.__STARFALL.ready === true', {
  timeout: 600000,
});

const duration = await page.evaluate(() => window.__STARFALL.duration);
const end = Math.min(TO ?? duration, duration);
const total = Math.max(1, Math.round((end - FROM) * FPS));

// The transport is a testing affordance, not part of the picture. Subtitles and
// the chapter tag stay: they are authored elements of the show.
if (!SHOW_HUD) {
  await page.addStyleTag({ content: '.transport, .toasts, .debug { display: none !important; }' });
}

// Take exclusive control of the frame, then roll in from a little before the
// start mark so one-shot events and particle state are already correct.
await page.evaluate(
  (from, fps) => {
    const app = window.__STARFALL.app;
    app.frozen = true;
    app.show.timeline.pause();
    app.show.timeline.seek(Math.max(0, from - 2));
    app.show.timeline.play();
    const step = 1 / fps;
    for (let t = Math.max(0, from - 2); t < from; t += step) app.simulate(step);
  },
  FROM,
  FPS,
);

await mkdir(path.dirname(OUT), { recursive: true });

const ff = spawn(
  'ffmpeg',
  [
    '-y',
    '-loglevel', 'error',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '21',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

let ffError = null;
ff.stdin.on('error', (e) => (ffError = e));

const write = (buf) =>
  new Promise((resolve, reject) => {
    if (ffError) return reject(ffError);
    if (ff.stdin.write(buf)) resolve();
    else ff.stdin.once('drain', resolve);
  });

console.log(
  `rendering ${(end - FROM).toFixed(1)}s of show · ${total} frames · ${WIDTH}x${HEIGHT} @ ${FPS} -> ${path.relative(root, OUT)}`,
);

const started = Date.now();
const step = 1 / FPS;
for (let i = 0; i < total; i++) {
  await page.evaluate((dt) => window.__STARFALL.app.frame(dt), step);
  await write(await page.screenshot({ type: 'jpeg', quality: 94, optimizeForSpeed: true }));
  if (i % 60 === 0 || i === total - 1) {
    const done = i + 1;
    const elapsed = (Date.now() - started) / 1000;
    const rate = done / elapsed;
    const left = (total - done) / rate;
    process.stdout.write(
      `\r  ${done}/${total} frames · show t=${(FROM + done * step).toFixed(1)}s · ` +
        `${rate.toFixed(1)} fps · ${Math.round(left / 60)} min left        `,
    );
  }
}
process.stdout.write('\n');

ff.stdin.end();
await new Promise((resolve, reject) => {
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
});
await browser.close();
console.log(`done in ${((Date.now() - started) / 60000).toFixed(1)} min -> ${OUT}`);
