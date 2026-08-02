import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import {
  recentre, taperSlab, zWedge, engineNozzle, glowRig, litTile, sym, mrot, RED,
  PLATE, BRICK, P, C, FINISH,
} from './_util.js';

/*
 * Class-6 escape pod -- the one the droids ride down to Tatooine. 10 studs
 * long, 6 wide, 5 tall, blunt wedge nose at +Z and one thruster bell aft.
 *
 * The cross section is six plate courses: narrow keel, two wide middle
 * courses, narrow roof. Stacking narrow-wide-narrow is how a LEGO hull gets a
 * rounded profile without a single curved part, and quantising each course to
 * the half-stud grid leaves the stepped edge that reads as brick-built. Each
 * course also stops at its own z, so the nose tapers in side view as well as
 * in plan.
 */

const WHITE = C.white;
const GRAY = C.lightBluishGray;
const DARK = C.darkBluishGray;

const NOSE_Z = 5.0;
const TAIL_Z = -4.4;

/** Half width of the widest course. Blunt nose, very slight boat tail. */
function halfW(z) {
  let w = 3.0;
  if (z > 1.4) w -= (z - 1.4) * 0.32;
  if (z < -3.2) w -= (-3.2 - z) * 0.18;
  return Math.max(1.4, w);
}

// bottom Y, thickness, width scale, colour, front cut
const COURSES = [
  [-2.30, P(1), 0.60, DARK, 3.4],
  [-1.90, P(2), 0.86, GRAY, 4.2],
  [-1.10, P(3), 1.00, GRAY, NOSE_Z],
  [0.10, P(3), 1.00, WHITE, NOSE_Z],
  [1.30, P(2), 0.86, WHITE, 4.2],
  [2.10, P(1), 0.60, WHITE, 3.4],
];
const TOP_Y = 2.50, BOT_Y = -2.30;

function hull(bb) {
  for (const [y, h, k, color, z1] of COURSES) {
    taperSlab(bb, {
      z0: TAIL_Z, z1, y, h, step: 1.4, grid: 0.5,
      halfW: (z) => halfW(z) * k, color, studs: false, free: true,
    });
  }

  // ---- nose: roof steps down over two courses, keel steps up ------------
  // Each ramp is as wide as the course it caps so nothing overhangs into a
  // wafer-thin flange.
  bb.slope(0, 2.10, 3.85, halfW(3.4) * 1.2, 0.9, { h: P(1), color: WHITE, rot: Math.PI / 2 });
  bb.slope(0, 1.30, 4.6, halfW(4.2) * 1.72, 0.8, { h: P(2), color: WHITE, rot: Math.PI / 2 });
  zWedge(bb, 0, halfW(3.4) * 1.2, [
    [3.4, -2.30], [4.3, -1.90], [3.4, -1.90],
  ], { color: DARK });
  zWedge(bb, 0, halfW(4.2) * 1.72, [
    [4.2, -1.90], [5.0, -1.10], [4.2, -1.10],
  ], { color: GRAY });

  // blunt bow cap: a bumper across the flat of the nose with a docking ring
  bb.brick(0, -0.80, NOSE_Z - 0.05, halfW(NOSE_Z) * 1.7, 0.5, {
    h: 1.9, color: GRAY, studs: false, free: true,
  });
  bb.cyl(0, 0.15, NOSE_Z + 0.25, 1.05, 0.4, { axis: 'z', color: DARK, seg: 10, stud: false });
  bb.cyl(0, 0.15, NOSE_Z + 0.4, 0.7, 0.3, { axis: 'z', color: C.black, seg: 10, stud: false });
  sym(bb, (b, s) => {
    b.slope(s * 1.15, -1.10, 4.1, 0.8, 1.8, { h: P(6), color: GRAY, rot: mrot(s) });
  });

  // ---- stern plate ------------------------------------------------------
  bb.brick(0, -1.90, TAIL_Z - 0.3, halfW(TAIL_Z) * 1.9, 0.6, {
    h: P(9), color: DARK, studs: false, free: true,
  });
}

/**
 * Three rib rings round the body -- the pod's most recognisable feature.
 * Hull-coloured, not dark: they should read as a raised band catching the
 * light, not as three black straps.
 */
function ribs(bb) {
  for (const z of [3.05, 0.5, -2.1]) {
    const hw = halfW(z);
    sym(bb, (b, s) => {
      b.brick(s * hw, -1.60, z, 0.34, 0.62, { h: 3.4, color: GRAY, studs: false, free: true });
    });
    bb.brick(0, TOP_Y - P(1), z, hw * 1.24, 0.62, {
      h: P(1) + 0.05, color: GRAY, tile: true, studs: false, free: true,
    });
    bb.brick(0, BOT_Y - 0.05, z, hw * 1.24, 0.62, {
      h: P(1) + 0.05, color: DARK, tile: true, studs: false, free: true,
    });
  }
}

function fittings(bb) {
  // ---- viewport slits on the flanks -------------------------------------
  sym(bb, (b, s) => {
    b.brick(s * (halfW(1.7) - 0.04), 0.28, 1.7, 0.3, 1.9, {
      h: 0.95, color: C.black, studs: false, free: true,
    });
    litTile(b, s * (halfW(1.7) + 0.1), 0.4, 1.7, 0.2, 1.7, { color: C.transLightBlue, h: 0.75 });
  });
  // dorsal sensor window
  bb.brick(0, TOP_Y - P(1), 2.2, 1.9, 1.4, {
    h: P(1) + 0.04, color: C.black, tile: true, studs: false, free: true,
  });
  litTile(bb, 0, TOP_Y - 0.08, 2.2, 1.6, 1.15, { color: C.transLightBlue, h: P(1) });

  // ---- red rescue striping: one band round the shoulders ----------------
  bb.brick(0, TOP_Y - 0.04, -1.0, halfW(-1.0) * 1.2, 1.3, {
    h: P(1), ...RED, tile: true, studs: false, free: true,
  });
  sym(bb, (b, s) => {
    b.brick(s * (halfW(-1.0) + 0.03), -0.2, -1.0, 0.24, 1.3, {
      h: 2.4, ...RED, studs: false, free: true,
    });
    b.brick(s * 1.1, TOP_Y - 0.04, 2.1, 0.55, 1.5, {
      h: P(1), ...RED, tile: true, studs: false, free: true,
    });
  });

  // ---- thruster bell + manoeuvring jets ---------------------------------
  bb.cyl(0, 0.1, TAIL_Z - 0.75, 1.7, 0.9, { axis: 'z', color: GRAY, seg: 12, stud: false });
  engineNozzle(bb, 'thruster', 0, 0.1, TAIL_Z - 1.45, 1.45, { depth: 1.1, seg: 12 });
  sym(bb, (b, s) => {
    b.cyl(s * 1.95, -1.35, TAIL_Z - 0.5, 0.4, 0.5, { axis: 'z', color: DARK, seg: 8, stud: false });
    b.cyl(s * 1.95, -1.35, TAIL_Z - 0.85, 0.32, 0.24, {
      axis: 'z', color: C.transLightBlue, finish: FINISH.GLOW, seg: 8, stud: false,
    });
  });

  // ---- hatch on the port flank ------------------------------------------
  bb.brick(-halfW(-0.6) + 0.02, -1.05, -0.6, 0.3, 2.4, {
    h: 2.2, color: WHITE, studs: false, free: true,
  });
  bb.cyl(-halfW(-0.6) - 0.06, 0.05, -0.6, 0.24, 0.34, { axis: 'x', color: DARK, seg: 6, stud: false });
  bb.node('hatch', -halfW(-0.6) - 0.5, 0.05, -0.6);
  bb.node('cockpit', 0, 0.6, 1.6);
}

function buildPod() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  hull(bb);
  ribs(bb);
  fittings(bb);

  const shell = bb.build();
  const model = recentre(shell, { y: 'centre' });
  const glow = glowRig(shell);
  // atmospheric entry: the little jets flicker, the main bell breathes
  model.userData.update = (t) => {
    glow.set(0.8 + Math.sin(t * 9.3) * 0.15 + Math.sin(t * 23.7) * 0.05);
  };
  return model;
}

register('escapepod', () => buildPod(), {
  notes: 'Class-6 escape pod, 10 studs long, wedge nose at +Z, glowing thruster aft. '
    + 'nodes thruster, hatch, cockpit',
});
