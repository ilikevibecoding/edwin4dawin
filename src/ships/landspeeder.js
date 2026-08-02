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
const TAN = C.darkTan;
const IRON = C.darkGray;

const NOSE_Z = 8.0;
const TAIL_Z = -7.6;
const DECK_Y = 0.0;           // top of the main deck plates
const TURBINE_X = 3.15;       // outboard intake centres

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

  // ---- bow: chamfered nose over the intakes -----------------------------
  zWedge(bb, 0, halfW(6.0) * 2, [
    [4.6, DECK_Y], [NOSE_Z - 0.4, DECK_Y - P(3)], [NOSE_Z - 0.4, DECK_Y - P(4)], [4.6, DECK_Y - P(4)],
  ], { color: GRAY });
  sym(bb, (b, s) => {
    // fender tips sweeping forward past the nose
    b.prism([
      [s * 3.9, 3.0], [s * 3.9, 6.2], [s * 2.5, 7.4], [s * 2.5, 3.0],
    ], P(2), { rx: Math.PI / 2, y: DECK_Y - P(2) + P(1), color: GRAY });
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

/** The three turbine intakes -- the X-34's signature. */
function turbines(bb) {
  const mk = (x, z, r, name) => {
    bb.cyl(x, DECK_Y - P(2), z - 0.9, r, 2.6, { axis: 'z', color: GRAY, seg: 12, stud: false });
    bb.cyl(x, DECK_Y - P(2), z + 0.45, r + 0.16, 0.55, { axis: 'z', color: DARK, seg: 12, stud: false });
    bb.cyl(x, DECK_Y - P(2), z + 0.7, r * 0.82, 0.4, { axis: 'z', color: C.black, seg: 12, stud: false });
    // compressor face set back inside the lip
    bb.cyl(x, DECK_Y - P(2), z + 0.15, r * 0.7, 0.3, { axis: 'z', color: IRON, seg: 10, stud: false });
    bb.cyl(x, DECK_Y - P(2), z + 0.3, 0.28, 0.5, { axis: 'z', color: C.flatSilver, finish: FINISH.SOLID, seg: 8, stud: false });
    bb.node(name, x, DECK_Y - P(2), z + 1.1);
  };
  mk(0, NOSE_Z - 0.6, 1.55, 'intakeC');
  mk(-TURBINE_X, 6.5, 1.3, 'intakeL');
  mk(TURBINE_X, 6.5, 1.3, 'intakeR');
  // nacelle fairings behind the outboard intakes
  sym(bb, (b, s) => {
    b.brick(s * TURBINE_X, DECK_Y - P(4), 3.6, 2.5, 3.2, {
      h: P(4), color: GRAY, studs: false, free: true,
    });
    b.slope(s * TURBINE_X, DECK_Y, 3.4, 2.5, 2.8, { h: P(2), color: DARK, rot: -Math.PI / 2 });
  });
}

/** Open tub with two seats, dash and windscreen. */
function cockpit(bb) {
  const cz = 0.2;
  // tub floor and the coaming round it
  bb.brick(0, DECK_Y - P(2), cz, 6.4, 6.4, { h: P(1), color: TAN, studs: false, free: true });
  sym(bb, (b, s) => {
    b.brick(s * 3.55, DECK_Y - P(2), cz, 0.7, 6.4, { h: P(4), color: GRAY, studs: false, free: true });
    b.brick(s * 3.55, DECK_Y + P(2), cz, 0.9, 6.4, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
  });
  bb.brick(0, DECK_Y - P(2), cz - 3.6, 7.2, 0.8, { h: P(4), color: GRAY, studs: false, free: true });

  // ---- two seats --------------------------------------------------------
  sym(bb, (b, s) => {
    const sx = s * 1.6;
    b.brick(sx, DECK_Y - P(1), cz - 0.4, 2.4, 2.4, { h: P(2), color: TAN, studs: false, free: true });
    b.brick(sx, DECK_Y - P(1), cz - 1.8, 2.4, 0.7, { h: P(6), color: TAN, studs: false, free: true });
    b.brick(sx, DECK_Y + P(5), cz - 1.8, 1.8, 0.6, {
      h: P(2), color: DARK, studs: false, tile: true, free: true,
    });
    b.node(s > 0 ? 'seatR' : 'seatL', sx, DECK_Y + P(1), cz - 0.3);
  });

  // ---- dash, steering yoke and windscreen -------------------------------
  bb.brick(0, DECK_Y - P(1), cz + 2.5, 6.0, 1.3, { h: P(4), color: DARK, studs: false, free: true });
  sym(bb, (b, s) => {
    litTile(b, s * 1.7, DECK_Y + P(3) - 0.05, cz + 2.5, 1.6, 0.9, { color: C.transLightBlue, h: P(1) });
  });
  bb.cyl(-1.6, DECK_Y + P(3), cz + 2.0, 0.7, P(1), { color: IRON, seg: 10, stud: false });
  bb.cyl(-1.6, DECK_Y + P(3) - 0.5, cz + 2.0, 0.16, 0.6, { color: IRON, seg: 6, stud: false });

  // wraparound screen: a low trans band, opaque frame
  bb.brick(0, DECK_Y + P(3), cz + 3.15, 6.2, 0.34, {
    h: 1.15, color: C.transLightBlue, finish: FINISH.TRANS, studs: false, free: true,
  });
  sym(bb, (b, s) => {
    b.brick(s * 3.1, DECK_Y + P(3), cz + 3.15, 0.44, 0.44, {
      h: 1.25, color: GRAY, studs: false, free: true,
    });
    // screen shoulders angling back to the coaming
    b.prism([
      [s * 3.1, cz + 3.15], [s * 3.55, cz + 3.15], [s * 3.55, cz + 1.6],
    ], 1.1, { rx: Math.PI / 2, y: DECK_Y + P(3) + 0.55, color: GRAY });
  });
  bb.brick(0, DECK_Y + P(3) + 1.15, cz + 3.15, 6.2, 0.5, {
    h: P(1), color: DARK, studs: false, tile: true, free: true,
  });
  bb.node('cockpit', 0, DECK_Y + P(3), cz - 0.3);
}

/** Weathering stripes and the odd panel, so it is not a bare grey shell. */
function trim(bb) {
  sym(bb, (b, s) => {
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
      b.cyl(s * 3.0, DECK_Y - P(5), z, 0.75, P(1), { color: IRON, seg: 8, stud: false });
      b.cyl(s * 3.0, DECK_Y - P(6), z, 0.6, P(1), {
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
