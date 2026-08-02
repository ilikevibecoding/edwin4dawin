import * as THREE from 'three';
import { Kit, PLATE, BRICK, STUD_H } from './kit.js';
import { C, SW } from './palette.js';
import { FINISH } from '../core/materials.js';
import { makeRng } from '../core/rng.js';

/*
 * Set dressing.
 *
 * Everything here is small, cheap and greeble-friendly: crates to stack in a
 * hangar, consoles to line a corridor, pipes to run along a wall. Each prop is
 * exposed twice — as a `*Kit()` returning the raw Kit so a room can fold it in
 * with kit.merge() and keep a single batched draw, and as a `build*()` that
 * returns a finished Group for standalone use.
 *
 * Props are built facing -Z (the three.js forward axis) and centred on x = 0,
 * with y = 0 at the floor, so they drop straight into a set.
 */

const wrap = (kit, name) => kit.build({ name });

/*
 * kit.js sign conventions, established by rendering a probe rather than by
 * reading the docstrings, which disagree:
 *
 *   kit.poly(x, y, z, pts)     pts are [x, z] but z is mirrored on the way in
 *   kit.profile(x, y, z, pts)  pts are [z, y] and z is mirrored likewise
 *   kit.slope(...)             descends toward -Z, so its tall face is at +Z
 *
 * These adapters take coordinates in the documented sense and flip them, so
 * builds can be written the way the rest of the project reads.
 */
export const polyPts = (pts) => pts.map(([x, z]) => [x, -z]);
export const profilePts = (pts) => pts.map(([z, y]) => [-z, y]);

/** Y rotation that makes a kit.slope() descend toward the direction (dx, dz). */
export const slopeRot = (dx, dz) => Math.atan2(-dx, -dz);

// ------------------------------------------------------------------ crate --

/**
 * Cargo crate. Corner ribs, a recessed panel per face and a studded lid — the
 * classic 4x4 shipping container that stacks.
 */
export function crateKit({
  size = 4, bricks = 3, color = C.darkTan, trim = C.reddishBrown, seed = 'crate',
} = {}) {
  const k = new Kit('crate');
  const rng = makeRng(`crate-${seed}`);
  const s = size;
  const h = bricks * BRICK;
  const body = h - PLATE * 2;

  k.plate(0, 0, 0, s, s, trim, { studs: false });
  k.block(0, PLATE, 0, s, s, color, { h: body });

  // Corner ribs, fractionally proud of the body so the edges catch the key.
  const c = s / 2 - 0.5;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      k.box(sx * c, PLATE, sz * c, 1.16, body, 1.16, trim);
    }
  }

  // Recessed panel on each face.
  const pw = s - 1.9;
  const ph = body - 0.9;
  for (const sz of [-1, 1]) {
    k.box(0, PLATE + 0.45, sz * (s / 2 - 0.06), pw, ph, 0.18, trim);
    k.box(0, PLATE + 0.75, sz * (s / 2 + 0.02), pw - 1.0, ph - 0.8, 0.12, C.darkBrown);
  }
  for (const sx of [-1, 1]) {
    k.box(sx * (s / 2 - 0.06), PLATE + 0.45, 0, 0.18, ph, pw, trim);
    k.box(sx * (s / 2 + 0.02), PLATE + 0.75, 0, 0.12, ph - 0.8, pw - 1.0, C.darkBrown);
  }

  // Lid: a studded plate with a couple of latch tiles.
  k.plate(0, h - PLATE, 0, s, s, color);
  k.tile(0, h, s / 2 - 0.7, s - 2, 1, trim);
  if (rng.bool(0.6)) k.tile(0, h, -(s / 2 - 0.7), 1, 1, C.black);
  k.point('top', 0, h + STUD_H, 0);
  return k;
}

export function buildCrate(opts) { return wrap(crateKit(opts), 'crate'); }

/** A leaning stack of crates, for corners of a set. */
export function crateStackKit({ seed = 'stack', count = 4 } = {}) {
  const k = new Kit('crate-stack');
  const rng = makeRng(`crate-stack-${seed}`);
  const colors = [C.darkTan, C.reddishBrown, C.oliveGreen, C.darkBluishGray];
  let y = 0;
  for (let i = 0; i < count; i++) {
    const size = rng.bool(0.35) ? 3 : 4;
    const bricks = rng.int(2, 3);
    k.push()
      .translate(rng.range(-0.7, 0.7), y, rng.range(-0.7, 0.7))
      .rotY(rng.range(-0.22, 0.22));
    k.merge(crateKit({ size, bricks, color: rng.pick(colors), seed: `${seed}-${i}` }));
    k.pop();
    y += bricks * BRICK;
    if (i === 1 && count > 3) y = 0;      // start a second pile alongside
  }
  return k;
}

export function buildCrateStack(opts) { return wrap(crateStackKit(opts), 'crate-stack'); }

// ---------------------------------------------------------------- console --

/**
 * Angled control desk. The screen is a glowing tile laid on the slope, with a
 * row of coloured stud buttons along the front edge.
 */
export function consoleKit({
  w = 5, color = C.darkBluishGray, trim = C.black, screen = C.transLightBlue, seed = 'console',
} = {}) {
  const k = new Kit('console');
  const rng = makeRng(`console-${seed}`);

  k.plate(0, 0, 0, w + 0.5, 3.5, trim, { studs: false });
  k.block(0, PLATE, 0, w, 3, color, { h: BRICK });
  k.block(0, PLATE + BRICK, -0.3, w, 2.4, color, { h: BRICK });

  // Sloped desk top: rises 1.0 over 2.6 studs, falling toward the operator.
  const rise = 1.0;
  const run = 2.6;
  const y0 = PLATE + BRICK * 2;
  k.slope(0, y0, -0.1, w, run, trim, { h: rise, hFront: 0.12 });

  // Screen laid on the slope face.
  const ang = Math.atan2(rise - 0.12, run);
  k.push().translate(0, y0 + rise * 0.5 + 0.02, -0.1).rotX(-ang);
  k.tile(0, 0, 0, w - 1.4, run - 0.9, screen, { finish: FINISH.glow, emissive: 0.55, h: 0.12 });
  k.pop();

  // Button row and side greebles.
  const n = Math.max(2, Math.round(w) - 2);
  const btn = [C.red, C.green, C.yellow, C.orange];
  for (let i = 0; i < n; i++) {
    const x = -(n - 1) / 2 + i;
    k.stud(x, y0 + 0.1, 1.05, rng.pick(btn), { seg: 8 });
  }
  k.tile(0, PLATE + BRICK, 1.45, w - 1, 0.6, C.lightBluishGray);
  for (const s of [-1, 1]) k.cyl(s * (w / 2 - 0.35), PLATE, 1.2, 0.16, BRICK, C.flatSilver, { seg: 8 });

  k.point('screen', 0, y0 + rise * 0.6, -0.1);
  return k;
}

export function buildConsole(opts) { return wrap(consoleKit(opts), 'console'); }

// ---------------------------------------------------------- computer bank --

/**
 * Wall of readouts. Two rows of glowing screens in a dark cabinet with a pipe
 * run and vents on top; the standard back-of-shot Imperial/Rebel greeble.
 */
export function computerBankKit({
  w = 10, h = 7, body = C.darkBluishGray, seed = 'bank',
} = {}) {
  const k = new Kit('computer-bank');
  const rng = makeRng(`bank-${seed}`);
  const d = 2.6;

  k.plate(0, 0, 0, w + 0.6, d + 0.6, C.black, { studs: false });
  k.block(0, PLATE, 0, w, d, body, { h: h - PLATE * 2 });
  k.plate(0, h - PLATE, 0, w + 0.4, d + 0.4, C.black, { studs: false });

  // Vertical dividers.
  const bays = Math.max(2, Math.round(w / 3.2));
  const bw = w / bays;
  for (let i = 0; i <= bays; i++) {
    const x = -w / 2 + i * bw;
    k.box(x, PLATE, -d / 2 - 0.05, 0.34, h - PLATE * 2, 0.22, C.black);
  }

  const tints = [C.transLightBlue, SW.r2Blue, C.transGreen, C.transYellow];
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + bw * (i + 0.5);
    // Upper screen.
    k.box(x, h * 0.52, -d / 2 - 0.06, bw - 0.85, h * 0.3, 0.18, C.black);
    k.box(x, h * 0.545, -d / 2 - 0.16, bw - 1.15, h * 0.25, 0.1, rng.pick(tints),
      { finish: FINISH.glow, emissive: rng.range(0.35, 0.7) });
    // Lower panel: dials, a small readout, a vent.
    k.box(x, h * 0.16, -d / 2 - 0.06, bw - 0.85, h * 0.22, 0.16, C.black);
    k.box(x - bw * 0.2, h * 0.2, -d / 2 - 0.15, bw * 0.3, 0.34, 0.08, C.transGreen,
      { finish: FINISH.glow, emissive: 0.7 });
    for (let j = 0; j < 3; j++) {
      k.cyl(x + bw * 0.12 + j * 0.42, h * 0.17, -d / 2 - 0.14, 0.14, 0.14,
        rng.pick([C.red, C.yellow, C.lime]), { axis: 'z', seg: 8, finish: FINISH.glow, emissive: 0.8 });
    }
  }

  // Cooling stack on top: vents plus a pipe run along the cabinet.
  for (let i = 0; i < 3; i++) {
    k.box(-w / 2 + 1.2 + (i * (w - 2.4)) / 2, h, 0, 1.1, 0.7, d - 0.6, C.flatSilver);
  }
  k.push().translate(0, h + 0.95, -0.4);
  k.merge(pipeRunKit({ length: w - 1.5, count: 2, r: 0.24, spacing: 0.8, clampEvery: 4, axis: 'x' }));
  k.pop();
  k.point('top', 0, h, 0);
  return k;
}

export function buildComputerBank(opts) { return wrap(computerBankKit(opts), 'computer-bank'); }

// ------------------------------------------------------------- holo table --

/** Circular briefing table with a glowing emitter ring. */
export function holoTableKit({ r = 3.4, color = C.darkBluishGray, glow = C.transLightBlue } = {}) {
  const k = new Kit('holo-table');
  k.cyl(0, 0, 0, r * 0.42, 0.4, C.black, { seg: 20 });
  k.cyl(0, 0.4, 0, r * 0.3, 1.5, color, { seg: 16 });
  k.cyl(0, 1.9, 0, r, 0.5, color, { seg: 26 });
  k.torus(0, 2.2, 0, r - 0.06, 0.16, C.black, { seg: 26, rot: [Math.PI / 2, 0, 0] });
  k.cyl(0, 2.4, 0, r - 0.7, 0.12, C.black, { seg: 24 });
  k.cyl(0, 2.48, 0, r - 1.0, 0.08, glow, { seg: 24, finish: FINISH.glow, emissive: 0.5 });
  // Emitter studs around the rim.
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    k.stud(Math.cos(a) * (r - 0.42), 2.4, Math.sin(a) * (r - 0.42), C.flatSilver, { seg: 8 });
  }
  k.point('emitter', 0, 2.6, 0);
  return k;
}

/**
 * Standalone holo table with the projection cone above it.
 * userData.update(t, dt) turns the cone and breathes its brightness.
 */
export function buildHoloTable(opts = {}) {
  const kit = holoTableKit(opts);
  const g = kit.build({ name: 'holo-table' });
  const r = opts.r ?? 3.4;

  const beamGeo = new THREE.ConeGeometry(r - 1.0, 3.4, 22, 1, true);
  beamGeo.translate(0, 1.7, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x8fd8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.name = 'holoBeam';
  beam.position.y = 2.6;
  beam.rotation.x = Math.PI;      // wide end at the top
  beam.renderOrder = 3;
  g.add(beam);

  g.userData.beam = beam;
  g.userData.update = (t) => {
    beam.rotation.y = t * 0.5;
    beamMat.opacity = 0.13 + 0.05 * Math.sin(t * 2.3);
  };
  return g;
}

// --------------------------------------------------------------- pipe run --

/**
 * Parallel pipes with clamp brackets. axis 'z' runs them along the corridor,
 * 'x' across it. Length is in studs; the run is centred on the origin.
 */
export function pipeRunKit({
  length = 12, count = 3, r = 0.34, spacing = 0.86, color = C.flatSilver,
  clamp = C.darkBluishGray, clampEvery = 5, axis = 'z', vertical = false,
} = {}) {
  const k = new Kit('pipe-run');
  const off = (i) => (-(count - 1) / 2 + i) * spacing;
  for (let i = 0; i < count; i++) {
    const o = off(i);
    if (axis === 'z') k.cyl(o, 0, -length / 2, r, length, color, { axis: 'z', seg: 10 });
    else k.cyl(-length / 2, 0, o, r, length, color, { axis: 'x', seg: 10 });
  }
  const spanY = vertical ? 0 : r + 0.24;
  const n = Math.max(2, Math.floor(length / clampEvery));
  for (let j = 0; j <= n; j++) {
    const p = -length / 2 + (length * j) / n;
    const width = (count - 1) * spacing + r * 2 + 0.5;
    if (axis === 'z') k.box(0, -r - 0.2, p, width, 0.34, 0.5, clamp);
    else k.box(p, -r - 0.2, 0, 0.5, 0.34, width, clamp);
  }
  void spanY;
  return k;
}

export function buildPipeRun(opts) { return wrap(pipeRunKit(opts), 'pipe-run'); }

// ------------------------------------------------------------ floor grate --

/** Recessed walkway grate: a dark well with slats over it. */
export function floorGrateKit({ w = 4, d = 6, frame = C.darkBluishGray, slat = C.black } = {}) {
  const k = new Kit('floor-grate');
  k.tile(0, -0.55, 0, w, d, C.black, { bevel: false });
  // Frame lip.
  for (const s of [-1, 1]) {
    k.tile(s * (w / 2 - 0.3), -PLATE, 0, 0.6, d, frame);
    k.tile(0, -PLATE, s * (d / 2 - 0.3), w - 1.2, 0.6, frame);
  }
  const n = Math.max(2, Math.round((d - 1.6) / 0.9));
  for (let i = 0; i < n; i++) {
    const z = -(d - 1.6) / 2 + ((d - 1.6) * i) / (n - 1);
    k.box(0, -0.42, z, w - 1.3, 0.16, 0.34, slat);
  }
  return k;
}

export function buildFloorGrate(opts) { return wrap(floorGrateKit(opts), 'floor-grate'); }

// -------------------------------------------------------------- baseplate --

/** Plain studded baseplate. Set studs:false for a tiled floor. */
export function baseplateKit({ w = 32, d = 32, color = C.lightBluishGray, studs = true } = {}) {
  const k = new Kit('baseplate');
  k.plate(0, -PLATE, 0, w, d, color, { studs, castShadow: false });
  return k;
}

export function buildBaseplate(opts) { return wrap(baseplateKit(opts), 'baseplate'); }

// ---------------------------------------------------------------- barrier --

/** Hazard barrier: sloped face, warning stripes, splayed feet. */
export function barrierKit({ w = 8, color = C.darkBluishGray, stripe = C.yellow } = {}) {
  const k = new Kit('barrier');
  const h = 2.6;
  for (const s of [-1, 1]) {
    k.box(s * (w / 2 - 0.6), 0, 0, 1.0, 0.5, 3.0, C.black);
    k.box(s * (w / 2 - 0.6), 0.5, 0, 0.8, h - 0.5, 1.0, color);
  }
  // Face panel, leaning back a touch.
  k.push().translate(0, 0.9, -0.35).rotX(0.16);
  k.box(0, 0, 0, w - 0.6, 1.5, 0.34, color);
  const bands = Math.max(3, Math.round(w / 1.6));
  for (let i = 0; i < bands; i++) {
    if (i % 2) continue;
    const bw = (w - 1.2) / bands;
    k.box(-w / 2 + 0.6 + bw * (i + 0.5), 0.16, -0.24, bw * 0.92, 1.15, 0.12, stripe);
  }
  k.pop();
  k.box(0, h - 0.1, -0.2, w - 0.2, 0.34, 0.7, C.black);
  return k;
}

export function buildBarrier(opts) { return wrap(barrierKit(opts), 'barrier'); }

// ------------------------------------------------------ droid call button --

/** Wall plate with the big round call button and a status light. */
export function droidCallButtonKit({ color = C.darkBluishGray, button = C.red } = {}) {
  const k = new Kit('droid-call');
  k.box(0, 0, 0, 2.4, 3.2, 0.3, color);
  k.box(0, 0.25, -0.16, 1.9, 2.7, 0.14, C.black);
  k.cyl(0, 1.9, -0.2, 0.52, 0.24, C.flatSilver, { axis: 'z', seg: 14 });
  k.cyl(0, 1.9, -0.36, 0.42, 0.18, button, { axis: 'z', seg: 14, finish: FINISH.glow, emissive: 0.45 });
  k.box(0, 0.95, -0.24, 1.3, 0.34, 0.1, C.transGreen, { finish: FINISH.glow, emissive: 0.7 });
  for (const s of [-1, 1]) k.stud(s * 0.8, 0.5, -0.2, C.flatSilver, { seg: 8, rot: [-Math.PI / 2, 0, 0] });
  k.point('button', 0, 1.9, -0.4);
  return k;
}

export function buildDroidCallButton(opts) { return wrap(droidCallButtonKit(opts), 'droid-call-button'); }

// ------------------------------------------------------------------ misc --

/** Wall-mounted equipment box, the cheapest greeble in the bin. */
export function wallBoxKit({ w = 2.4, h = 1.8, d = 0.7, color = C.lightBluishGray, lit = false } = {}) {
  const k = new Kit('wall-box');
  k.box(0, 0, 0, w, h, d, color);
  k.box(0, h * 0.18, -d / 2 - 0.05, w - 0.7, h * 0.45, 0.12, C.black);
  if (lit) k.box(0, h * 0.24, -d / 2 - 0.12, w - 1.0, h * 0.3, 0.08, C.transLightBlue, { finish: FINISH.glow, emissive: 0.6 });
  for (const s of [-1, 1]) k.stud(s * (w / 2 - 0.34), h, 0, color, { seg: 8 });
  return k;
}

export function buildWallBox(opts) { return wrap(wallBoxKit(opts), 'wall-box'); }

// ----------------------------------------------------------------- probe --
// Temporary: pins down the sign conventions of slope / poly / profile.
function orientationProbeKit() {
  const k = new Kit('probe');
  k.brick(0, 0, 6, 2, 2, C.red);            // +Z marker
  k.brick(0, 0, -6, 2, 2, C.green);         // -Z marker
  k.brick(6, 0, 0, 2, 2, C.white);          // +X marker
  k.brick(-6, 0, 0, 2, 2, C.black);         // -X marker
  k.slope(0, 0, 0, 4, 4, C.orange, { h: 2.4 });
  k.poly(0, 0, 0, [[-1.5, 3], [1.5, 3], [0, 9]], 0.8, C.blue);   // apex at +z per doc
  k.profile(0, 3, 0, [[-3, 0], [3, 0], [3, 1.4]], 2, C.yellow);  // tall side at +z per doc
  return k;
}

export const EXHIBITS = {
  crate: () => buildCrate(),
  'crate-stack': () => buildCrateStack(),
  console: () => buildConsole(),
  'computer-bank': () => buildComputerBank(),
  'holo-table': () => buildHoloTable(),
  'pipe-run': () => buildPipeRun({ length: 14, count: 4 }),
  'floor-grate': () => buildFloorGrate(),
  baseplate: () => buildBaseplate({ w: 16, d: 16 }),
  barrier: () => buildBarrier(),
  'droid-call-button': () => buildDroidCallButton(),
  probe: () => orientationProbeKit().build({ name: 'probe' }),
  props: () => {
    const k = new Kit('props');
    k.push().translate(-11, 0, -5); k.merge(crateStackKit()); k.pop();
    k.push().translate(-1, 0, -6); k.merge(computerBankKit({ w: 9, h: 6 })); k.pop();
    k.push().translate(10, 0, -5); k.merge(consoleKit()); k.pop();
    k.push().translate(-10, 0, 5); k.merge(barrierKit()); k.pop();
    k.push().translate(0, 0, 6); k.merge(floorGrateKit()); k.pop();
    k.push().translate(9, 0, 5); k.merge(holoTableKit()); k.pop();
    k.push().translate(0, 6.5, -9.6); k.merge(droidCallButtonKit()); k.pop();
    k.push().translate(0, 5.4, 0); k.merge(pipeRunKit({ length: 16, count: 3, axis: 'x' })); k.pop();
    return k.build({ name: 'props' });
  },
};
