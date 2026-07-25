#!/usr/bin/env node
/**
 * tools/playcheck.mjs — can a human actually play it?
 *
 *   node tools/playcheck.mjs                       # dev server
 *   node tools/playcheck.mjs --url "<public url>"  # the published build
 *
 * This exists because of a bug that shipped. `tools/shots.mjs` drove the camera
 * through `debugAPI.setView()` and `tools/cdncheck.mjs` only asserted that pixels
 * appeared, so between them they proved the renderer worked and never once proved
 * the *game* worked. It didn't: the frame loop clamped its timestep to 0.05 s, so
 * below 20 fps the simulation ran in slow motion, and holding W moved you a few
 * centimetres per second.
 *
 * So this drives it the way a player does — click to lock the pointer, hold a key,
 * move the mouse, press E — and asserts on the resulting motion in metres.
 *
 * The headless box has no GPU, so it runs at a small viewport and a pinned low
 * quality to get a usable frame rate; the assertion is on distance per second of
 * *real* time, which is the thing that was broken and is frame-rate independent
 * once fixed. 200x120 gives ~30 fps here and 320x180 gives ~16 fps — run it at
 * both and the metres-per-second figure should agree, which is the proof.
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { analyse } from './png.mjs';

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const URL_BASE = arg('url', 'http://127.0.0.1:5173');
const W = Number(arg('width', 200));
const H = Number(arg('height', 120));
const HOLD_MS = Number(arg('hold', 3000));
const OUT = arg('out', '/tmp/playcheck.png');
/**
 * Simulate a browser that refuses pointer lock (Chrome does exactly this for
 * about a second after you leave lock with Esc; iframes without
 * `allow="pointer-lock"`, some extensions and some policies refuse outright).
 * The demo must stay playable via drag-to-look rather than dead-ending on the
 * title screen.
 */
const DENY_LOCK = argv.includes('--deny-lock');
const WALK_SPEED = 2.5;          // must match WALK in src/player.js
// Generous: acceleration ramp, collision, and any frame-rate wobble all cost
// distance. The bug produced 3 % of this, so the margin does not need to be tight.
const MIN_FRACTION = 0.45;

// Quality is pinned after load via the debug API rather than a URL param:
// htmlpreview.github.io takes the target file as its own query string, so
// appending `&quality=low` corrupts the URL it tries to fetch and nothing loads.
const url = URL_BASE;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text().slice(0, 200);
  if (/favicon/i.test(t) || /Failed to load resource/i.test(t)) return;
  errors.push(t);
});

if (DENY_LOCK) {
  await page.addInitScript(() => {
    Element.prototype.requestPointerLock = function () {
      // mirror Chrome: reject the promise *and* fire the legacy error event
      setTimeout(() => document.dispatchEvent(new Event('pointerlockerror')), 0);
      return Promise.reject(new DOMException('denied by test', 'NotSupportedError'));
    };
  });
}

console.log(`· ${url}${DENY_LOCK ? '  [pointer lock denied]' : ''}`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.debugAPI?.ready, null, { timeout: 300000, polling: 300 });
// pin the floor rung so the GPU-less box gets whatever frame rate it can, and
// stop the governor from moving the target mid-test
await page.evaluate(() => { window.debugAPI.setAutoQuality(false); window.debugAPI.setQuality('low'); });

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
/** Wait for the render loop to actually run n frames — wall-clock waits are a lie
 *  when the frame rate is unknown. */
const frames = async (n) => {
  await page.evaluate(() => window.debugAPI.resetFrames());
  await page.waitForFunction((k) => window.debugAPI.frames >= k, n, { timeout: 120000, polling: 60 });
};

// measure the frame rate we are actually testing at, and report it
await frames(2);
const fpsT0 = Date.now();
await frames(40);
const measuredFps = 40000 / (Date.now() - fpsT0);
console.log(`· ${W}x${H} running at ~${measuredFps.toFixed(1)} fps (frame ${(1000 / measuredFps).toFixed(0)} ms)`);

/* ---------------------------------------------------------- 1. pointer lock */

await page.mouse.click(W / 2, H / 2);
await page.waitForTimeout(1800);
const engaged = await page.evaluate(() => ({
  locked: window.debugAPI.isPointerLocked(),
  fallback: window.debugAPI.player.fallback,
  active: window.debugAPI.player.active,
  splashGone: document.getElementById('splash').classList.contains('hidden'),
  hintShown: !document.getElementById('fallback').classList.contains('hidden'),
}));

if (DENY_LOCK) {
  check('denied pointer lock falls back instead of dead-ending', engaged.fallback && engaged.active);
  check('splash clears so the player is not stuck on the title', engaged.splashGone);
  check('the fallback control hint is shown', engaged.hintShown);
} else {
  check('pointer lock engages on click', engaged.locked);
  check('splash clears once locked', engaged.splashGone);
  check('no spurious fallback hint', !engaged.hintShown);
}

/**
 * The first frame a player ever sees must not be a flat wall.
 *
 * The demo used to spawn facing the aft blast door two metres away, so clicking
 * through the splash put a dim featureless panel across the whole screen — which
 * got reported as "an all grey screen", and reasonably so. Concentration in the
 * busiest luminance bin separates the two cleanly: 61% for the blast door, 39%
 * for the corridor it now spawns on.
 */
const firstFrame = OUT.replace(/\.png$/, '') + '_firstframe.png';
await page.screenshot({ path: firstFrame });
const hist = analyse(firstFrame);
const topBin = Math.max(...hist.lumaHist);
check('the first frame is not a flat wall', topBin < 50,
  `busiest luminance bin holds ${topBin}% of pixels (blast door was 61%, corridor is 39%; ceiling 50%)`);

// In fallback mode looking is drag-based, so hold a button for the rest of the run.
if (DENY_LOCK) await page.mouse.down();

/* ------------------------------------------------------------- 2. walking */

// Face down the long axis of the corridor so there is room to walk.
await page.evaluate(() => {
  window.debugAPI.player.teleport(0, -3.0, 0, 0);   // yaw 0 = toward the bow
});
await frames(2);

await page.evaluate(() => window.debugAPI.resetFrames());
const t0 = Date.now();
const from = await page.evaluate(() => [window.debugAPI.player.pos.x, window.debugAPI.player.pos.z]);
await page.keyboard.down('KeyW');
await page.waitForTimeout(HOLD_MS);
await page.keyboard.up('KeyW');
const to = await page.evaluate(() => [window.debugAPI.player.pos.x, window.debugAPI.player.pos.z]);
const walkFrames = await page.evaluate(() => window.debugAPI.frames);
const seconds = (Date.now() - t0) / 1000;
const walkFps = walkFrames / seconds;
const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
const frac = dist / (WALK_SPEED * seconds);

// Below ~5 fps the loop's own hitch clamp (MAX_FRAME = 0.25 s) legitimately drops
// real time on the floor — that is the designed behaviour for a machine that
// cannot render, not the bug. Asserting real-time travel there would be crying
// wolf forever on a box with no GPU, so this defers to tools/simtest.mjs, which
// proves frame-rate independence against the same controller without a renderer.
const CAN_ASSERT_FPS = 6;
if (walkFps >= CAN_ASSERT_FPS) {
  check(
    'walking covers ground in real time',
    frac >= MIN_FRACTION,
    `${dist.toFixed(2)} m in ${seconds.toFixed(1)} s = ${(dist / seconds).toFixed(2)} m/s at ${walkFps.toFixed(1)} fps ` +
    `(${(frac * 100).toFixed(0)}% of the ${WALK_SPEED} m/s walk speed; floor is ${MIN_FRACTION * 100}%)`,
  );
} else {
  console.log(`  SKIP  walking covers ground in real time — only ${walkFps.toFixed(1)} fps while moving ` +
    `(${dist.toFixed(2)} m in ${seconds.toFixed(1)} s). Below ${CAN_ASSERT_FPS} fps the hitch clamp drops real ` +
    `time by design; run tools/simtest.mjs for the frame-rate independence proof.`);
}
// This one holds at any frame rate: the player must have actually moved.
check('walking moves the player at all', dist > 0.25, `${dist.toFixed(2)} m over ${walkFrames} frames`);

/* --------------------------------------------------------- 3. mouse look */

const yaw0 = await page.evaluate(() => window.debugAPI.player.yaw);
await page.mouse.move(W / 2 + 200, H / 2, { steps: 8 });
await frames(2);
const yaw1 = await page.evaluate(() => window.debugAPI.player.yaw);
check(`${DENY_LOCK ? 'drag' : 'mouse'} look turns the camera`, Math.abs(yaw1 - yaw0) > 0.05,
  `yaw ${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)}`);

// the keyboard-only route in, for anyone with neither pointer lock nor a mouse
await page.keyboard.down('ArrowLeft');
await frames(4);
await page.keyboard.up('ArrowLeft');
const yaw2 = await page.evaluate(() => window.debugAPI.player.yaw);
check('arrow keys turn the camera', Math.abs(yaw2 - yaw1) > 0.05,
  `yaw ${yaw1.toFixed(2)} -> ${yaw2.toFixed(2)}`);

/* ----------------------------------------------------------- 4. collision */

// Walk hard into the forward bulkhead; the player must stop, not pass through.
await page.evaluate(() => window.debugAPI.player.teleport(0, -20.0, 0, 0));
await page.keyboard.down('KeyW');
await page.waitForTimeout(2500);
await page.keyboard.up('KeyW');
const zEnd = await page.evaluate(() => window.debugAPI.player.pos.z);
check('collision stops the player at the bulkhead', zEnd > -21.4,
  `stopped at z=${zEnd.toFixed(2)} (corridor ends at -21.0)`);

/* --------------------------------------------------------- 5. interaction */

// stand in front of the bunk, aimed at it (same geometry as the `bedFront` view:
// yaw = atan2(-(tx - px), -(tz - pz)))
await page.evaluate(() => {
  const yaw = Math.atan2(-(-4.5 - -2.9), -(-8.35 - -7.7));
  window.debugAPI.player.teleport(-2.9, -7.7, yaw, -0.24);
});
await frames(3);
const prompt = await page.evaluate(() => window.debugAPI.getPrompt());
check('walking up to the bunk raises its prompt', /Sleep/i.test(prompt || ''), `prompt=${JSON.stringify(prompt)}`);
await page.evaluate(() => window.debugAPI.clearToast?.());
await page.keyboard.press('KeyE');
await page.waitForFunction(() => !!window.debugAPI.getLastToast(), null, { timeout: 60000, polling: 120 })
  .catch(() => {});
const toast = await page.evaluate(() => window.debugAPI.getLastToast());
check('pressing E runs the interaction', !!toast, `toast=${JSON.stringify(toast)}`);

/* -------------------------------------------------------------- 6. health */

const q = await page.evaluate(() => window.debugAPI.getQuality());
const s = await page.evaluate(() => window.debugAPI.getStats());
console.log(`· quality=${q.name} (auto=${q.auto}) calls=${s.calls} tris=${s.tris} updateMs=${s.updateMs}`);
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'none');

await page.screenshot({ path: OUT });
await browser.close();

const failed = checks.filter((c) => !c.ok);
console.log(failed.length ? `\n✘ ${failed.length}/${checks.length} playability checks FAILED` : `\n✔ all ${checks.length} playability checks passed (${path.resolve(OUT)})`);
process.exit(failed.length ? 1 : 0);
