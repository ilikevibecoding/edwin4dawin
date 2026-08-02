#!/usr/bin/env node
/*
 * Offline film renderer.
 *
 * Drives the film one frame at a time in headless Chrome — the page never
 * relies on wall-clock time, so a machine with no GPU can take as long as it
 * likes per frame and still produce a perfectly timed 24 fps film. The
 * soundtrack is rendered separately through an OfflineAudioContext and muxed
 * against the picture, which keeps the score, effects and narration locked to
 * the cut.
 *
 *   node tools/render.mjs                          # full film, 1280x535 @ 24fps
 *   node tools/render.mjs --w 960 --fps 20         # faster draft
 *   node tools/render.mjs --start 40 --end 70      # just one sequence
 *   node tools/render.mjs --audio-only
 */
import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const PORT = +(process.env.PREVIEW_PORT || 5173);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const argv = process.argv.slice(2);
const opt = {
  w: 1280, fps: 24, out: 'render/out/film.mp4', start: 0, end: 0,
  quality: 92, crf: 18, preset: 'medium',
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  if (k === 'audio-only' || k === 'no-audio' || k === 'keep') { opt[k] = true; continue; }
  opt[k] = argv[++i];
}
const W = Math.round(+opt.w / 2) * 2;
const H = Math.round(W / 2.39 / 2) * 2;
const FPS = +opt.fps;

async function up() {
  try { return (await fetch(ORIGIN + '/index.html', { signal: AbortSignal.timeout(1500) })).ok; }
  catch { return false; }
}
async function ensureServer() {
  if (await up()) return;
  console.error(`[render] starting vite on ${PORT} ...`);
  const p = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: process.cwd(), stdio: 'ignore', detached: true });
  p.unref();
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await up()) return;
  }
  throw new Error('vite did not come up');
}

(async () => {
  await ensureServer();
  mkdirSync(path.dirname(opt.out), { recursive: true });
  mkdirSync('render/out', { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio',
      '--disable-frame-rate-limit', '--js-flags=--max-old-space-size=4096',
      '--force-device-scale-factor=1', '--hide-scrollbars',
    ],
  });
  const page = await browser.newPage({ viewport: { width: W + 40, height: H + 40 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });

  const url = `${ORIGIN}/index.html?capture=1&w=${W}&h=${H}&q=high`;
  console.error(`[render] loading ${url}`);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__filmReady === true', null, { timeout: 900000 });

  const info = await page.evaluate('({ duration: window.__film.duration, sequences: window.__film.sequences })');
  console.error(`[render] film is ${info.duration.toFixed(1)}s in ${info.sequences.length} sequences`);

  const t0 = +opt.start || 0;
  const t1 = +opt.end || info.duration;
  const frames = Math.floor((t1 - t0) * FPS);

  // ---- soundtrack -------------------------------------------------------
  const wav = path.resolve('render/out/film.wav');
  if (!opt['no-audio']) {
    console.error('[render] rendering soundtrack offline ...');
    const b64 = await page.evaluate(`window.__film.renderAudio(${info.duration + 1.5})`);
    writeFileSync(wav, Buffer.from(b64, 'base64'));
    const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', wav]).stdout.toString().trim();
    console.error(`[render] soundtrack: ${dur}s -> ${wav}`);
  }
  if (opt['audio-only']) { await browser.close(); return; }

  // ---- picture ----------------------------------------------------------
  const ffArgs = [
    '-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  ];
  if (!opt['no-audio']) ffArgs.push('-ss', String(t0), '-i', wav);
  ffArgs.push(
    '-map', '0:v:0',
    ...(opt['no-audio'] ? [] : ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k']),
    '-c:v', 'libx264', '-preset', opt.preset, '-crf', String(opt.crf),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest',
    opt.out,
  );
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => {
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg exit ' + code))));
  });

  console.error(`[render] ${frames} frames at ${W}x${H} ${FPS}fps`);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const abs = Math.round((t0 * FPS) + i);
    const b64 = await page.evaluate(`(function(){
      window.__film.frame(${abs}, ${FPS});
      return document.getElementById('c').toDataURL('image/jpeg', ${opt.quality / 100}).slice(23);
    })()`);
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 24 === 0 || i === frames - 1) {
      const el = (Date.now() - started) / 1000;
      const rate = (i + 1) / el;
      const eta = (frames - i - 1) / Math.max(0.01, rate);
      process.stderr.write(
        `\r[render] ${String(i + 1).padStart(5)}/${frames}  ${(100 * (i + 1) / frames).toFixed(1)}%  ` +
        `${rate.toFixed(2)} fps  elapsed ${fmt(el)}  eta ${fmt(eta)}   `,
      );
    }
  }
  ff.stdin.end();
  process.stderr.write('\n[render] encoding ...\n');
  await ffDone;
  await browser.close();

  const size = spawnSync('du', ['-h', opt.out]).stdout.toString().trim();
  console.error(`[render] done: ${size}`);
})().catch((e) => { console.error(e); process.exit(1); });

function fmt(s) {
  s = Math.max(0, Math.round(s));
  const m = (s / 60) | 0;
  return `${m}m${String(s % 60).padStart(2, '0')}s`;
}
