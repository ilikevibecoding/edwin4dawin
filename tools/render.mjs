// Offline renderer. Drives the film frame by frame in headless Chrome, pipes
// the frames straight into ffmpeg, and renders the soundtrack separately with
// an OfflineAudioContext so picture and sound come out of exactly the same code
// that runs live in a browser.
//
//   node tools/render.mjs --w=1280 --h=720 --fps=24 --out=build/film.mp4
//   node tools/render.mjs --from=294 --to=358 --out=build/trench.mp4
//   node tools/render.mjs --audio-only --out=build/track.wav
//
// Rendering the whole film in one process takes a while on a software
// rasteriser; --workers=N splits the timeline and muxes the parts together.

import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : 'true'];
}));

const W = +(args.w || 1280);
const H = +(args.h || 720);
const FPS = +(args.fps || 24);
const PORT = args.port || 8080;
const OUT = args.out || 'build/film.mp4';
const CRF = args.crf || '20';
const QUIET = args.quiet === 'true';

fs.mkdirSync(path.dirname(OUT), { recursive: true });

function log(...m) { if (!QUIET) console.log(...m); }

async function launch() {
  return puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--mute-audio', '--enable-unsafe-swiftshader',
      '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu',
      '--disable-frame-rate-limit', '--js-flags=--max-old-space-size=4096',
    ],
    defaultViewport: { width: W, height: H },
    protocolTimeout: 900000,
  });
}

async function openFilm(browser) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('favicon')) console.error('[page]', t); });
  await page.goto(`http://localhost:${PORT}/index.html?capture=1&w=${W}&h=${H}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__STORY__ && window.__STORY__.ready === true', { timeout: 240000 });
  return page;
}

async function renderAudio(outWav, duration) {
  const browser = await launch();
  const page = await openFilm(browser);
  log('rendering soundtrack...');
  const t0 = Date.now();
  const info = await page.evaluate((d) => window.__STORY__.renderAudio(d), duration || null);
  log(`  ${(info.bytes / 1e6).toFixed(1)} MB, ${info.duration.toFixed(1)}s @ ${info.sampleRate} Hz in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const fd = fs.openSync(outWav, 'w');
  const CH = 6 * 1024 * 1024;
  for (let off = 0; off < info.bytes; off += CH) {
    const b64 = await page.evaluate((o, l) => window.__STORY__.audioChunk(o, l), off, Math.min(CH, info.bytes - off));
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  await browser.close();
  log(`  wrote ${outWav}`);
  return info;
}

async function renderFrames({ from, to, outFile }) {
  const browser = await launch();
  const page = await openFilm(browser);
  const duration = await page.evaluate(() => window.__STORY__.duration);
  const start = from ?? 0;
  const end = Math.min(to ?? duration, duration);
  const total = Math.max(1, Math.round((end - start) * FPS));
  const dt = 1 / FPS;

  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF,
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  await page.evaluate((t) => window.__STORY__.seekTo(t), start);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate((d) => window.__STORY__.step(d), dt);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92, optimizeForSpeed: true, captureBeyondViewport: false });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0 || i === total - 1) {
      const el = (Date.now() - t0) / 1000;
      const rate = (i + 1) / el;
      const eta = (total - i - 1) / Math.max(rate, 1e-6);
      log(`  [${outFile}] ${i + 1}/${total} frames  ${rate.toFixed(2)} fps  eta ${(eta / 60).toFixed(1)} min`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => { ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))); });
  await browser.close();
  return { start, end, total };
}

// --- main ------------------------------------------------------------------

if (args['audio-only']) {
  await renderAudio(OUT.replace(/\.\w+$/, '.wav'));
  process.exit(0);
}

const workers = +(args.workers || 1);
const wavPath = args.wav || OUT.replace(/\.\w+$/, '.wav');

if (!args['skip-audio'] && !fs.existsSync(wavPath)) {
  await renderAudio(wavPath);
} else {
  log(`reusing ${wavPath}`);
}

// Discover the film duration.
const probe = await launch();
const probePage = await openFilm(probe);
const filmDuration = await probePage.evaluate(() => window.__STORY__.duration);
await probe.close();

const from = args.from !== undefined ? +args.from : 0;
const to = args.to !== undefined ? +args.to : filmDuration;
log(`film ${filmDuration}s; rendering ${from}s..${to}s at ${W}x${H} ${FPS}fps with ${workers} worker(s)`);

const silent = path.join(path.dirname(OUT), path.basename(OUT, path.extname(OUT)) + '.silent.mp4');

if (workers <= 1) {
  await renderFrames({ from, to, outFile: silent });
} else {
  // Split into equal spans and run child processes.
  const span = (to - from) / workers;
  const parts = [];
  const procs = [];
  for (let i = 0; i < workers; i++) {
    const a = from + i * span;
    const b = i === workers - 1 ? to : from + (i + 1) * span;
    const partFile = path.join(path.dirname(OUT), `part${i}.mp4`);
    parts.push(partFile);
    procs.push(new Promise((res, rej) => {
      const p = spawn(process.execPath, [
        new URL(import.meta.url).pathname, `--w=${W}`, `--h=${H}`, `--fps=${FPS}`,
        `--from=${a}`, `--to=${b}`, `--out=${partFile}`, '--skip-audio=true',
        `--wav=${wavPath}`, `--crf=${CRF}`, '--single=true', `--port=${PORT}`,
      ], { stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? res() : rej(new Error(`worker ${i} exit ${c}`))));
    }));
  }
  await Promise.all(procs);
  const listFile = path.join(path.dirname(OUT), 'parts.txt');
  fs.writeFileSync(listFile, parts.map((p) => `file '${path.resolve(p.replace(/\.mp4$/, '.silent.mp4'))}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent]);
}

// Mux picture and sound.
if (fs.existsSync(wavPath)) {
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-i', silent, '-ss', String(from), '-i', wavPath,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', OUT,
  ]);
  log(`wrote ${OUT}`);
} else {
  fs.copyFileSync(silent, OUT);
  log(`wrote ${OUT} (no audio)`);
}
