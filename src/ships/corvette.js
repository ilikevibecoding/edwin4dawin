import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import { quadTurret } from './turret.js';
import { mulberry32 } from '../engine/rng.js';
import {
  recentre, taperSlab, edgeStripe, engineNozzle, greebleField, glowRig, sym, mrot,
  PLATE, BRICK, P, C, FINISH,
} from './_util.js';

/*
 * CR90 corvette -- the Rebel blockade runner (Tantive IV).
 *
 * Layout, nose at +Z:
 *   z  +35 .. +15   hammerhead: a flat, wide arrowhead
 *   z  +16 .. +9    neck
 *   z   +9 .. -11   spine / main hull
 *   z  -11 .. -32   engine block; eleven nozzles fire back to z = -34.6
 *
 * A dorsal ridge runs unbroken from the engine block all the way out over the
 * hammerhead and ends in the bridge windscreen -- that ridge is what makes the
 * silhouette read as a CR90 rather than a generic wedge.
 */

const lerp = THREE.MathUtils.lerp;

const HEAD_Z0 = 15.5, HEAD_Z1 = 35.5, HEAD_HW = 10;
/** Hammerhead plan: an arrowhead with slightly full sides. */
const headHalf = (z) => 1.6 + (HEAD_HW - 1.6)
  * Math.pow(THREE.MathUtils.clamp((HEAD_Z1 - z) / (HEAD_Z1 - HEAD_Z0), 0, 1), 0.75);

/** Spine plan: slim behind the head, swelling to 12 studs over the belly. */
function spineHalf(z) {
  if (z > 16) return 2.5;
  if (z > 9) return lerp(3.5, 2.5, (z - 9) / 7);
  if (z > -2) return lerp(6, 3.5, (z + 2) / 11);
  return 6;
}

const RIDGE_Z0 = -11, RIDGE_Z1 = 28.5;
const ridgeHalf = (z) => (z < 14 ? 2.6 : lerp(2.6, 1.8, (z - 14) / (RIDGE_Z1 - 14)));

const ENG_Z0 = -32, ENG_Z1 = -11, ENG_HW = 9;
const SPINE_TOP = 6.4, HEAD_TOP = 4.8;

// Eleven sublight engines: an upper row of five over a lower row of six.
const ENGINES = [
  ...[-5.6, -2.8, 0, 2.8, 5.6].map((x) => [x, 5.5]),
  ...[-7, -4.2, -1.4, 1.4, 4.2, 7].map((x) => [x, 2.9]),
];

const WHITE = C.white, GRAY = C.lightBluishGray, DARK = C.darkBluishGray;

function hammerhead(bb) {
  const layers = [
    { y: 1.6, h: P(1), inset: 2.6, color: DARK },
    { y: 2.0, h: P(4), inset: 0.0, color: WHITE },
    { y: 3.6, h: P(2), inset: 1.6, color: GRAY },
    { y: 4.4, h: P(1), inset: 3.2, color: WHITE, studs: true },
  ];
  for (const L of layers) {
    taperSlab(bb, {
      z0: HEAD_Z0, z1: HEAD_Z1, y: L.y, h: L.h, step: 2,
      halfW: (z) => headHalf(z) - L.inset,
      minHalfW: 1, color: L.color, studs: L.studs ?? false, grid: 1,
    });
  }
  // Red leading-edge stripe, one tile per stepped band so it never overhangs.
  edgeStripe(bb, {
    z0: HEAD_Z0, z1: HEAD_Z1 - 1, step: 2, y: 3.6, w: 1.6, color: C.red, finish: FINISH.SOLID,
    halfW: (z) => headHalf(z),
  });
  // Blunt prow.
  bb.brick(0, 2.0, HEAD_Z1 - 0.4, 4, 1.6, { h: P(4), color: WHITE, studs: false });
  bb.slope(0, 3.6, HEAD_Z1 - 1.2, 1.6, 4, {
    h: P(2), color: C.red, finish: FINISH.SOLID, rot: -Math.PI / 2,
  });
  bb.tile(0, 1.6, HEAD_Z1 - 2.6, 5, 5, { color: DARK });
  // Forward sensor cluster on the centreline ahead of the ridge.
  bb.tile(0, HEAD_TOP, RIDGE_Z1 + 2.2, 4, 3.5, { color: GRAY });
  bb.cyl(0, HEAD_TOP, RIDGE_Z1 + 2.4, 0.7, P(2), { color: DARK, seg: 10, stud: false });

  // Sensor pits out on the wide part of the head.
  sym(bb, (b, s) => {
    b.cyl(s * 6.4, 4.4, HEAD_Z0 + 3.6, 0.85, P(1), { color: DARK, seg: 10, stud: false });
    b.cyl(s * 6.4, HEAD_TOP, HEAD_Z0 + 3.6, 0.6, P(1), { color: C.flatSilver, finish: FINISH.METAL, seg: 10, stud: false });
    b.tile(s * 4.5, HEAD_TOP, HEAD_Z0 + 9, 1, 6, { color: C.red, finish: FINISH.SOLID });
  });
}

/**
 * The dorsal ridge: one continuous run of bricks from the engine block to the
 * bridge windscreen, sitting on whatever hull is underneath it.
 */
function dorsalRidge(bb) {
  const base = HEAD_TOP;      // ridge floor over the head
  taperSlab(bb, {
    z0: RIDGE_Z0, z1: RIDGE_Z1, y: base, h: P(3), step: 2.5,
    halfW: ridgeHalf, minHalfW: 1.5, color: GRAY, grid: 0.5,
  });
  taperSlab(bb, {
    z0: RIDGE_Z0, z1: RIDGE_Z1 - 2, y: base + P(3), h: P(1), step: 2.5,
    halfW: (z) => ridgeHalf(z) - 0.6, minHalfW: 1, color: WHITE, studs: true, grid: 0.5,
  });
  // Ridge ends in a slope so the prow stays a clean arrowhead.
  bb.slope(0, base, RIDGE_Z1 + 1.1, 2.2, 3.4, { h: P(4), color: GRAY, rot: Math.PI / 2 });
  edgeStripe(bb, {
    z0: 8, z1: RIDGE_Z1 - 2, step: 2.5, y: base + P(3), w: 0.8, color: C.red, finish: FINISH.SOLID,
    halfW: ridgeHalf, grid: 0.5,
  });

  // Bridge: windscreen wrapped round the front of the ridge, dome behind it.
  const bz = RIDGE_Z1 - 1.2;
  bb.brick(0, base, bz + 0.5, 3.6, 1.4, { h: P(3), color: C.transLightBlue, finish: FINISH.TRANS, studs: false });
  sym(bb, (b, s) => {
    b.brick(s * 1.9, base, bz - 0.8, 0.7, 2.4, { h: P(3), color: C.transLightBlue, finish: FINISH.TRANS, studs: false });
    b.slope(s * 2.3, base, bz - 0.8, 0.9, 2.4, { h: P(3), color: WHITE, rot: mrot(s) });
  });
  bb.tile(0, base + P(3), bz + 0.2, 3, 2.4, { color: GRAY });
  bb.node('cockpit', 0, base + P(1.5), bz + 1.4);

  bb.cyl(0, base + P(3), RIDGE_Z1 - 7, 1.0, P(1), { color: DARK, seg: 12, stud: false });
  bb.sphere(0, base + P(4) + 0.3, RIDGE_Z1 - 7, 0.95, { color: C.veryLightGray, dome: true, seg: 12, rings: 5 });
  sym(bb, (b, s) => {
    b.cyl(s * 2.0, base + P(3), RIDGE_Z1 - 11, 0.4, P(2), { color: C.darkGray, seg: 8, stud: false });
  });
}

function neck(bb) {
  // Stepped transition: the head's 2.0 floor rises to the spine's 0.4 floor.
  bb.brick(0, 2.0, 14.0, 6, 4.4, { h: P(6), color: WHITE, studs: false });
  bb.brick(0, 1.2, 11.0, 7, 4.4, { h: P(7), color: WHITE, studs: false });
  bb.brick(0, 0.8, 9.6, 6, 2.4, { h: P(2), color: DARK, studs: false });
  sym(bb, (b, s) => {
    b.slope(s * 3.5, 2.0, 14.0, 1, 4.4, { h: P(6), color: GRAY, rot: mrot(s) });
    b.slope(s * 3.0, 1.2, 11.0, 1, 4.4, { h: P(7), color: GRAY, rot: mrot(s) });
    b.tile(s * 2.7, 4.4, 12.4, 1.2, 8.8, { color: C.red, finish: FINISH.SOLID });
  });
}

function spine(bb) {
  const layers = [
    { y: 0.4, h: P(3), inset: 2.0, color: DARK },
    { y: 1.6, h: P(4), inset: 0.5, color: GRAY },
    { y: 3.2, h: P(4), inset: 0.0, color: WHITE },
    { y: 4.8, h: P(3), inset: 1.0, color: GRAY },
    { y: 6.0, h: P(1), inset: 2.5, color: WHITE, studs: true },
  ];
  for (const L of layers) {
    taperSlab(bb, {
      z0: 9.6, z1: ENG_Z1, y: L.y, h: L.h, step: 2.4,
      halfW: (z) => spineHalf(z) - L.inset,
      minHalfW: 1, color: L.color, studs: L.studs ?? false, grid: 1,
    });
  }
  edgeStripe(bb, {
    z0: 9.6, z1: ENG_Z1, step: 2.4, y: 4.8, w: 1, color: C.red, finish: FINISH.SOLID,
    halfW: (z) => spineHalf(z) - 0.5,
  });
  // Escape-pod hatches down the flanks: this is where Leia's pod launches.
  sym(bb, (b, s) => {
    for (const z of [2, -1, -4, -7]) {
      b.cyl(s * 5.7, 3.8, z, 0.8, P(1), { axis: 'x', color: C.veryLightGray, seg: 10, stud: false });
      b.cyl(s * 5.95, 3.8, z, 0.42, P(1), { axis: 'x', color: DARK, seg: 8, stud: false });
    }
    b.brick(s * 6.05, 1.6, -2, 0.4, 16, { h: P(2), color: C.red, finish: FINISH.SOLID, studs: false, free: true });
  });
}

function engineBlock(bb) {
  const zc = (ENG_Z0 + ENG_Z1) / 2 - 0.5;
  const zd = (ENG_Z1 - ENG_Z0) - 1;
  const layers = [
    { y: -0.4, h: P(2), hw: ENG_HW - 2.5, color: DARK },
    { y: 0.4, h: P(3), hw: ENG_HW - 1, color: GRAY },
    { y: 1.6, h: P(13), hw: ENG_HW, color: WHITE },
    { y: 6.8, h: P(2), hw: ENG_HW - 1, color: C.red, finish: FINISH.SOLID },
    { y: 7.6, h: P(1), hw: ENG_HW - 3, color: WHITE, studs: true },
  ];
  for (const L of layers) {
    bb.brick(0, L.y, zc, L.hw * 2, zd, { h: L.h, color: L.color, finish: L.finish, studs: L.studs ?? false });
  }
  // Shoulders blending the narrow spine into the wide block.
  sym(bb, (b, s) => {
    b.prism([[s * 6, ENG_Z1 + 0.4], [s * 9, ENG_Z1 - 4.5], [s * 9, ENG_Z1 + 0.4]], P(13), {
      rx: Math.PI / 2, y: 1.6 + P(6.5), color: GRAY,
    });
    b.slope(s * 9, 6.8, ENG_Z1 - 2.2, 3, 3.6, { h: P(2), color: GRAY, rot: -Math.PI / 2 });
    b.slope(s * 9, 0.4, ENG_Z1 - 2.2, 3, 3.6, { h: P(3), color: GRAY, rot: -Math.PI / 2, inverted: true });
    // panel ribs, kept below the red band so they read as plating not stripes
    for (let z = ENG_Z1 - 3.5; z > ENG_Z0 + 1; z -= 4.2) {
      b.brick(s * (ENG_HW - 0.1), 1.6, z, 0.5, 1.4, { h: P(11), color: GRAY, studs: false, free: true });
    }
    b.brick(s * (ENG_HW - 0.05), 1.6, zc, 0.4, zd - 1.5, { h: P(1), color: C.red, finish: FINISH.SOLID, studs: false, free: true });
  });
  // Roof plating, dishes, stub mast.
  for (let i = -2; i <= 2; i++) {
    bb.tile(i * 3.2, 8.0, ENG_Z1 - 4.5, 2, 4, { color: i === 0 ? C.red : DARK, finish: FINISH.SOLID });
    bb.tile(i * 3.2, 8.0, ENG_Z1 - 9.5, 2, 4, { color: C.veryLightGray });
  }
  bb.cyl(0, 8.0, ENG_Z0 + 4.5, 0.75, P(3), { color: GRAY, seg: 10 });
  bb.bar(0, 8.0 + P(3) + 0.9, ENG_Z0 + 4.5, 0.1, 1.8, { color: C.flatSilver, finish: FINISH.METAL });
  sym(bb, (b, s) => {
    b.cyl(s * 5.5, 8.0, ENG_Z0 + 4.5, 0.5, P(2), { color: DARK, seg: 10, stud: false });
    b.sphere(s * 5.5, 8.0 + P(2), ENG_Z0 + 4.5, 1.0, { color: C.veryLightGray, dome: true, seg: 10, rings: 4, sy: 0.45 });
  });

  // Rear bulkhead + the eleven nozzles.
  bb.brick(0, 0.4, ENG_Z0 - 0.35, ENG_HW * 2 - 1.4, 0.7, { h: P(17), color: DARK, studs: false });
  ENGINES.forEach(([x, y], i) => {
    bb.cyl(x, y, ENG_Z0 - 0.9, 1.45, 0.6, { axis: 'z', color: C.darkGray, seg: 12, stud: false });
    engineNozzle(bb, `engine${i}`, x, y, ENG_Z0 - 2.1, 1.3, { depth: 2.6, seg: 12 });
  });
  bb.tile(-ENG_HW + 0.7, 8.0, ENG_Z0 + 1.6, 1, 1, { color: C.red, finish: FINISH.SOLID });
  bb.tile(ENG_HW - 0.7, 8.0, ENG_Z0 + 1.6, 1, 1, { color: C.brightGreen });
}

function underside(bb) {
  sym(bb, (b, s) => {
    b.tile(s * 3, 0.0, -6, 4, 8, { color: DARK });
    b.tile(s * 2.5, 0.0, 3, 3, 8, { color: C.darkGray });
    b.cyl(s * 4.5, 0.4 - P(2), 7.5, 0.9, P(2), { color: C.flatSilver, finish: FINISH.METAL, seg: 10, stud: false });
  });
  bb.tile(0, 1.6, HEAD_Z0 + 5, 7, 9, { color: DARK });
  bb.tile(0, 0.0, -1, 4, 10, { color: DARK });
  // Ventral comms array under the chin of the head.
  bb.brick(0, 1.2, HEAD_Z0 + 3.5, 5, 5, { h: P(1), color: C.darkGray, studs: false });
  sym(bb, (b, s) => {
    b.cyl(s * 1.4, 0.9, HEAD_Z0 + 3.5, 0.7, P(1), { color: DARK, seg: 10, stud: false });
    b.cyl(s * 4.5, 0.4, -5, 0.55, P(2), { color: C.darkGray, seg: 8, stud: false });
  });
  const belly = mulberry32(90210);
  greebleField(bb, belly, {
    x0: -5, x1: 5, z0: -10, z1: 8, y: 0.4, count: 46, maxW: 3, maxD: 3, down: true,
    colors: [DARK, C.darkGray, C.black, C.flatSilver],
  });
}

function buildCorvette() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  hammerhead(bb);
  neck(bb);
  spine(bb);
  dorsalRidge(bb);
  engineBlock(bb);
  underside(bb);
  const shell = bb.build();

  // The turbolaser turrets stay live rigs so scenes can track them.
  const dorsal = quadTurret({ scale: 1.0 });
  dorsal.position.set(0, SPINE_TOP, -6.5);
  const ventral = quadTurret({ scale: 1.0, flip: true });
  ventral.position.set(0, 0.4, -6.5);

  const inner = new THREE.Group();
  inner.add(shell, dorsal, ventral);

  const nodes = { ...shell.userData.nodes, dorsalGun: dorsal, ventralGun: ventral };
  const engines = new THREE.Group();
  engines.name = 'engines';
  inner.add(engines);
  const engineNodes = [];
  for (let i = 0; i < ENGINES.length; i++) {
    const n = nodes[`engine${i}`];
    engines.add(n);          // same frame as shell, so world positions hold
    engineNodes.push(n);
  }
  nodes.engines = engines;
  inner.userData.nodes = nodes;

  const model = recentre(inner, { y: 'centre' });
  model.userData.engineNodes = engineNodes;
  model.userData.aim = dorsal.userData.aim;

  const glow = glowRig(shell);
  model.userData.update = (t) => {
    glow.set(0.92 + Math.sin(t * 5.1) * 0.08 + Math.sin(t * 11.3) * 0.03);
    dorsal.userData.aim(Math.sin(t * 0.35) * 0.8, 0.25 + Math.sin(t * 0.7) * 0.2);
    ventral.userData.aim(Math.sin(t * 0.31 + 2) * 0.8, 0.2);
  };
  return model;
}

register('corvette', () => buildCorvette(), {
  notes: 'CR90 blockade runner, ~70 studs long; nodes engine0..engine10, engines, cockpit, dorsalGun, ventralGun',
});
