import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import {
  recentre, zWedge, glowRig, litTile, sym,
  P, C, FINISH,
} from './_util.js';

/*
 * SoroSuub X-34 landspeeder. 16 studs long, 9 across the fenders, 4 tall.
 *
 * Three turbine intakes across the bow, an open two-seat tub amidships, and
 * swept-back fenders carrying the outboard turbines. It hovers, so the model is
 * centred on Y like a flyer; a scene sets its own ride height. Bow at +Z.
 *
 * Weathered light-bluish-grey over tan, the way the screen prop looks: grey
 * panels, tan interior, bare metal round the intakes.
 */

const GRAY = C.lightBluishGray;
const DARK = C.darkBluishGray;
const TAN = C.tan;            // sun-bleached cowl panels
const HIDE = C.reddishBrown;  // seat upholstery
const IRON = C.darkGray;

const NOSE_Z = 8.0;
const PROW_Z = 7.6;           // prow face; the intake lips stand proud of it
const TAIL_Z = -7.6;
const DECK_Y = 0.0;           // top of the main deck plates
const TURBINE_X = 2.45;       // outboard intake centres, inboard of the fenders

/** Hull half width: waisted at the cockpit, flaring out to the fenders. */
function halfW(z) {
  if (z > 4.0) return 3.9 - (z - 4.0) * 0.30;      // bow tapers in
  if (z > -1.0) return 3.9;
  return 3.9 - (-1.0 - z) * 0.16;                   // tail tucks in
}

/* -------------------------------------------------------------------- hull */

function chassis(bb) {
  // ---- keel and deck ----------------------------------------------------
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    const za = TAIL_Z + (i / bands) * (NOSE_Z - TAIL_Z);
    const zb = TAIL_Z + ((i + 1) / bands) * (NOSE_Z - TAIL_Z);
    const zc = (za + zb) / 2;
    const hw = Math.max(0.8, Math.round(halfW(zc) * 2) / 2);
    bb.brick(0, DECK_Y - P(4), zc, hw * 2, zb - za, {
      h: P(2), color: DARK, studs: false, free: true,
    });
    bb.brick(0, DECK_Y - P(2), zc, hw * 2 - 0.5, zb - za, {
      h: P(2), color: GRAY, studs: false, free: true,
    });
  }
  // underside skid rails
  sym(bb, (b, s) => {
    b.brick(s * 2.6, DECK_Y - P(5), 0.4, 0.8, 12.0, {
      h: P(1), color: IRON, studs: false, tile: true, free: true,
    });
  });

  // ---- prow: a low block with a tan cowl over a grille of intakes ---------
  bb.brick(0, DECK_Y - P(3), 5.65, 7.6, 3.9, { h: P(3), color: GRAY, studs: false, free: true });
  zWedge(bb, 0, 7.6, [
    [3.7, DECK_Y], [PROW_Z, DECK_Y], [PROW_Z, DECK_Y + P(0.5)], [3.7, DECK_Y + P(1.2)],
  ], { color: TAN });
  // Keel chamfers up toward the nose, so the front face starts well above the
  // bottom of the hull: an inlet down at keel level reads as a wheel.
  zWedge(bb, 0, 7.6, [
    [3.4, DECK_Y - P(5)], [PROW_Z, DECK_Y - P(3)], [PROW_Z, DECK_Y - P(5)],
  ], { color: DARK });
  sym(bb, (b, s) => {
    // corners chamfered off the prow so it is not a plain slab
    b.prism([
      [s * 3.8, 3.6], [s * 3.8, 6.2], [s * 2.8, PROW_Z], [s * 2.8, 3.6],
    ], P(3), { rx: Math.PI / 2, y: DECK_Y - P(1.5), color: GRAY });
    // fender shoulder running back from the prow to the tail
    b.brick(s * 3.55, DECK_Y - P(4), -1.4, 0.8, 8.0, {
      h: P(2), color: DARK, studs: false, free: true,
    });
  });

  // ---- stern deck -------------------------------------------------------
  bb.brick(0, DECK_Y, -5.4, halfW(-5.4) * 2 - 0.4, 4.0, {
    h: P(3), color: GRAY, studs: false, free: true,
  });
  bb.brick(0, DECK_Y + P(3), -5.4, halfW(-5.4) * 2 - 1.6, 3.2, {
    h: P(1), color: DARK, studs: false, tile: true, free: true,
  });
  // stern vents
  for (let i = -1; i <= 1; i++) {
    bb.brick(i * 2.3, DECK_Y - P(3), TAIL_Z + 0.15, 1.7, 0.5, {
      h: P(4), color: IRON, studs: false, free: true,
    });
    bb.cyl(i * 2.3, DECK_Y - P(1), TAIL_Z - 0.2, 0.55, 0.3, {
      axis: 'z', color: C.transNeonOrange, finish: FINISH.GLOW, seg: 8, stud: false,
    });
  }
  bb.node('exhaust', 0, DECK_Y - P(1), TAIL_Z - 0.6);
}

/**
 * The three turbine intakes -- the X-34's signature. Set into the prow face so
 * only the lip stands proud; three loose barrels on the front read as plumbing.
 */
function turbines(bb) {
  const cy = DECK_Y - P(1.5);

  // A single grille plate across the prow ties the three inlets together, so
  // they read as engine mouths in a bulkhead rather than three loose discs.
  bb.brick(0, cy - 0.72, PROW_Z + 0.06, 7.2, 0.32, {
    h: 1.44, color: DARK, studs: false, free: true,
  });

  /*
   * Concentric rings stepping forward: bulkhead / bore / compressor / spinner.
   * Each ring's front face has to sit ahead of the one outside it, or the wider
   * cylinder's solid cap covers everything behind it. All solid too -- an open
   * tube would cull its own inner wall and the inlet would look hollow.
   */
  const mk = (x, r, name) => {
    bb.cyl(x, cy, PROW_Z + 0.16, r + 0.22, 0.36, { axis: 'z', color: GRAY, seg: 12, stud: false });
    bb.cyl(x, cy, PROW_Z - 0.3, r, 1.5, { axis: 'z', color: IRON, seg: 12, stud: false });
    bb.cyl(x, cy, PROW_Z + 0.42, r * 0.72, 0.24, { axis: 'z', color: GRAY, seg: 10, stud: false });
    bb.cyl(x, cy, PROW_Z + 0.46, 0.2, 0.3, {
      axis: 'z', color: C.flatSilver, finish: FINISH.SOLID, seg: 8, stud: false,
    });
    bb.node(name, x, cy, PROW_Z + 1.0);
  };
  mk(0, 0.62, 'intakeC');
  mk(-TURBINE_X, 0.55, 'intakeL');
  mk(TURBINE_X, 0.55, 'intakeR');

  // slats filling the grille between the inlets, so the round mouths read as
  // part of a vented bulkhead
  for (const x of [-3.35, -1.25, 1.25, 3.35]) {
    for (let i = 0; i < 3; i++) {
      bb.brick(x, cy - 0.55 + i * 0.42, PROW_Z + 0.12, 1.0, 0.26, {
        h: 0.24, color: GRAY, studs: false, tile: true, free: true,
      });
    }
  }
}

/** Open tub with two seats, dash and windscreen. */
function cockpit(bb) {
  const cz = 0.2;
  // tub floor and the coaming round it
  bb.brick(0, DECK_Y - P(2), cz, 6.4, 6.4, { h: P(1), color: DARK, studs: false, free: true });
  sym(bb, (b, s) => {
    b.brick(s * 3.55, DECK_Y - P(2), cz, 0.7, 6.4, { h: P(4), color: GRAY, studs: false, free: true });
    b.brick(s * 3.55, DECK_Y + P(2), cz, 0.9, 6.4, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
  });
  bb.brick(0, DECK_Y - P(2), cz - 3.6, 7.2, 0.8, { h: P(4), color: GRAY, studs: false, free: true });

  // ---- two seats: dark frames, tan cushions -----------------------------
  sym(bb, (b, s) => {
    const sx = s * 1.6;
    b.brick(sx, DECK_Y - P(1), cz - 0.4, 2.4, 2.4, { h: P(1), color: IRON, studs: false, free: true });
    b.brick(sx, DECK_Y, cz - 0.4, 2.1, 2.1, {
      h: P(1), color: HIDE, studs: false, tile: true, free: true,
    });
    b.brick(sx, DECK_Y - P(1), cz - 1.8, 2.4, 0.6, { h: P(5), color: IRON, studs: false, free: true });
    b.brick(sx, DECK_Y, cz - 1.9, 2.0, 0.3, { h: P(3), color: HIDE, studs: false, free: true });
    b.node(s > 0 ? 'seatR' : 'seatL', sx, DECK_Y + P(1), cz - 0.3);
  });

  // ---- dash, steering yoke ----------------------------------------------
  bb.brick(0, DECK_Y - P(1), cz + 2.5, 6.0, 1.2, { h: P(3), color: DARK, studs: false, free: true });
  sym(bb, (b, s) => {
    litTile(b, s * 1.6, DECK_Y + P(2) - 0.04, cz + 2.5, 1.5, 0.8, { color: C.transLightBlue, h: P(1) });
  });
  bb.cyl(-1.6, DECK_Y + P(2), cz + 1.95, 0.62, P(1), { color: IRON, seg: 10, stud: false });
  bb.cyl(-1.6, DECK_Y + P(2) - 0.4, cz + 1.95, 0.15, 0.45, { color: IRON, seg: 6, stud: false });

  // ---- low wraparound screen --------------------------------------------
  // Kept short: the X-34's screen is a lip you look over, not a windshield.
  bb.brick(0, DECK_Y + P(2), cz + 3.1, 5.6, 0.3, {
    h: 0.75, color: C.transLightBlue, finish: FINISH.TRANS, studs: false, free: true,
  });
  bb.brick(0, DECK_Y + P(2) + 0.75, cz + 3.1, 5.8, 0.42, {
    h: P(1), color: DARK, studs: false, tile: true, free: true,
  });
  sym(bb, (b, s) => {
    // screen shoulders angling back to the coaming
    b.prism([
      [s * 2.8, cz + 3.1], [s * 3.5, cz + 3.1], [s * 3.5, cz + 1.5],
    ], 0.75, { rx: Math.PI / 2, y: DECK_Y + P(2) + 0.375, color: C.transLightBlue, finish: FINISH.TRANS });
    b.brick(s * 3.15, DECK_Y + P(2), cz + 3.1, 1.3, 0.42, {
      h: 0.9, color: GRAY, studs: false, free: true, rot: 0,
    });
  });
  bb.node('cockpit', 0, DECK_Y + P(2), cz - 0.3);
}

/** Weathering stripes and the odd panel, so it is not a bare grey shell. */
function trim(bb) {
  // raised spine and panel seams breaking up the cowl
  bb.brick(0, DECK_Y + P(0.4), 5.3, 2.2, 3.0, {
    h: P(1), color: GRAY, studs: false, tile: true, free: true,
  });
  for (const z of [4.1, 6.4]) {
    bb.brick(0, DECK_Y + P(0.3), z, 7.4, 0.3, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
  }
  sym(bb, (b, s) => {
    b.brick(s * 2.55, DECK_Y - P(1) + 0.04, 5.2, 0.3, 3.4, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
    b.brick(s * 3.5, DECK_Y - P(4) + P(2), -3.0, 0.8, 3.2, {
      h: P(1), color: TAN, studs: false, tile: true, free: true,
    });
    b.brick(s * 2.2, DECK_Y - P(4), 7.0, 1.0, 1.0, {
      h: P(1), color: C.orange, studs: false, tile: true, free: true,
    });
  });
  bb.brick(0, DECK_Y + P(3) + P(1), -5.4, 2.4, 1.6, {
    h: P(1), color: TAN, studs: false, tile: true, free: true,
  });
  // hover-field emitters under the fenders: the reason it has no wheels
  sym(bb, (b, s) => {
    for (const z of [4.6, -0.6, -5.0]) {
      b.cyl(s * 3.0, DECK_Y - P(5), z, 0.85, P(1), { color: IRON, seg: 8, stud: false });
      b.cyl(s * 3.0, DECK_Y - P(5.6), z, 0.45, P(0.6), {
        color: C.transLightBlue, finish: FINISH.GLOW, seg: 8, stud: false,
      });
    }
  });
}

function buildSpeeder() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  chassis(bb);
  turbines(bb);
  cockpit(bb);
  trim(bb);

  const shell = bb.build();
  const model = recentre(shell, { y: 'centre' });
  const glow = glowRig(shell);
  model.userData.update = (t) => {
    glow.set(0.85 + Math.sin(t * 7.7) * 0.1);
  };
  return model;
}

register('landspeeder', () => buildSpeeder(), {
  notes: 'X-34 landspeeder, 16 studs long, three bow turbines, open two-seat tub. '
    + 'Hovers, so centred on Y. nodes seatL, seatR, cockpit, intakeL/C/R, exhaust',
});
