import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import {
  recentre, zWedge, glowRig, litTile, sym, taperSlab,
  P, C, FINISH,
} from './_util.js';

/*
 * SoroSuub X-34 landspeeder. 17 studs long, 9 across, under 4 tall. Bow at +Z.
 *
 * The read is all in the silhouette: a long low hull, three big open turbine
 * mouths filling a deep snout, and the tub cut into the back half so the seats
 * break the deck line. Two earlier passes came out looking like a pickup truck
 * -- slab sides, tall stern deck, and intakes too small to be anything but
 * wheels -- so here every outer edge is chamfered, nothing aft of the cockpit
 * rises above the coaming, and the mouths are 2 studs across, a quarter of the
 * beam, the way they are on the real prop.
 *
 * The bow dips below the keel line to give those mouths somewhere to live. That
 * is true to the X-34, and it makes the thing look like it is leaning into the
 * hover rather than sitting on something.
 *
 * It floats, so the model is centred on Y like a flyer and a scene picks its own
 * ride height. No wheels -- and no glowing pads underneath either, since lit
 * discs on the keel read as castors from three-quarter front.
 */

const GRAY = C.lightBluishGray;
const DARK = C.darkBluishGray;
const TAN = C.tan;            // sun-bleached bonnet and tonneau panels
const HIDE = C.darkRed;       // seat upholstery
const IRON = C.darkGray;

const FRONT = 7.4;            // bow bulkhead; the intake lips stand proud of it
const TAIL = -8.6;
const HULL_Y = 0;             // keel line down the length of the hull
const HULL_H = P(4);
const DECK_Y = HULL_Y + HULL_H;
const DECK_H = P(1);
const DECK_TOP = DECK_Y + DECK_H;
const COAM_TOP = DECK_TOP + P(2);   // top of the cockpit coaming
const CHIN_Y = HULL_Y - P(2);       // underside of the snout
const CHIN_Z = 3.4;                 // where the keel starts dropping into it
const INTAKE_Y = (CHIN_Y + DECK_TOP) / 2;
const INTAKE_X = 3.05;
const INTAKE_R = 1.0;

/**
 * Hull half width. Widest across the bow, where the outboard turbines live,
 * then tucked in gently to a narrow tail. Quantised to half studs by taperSlab.
 */
function halfW(z) {
  if (z > 2.0) return 4.5;
  if (z > -2.0) return 4.3;
  if (z > -5.0) return 4.0;
  return Math.max(2.4, 4.0 - (-5.0 - z) * 0.42);
}

/** Chamfer strip along one flank: profile drawn in cross-section, run along Z. */
function flankChamfer(bb, s, z0, z1, pts, color) {
  bb.prism(pts.map(([x, y]) => [s * x, y]), z1 - z0, { z: (z0 + z1) / 2, color });
}

/* -------------------------------------------------------------------- hull */

function chassis(bb) {
  // ---- keel, main course, deck ------------------------------------------
  taperSlab(bb, {
    z0: TAIL, z1: FRONT, y: HULL_Y - P(1), h: P(1), step: 2,
    halfW: (z) => halfW(z) - 0.9, color: DARK, grid: 0.5, free: true,
  });
  taperSlab(bb, {
    z0: TAIL, z1: FRONT, y: HULL_Y, h: HULL_H, step: 2,
    halfW, color: GRAY, grid: 0.5, free: true,
  });
  taperSlab(bb, {
    z0: TAIL, z1: FRONT, y: DECK_Y, h: DECK_H, step: 2,
    halfW: (z) => halfW(z) - 0.5, color: GRAY, grid: 0.5, tile: true, free: true,
  });

  // ---- chamfers: tuck the keel under, round the fender tops --------------
  const bands = [[TAIL, -5.0, 3.0], [-5.0, -2.0, 4.0], [-2.0, 2.0, 4.3], [2.0, FRONT, 4.5]];
  for (const [z0, z1, hw] of bands) {
    sym(bb, (b, s) => {
      // bottom outer corner slopes in and down to the keel
      flankChamfer(b, s, z0, z1, [
        [hw - 0.9, HULL_Y - P(1)], [hw, HULL_Y + P(1.5)], [hw - 0.9, HULL_Y + P(1.5)],
      ], GRAY);
      // the deck plate is inset, leaving the fender corner above the hull side
      flankChamfer(b, s, z0, z1, [
        [hw - 0.5, DECK_TOP], [hw, DECK_Y], [hw - 0.5, DECK_Y],
      ], GRAY);
      // rubbing strake along the crease
      b.brick(s * (hw - 0.15), DECK_Y - P(1), (z0 + z1) / 2, 0.4, z1 - z0, {
        h: P(1), color: DARK, studs: false, tile: true, free: true,
      });
    });
  }
}

/** The snout: a deep bow section carrying the turbines, plus its cowl. */
function bow(bb) {
  // chin block under the bow, and the ramp that lets the keel down into it
  taperSlab(bb, {
    z0: CHIN_Z + 1.2, z1: FRONT, y: CHIN_Y, h: P(2), step: 2,
    halfW: (z) => halfW(z) - 0.3, color: GRAY, grid: 0.5, free: true,
  });
  zWedge(bb, 0, 8.4, [
    [CHIN_Z - 1.0, HULL_Y], [CHIN_Z + 1.4, CHIN_Y], [CHIN_Z + 1.4, HULL_Y],
  ], { color: DARK });
  // bulkhead the three mouths are cut into
  bb.brick(0, CHIN_Y, FRONT - 0.5, 8.9, 1.0, {
    h: DECK_TOP - CHIN_Y, color: GRAY, studs: false, free: true,
  });
  // chin chamfered back so the mouths sit in a rounded snout, not a shoebox
  zWedge(bb, 0, 8.2, [
    [CHIN_Z + 1.4, CHIN_Y - 0.01], [FRONT, HULL_Y], [FRONT, CHIN_Y - 0.01],
  ], { color: DARK });
  sym(bb, (b, s) => {
    // bow corners knocked off, top and bottom
    b.prism([
      [s * 4.5, 4.6], [s * 4.5, FRONT], [s * 3.3, FRONT], [s * 3.3, 4.6],
    ], DECK_TOP - HULL_Y, { rx: Math.PI / 2, y: (HULL_Y + DECK_TOP) / 2, color: GRAY });
    b.prism([
      [s * 4.2, 5.0], [s * 4.2, FRONT], [s * 3.2, FRONT], [s * 3.2, 5.0],
    ], P(2), { rx: Math.PI / 2, y: CHIN_Y + P(1), color: DARK });
  });

  // ---- cowl brow ---------------------------------------------------------
  // It overhangs the mouths and falls away toward the nose, which is what keeps
  // the bow from reading as a radiator grille.
  zWedge(bb, 0, 8.6, [
    [1.6, DECK_TOP], [5.2, DECK_TOP], [FRONT + 0.45, DECK_Y],
    [FRONT + 0.45, DECK_Y - P(1)], [4.8, DECK_Y - P(1)], [1.6, DECK_Y - P(1)],
  ], { color: TAN });
}

/**
 * Ring of `n` chunky segments in the plane facing +Z, centred on (x, y, z).
 * cyl() cannot make a hole, so an intake lip has to be a ring of separate
 * parts -- which is how it would be built in bricks anyway.
 */
function lipRing(bb, x, y, z, rOuter, thick, depth, color, n = 16) {
  const rIn = rOuter - thick;
  const h = Math.PI / n;
  const pts = [
    [rIn * Math.cos(-h), rIn * Math.sin(-h)],
    [rOuter * Math.cos(-h), rOuter * Math.sin(-h)],
    [rOuter * Math.cos(h), rOuter * Math.sin(h)],
    [rIn * Math.cos(h), rIn * Math.sin(h)],
  ];
  for (let i = 0; i < n; i++) {
    bb.prism(pts, depth, { rz: (i / n) * Math.PI * 2, x, y, z, color });
  }
  return bb;
}

/**
 * The three turbine mouths -- the X-34's signature, and the whole reason the
 * bow is nine studs wide and dips below the keel.
 *
 * Each is a hole you can see into: a 16-segment lip standing proud of the
 * bulkhead, a black funnel narrowing away behind it, a hub on the axis and
 * vanes across the throat. Stepping solid cylinders forward instead is much
 * cheaper but builds a nose cone with a bright hub, and three of those low on
 * the bow read unmistakably as wheels.
 */
function turbines(bb) {
  const y = INTAKE_Y;
  const zf = FRONT + 0.1;

  const mk = (x, r, name) => {
    lipRing(bb, x, y, zf + 0.28, r, 0.28, 0.56, GRAY);
    lipRing(bb, x, y, zf - 0.2, r - 0.24, 0.18, 1.0, IRON);
    // funnel: wide at the lip, narrowing into the hull
    bb.cyl(x, y, zf - 0.75, r - 0.4, 1.3, {
      axis: 'z', rTop: r - 0.4, rBottom: r * 0.34, color: C.black, seg: 16, stud: false,
    });
    bb.cyl(x, y, zf - 1.4, r * 0.28, 0.6, { axis: 'z', color: IRON, seg: 10, stud: false });
    for (let i = 0; i < 4; i++) {
      bb.prism([
        [-(r - 0.36), -0.08], [r - 0.36, -0.08], [r - 0.36, 0.08], [-(r - 0.36), 0.08],
      ], 0.18, { rz: i * (Math.PI / 4), x, y, z: zf - 0.6, color: IRON });
    }
    bb.node(name, x, y, zf + 1.1);
  };
  mk(-INTAKE_X, INTAKE_R, 'intakeL');
  mk(0, INTAKE_R, 'intakeC');
  mk(INTAKE_X, INTAKE_R, 'intakeR');

  // ribs between the mouths -- flush with the bulkhead, not standing off it,
  // or they read as four black posts across the bow
  sym(bb, (b, s) => {
    b.brick(s * 1.52, y - 0.9, zf - 0.02, 0.62, 0.3, {
      h: 1.8, color: GRAY, studs: false, free: true,
    });
    b.brick(s * 1.52, y - 0.15, zf + 0.06, 0.5, 0.24, {
      h: 0.3, color: IRON, studs: false, tile: true, free: true,
    });
  });
}

/** Stern deck, turbine ducts and exhausts. */
function stern(bb) {
  zWedge(bb, 0, 6.0, [
    [TAIL, DECK_Y - P(1)], [-4.4, DECK_TOP], [-4.4, DECK_Y - P(1)],
  ], { color: GRAY });
  sym(bb, (b, s) => {
    // ducts breaking the stern deck, exhausts in their ends
    b.brick(s * 2.1, DECK_Y - P(2), -6.3, 2.3, 4.2, {
      h: P(3), color: GRAY, studs: false, free: true,
    });
    b.brick(s * 2.1, DECK_Y + P(1), -6.3, 1.7, 3.4, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
    b.cyl(s * 2.1, DECK_Y - P(0.5), TAIL + 0.5, 0.78, 0.7, {
      axis: 'z', color: IRON, seg: 12, stud: false,
    });
    b.cyl(s * 2.1, DECK_Y - P(0.5), TAIL + 0.28, 0.6, 0.3, {
      axis: 'z', color: C.transNeonOrange, finish: FINISH.GLOW, seg: 12, stud: false,
    });
    b.node(s > 0 ? 'exhaustR' : 'exhaustL', s * 2.1, DECK_Y - P(0.5), TAIL - 0.2);
  });
  litTile(bb, 0, DECK_TOP - 0.04, TAIL + 0.9, 2.0, 0.6, { color: C.transRed });
}

/** Open tub with two seats, dash, yoke and a low wraparound screen. */
function cockpit(bb) {
  const cz = -0.6;
  const W = 6.6;

  // tub floor sits a hair above the deck plate; flush, the two z-fight
  bb.brick(0, DECK_TOP - P(0.4) + 0.02, cz, W, 7.0, {
    h: P(0.4), color: IRON, studs: false, tile: true, free: true,
  });
  sym(bb, (b, s) => {
    b.brick(s * (W / 2 + 0.35), DECK_TOP, cz, 0.7, 7.0, {
      h: P(2), color: GRAY, studs: false, free: true,
    });
    b.brick(s * (W / 2 + 0.35), COAM_TOP, cz, 0.85, 7.0, {
      h: P(1), color: GRAY, studs: false, tile: true, free: true,
    });
  });
  // rear bulkhead of the tub, tied into the stern deck
  bb.brick(0, DECK_TOP, cz - 3.8, W + 1.4, 0.7, { h: P(2), color: GRAY, studs: false, free: true });
  bb.brick(0, COAM_TOP, cz - 3.8, W + 1.4, 0.85, {
    h: P(1), color: GRAY, studs: false, tile: true, free: true,
  });

  // ---- two seats: dark frames, oxblood cushions --------------------------
  sym(bb, (b, s) => {
    const sx = s * 1.62;
    b.brick(sx, DECK_TOP, cz - 0.5, 2.5, 2.6, { h: P(1), color: IRON, studs: false, free: true });
    b.brick(sx, DECK_TOP + P(1), cz - 0.5, 2.3, 2.4, {
      h: P(1), color: HIDE, studs: false, tile: true, free: true,
    });
    b.brick(sx, DECK_TOP, cz - 2.1, 2.5, 0.7, { h: P(3), color: IRON, studs: false, free: true });
    b.brick(sx, DECK_TOP + P(1), cz - 2.2, 2.2, 0.5, {
      h: P(3), color: HIDE, studs: false, free: true,
    });
    b.node(s > 0 ? 'seatR' : 'seatL', sx, DECK_TOP + P(1), cz - 0.4);
  });

  // ---- dash and yoke -----------------------------------------------------
  bb.brick(0, DECK_TOP, cz + 2.6, W, 1.1, { h: P(2), color: DARK, studs: false, free: true });
  sym(bb, (b, s) => {
    litTile(b, s * 1.5, COAM_TOP - 0.04, cz + 2.6, 1.6, 0.7, { color: C.transLightBlue });
  });
  bb.cyl(-1.62, COAM_TOP, cz + 1.9, 0.6, P(1), { color: IRON, seg: 10, stud: false });
  bb.cyl(-1.62, COAM_TOP - 0.34, cz + 1.9, 0.14, 0.4, { color: IRON, seg: 6, stud: false });

  // ---- screen: a lip you look over, not a windshield ---------------------
  bb.brick(0, COAM_TOP, cz + 3.35, W - 0.6, 0.3, {
    h: 0.8, color: C.transLightBlue, finish: FINISH.TRANS, studs: false, free: true,
  });
  bb.brick(0, COAM_TOP + 0.8, cz + 3.35, W - 0.4, 0.44, {
    h: P(1), color: DARK, studs: false, tile: true, free: true,
  });
  sym(bb, (b, s) => {
    // corner posts. Raked triangles of glass round the corner were tried first
    // and read as little fins from above, so the screen just stops at a post.
    b.brick(s * (W / 2 + 0.02), COAM_TOP, cz + 3.35, 0.66, 0.44, {
      h: 0.95, color: GRAY, studs: false, free: true,
    });
    b.brick(s * (W / 2 + 0.35), COAM_TOP, cz + 2.7, 0.7, 1.4, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
  });
  bb.node('cockpit', 0, COAM_TOP, cz - 0.4);
}

/** Panel lines, weathered plates and the odd hatch, so it is not a grey shell. */
function trim(bb) {
  sym(bb, (b, s) => {
    // bonnet panels either side of the spine
    b.brick(s * 2.75, DECK_TOP - 0.04, 4.2, 2.2, 4.2, {
      h: P(1), color: TAN, studs: false, tile: true, free: true,
    });
    b.brick(s * 1.35, DECK_TOP - 0.04, 4.2, 0.35, 4.2, {
      h: P(1), color: DARK, studs: false, tile: true, free: true,
    });
    // louvres let into the fender tops over the turbine ducts
    for (let i = 0; i < 3; i++) {
      b.brick(s * 3.5, DECK_TOP - 0.04, 1.4 - i * 1.1, 1.5, 0.4, {
        h: P(1), color: IRON, studs: false, tile: true, free: true,
      });
    }
    // flank panel and a filler cap
    b.brick(s * 4.24, DECK_Y - P(2), 1.4, 0.35, 4.0, {
      h: P(1), color: TAN, studs: false, tile: true, free: true,
    });
    b.cyl(s * 3.1, DECK_TOP - 0.1, -4.6, 0.42, P(1), { color: IRON, seg: 8, stud: false });
  });
  // spine down the bonnet with a grille let into it
  bb.brick(0, DECK_TOP - 0.04, 4.2, 2.0, 4.2, {
    h: P(1), color: GRAY, studs: false, tile: true, free: true,
  });
  for (let i = 0; i < 4; i++) {
    bb.brick(0, DECK_TOP, 5.6 - i * 0.62, 1.5, 0.34, {
      h: P(0.6), color: IRON, studs: false, tile: true, free: true,
    });
  }
  // tonneau over the stern, and its strap
  bb.brick(0, DECK_TOP - 0.04, -6.3, 2.0, 3.6, {
    h: P(1), color: TAN, studs: false, tile: true, free: true,
  });
  bb.brick(0, DECK_TOP, -6.3, 1.0, 0.5, { h: P(1), color: DARK, studs: false, free: true });
  // underside skids: flat and dark. It floats, but not on lit pads.
  sym(bb, (b, s) => {
    b.brick(s * 2.5, HULL_Y - P(1.6), -1.5, 1.0, 8.0, {
      h: P(0.6), color: IRON, studs: false, tile: true, free: true,
    });
  });
}

function buildSpeeder() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  chassis(bb);
  bow(bb);
  turbines(bb);
  stern(bb);
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
  notes: 'X-34 landspeeder, 17 studs long, three open bow turbines, two-seat tub. '
    + 'Hovers, so centred on Y. nodes seatL, seatR, cockpit, intakeL/C/R, exhaustL/R',
});
