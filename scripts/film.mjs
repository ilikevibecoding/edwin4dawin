#!/usr/bin/env node
/**
 * Deterministic film capture.
 *
 * Renders the game one fixed timestep at a time and writes every frame to disk,
 * then encodes with ffmpeg. Because the clock is driven manually, the resulting
 * video is perfectly smooth no matter how slow the machine actually renders —
 * which is what makes a cinematic capture possible on software WebGL.
 *
 *   node scripts/film.mjs --chapter ch1 --seconds 40 --fps 15 --out demo.mp4
 */
import puppeteer from 'puppeteer-core';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (n) => args.includes(`--${n}`);

const CHAPTER = arg('chapter', '');
const SEEK = Number(arg('seek', 0));
const SECONDS = Number(arg('seconds', 20));
const FPS = Number(arg('fps', 15));
const W = Number(arg('w', 960));
const H = Number(arg('h', 540));
const Q = arg('q', 'medium');
const OUT = resolve(arg('out', 'artifacts/film.mp4'));
const FRAMES_DIR = resolve(arg('frames', '.film-frames'));
const BASE = arg('base', 'http://localhost:4173/');
const DEMO = flag('no-demo') ? '' : '&demo=1';
const KEEP = flag('keep');

const total = Math.round(SECONDS * FPS);
const dt = 1 / FPS;

function encode(pattern, out, fps) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', [
      '-y', '-framerate', String(fps), '-i', pattern,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19',
      '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      out,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(err.slice(-1500)))));
  });
}

async function main() {
  if (existsSync(FRAMES_DIR)) await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(FRAMES_DIR, { recursive: true });
  await mkdir(resolve(OUT, '..'), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist', '--disable-frame-rate-limit',
      `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio',
      '--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none',
    ],
    protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (/error/i.test(m.text())) console.log('[console]', m.text().slice(0, 240));
  });

  const url = `${BASE}?film=1&q=${Q}${CHAPTER ? `&chapter=${CHAPTER}` : ''}${SEEK ? `&seek=${SEEK}` : ''}${DEMO}&rf=2`;
  console.log(`→ ${url}`);
  console.log(`   ${total} frames @ ${FPS}fps (${SECONDS}s) at ${W}x${H}, quality=${Q}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction('window.__film !== undefined', { timeout: 300000 });
  // A few warm frames so shaders are compiled before the first captured frame.
  for (let i = 0; i < 3; i++) await page.evaluate((d) => window.__film.step(d), dt);

  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate((d) => window.__film.step(d), dt);
    const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });
    await writeFile(`${FRAMES_DIR}/f${String(i).padStart(5, '0')}.png`, buf);
    if (i % 10 === 0 || i === total - 1) {
      const el = (Date.now() - t0) / 1000;
      const per = el / (i + 1);
      const eta = per * (total - i - 1);
      process.stdout.write(
        `\r   frame ${i + 1}/${total}  ${per.toFixed(2)}s/frame  elapsed ${(el / 60).toFixed(1)}m  eta ${(eta / 60).toFixed(1)}m   `,
      );
    }
  }
  console.log('');
  await browser.close();

  console.log('   encoding…');
  await encode(`${FRAMES_DIR}/f%05d.png`, OUT, FPS);
  if (!KEEP) await rm(FRAMES_DIR, { recursive: true, force: true });
  console.log(`   wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
