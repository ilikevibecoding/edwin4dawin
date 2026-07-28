#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Exercises the mouse camera controls and checks where the camera actually ends
// up, in the truck's own space, so "click puts you on the nose" is a number
// rather than an impression.
//
//   node tools/interact.mjs --out shots/interact
//
// State is asserted by stepping the rig by hand instead of waiting on requestAnimationFrame:
// a software frame is the better part of a minute, and none of these assertions
// need one. Only the final picture does.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const outDir = arg('out', 'shots/interact');
// A hosted build cannot be handed extra query parameters — a previewer's query
// string is the target URL — so --raw takes the URL as given and skips the
// picture, which is the only step that needs preserveDrawingBuffer.
const raw = argv.includes('--raw');
const url = raw ? arg('url') : `${arg('url', 'http://127.0.0.1:5185/?quality=fast')}&capture=1`;

const log = (...a) => console.log('[interact]', ...a);
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

/**
 * Camera position and aim in the truck's local frame: +Z is the nose, +X right.
 *
 * Steps the rig by hand rather than waiting for a render, and steps it enough
 * times to settle: the chase and orbit cameras are exponentially smoothed, so a
 * single 1/60 step only closes a tenth of the distance and every assertion
 * about where the camera ended up would be reading a value mid-flight.
 */
const readRig = (settle = 120) =>
  page.evaluate((steps) => {
    const { camera, vehicle, rig } = window.debugAPI.objects;
    for (let i = 0; i < steps; i++) rig.update(1 / 60, 8.6);
    vehicle.root.updateMatrixWorld();
    const inv = vehicle.root.matrixWorld.clone().invert();
    const p = camera.position.clone().applyMatrix4(inv);
    const fwd = camera.getWorldDirection(camera.position.clone().set(0, 0, 0));
    return {
      label: document.querySelector('#hud-cam')?.textContent ?? '',
      view: rig.view,
      mode: rig.mode,
      x: +p.x.toFixed(2),
      y: +p.y.toFixed(2),
      z: +p.z.toFixed(2),
      fov: +camera.fov.toFixed(1),
      aimWorld: [+fwd.x.toFixed(2), +fwd.y.toFixed(2), +fwd.z.toFixed(2)],
    };
  }, settle);

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
const page = await browser.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => log('page error:', e.message));

await mkdir(outDir, { recursive: true });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
log('booted');

// Hold the sim still so the truck does not drive out from under the assertions.
await page.evaluate(() => window.debugAPI.pause());

const cx = 240;
const cy = 135;

log('initial');
let s = await readRig();
check('starts on the chase cam', s.mode === 'chase' && s.view === null, s.label);
check('chase sits behind the cab', s.z < 0, `local z ${s.z}`);

log('click once');
await page.mouse.click(cx, cy);
s = await readRig();
check('first click selects the front view', s.view === 'front', s.label);
check('camera is ahead of the nose', s.z > 5, `local z ${s.z}`);
check('camera is at bumper height', s.y > 0.6 && s.y < 2.0, `local y ${s.y}`);
check('HUD names it', /front view/i.test(s.label), s.label);

if (raw) {
  log('skipping the capture (--raw)');
} else {
  log('capture the front');
  const dataUrl = await page.evaluate(() => window.debugAPI.captureFrame(2));
  const file = path.join(outDir, 'click-front.png');
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  log('wrote', file);
}

log('click through the rest of the tour');
const tour = [];
for (let i = 0; i < 5; i++) {
  await page.mouse.click(cx, cy);
  s = await readRig();
  tour.push(s.view ?? s.mode);
}
check(
  'tour walks the views then hands back to chase',
  tour.join(',') === 'hero,rear,wheel,interior,chase',
  tour.join(' -> '),
);

log('drag');
const before = await readRig();
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 120, cy + 20, { steps: 6 });
await page.mouse.up();
s = await readRig();
check('drag takes hold of the orbit', s.mode === 'orbit', s.label);
check('drag swings the camera round', Math.abs(s.x - before.x) > 1 || Math.abs(s.z - before.z) > 1, `x ${before.x}->${s.x}  z ${before.z}->${s.z}`);
check('a drag is not read as a click', s.view === null, `view ${s.view}`);

log('wheel');
const r0 = Math.hypot(s.x, s.z);
await page.mouse.move(cx, cy);
await page.mouse.wheel(0, -400);
s = await readRig();
const r1 = Math.hypot(s.x, s.z);
check('wheel pulls the camera in', r1 < r0, `radius ${r0.toFixed(2)} -> ${r1.toFixed(2)}`);

log('number keys');
await page.keyboard.press('Digit6');
s = await readRig();
check('6 jumps to the interior', s.view === 'interior', s.label);
await page.keyboard.press('Digit2');
s = await readRig();
check('2 jumps to the front', s.view === 'front', s.label);

log('camera key');
await page.keyboard.press('KeyC');
s = await readRig();
check('C leaves the view for a drive cam', s.view === null && s.mode === 'chase', s.label);

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
