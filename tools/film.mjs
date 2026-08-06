// Renders a scripted gameplay sequence frame-by-frame and encodes it to MP4.
//
// The build VM has no GPU, so a real-time screen recording would be a slideshow.
// Instead every frame is a genuine render of the running game, produced offline
// at a fixed simulation step and then played back at the intended rate.
//
// Usage: node tools/film.mjs [--out file.mp4] [--fps 12] [--w 1280] [--h 720]

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = path.resolve(arg('out', '/opt/cursor/artifacts/aegis_ridge_walkthrough.mp4'));
const FPS = Number(arg('fps', 12));
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));
const BASE = arg('base', 'http://127.0.0.1:5173');
const SEED = arg('seed', '20260805');

const frameDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aegis-film-'));
const SUB_STEPS = Math.max(1, Math.round(60 / FPS));

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--mute-audio',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(m.text());
});

console.log(`> loading ${BASE}/?test=1&seed=${SEED}&quality=high`);
await page.goto(`${BASE}/?test=1&seed=${SEED}&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });

let frame = 0;
const t0 = Date.now();

/** Render exactly one output frame, advancing the sim by 1/FPS seconds. */
async function grab(setup) {
  if (setup) await page.evaluate(setup);
  await page.evaluate((n) => {
    const G = window.__GAME;
    for (let i = 0; i < n - 1; i++) G.step(1 / 60, false);
    G.step(1 / 60, true);
  }, SUB_STEPS);
  const file = path.join(frameDir, `f${String(frame).padStart(5, '0')}.png`);
  await page.screenshot({ path: file, timeout: 240000 });
  frame++;
  if (frame % 12 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  frame ${frame} (${(el / frame).toFixed(1)} s/frame, ${el.toFixed(0)} s elapsed)`);
  }
}

/** Render `seconds` of footage, calling `perFrame(t01)` before each frame. */
async function shot(label, seconds, perFrame) {
  const n = Math.max(1, Math.round(seconds * FPS));
  console.log(`> shot "${label}" — ${n} frames`);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    await grab(perFrame ? new Function('t', `const G = window.__GAME; (${perFrame.toString()})(G, t);`).bind(null, t) : null);
  }
}

/* ------------------------------------------------------------- storyboard */

await page.evaluate(() => {
  const G = window.__GAME;
  G.action('tod:sunset');
  G.action('scenario:SATURATION');
  G.action('battery:SENTINEL');
});

// 1. Briefing card.
await shot('briefing', 1.6);

// 2. Deploy and walk the pad toward the Sentinel launcher.
await page.evaluate(() => {
  const G = window.__GAME;
  G.action('deploy');
  G.teleport(40, undefined, -40);
  G.lookAt(4, 7, -96);
  G.game.player.allowKeyboard = true;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
});
await shot('walk to sentinel', 3.2, (G, t) => {
  // Gentle look drift while walking so the shot has life.
  G.game.player.yaw += 0.0016;
  G.game.player.pitch = -0.02 + Math.sin(t * 3.1) * 0.012;
});
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));

// 3. Take the console and start the scenario.
await page.evaluate(() => {
  const G = window.__GAME;
  G.dock();
  G.startScenario('SATURATION', 'sunset', 'THAAD');
  G.runFor(0.5);
});
await shot('console start', 2.0);

// 4. Tracks come up on the scope.
await page.evaluate(() => {
  const G = window.__GAME;
  G.runUntil((s) => s.firm >= 2, 45);
});
await shot('tracks firm', 2.2);

// 5. Commit rounds.
await page.evaluate(() => {
  const G = window.__GAME;
  G.autoEngage(3);
});
await shot('commit', 1.6);

// 6. Outside for the launch.
await page.evaluate(() => {
  const G = window.__GAME;
  G.undock();
  G.teleport(16, undefined, 14);
  G.lookAt(60, 40, -40);
  G.runUntil((s) => s.interceptors.length > 0, 30);
});
await shot('launch', 3.2, (G) => {
  const m = G.game.interceptors.active[0];
  if (m) G.lookAt(m.pos.x, m.pos.y * 0.75 + 20, m.pos.z);
});

// 7. Follow the climb.
await shot('climb', 3.6, (G) => {
  const m = G.game.interceptors.active[0];
  if (m) G.lookAt(m.pos.x, m.pos.y, m.pos.z);
});

// 8. Hold on the intercept.
await page.evaluate(() => {
  const G = window.__GAME;
  const before = G.snapshot().stats.intercepted;
  G.runUntil((s) => s.stats.intercepted > before || s.interceptors.length === 0, 40);
});
await shot('intercept', 3.4, (G) => {
  const t = G.game.threats.active[0];
  const m = G.game.interceptors.active[0];
  const p = m ? m.pos : t ? t.pos : null;
  if (p) G.lookAt(p.x, p.y, p.z);
});

// 9. Second engagement wave, seen from the pad.
await page.evaluate(() => {
  const G = window.__GAME;
  G.autoEngage(3);
  G.teleport(-20, undefined, 34);
  G.runUntil((s) => s.interceptors.length > 0, 30);
});
await shot('second wave', 3.2, (G) => {
  const m = G.game.interceptors.active[0];
  if (m) G.lookAt(m.pos.x, m.pos.y * 0.8, m.pos.z);
});

// 10. Run the scenario out and land on the debrief.
await page.evaluate(() => {
  const G = window.__GAME;
  for (let i = 0; i < 200 && G.snapshot().phase !== 'DEBRIEF'; i++) {
    G.autoEngage(3);
    G.runFor(0.6);
  }
});
await shot('debrief', 2.4);

const stats = await page.evaluate(() => window.__GAME.snapshot());
console.log(`> ${frame} frames, result ${JSON.stringify(stats.stats)}`);
console.log('> problems:', problems.length ? problems.slice(0, 6) : 'none');
await browser.close();

/* ------------------------------------------------------------------ encode */

await fs.mkdir(path.dirname(OUT), { recursive: true });
await new Promise((resolve, reject) => {
  const ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(frameDir, 'f%05d.png'),
      '-vf', `fps=30,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '20',
      '-movflags', '+faststart',
      OUT,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited ${c}`))));
});
console.log(`> wrote ${OUT}`);
await fs.rm(frameDir, { recursive: true, force: true });
