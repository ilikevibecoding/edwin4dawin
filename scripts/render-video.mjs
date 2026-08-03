#!/usr/bin/env node
/**
 * Deterministic video renderer.
 *
 * Steps the engine frame by frame through `window.__starfall.renderAt(t)` and
 * encodes the result with ffmpeg. Because the whole world is a pure function of
 * the master clock, this produces exactly the frames the cinematic plays - it
 * is a recording of the real renderer, just not captured in real time (the CI
 * box here has no GPU and falls back to software rasterisation).
 *
 * Usage:
 *   node scripts/render-video.mjs --out demo.mp4 --fps 12 --from 86 --to 130
 *   node scripts/render-video.mjs --out reel.mp4 --reel          # highlight reel
 *   node scripts/render-video.mjs --out full.mp4 --from 0 --to 380 --fps 10
 */

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const FRAME_DIR = path.join(ROOT, 'qa', 'frames');
const PORT = 5173;
const BASE = `http://127.0.0.1:${PORT}`;

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

const out = String(flag('out', 'starfall.mp4'));
const fps = Number(flag('fps', 12));
const width = Number(flag('width', 1280));
const height = Number(flag('height', 720));
const quality = String(flag('quality', 'medium'));
const hideUi = args.includes('--clean');

/** Highlight reel: one representative window per chapter. */
const REEL = [
  [4, 14], [50, 62], [88, 100], [104, 122], [131, 143], [147, 158],
  [160, 172], [186, 196], [198, 208], [215, 228], [242, 256],
  [272, 286], [288, 298], [306, 318], [319, 330], [344, 356], [366, 376],
];

const segments = args.includes('--reel')
  ? REEL
  : [[Number(flag('from', 0)), Number(flag('to', 380))]];

async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server not up at ${url}`);
}

await rm(FRAME_DIR, { recursive: true, force: true });
await mkdir(FRAME_DIR, { recursive: true });

const server = spawn('npm', ['run', 'dev'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', () => {});
server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

let browser;
try {
  await waitForServer(BASE);
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: [
      '--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required', '--mute-audio',
      `--window-size=${width},${height}`,
    ],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error(`[pageerror] ${e}`));

  await page.goto(`${BASE}/?qa=1&quality=${quality}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__starfall?.ready === true, null, { timeout: 180000 });
  await page.evaluate(() => window.__starfall.enter());
  await page.evaluate(() => window.__starfall.pause());
  await page.waitForTimeout(800);

  if (hideUi) {
    await page.addStyleTag({ content: '.transport,.title-card,.chapter-list,.panel{opacity:0 !important}' });
  }

  const total = segments.reduce((a, [s, e]) => a + Math.round((e - s) * fps), 0);
  console.log(`\nRendering ${total} frames at ${fps} fps, ${width}x${height}, quality=${quality}`);
  const started = Date.now();
  let index = 0;

  for (const [from, to] of segments) {
    const count = Math.round((to - from) * fps);
    for (let i = 0; i < count; i++) {
      const t = from + i / fps;
      await page.evaluate((time) => window.__starfall.renderAt(time), t);
      await page.screenshot({
        path: path.join(FRAME_DIR, `f${String(index).padStart(6, '0')}.png`),
        animations: 'disabled',
      });
      index++;
      if (index % 25 === 0) {
        const rate = index / ((Date.now() - started) / 1000);
        const eta = (total - index) / rate;
        process.stdout.write(
          `\r  ${index}/${total} frames  ${rate.toFixed(1)} fps render  eta ${Math.round(eta)}s   `,
        );
      }
    }
  }
  process.stdout.write('\n');

  const outPath = path.isAbsolute(out) ? out : path.join(ROOT, out);
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-framerate', String(fps),
      '-i', path.join(FRAME_DIR, 'f%06d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-preset', 'slow', '-crf', '20',
      '-vf', `fps=${Math.max(fps, 24)}`,
      '-movflags', '+faststart',
      outPath,
    ], { stdio: 'inherit' });
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });

  await writeFile(path.join(ROOT, 'qa', 'video-manifest.json'), `${JSON.stringify({
    out: outPath, fps, width, height, quality, segments, frames: index,
    renderedAt: new Date().toISOString(),
    note: 'Rendered frame-by-frame from the live engine on a software rasteriser; identical to real-time output on a GPU.',
  }, null, 2)}\n`);

  console.log(`\nWrote ${outPath} (${index} frames)`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 300));
  if (!server.killed) server.kill('SIGKILL');
}
