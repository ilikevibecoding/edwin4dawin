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

/**
 * Render exactly one output frame, advancing the sim by 1/FPS seconds. The
 * per-frame camera script is shipped as source text because Playwright cannot
 * serialise a closure.
 */
async function grab(src, t) {
  await page.evaluate(
    ({ body, tt, n }) => {
      const G = window.__GAME;
      if (body) new Function('G', 't', body)(G, tt);
      for (let i = 0; i < n - 1; i++) G.step(1 / 60, false);
      G.step(1 / 60, true);
    },
    { body: src || null, tt: t, n: SUB_STEPS }
  );
  const file = path.join(frameDir, `f${String(frame).padStart(5, '0')}.png`);
  await page.screenshot({ path: file, timeout: 240000 });
  frame++;
  if (frame % 12 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  frame ${frame} (${(el / frame).toFixed(1)} s/frame, ${el.toFixed(0)} s elapsed)`);
  }
}

/**
 * Render `seconds` of footage. `perFrameBody` is the *source* of a function body
 * with `G` (the test API) and `t` (0..1 progress through the shot) in scope.
 */
async function shot(label, seconds, perFrameBody) {
  const n = Math.max(1, Math.round(seconds * FPS));
  console.log(`> shot "${label}" — ${n} frames`);
  for (let i = 0; i < n; i++) {
    await grab(perFrameBody, n === 1 ? 1 : i / (n - 1));
  }
}

/* ------------------------------------------------------------- storyboard */

// A guided tour of the site, then a full engagement, then the night raid.
// Camera vantages are ones verified clear of structures — an earlier cut put the
// lens inside the shelter wall and the frame filled with corrugated panel.

await page.evaluate(() => {
  const G = window.__GAME;
  G.action('tod:day');
  G.action('scenario:SATURATION');
  G.action('battery:THAAD');
});

// 1. Briefing card.
await shot('briefing', 1.3);

// 2. Deploy, then sprint across the apron toward the terminal battery.
await page.evaluate(() => {
  const G = window.__GAME;
  G.action('deploy');
  G.teleport(-26, undefined, 54);
  G.lookAt(-64, 3.2, 22);
  G.game.player.allowKeyboard = true;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
});
await shot('walk to patriot', 3.4, `G.game.player.pitch = -0.02 + Math.sin(t * 2.6) * 0.01;`);
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
});

// 3. Pan across the high-altitude launcher.
await page.evaluate(() => {
  const G = window.__GAME;
  G.teleport(44, undefined, 2);
  G.lookAt(72, 4.0, 12);
});
await shot('thaad', 2.6, `G.game.player.yaw -= 0.0022;`);

// 4. The Sentinel test article and its gantry.
await page.evaluate(() => {
  const G = window.__GAME;
  G.teleport(-14, undefined, -70);
  G.lookAt(4, 6.5, -96);
});
await shot('sentinel', 2.6, `G.game.player.yaw += 0.0018;`);

// 5. The radar installation, array turning.
await page.evaluate(() => {
  const G = window.__GAME;
  G.teleport(-10, undefined, -40);
  G.lookAt(-26, 4.5, -58);
});
await shot('radar', 2.2);

// 6. Take the console; tracks come up on the scope and in the holo tank.
await page.evaluate(() => {
  const G = window.__GAME;
  G.dock();
  G.startScenario('SATURATION', 'sunset', 'THAAD');
  G.runUntil((s) => s.firm >= 2, 45);
});
await shot('console tracks', 3.0);

// 7. Commit rounds. The high-altitude battery is committed by name, because the
// auto-engage helper picks whichever battery has the best solution and the
// launch shot has to be framed on a launcher that is actually going to fire.
await page.evaluate(() => {
  const G = window.__GAME;
  G.action('battery:THAAD');
  const t = G.game.radar.firmTracks().find((x) => !x.classified.includes('DECOY'));
  if (t) {
    G.game.selectTrack(t.id);
    G.game.assign();
    G.authorize();
  }
});
await shot('commit', 1.6);

// 8. Outside for the launch: eye level on the vehicle at ~40 m so the ignition,
// the exhaust and the dust off the concrete are all in frame, then lead up.
await page.evaluate(() => {
  const G = window.__GAME;
  G.undock();
  G.teleport(30, undefined, -6);
  G.lookAt(58, 5, -34);
  G.runUntil((s) => s.interceptors.some((i) => i.battery === 'THAAD'), 40);
});
await shot(
  'launch',
  3.0,
  `const m = G.game.interceptors.active.find((x) => x.batteryId === 'THAAD') || G.game.interceptors.active[0];
   if (m && t > 0.42) {
     const k = (t - 0.42) / 0.58;
     G.lookAt(58 + (m.pos.x - 58) * k, 5 + (m.pos.y - 5) * k * 0.8, -34 + (m.pos.z + 34) * k);
   } else {
     G.lookAt(58, 5, -34);
   }`
);

// 9. Follow the climb.
await shot(
  'climb',
  3.4,
  `const m = G.game.interceptors.active.find((x) => x.batteryId === 'THAAD') || G.game.interceptors.active[0];
   if (m) G.lookAt(m.pos.x, m.pos.y, m.pos.z);`
);

// 10. Hold just short of closure so the kill lands inside the shot.
await page.evaluate(() => {
  const G = window.__GAME;
  for (let i = 0; i < 900; i++) {
    const m = G.game.interceptors.active[0];
    if (!m) break;
    if (m.target && m.target.alive && m.pos.distanceTo(m.target.pos) < 4200) break;
    G.step(1 / 60, false);
  }
});
await shot(
  'intercept',
  3.4,
  `const m = G.game.interceptors.active[0];
   const tgt = m && m.target ? m.target : G.game.threats.active[0];
   if (tgt) { G.lookAt(tgt.pos.x, tgt.pos.y, tgt.pos.z); window.__LASTKILL = tgt.pos.toArray(); }
   else if (window.__LASTKILL) G.lookAt(window.__LASTKILL[0], window.__LASTKILL[1], window.__LASTKILL[2]);`
);

// 11. Second wave from the open apron.
await page.evaluate(() => {
  const G = window.__GAME;
  G.autoEngage(3);
  G.teleport(10, undefined, 46);
  G.runUntil((s) => s.interceptors.length > 0, 30);
});
await shot(
  'second wave',
  3.0,
  `const m = G.game.interceptors.active[0];
   if (m) G.lookAt(m.pos.x, m.pos.y * 0.8, m.pos.z);`
);

// 12. Night raid: the site under searchlights.
await page.evaluate(() => {
  const G = window.__GAME;
  G.startScenario('NIGHT_RAID', 'night', 'SENTINEL');
  G.teleport(6, undefined, 34);
  // A shallow up-angle across the pad. Aiming steeply into the searchlight cones
  // fills the frame with sky and puts the site out of shot, so this favours the
  // site's own lighting, which is what the night preset is built around.
  G.lookAt(-64, 46, -60);
  G.runFor(2.0);
});
await shot('night site', 2.6, `G.game.player.yaw += 0.0018;`);

// 13. Night launch and climb against the star field.
await page.evaluate(() => {
  const G = window.__GAME;
  G.runUntil((s) => s.firm >= 1, 45);
  G.autoEngage(3);
  G.runUntil((s) => s.interceptors.length > 0, 30);
});
await shot(
  'night launch',
  3.4,
  `const m = G.game.interceptors.active[0];
   if (m) G.lookAt(m.pos.x, m.pos.y + 30, m.pos.z);`
);

// 14. Run the scenario out and land on the debrief.
await page.evaluate(() => {
  const G = window.__GAME;
  for (let i = 0; i < 240 && G.snapshot().phase !== 'DEBRIEF'; i++) {
    G.autoEngage(3);
    G.runFor(0.6);
  }
});
await shot('debrief', 2.3);

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
