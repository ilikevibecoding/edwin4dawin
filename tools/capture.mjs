#!/usr/bin/env node
/**
 * Render the film to video.
 *
 * The timeline is a pure function of absolute time, so the work splits cleanly:
 * N headless browsers each render a contiguous slice of frames straight into
 * their own ffmpeg process, then the slices are concatenated and the master
 * audio track is muxed on. Each worker warms its chapter's simulation state
 * before its first frame so particles and capes match a single-pass render.
 *
 *   npm run capture -- --fps=30 --w=1600 --h=900 --segments=3
 *   npm run capture -- --from=0 --to=52 --out=render/title.mp4
 */
import { spawn } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { startServer, launch, openFilm, ROOT } from './browser.mjs';

const args = Object.fromEntries(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));

const FPS = +(args.fps || 30);
const W = +(args.w || 1600);
const H = +(args.h || 900);
const SEGMENTS = +(args.segments || 3);
const QUALITY = args.quality || 'high';
const JPEG_Q = +(args.jpegq || 94);
const OUT = resolve(args.out || join(ROOT, 'render/film.mp4'));
const WORK = resolve(args.work || join(ROOT, 'render/segments'));
const AUDIO = args.audio === '0' ? null
  : resolve(args.audio || (existsSync(join(ROOT, 'public/audio/master.wav'))
    ? join(ROOT, 'public/audio/master.wav') : join(ROOT, 'public/audio/master.mp3')));
// Warm from the chapter's own start by default: __film.warm clamps the lower
// bound to the chapter boundary, so 0 means "everything this chapter has done".
const WARMUP = +(args.warmup ?? 0);

mkdirSync(dirname(OUT), { recursive: true });
mkdirSync(WORK, { recursive: true });

function ffmpegSink(file) {
  const ff = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  return ff;
}

async function renderSegment(index, tStart, tEnd, onProgress) {
  const { server, port } = await startServer();
  const { browser, page } = await launch({ width: W, height: H, quiet: true });
  const file = join(WORK, `seg${String(index).padStart(2, '0')}.mp4`);
  const ff = ffmpegSink(file);
  let frames = 0;
  try {
    await openFilm(page, port, { width: W, height: H, quality: QUALITY });
    // Warm simulation state so a mid-film segment matches a single-pass render.
    await page.evaluate((a, b) => window.__film.warm(a, b, 1 / 30),
      WARMUP > 0 ? Math.max(0, tStart - WARMUP) : 0, tStart);

    const total = Math.round((tEnd - tStart) * FPS);
    for (let i = 0; i < total; i++) {
      const t = tStart + i / FPS;
      await page.evaluate((x) => window.__film.renderAt(x), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: JPEG_Q, optimizeForSpeed: true });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      frames++;
      if (frames % 25 === 0) onProgress?.(index, frames, total);
    }
    onProgress?.(index, frames, total);
  } finally {
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    await browser.close();
    await server.close();
  }
  return { file, frames };
}

// --------------------------------------------------------------------- main

const probe = await (async () => {
  const { server, port } = await startServer();
  const { browser, page } = await launch({ width: 320, height: 180, quiet: true });
  await openFilm(page, port, { width: 320, height: 180, quality: 'low' });
  const d = await page.evaluate(() => window.__film.duration);
  const chapters = await page.evaluate(() => window.__film.chapters());
  await browser.close(); await server.close();
  return { duration: d, chapters };
})();

const FROM = +(args.from ?? 0);
const TO = Math.min(+(args.to ?? probe.duration), probe.duration);
const totalFrames = Math.round((TO - FROM) * FPS);

console.log(`film ${probe.duration.toFixed(1)}s | rendering ${FROM.toFixed(1)}–${TO.toFixed(1)}s`
  + ` @ ${FPS}fps ${W}x${H} = ${totalFrames} frames across ${SEGMENTS} workers`);

// Prefer splitting on chapter boundaries so warmup is never wrong.
const bounds = [FROM];
const ideal = (TO - FROM) / SEGMENTS;
for (let i = 1; i < SEGMENTS; i++) {
  const target = FROM + ideal * i;
  let best = target, bestD = Infinity;
  for (const c of probe.chapters) {
    for (const edge of [c.start, c.start + c.dur]) {
      if (edge <= FROM || edge >= TO) continue;
      const d = Math.abs(edge - target);
      if (d < bestD) { bestD = d; best = edge; }
    }
  }
  // Snap to a chapter edge when one is close, otherwise split evenly; warmup
  // is clamped to the chapter start either way, so any split point is safe.
  const pick = bestD < ideal * 0.45 ? best : target;
  if (pick > bounds[bounds.length - 1] + 1) bounds.push(pick);
}
bounds.push(TO);
const segs = [];
for (let i = 0; i < bounds.length - 1; i++) segs.push([bounds[i], bounds[i + 1]]);
console.log('segments: ' + segs.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}`).join('  '));

const t0 = Date.now();
const progress = new Map();
const report = (i, done, total) => {
  progress.set(i, [done, total]);
  let d = 0, tt = 0;
  for (const [x, y] of progress.values()) { d += x; tt += y; }
  const el = (Date.now() - t0) / 1000;
  const rate = d / el;
  const eta = rate > 0 ? (totalFrames - d) / rate : 0;
  process.stdout.write(`\r  ${d}/${totalFrames} frames  ${rate.toFixed(1)} fps  elapsed ${(el / 60).toFixed(1)}m  eta ${(eta / 60).toFixed(1)}m   `);
};

const results = await Promise.all(segs.map(([a, b], i) => renderSegment(i, a, b, report)));
process.stdout.write('\n');

const listFile = join(WORK, 'list.txt');
writeFileSync(listFile, results.map((r) => `file '${r.file}'`).join('\n'));

const silent = !AUDIO || !existsSync(AUDIO);
const muxArgs = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'concat', '-safe', '0', '-i', listFile,
];
if (!silent) muxArgs.push('-ss', String(FROM), '-i', AUDIO);
muxArgs.push('-c:v', 'copy');
if (!silent) muxArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
muxArgs.push(OUT);

await new Promise((res, rej) => {
  const p = spawn('ffmpeg', muxArgs, { stdio: 'inherit' });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error('mux failed ' + c))));
});

console.log(`\ndone in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${OUT}${silent ? ' (no audio track found)' : ''}`);
if (!args.keep) rmSync(WORK, { recursive: true, force: true });
