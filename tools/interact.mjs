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
    const { camera, vehicle, rig, driver } = window.debugAPI.objects;
    // the real heading, so cameras placed off the heading land where the
    // truck-local readout below expects them
    const drive = { speed: 8.6, steer: 0, heading: driver.state.heading };
    for (let i = 0; i < steps; i++) rig.update(1 / 60, drive);
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
check('C leaves a beauty view for a drive cam', s.view === null && ['chase', 'hood', 'orbit'].includes(s.mode), s.label);

const seen = [s.view ?? s.mode];
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('KeyC');
  s = await readRig();
  seen.push(s.view ?? s.mode);
}
check('the camera key reaches the cockpit', seen.includes('interior'), seen.join(' -> '));
check('the camera key reaches the cinematic and wildlife cams', seen.includes('cinematic') && seen.includes('wildlife'), seen.join(' -> '));

log('cinematic director');
await page.evaluate(() => {
  const { rig } = window.debugAPI.objects;
  rig.mode = 'cinematic';
});
s = await readRig(30);
const firstShotPos = [s.x, s.y, s.z];
check('cinematic places the camera somewhere other than the chase offset', Math.abs(s.z + 7.84) > 0.5, `local ${firstShotPos.join(',')}`);
// run the director past its first hold so it cuts
s = await readRig(60 * 8);
check('the director cuts to a different shot', Math.hypot(s.x - firstShotPos[0], s.z - firstShotPos[2]) > 1, `local ${[s.x, s.y, s.z].join(',')}`);
check('the camera stays above the ground through a cut', s.y > 0.2, `local y ${s.y}`);

log('wildlife cam');
await page.evaluate(() => {
  window.debugAPI.objects.rig.mode = 'wildlife';
});
s = await readRig();
check('wildlife cam sits on the roof', s.y > 1.8 && Math.abs(s.x) < 1 && s.z > -1.2 && s.z < 0.4, `local ${[s.x, s.y, s.z].join(',')}`);
check('wildlife cam uses a long lens', s.fov <= 40, `fov ${s.fov}`);

log('photo mode');
await page.keyboard.press('KeyC');
const beforePhoto = await readRig();
await page.keyboard.press('KeyP');
s = await readRig(5);
check('P enters photo mode', /photo/i.test(s.label), s.label);
const hudHidden = await page.evaluate(() => document.querySelector('.hud').style.opacity === '0');
check('photo mode hides the HUD', hudHidden);
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 120, cy, { steps: 5 });
await page.mouse.up();
s = await readRig();
check('drag orbits in photo mode', /photo/i.test(s.label) && s.mode === 'orbit', `${s.label} / ${s.mode}`);
await page.keyboard.press('KeyP');
// leaving photo mode unfreezes the world; hold it still again for the readout
await page.evaluate(() => window.debugAPI.pause());
s = await readRig(5);
check('P again returns to the previous camera', s.mode === beforePhoto.mode && s.view === beforePhoto.view, `${beforePhoto.label} -> ${s.label}`);
const hudBack = await page.evaluate(() => document.querySelector('.hud').style.opacity !== '0');
check('the HUD comes back', hudBack);

log('free look from the cab');
await page.evaluate(() => window.debugAPI.objects.rig.showView('interior'));
const seat = await readRig();
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 150, cy, { steps: 6 });
await page.mouse.up();
s = await readRig();
check('drag in the cab does not kick out to the orbit', s.view === 'interior', s.label);
check('the eye stays in the seat', Math.abs(s.x - seat.x) < 0.02 && Math.abs(s.z - seat.z) < 0.02, `local x ${seat.x}->${s.x} z ${seat.z}->${s.z}`);
const turned = Math.hypot(s.aimWorld[0] - seat.aimWorld[0], s.aimWorld[2] - seat.aimWorld[2]);
check('the head turns', turned > 0.15, `aim moved ${turned.toFixed(3)}`);

// ---------------------------------------------------------------------------
// Collision. The world is paused, so every run below steps the simulation by
// hand through debugAPI.collision.trace() and reads the truck back per frame:
// position, speed, the impact it reported, and the clearance of its three
// circles to the nearest hard collider (negative means inside one).
// ---------------------------------------------------------------------------
log('collision');
const hasCollision = await page.evaluate(() => !!window.debugAPI.collision);
check('debugAPI exposes the collision world', hasCollision);
if (hasCollision) {
  const stats = await page.evaluate(() => window.debugAPI.collision.stats);
  check('static colliders were registered at boot', stats.count > 100, `${stats.count} colliders, ${JSON.stringify(stats.byTag)}`);
  check('static build cost under 20 ms', stats.boot.ms < 20, `${stats.boot.ms} ms (${Object.entries(stats.boot.stages).map(([k, v]) => `${k} ${v}`).join(', ')})`);

  /** Put the truck at (x, z) facing `heading` under manual control with the wheel held, then run. */
  const ram = async (x, z, heading, { speed = 8.33, frames = 180, throttle = 1 } = {}) => {
    // manual control reads the keyboard every step, so the wheel is held
    // with a real key down rather than by poking the input
    if (throttle) await page.keyboard.down('KeyW');
    const trace = await page.evaluate(
      ({ x, z, heading, speed, frames, throttle }) => {
        const { driver } = window.debugAPI.objects;
        const s = driver.state;
        s.auto = false;
        s.pos.set(x, 0, z);
        s.heading = heading;
        s.speed = speed;
        s.spin = 0;
        s.jolt = 0;
        s.contact = false;
        driver.input.throttle = throttle;
        driver.input.brake = 0;
        driver.input.steer = 0;
        s.steer = 0;
        return window.debugAPI.collision.trace(frames, 1 / 60);
      },
      { x, z, heading, speed, frames, throttle },
    );
    if (throttle) await page.keyboard.up('KeyW');
    return trace;
  };

  /** What a head-on run did: penetration, when it stopped, how many impacts it reported. */
  const headOn = (trace) => {
    const first = trace.findIndex((f) => f.contact);
    const minClear = Math.min(...trace.map((f) => f.clearance));
    const impacts = trace.filter((f) => f.impact > 3).length;
    const peak = Math.max(...trace.map((f) => f.impact));
    let stopped = -1;
    if (first >= 0) {
      // first frame after which |speed| never comes back above 1 m/s
      for (let i = first; i < trace.length; i++) {
        if (trace.slice(i).every((f) => Math.abs(f.speed) < 1)) {
          stopped = i;
          break;
        }
      }
    }
    const after = first >= 0 ? trace.slice(first + 30) : [];
    return {
      first,
      minClear,
      impacts,
      peak: +peak.toFixed(2),
      stopS: stopped >= 0 ? +((stopped - first) / 60).toFixed(3) : null,
      quietAfterHalfSecond: after.length > 0 && after.every((f) => Math.abs(f.speed) < 1),
      tag: trace[first]?.tag,
      accelPeak: +Math.min(...trace.map((f) => f.accel)).toFixed(1),
    };
  };
  const reportHeadOn = (label, r) => {
    check(`${label}: the truck made contact`, r.first >= 0, r.first >= 0 ? `frame ${r.first} (${r.tag})` : 'never touched');
    check(`${label}: never left inside a collider`, r.minClear > -0.01, `min clearance ${r.minClear.toFixed(4)} m`);
    check(`${label}: under 1 m/s within 0.5 s of contact`, r.quietAfterHalfSecond, `settled ${r.stopS} s after contact`);
    check(`${label}: impact fired once`, r.impacts === 1, `${r.impacts} impact(s) over 3 m/s, peak ${r.peak} m/s, accel ${r.accelPeak} m/s²`);
  };

  // (a) a culvert headwall, from six metres, at 30 km/h
  const hw = await page.evaluate(() => {
    const { terrain } = window.debugAPI.objects;
    const h = terrain.riverbed?.headwalls?.[0];
    if (!h) return null;
    // the wall's face is on the channel side; stand six metres out from it
    return { x: h.x + h.nx * 6, z: h.z + h.nz * 6, heading: Math.atan2(-h.nx, -h.nz) };
  });
  check('a culvert headwall is exposed by the terrain', !!hw);
  if (hw) reportHeadOn('headwall', headOn(await ram(hw.x, hw.z, hw.heading)));

  // (b) a parked vehicle, into its tail from the lane (the row is too tight to
  // come at one from the side without starting inside its neighbour), and a
  // guest tent into its back wall from the savanna side
  const fv = await page.evaluate(() => {
    const cols = window.debugAPI.collision.colliders().filter((c) => c.tag === 'vehicle' && c.type === 'box');
    const c = cols.find((v) => /jeep/.test(v.name || '')) || cols[0];
    if (!c) return null;
    const fx = Math.sin(c.heading);
    const fz = Math.cos(c.heading);
    return { x: c.x - fx * (c.hl + 6), z: c.z - fz * (c.hl + 6), heading: c.heading, name: c.name };
  });
  check('the fleet registered vehicles', !!fv, fv?.name);
  if (fv) reportHeadOn('fleet vehicle', headOn(await ram(fv.x, fv.z, fv.heading)));

  const tent = await page.evaluate(() => {
    const cols = window.debugAPI.collision.colliders().filter((c) => c.tag === 'tent' && c.type === 'box' && c.name === 'tent');
    const c = cols[2] || cols[0];
    if (!c) return null;
    const fx = Math.sin(c.heading);
    const fz = Math.cos(c.heading);
    return { x: c.x - fx * (c.hl + 6), z: c.z - fz * (c.hl + 6), heading: c.heading };
  });
  check('the camp registered tents', !!tent);
  if (tent) reportHeadOn('tent', headOn(await ram(tent.x, tent.z, tent.heading)));

  // (d) a glancing pass along the boma at 15 degrees, wheel held straight
  const glance = await page.evaluate(() => {
    const { camp } = window.debugAPI.objects;
    const cols = window.debugAPI.collision.colliders().filter((c) => c.name === 'boma');
    if (!cols.length || !camp?.frame) return null;
    const a = (15 * Math.PI) / 180;
    // inside the camp, 2 m clear of the pile, heading along it and 15° into it
    const v = -22.2 + 0.7 + 1.05 + 2.0;
    const u = 6;
    const p = camp.frame.toWorld(u, v);
    const heading = camp.frame.worldHeading(Math.cos(a), -Math.sin(a));
    const tangent = camp.frame.worldHeading(1, 0);
    return { x: p.x, z: p.z, heading, tangent, start: [u, v] };
  });
  check('the boma is registered', !!glance);
  if (glance) {
    // judged over the second after contact: the truck is still along the pile
    // then, and has not yet reached whatever the camp put past its end
    const full = await ram(glance.x, glance.z, glance.heading, { speed: 8, frames: 150, throttle: 1 });
    const first = full.findIndex((f) => f.contact);
    check('boma glance: the truck touched the boma', first >= 0 && full[first].tag === 'structure', first >= 0 ? `frame ${first} (${full[first].tag})` : 'never touched');
    if (first >= 0) {
      const tr = full.slice(0, first + 61);
      const v0 = tr[first - 1]?.speed ?? tr[first].speed;
      const after = tr.slice(first);
      const vMin = Math.min(...after.map((f) => f.speed));
      const ratio = vMin / v0;
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      const endAngle = Math.abs(wrap(tr[tr.length - 1].h - glance.tangent));
      const minClear = Math.min(...tr.map((f) => f.clearance));
      const travelled = Math.hypot(tr[tr.length - 1].x - tr[first].x, tr[tr.length - 1].z - tr[first].z);
      check('boma glance: the truck slides rather than stops', ratio > 0.6, `speed ${v0.toFixed(2)} -> min ${vMin.toFixed(2)} m/s (${(ratio * 100).toFixed(0)} %)`);
      check('boma glance: the wall steers the truck along itself', endAngle < 0.2, `${((endAngle * 180) / Math.PI).toFixed(1)}° off the line at the end, ${travelled.toFixed(1)} m on`);
      check('boma glance: never inside the pile', minClear > -0.01, `min clearance ${minClear.toFixed(4)} m`);
    }
  }

  // (c) the whole auto-drive route, both ways along the mainline: no hard
  // contact, and never closer than 0.4 m to anything static
  const route = await page.evaluate(() => {
    const api = window.debugAPI;
    const { driver, terrain } = api.objects;
    const s = driver.state;
    const run = (setup, maxFrames) => {
      setup();
      let minClear = Infinity;
      let where = null;
      let contacts = 0;
      let frames = 0;
      let maxSpeed = 0;
      let atJunction = null;
      const j = terrain.junction;
      for (let k = 0; k < maxFrames; k++) {
        const tr = api.collision.trace(30, 1 / 60);
        frames += 30;
        for (const f of tr) {
          if (f.contact) contacts++;
          if (f.speed > maxSpeed) maxSpeed = f.speed;
          if (f.clearance < minClear) {
            minClear = f.clearance;
            const near = api.collision.clearance(f.x, f.z, 1.05);
            where = { x: +f.x.toFixed(1), z: +f.z.toFixed(1), speed: +f.speed.toFixed(1), route: s.route, t: +s.autoT.toFixed(3), tag: near.tag, name: near.name };
          }
          const dj = Math.hypot(f.x - j.x, f.z - j.z);
          if (dj < 6 && (!atJunction || f.clearance < atJunction.clearance)) atJunction = { clearance: +f.clearance.toFixed(2), speed: +f.speed.toFixed(1), dj: +dj.toFixed(1) };
        }
        if (setup.done()) break;
      }
      return { minClear: +minClear.toFixed(3), where, contacts, frames, maxSpeed: +maxSpeed.toFixed(1), atJunction, seconds: +(frames / 60).toFixed(0) };
    };
    // forward: from high on the spur, through the junction, along the mainline
    // to its end. Not from the very top: the spur's first 40 m lie outside the
    // driver's playable-area clamp (terrain.size * 0.45), so a truck put there
    // is snapped 19 m sideways before it moves.
    const fwd = () => {
      s.auto = true;
      driver.resetAuto(0.12);
      const p = terrain.roadPoint(0.12);
      const t = terrain.roadTangent(0.12);
      s.pos.copy(p);
      s.heading = Math.atan2(t.x, t.z);
      s.speed = 6;
      s.spin = 0;
      s.contact = false;
    };
    fwd.done = () => s.route === 'main' && s.autoT > 0.955;
    // back: the mainline the other way, from its far end down past the camp to the junction
    const back = () => {
      s.auto = true;
      driver.resetAuto(0.5);
      s.route = 'main';
      s.turned = true;
      s.autoDir = -1;
      s.autoT = 0.955;
      const p = terrain.mainPoint(0.955);
      const t = terrain.mainTangent(0.955);
      s.pos.copy(p);
      s.heading = Math.atan2(-t.x, -t.z);
      s.speed = 6;
      s.spin = 0;
      s.contact = false;
    };
    back.done = () => s.route !== 'main' || s.autoT < 0.045;
    const out = { forward: run(fwd, 400), back: run(back, 400) };
    // leave the truck where the capture tools expect it
    driver.resetAuto(0.42);
    return out;
  });
  for (const dir of ['forward', 'back']) {
    const r = route[dir];
    check(`auto-drive ${dir}: no hard contact over the route`, r.contacts === 0, `${r.contacts} contact frames in ${r.seconds} s, cruise ${r.maxSpeed} m/s`);
    check(`auto-drive ${dir}: clearance ≥ 0.4 m to every static collider`, r.minClear >= 0.4, `min ${r.minClear} m at ${JSON.stringify(r.where)}`);
    if (r.atJunction) console.log(`        ${dir} at the junction: clearance ${r.atJunction.clearance} m at ${r.atJunction.speed} m/s`);
  }

  // cost
  // Per-frame samples come from performance.now() round the resolve in the
  // driver, which in a headless browser ticks in 0.1 ms steps: a frame reads 0
  // or 0.1, so the p99 can only ever be "under one tick". The batch is timed as
  // a whole and gives the real per-resolve figure.
  const perf = await page.evaluate(() => {
    const api = window.debugAPI;
    const { driver } = api.objects;
    driver.state.auto = true;
    driver.resetAuto(0.42);
    api.collision.trace(600, 1 / 60);
    const st = api.collision.stats;
    // at the camp, where the grid is densest, and against the boma
    driver.resetAuto(0.6);
    api.collision.trace(30, 1 / 60);
    const free = api.collision.bench(2000);
    const c = api.collision.colliders().find((k) => k.name === 'boma');
    // the same pose every call: 5 cm into the pile, heading along it, so each
    // resolve is a full contact and push-out, not the first one only
    const touching = api.collision.bench(2000, { x: c.x + Math.cos(c.heading) * (c.hw + 1.0), z: c.z - Math.sin(c.heading) * (c.hw + 1.0), heading: c.heading, speed: 8 });
    driver.resetAuto(0.42);
    return { ...st, batch: { free: +free.toFixed(4), touching: +touching.toFixed(4) } };
  });
  check('resolve costs under 0.1 ms per frame', perf.resolveMs.mean < 0.1 && perf.resolveMs.p99 <= 0.1 && perf.batch.free < 0.1 && perf.batch.touching < 0.1, `per frame mean ${perf.resolveMs.mean} ms, p99 ${perf.resolveMs.p99} ms over ${perf.resolveMs.samples} frames (0.1 ms timer); batched ${perf.batch.free} ms free, ${perf.batch.touching} ms against the boma`);
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
