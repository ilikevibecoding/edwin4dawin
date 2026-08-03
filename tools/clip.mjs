#!/usr/bin/env node
/**
 * Renders a span of show time to a video.
 *
 * The piece is a deterministic function of time, so a clip can be assembled
 * frame by frame regardless of how fast the machine actually renders: seek
 * once, then advance the show by exactly 1/fps and capture, over and over.
 * That is the only way to get a smooth recording out of a software rasteriser.
 *
 *   node tools/clip.mjs --from=239 --to=252 --fps=24 --out=qa/clips/vader.mp4
 *   node tools/clip.mjs --from=66 --to=80 --ui=off --out=qa/clips/pursuit.mp4
 */

import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};

const url = value('url', 'http://127.0.0.1:4173/');
const from = Number(value('from', 0));
const to = Number(value('to', 10));
const fps = Number(value('fps', 24));
const width = Number(value('width', 1280));
const height = Number(value('height', 720));
const showUi = value('ui', 'on') !== 'off';
const outFile = join(root, value('out', 'qa/clips/clip.mp4'));
const frameDir = join(dirname(outFile), `.frames-${basename(outFile, '.mp4')}`);

rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
mkdirSync(dirname(outFile), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
  ],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__show !== undefined, null, { timeout: 120000 });
await page.waitForFunction(() => !document.getElementById('btn-enter').disabled, null, { timeout: 300000 });
await page.click('#btn-enter');
await page.waitForTimeout(1200);
await page.evaluate(() => window.__show.pause());
if (!showUi) await page.keyboard.press('KeyU');

const settle = (n) =>
  page.evaluate(
    (k) =>
      new Promise((resolve) => {
        let i = 0;
        const tick = () => (++i >= k ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    n,
  );

const step = 1 / fps;
const total = Math.max(1, Math.round((to - from) * fps));
await page.evaluate((t) => window.__show.seek(t), from);
await settle(6);

const started = Date.now();
for (let i = 0; i < total; i++) {
  await page.screenshot({ path: join(frameDir, `f${String(i).padStart(5, '0')}.png`) });
  await page.evaluate((s) => window.__show.simulate(s, s), step);
  await settle(2);
  if (i % 24 === 0) {
    const secs = Math.round((Date.now() - started) / 1000);
    process.stdout.write(`  ${i}/${total} frames  (${secs}s elapsed)\n`);
  }
}
await browser.close();

const r = spawnSync(
  'ffmpeg',
  [
    '-y', '-loglevel', 'error',
    '-framerate', String(fps),
    '-i', join(frameDir, 'f%05d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20',
    '-movflags', '+faststart',
    outFile,
  ],
  { stdio: 'inherit' },
);
if (r.status !== 0) process.exit(r.status ?? 1);
rmSync(frameDir, { recursive: true, force: true });
if (problems.length) console.log(`console:\n${problems.slice(0, 10).join('\n')}`);
console.log(`wrote ${outFile}  (${total} frames @ ${fps} fps)`);
