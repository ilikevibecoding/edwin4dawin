#!/usr/bin/env node
/**
 * Deterministic offline render of the auto-play demo.
 *
 *   node tools/render-demo.mjs --out render/demo --fps 24 --w 1280 --h 720
 *
 * The page advances one fixed step per screenshot, so the result is identical
 * regardless of how slow the software renderer is.
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildOnce, launchBrowser, startServer, parseArgs } from './harness.mjs';

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out ?? 'render/demo');
const framesDir = path.join(outDir, 'frames');
const width = Number(args.w ?? 1280);
const height = Number(args.h ?? 720);
const quality = args.q ?? 'balanced';
const fps = Number(args.fps ?? 24);
const dt = args.dt ? Number(args.dt) : 1 / fps;
const stride = Number(args.stride ?? 1);
const maxSeconds = Number(args.maxSeconds ?? 900);
const startFrom = args.from ?? null;
const format = args.png ? 'png' : 'jpeg';
const quality_jpeg = Number(args.jq ?? 92);
const resume = !!args.resume;
const checkOnly = !!args.check;

console.log('building...');
await buildOnce();
const { server, baseUrl } = await startServer({ mode: 'preview' });
const browser = await launchBrowser({ width, height });
await mkdir(framesDir, { recursive: true });

let startIndex = 0;
if (resume) {
  const existing = (await readdir(framesDir)).filter((f) => f.endsWith(`.${format === 'jpeg' ? 'jpg' : 'png'}`));
  startIndex = existing.length;
  console.log(`resuming after ${startIndex} frames`);
}

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (e) => errors.push(e.message));

const url = `${baseUrl}/index.html?capture=1&w=${width}&h=${height}&q=${quality}${startFrom ? `&from=${startFrom}` : ''}`;
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction('window.__ready === true', { timeout: 900000, polling: 500 });
console.log(`page ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Skip ahead when resuming.
if (startIndex > 0) {
  await page.evaluate(
    `(() => { for (let i = 0; i < ${startIndex * stride}; i++) window.__capture.frame(${dt}); })()`,
  );
}

let frame = startIndex;
let storyTime = 0;
const maxFrames = Math.ceil((maxSeconds * fps) / stride);
const started = Date.now();
let finished = false;

while (frame < maxFrames) {
  const res = await page.evaluate(`(() => {
    for (let i = 0; i < ${stride}; i++) window.__capture.frame(${dt});
    return { t: window.__capture.time, done: window.__capture.finished };
  })()`);
  storyTime = res.t;
  if (!checkOnly) {
    const name = String(frame).padStart(6, '0');
    const file = path.join(framesDir, `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    await page.screenshot({ path: file, type: format, ...(format === 'jpeg' ? { quality: quality_jpeg } : {}) });
  }
  frame++;
  if (frame % 20 === 0 || res.done) {
    const elapsed = (Date.now() - started) / 1000;
    const per = elapsed / (frame - startIndex);
    const remaining = res.done ? 0 : (maxFrames - frame) * per;
    console.log(
      `frame ${frame}/${maxFrames}  story ${storyTime.toFixed(1)}s  ${per.toFixed(2)}s/frame  eta ${(remaining / 60).toFixed(1)} min${errors.length ? `  errors=${errors.length}` : ''}`,
    );
    if (errors.length) {
      console.log(`  last error: ${errors[errors.length - 1]}`);
      errors.length = 0;
    }
  }
  if (res.done) {
    // Hold the ending card for a few seconds.
    finished = true;
    if (checkOnly) break;
    const holdFrames = Math.round((12 * fps) / stride);
    for (let i = 0; i < holdFrames && frame < maxFrames; i++) {
      await page.evaluate(`(() => { for (let i = 0; i < ${stride}; i++) window.__capture.frame(${dt}); })()`);
      const n = String(frame).padStart(6, '0');
      await page.screenshot({
        path: path.join(framesDir, `${n}.${format === 'jpeg' ? 'jpg' : 'png'}`),
        type: format,
        ...(format === 'jpeg' ? { quality: quality_jpeg } : {}),
      });
      frame++;
    }
    break;
  }
}

await writeFile(
  path.join(outDir, 'meta.json'),
  JSON.stringify({ frames: frame, fps, dt, stride, width, height, quality, storyTime, finished }, null, 2),
);
await browser.close();
server.kill('SIGKILL');
console.log(`\nrendered ${frame} frames (${(frame / fps).toFixed(1)}s of video, story ${storyTime.toFixed(1)}s)`);

if (!checkOnly && args.encode !== 'false' && existsSync(framesDir)) {
  const outFile = path.join(outDir, 'demo.mp4');
  const audioFile = args.audio ? path.resolve(args.audio) : null;
  console.log('encoding...');
  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        String(fps),
        '-i',
        path.join(framesDir, `%06d.${format === 'jpeg' ? 'jpg' : 'png'}`),
        ...(audioFile ? ['-i', audioFile] : []),
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        ...(audioFile ? ['-c:a', 'aac', '-b:a', '160k', '-shortest'] : []),
        outFile,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let log = '';
    ff.stderr.on('data', (b) => (log += b));
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(log.slice(-2000)))));
  });
  console.log(`wrote ${outFile}`);
}
process.exit(0);
