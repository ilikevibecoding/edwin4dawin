#!/usr/bin/env node
/**
 * Free-roam capture. Boots a chapter with `roam=1` so the seek stops at the
 * first exploration phase, then drives the game with a scripted input track
 * while stepping the clock by hand, exactly like film.mjs.
 *
 * The input track is a list of segments, each with the keys held, an optional
 * mouse-look delta per frame, and a duration in seconds:
 *
 *   node scripts/roam.mjs --chapter ch1 --out artifacts/roam.mp4 \
 *     --track '[["w",3,0],["wd",2,-6],["",1,0],["e",0.2,0]]'
 *
 * Segment = [keys, seconds, mouseDeltaXPerFrame].
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

const CHAPTER = arg('chapter', 'ch1');
const FPS = Number(arg('fps', 12));
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));
const Q = arg('q', 'medium');
const RF = arg('rf', '3');
const OUT = resolve(arg('out', 'artifacts/roam.mp4'));
const FRAMES_DIR = resolve(arg('frames', '.roam-frames'));
const BASE = arg('base', 'http://127.0.0.1:5173/');
const STILLS = arg('stills', '');
const KEEP = flag('keep');
const DEFAULT_TRACK = [
  ['', 0.6, 0],
  ['w', 2.2, 0],
  ['wd', 1.6, -7],
  ['w', 1.4, 0],
  ['e', 0.2, 0],
  ['', 1.6, 0],
  ['wa', 2.0, 6],
  ['w', 2.0, 0],
  ['e', 0.2, 0],
  ['', 1.6, 0],
];
const TRACK = JSON.parse(arg('track', JSON.stringify(DEFAULT_TRACK)));

const KEYMAP = { w: 'w', a: 'a', s: 's', d: 'd', e: 'e', r: 'Shift' };

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
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(err.slice(-1200)))));
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
    protocolTimeout: 900000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (/error/i.test(m.text())) console.log('[console]', m.text().slice(0, 240));
  });

  const url = `${BASE}?film=1&q=${Q}&chapter=${CHAPTER}&roam=1&no-demo=1&rf=${RF}`;
  console.log(`→ ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction('window.__film !== undefined', { timeout: 600000 });
  const roaming = await page.evaluate(() => !!window.__game?.director?.exploring);
  console.log(`   free roam active: ${roaming}`);

  const dt = 1 / FPS;
  for (let i = 0; i < 2; i++) await page.evaluate((d) => window.__film.step(d), dt);
  // Drag-look needs a held button outside pointer lock.
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));

  const stills = STILLS ? STILLS.split(',').map(Number) : [];
  let frame = 0;
  const t0 = Date.now();
  let held = new Set();
  for (const [keys, seconds, look] of TRACK) {
    const want = new Set(keys.split('').map((k) => KEYMAP[k] ?? k));
    for (const k of held) if (!want.has(k)) await page.keyboard.up(k);
    for (const k of want) if (!held.has(k)) await page.keyboard.down(k);
    held = want;
    const n = Math.max(1, Math.round(seconds * FPS));
    for (let i = 0; i < n; i++) {
      if (look) {
        await page.evaluate(
          (dx) => window.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, bubbles: true })),
          look,
        );
      }
      await page.evaluate((d) => window.__film.step(d), dt);
      const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });
      await writeFile(`${FRAMES_DIR}/f${String(frame).padStart(5, '0')}.png`, buf);
      if (stills.includes(frame)) {
        await writeFile(resolve(`shots/roam_still_${frame}.png`), buf);
      }
      frame++;
      if (frame % 10 === 0) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`\r   frame ${frame}  ${(el / frame).toFixed(2)}s/frame  elapsed ${(el / 60).toFixed(1)}m   `);
      }
    }
  }
  for (const k of held) await page.keyboard.up(k);
  console.log('');

  const report = await page.evaluate(() => {
    const g = window.__game;
    const p = g?.director?.player;
    return p
      ? {
          exploring: !!g.director.exploring,
          pos: [+p.character.group.position.x.toFixed(2), +p.character.group.position.z.toFixed(2)],
          used: [...p.used],
          yaw: +p.yaw.toFixed(2),
        }
      : null;
  });
  console.log('   state:', JSON.stringify(report));
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
