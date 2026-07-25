#!/usr/bin/env node
/**
 * tools/walkthrough.mjs — record a keyboard-driven playthrough.
 *
 *   node tools/walkthrough.mjs [--url <url>] [--out <dir>]
 *
 * Deliberately uses *only* real input — a click to lock the pointer, WASD, mouse
 * movement, E — with no `debugAPI.setView()` anywhere, so the resulting frames
 * are evidence that the game is playable rather than evidence that the renderer
 * works. (Confusing those two is how a build that could not be moved in got
 * signed off as passing.)
 *
 * The capture box has no GPU, so it renders at around one frame per second and
 * the timeline below is written in real seconds rather than frames. Movement
 * speed in the output is correct — that is the whole point — but the smoothness
 * is the software rasteriser's, not the game's.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const URL_BASE = arg('url', 'http://127.0.0.1:5173');
const OUT = arg('out', '/tmp/walkthrough');
const W = Number(arg('width', 960));
const H = Number(arg('height', 540));

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.debugAPI?.ready, null, { timeout: 300000, polling: 300 });
await page.evaluate(() => { window.debugAPI.setAutoQuality(false); window.debugAPI.setQuality('medium'); });

const SENS = 0.0022;             // must match Player.sensitivity
let cursorX = W / 2;             // pointer lock reports deltas, so the cursor is free
let cursorY = H / 2;             // to march off-screen; rotation accumulates cleanly

let n = 0;
const state = () => page.evaluate(() => ({
  x: +window.debugAPI.player.pos.x.toFixed(2),
  z: +window.debugAPI.player.pos.z.toFixed(2),
  yaw: +window.debugAPI.player.yaw.toFixed(2),
  prompt: window.debugAPI.getPrompt(),
  toast: window.debugAPI.getLastToast(),
}));
const shot = async (label) => {
  const file = path.join(OUT, `${String(n++).padStart(2, '0')}_${label}.png`);
  await page.screenshot({ path: file });
  const s = await state();
  console.log(`  ${path.basename(file).padEnd(28)} pos(${String(s.x).padStart(6)},${String(s.z).padStart(7)}) yaw ${String(s.yaw).padStart(5)}` +
    `${s.prompt ? `  prompt="${s.prompt}"` : ''}${s.toast ? `  toast="${s.toast}"` : ''}`);
};

/** Turn by `rad` (positive = left), since `yaw -= movementX * sensitivity`. */
const turn = async (rad, pitch = 0) => {
  cursorX -= rad / SENS;
  cursorY -= pitch / SENS;
  await page.mouse.move(cursorX, cursorY, { steps: 12 });
};

/**
 * Hold keys until `done(state)` or `maxMs` elapses. Polling on position rather
 * than sleeping for a fixed time keeps the route robust: this box renders at
 * about one frame per second, so any fixed duration either overshoots into a
 * wall or never arrives.
 */
const walkUntil = async (keys, done, maxMs = 45000) => {
  for (const k of keys) await page.keyboard.down(k);
  const t0 = Date.now();
  let s = await state();
  while (Date.now() - t0 < maxMs && !done(s)) {
    await page.waitForTimeout(250);
    s = await state();
  }
  for (const k of keys) await page.keyboard.up(k);
  await page.waitForTimeout(600);
  return Date.now() - t0;
};

/** Hold `keys` for exactly `count` rendered frames. */
const tap = async (keys, count = 1) => {
  await page.evaluate(() => window.debugAPI.resetFrames());
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForFunction((c) => window.debugAPI.frames >= c, count, { timeout: 30000, polling: 40 })
    .catch(() => {});
  for (const k of keys) await page.keyboard.up(k);
  await page.waitForTimeout(350);
};

/**
 * Creep onto a target coordinate with single-frame taps.
 *
 * Necessary because this box renders at roughly one frame per second while
 * moving, and one frame at walking pace covers 0.6 m — wider than the margin
 * either side of a 1.1 m doorway. A tap from a standing start only accelerates
 * for one step, so it moves 0.2-0.3 m and gives the resolution needed to line up.
 */
const creep = async (axis, target, incKey, decKey, tol = 0.18, tries = 12) => {
  for (let i = 0; i < tries; i++) {
    const s = await state();
    const delta = target - s[axis];
    if (Math.abs(delta) <= tol) return s;
    await tap([delta > 0 ? incKey : decKey], 1);
  }
  return state();
};

console.log(`· recording a playthrough of ${URL_BASE}`);
await shot('splash');

await page.mouse.click(W / 2, H / 2);                       // engage helmet interface
await page.waitForTimeout(1800);
await shot('pointer_locked');

// you spawn facing aft at the airlock; turn around to look down the ship
await turn(-Math.PI);
await page.waitForTimeout(1500);
await shot('turned_to_corridor');

// sprint down the corridor toward the crew quarters hatch (opening z -9.05..-7.95)
// facing yaw 0: W decreases z, S increases z
const ms = await walkUntil(['KeyW', 'ShiftLeft'], (s) => s.z <= -8.2, 70000);
console.log(`    · sprinted the corridor in ${(ms / 1000).toFixed(0)}s`);
await shot('sprinted_down_corridor');
const lined = await creep('z', -8.5, 'KeyS', 'KeyW');
console.log(`    · lined up on the hatch at z=${lined.z} (opening spans -9.05..-7.95)`);

// face the hatch and step through into the quarters
await turn(Math.PI / 2);
await page.waitForTimeout(1200);
await shot('facing_quarters_hatch');
await walkUntil(['KeyW'], (s) => s.x <= -2.6, 50000);
await shot('inside_quarters');

// Take up the pose the bunk's raycast responds to: standing off the foot of it at
// (-2.9, -7.7). Facing -X, W/S walk the x axis and A/D strafe the z axis.
await creep('x', -2.9, 'KeyS', 'KeyW');
const posed = await creep('z', -7.7, 'KeyA', 'KeyD');
console.log(`    · stood off the bunk at (${posed.x}, ${posed.z})`);

// look down at the mattress — the prompt is raycast from the crosshair, so
// standing near the bunk is not enough, you have to actually look at it
await turn(-0.39, -0.24);
await page.waitForTimeout(1500);
await shot('looking_at_bunk');
for (let i = 0; i < 6 && !(await state()).prompt; i++) await tap(['KeyW'], 1);
await shot('bunk_prompt');
await page.keyboard.press('KeyE');
await page.waitForTimeout(7000);
await shot('slept');

console.log(`· ${n} frames -> ${OUT}`);
await browser.close();
