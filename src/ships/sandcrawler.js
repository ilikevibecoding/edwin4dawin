import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import { mulberry32 } from '../engine/rng.js';
import {
  recentre, zWedge, greebleField, glowRig, litTile, sym,
  P, C, FINISH,
} from './_util.js';

/*
 * Jawa sandcrawler. 58 studs long, 33 over the tracks, 34 tall.
 *
 * Ground vehicle: the track contact patch rests on y = 0 so a scene can drop it
 * straight onto a dune. Centred on X and Z, bow (the ramp) at +Z.
 *
 * The body is a trapezoidal hulk -- a steeply raked bow, a roof much shorter
 * than the keel, a near-vertical stern. Built as horizontal courses of plates
 * whose z-extent shrinks with height, which is how you get that shape out of
 * rectangular bricks: every course steps back from the one below and the
 * staircase reads as riveted plating.
 */

const RUST = C.reddishBrown;
const OCHRE = C.darkOrange;
const BROWN = C.darkBrown;
const IRON = C.darkBluishGray;
const DARKIRON = C.darkGray;

const TRACK_R = 3.5;          // idler radius
const TRACK_END = 25.0;       // straight run ends here
const TRACK_W = 5.8;
const TRACK_X = 13.0;         // centre of each track unit
const TRACK_H = TRACK_R * 2 + 0.45;

const HULL_Y0 = TRACK_H - 1.4;  // keel of the body, skirted over the tracks
const ROOF_Y = 27.0;
const BOW_Z = 28.0;
const STERN_Z = -30.0;
const RAKE = 0.95;            // studs of setback per stud of height, at the bow

/** Body half width: 13.5 at the keel, tucking in slightly toward the roof. */
const bodyHalfW = (y) => 13.5 - Math.max(0, y - 14.0) * 0.09;
const bowAt = (y) => BOW_Z - Math.max(0, y - HULL_Y0) * RAKE;
const sternAt = (y) => STERN_Z + Math.max(0, y - HULL_Y0) * 0.10;

const RAMP_W = 15.0;
const RAMP_LEN = 15.5;        // long enough to reach the sand when lowered
const HINGE_Y = HULL_Y0 + 0.6;

/* ------------------------------------------------------------------ tracks */

/**
 * One track unit, built in local coordinates around x = 0. The links are
 * rectangles laid out around a stadium-shaped path and rotated to the local
 * tangent, so the run round the idler wheels stays continuous instead of
 * breaking into a polygon.
 */
function trackUnit() {
  const bb = new BrickBuilder({ studs: false, bevel: true, cullStuds: false });
  const R = TRACK_R, zEnd = TRACK_END, W = TRACK_W;
  const yc = R;                         // path centreline height

  // ---- road frame the chain wraps around --------------------------------
  bb.brick(0, yc - 2.4, 0, W - 1.4, zEnd * 2 + 1.0, { h: 4.8, color: DARKIRON, studs: false });
  sym(bb, (b, s) => {
    b.cyl(0, yc, s * zEnd, R - 0.55, W - 0.8, { axis: 'x', color: IRON, seg: 12, stud: false });
    b.cyl(0, yc, s * zEnd, R - 1.9, W + 0.6, { axis: 'x', color: DARKIRON, seg: 8, stud: false });
  });
  for (let z = -zEnd + 4; z <= zEnd - 4; z += 5.6) {
    bb.cyl(0, yc - 0.6, z, 2.0, W - 0.9, { axis: 'x', color: IRON, seg: 10, stud: false });
  }

  // ---- the link chain ---------------------------------------------------
  const straight = zEnd * 2;
  const arc = Math.PI * R;
  const per = straight * 2 + arc * 2;
  const links = Math.round(per / 2.6);
  const T = 0.85;                       // link thickness
  const L = (per / links) * 0.93;        // hairline gap between links

  for (let i = 0; i < links; i++) {
    const s = (i + 0.5) * (per / links);
    let z, y, th;
    if (s < straight) {                                   // bottom run, -z to +z
      z = -zEnd + s; y = 0; th = 0;
    } else if (s < straight + arc) {                       // bow idler
      const a = (s - straight) / R;
      z = zEnd + Math.sin(a) * R; y = yc - Math.cos(a) * R; th = a;
    } else if (s < straight * 2 + arc) {                   // top run, +z to -z
      z = zEnd - (s - straight - arc); y = yc * 2; th = Math.PI;
    } else {                                               // stern idler
      const a = (s - straight * 2 - arc) / R;
      z = -zEnd - Math.sin(a) * R; y = yc + Math.cos(a) * R; th = Math.PI + a;
    }
    const cz = Math.cos(th), sz = Math.sin(th);
    const nz = -sz, ny = cz;              // outward normal of the track
    const quad = (hl, ht, oz = 0, oy = 0) => {
      const pts = [];
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pts.push([
          z + oz + a * hl * cz + b * ht * nz,
          y + oy + a * hl * sz + b * ht * ny,
        ]);
      }
      return pts;
    };
    zWedge(bb, 0, W, quad(L / 2, T / 2), { color: i % 4 === 0 ? DARKIRON : C.black, bevel: 0 });
    // grouser bar standing off every other link
    if (i % 2 === 0) {
      zWedge(bb, 0, W - 1.0, quad(L * 0.22, T * 0.45, nz * T * 0.75, ny * T * 0.75),
        { color: IRON, bevel: 0 });
    }
  }

  // ---- fender over the top run ------------------------------------------
  bb.brick(0, yc * 2 + 0.9, 0, W + 1.8, zEnd * 2 + 3.2, {
    h: P(2), color: RUST, studs: false, free: true,
  });
  for (let z = -zEnd; z <= zEnd; z += 6.5) {
    bb.brick(0, yc * 2 + 1.7, z, W + 2.0, 1.2, {
      h: P(2), color: BROWN, studs: false, tile: true, free: true,
    });
  }

  const g = bb.build();
  const grp = new THREE.Group();
  grp.add(g);
  return grp;
}

/* -------------------------------------------------------------------- hull */

/** The trapezoidal body, as a stack of stepped courses. */
function courses(bb) {
  const step = 2.0;
  for (let y = HULL_Y0; y < ROOF_Y - 0.01; y += step) {
    const zA = bowAt(y + step), zB = sternAt(y + step);   // narrower end of the band
    const hw = bodyHalfW(y);
    const band = Math.round((y - HULL_Y0) / step);
    // Alternating strakes: the hull reads as riveted plating rather than one
    // flat slab of brown.
    const color = band % 3 === 2 ? OCHRE : RUST;
    bb.brick(0, y, (zA + zB) / 2, hw * 2, zA - zB, {
      h: step, color, studs: false, free: true,
    });
    if (band % 3 === 2) {
      sym(bb, (b, s) => {
        b.brick(s * hw, y + step - P(1), (zA + zB) / 2, 0.4, (zA - zB) * 0.97, {
          h: P(1), color: BROWN, studs: false, tile: true, free: true,
        });
      });
    }
  }
}

function roof(bb) {
  const rz0 = sternAt(ROOF_Y), rz1 = bowAt(ROOF_Y);
  const hw = bodyHalfW(ROOF_Y);
  bb.brick(0, ROOF_Y, (rz0 + rz1) / 2, hw * 2, rz1 - rz0, {
    h: P(3), color: OCHRE, studs: false, free: true,
  });
  // lip all the way round
  sym(bb, (b, s) => {
    b.brick(s * hw, ROOF_Y + P(3), (rz0 + rz1) / 2, 1.0, rz1 - rz0, {
      h: P(2), color: RUST, studs: false, free: true,
    });
  });
  for (const z of [rz1 - 0.5, rz0 + 0.5]) {
    bb.brick(0, ROOF_Y + P(3), z, hw * 2, 1.0, {
      h: P(2), color: RUST, studs: false, free: true,
    });
  }

  // ---- lookout house + mast ---------------------------------------------
  const tz = rz0 + 10.0;
  bb.brick(0, ROOF_Y + P(3), tz, 13.0, 9.0, { h: 3.6, color: RUST, studs: false, free: true });
  bb.brick(0, ROOF_Y + P(3) + 3.6, tz, 10.0, 6.4, { h: 1.6, color: OCHRE, studs: false, free: true });
  sym(bb, (b, s) => {
    litTile(b, s * 4.2, ROOF_Y + P(3) + 1.6, tz + 4.6, 3.0, 0.4, { color: C.transYellow, h: 1.2 });
  });
  bb.cyl(0, ROOF_Y + P(3) + 5.2, tz, 0.3, 3.0, { color: DARKIRON, seg: 6, stud: false });
  bb.cyl(0, ROOF_Y + P(3) + 8.2, tz, 0.95, 0.4, { color: IRON, seg: 8, stud: false });
  bb.node('bridge', 0, ROOF_Y + 4.2, tz);

  // roof hatch the Jawas drop the droids through
  bb.brick(0, ROOF_Y + P(3), tz + 12.0, 7.0, 6.0, {
    h: P(2), color: BROWN, studs: false, tile: true, free: true,
  });
  sym(bb, (b, s) => {
    b.cyl(s * 3.0, ROOF_Y + P(3) + P(2), tz + 12.0, 0.4, 0.9, { color: IRON, seg: 6, stud: false });
  });
  bb.node('roofHatch', 0, ROOF_Y + 2.0, tz + 12.0);
}

/**
 * The bow hatch. The hull courses staircase back from the rake line, so a flat
 * ramp resting on them would float clear of every tread. The jambs and lintel
 * here are raked parallelograms that stand out to the true rake line and bridge
 * the steps, giving the stowed ramp one flat plane to close against.
 */
function bowFace(bb) {
  const y0 = HINGE_Y, y1 = HINGE_Y + 15.0;
  /** Parallelogram following the rake between two heights, `d` deep. */
  const raked = (ya, yb, d, off = 0) => [
    [bowAt(ya) + off, ya], [bowAt(yb) + off, yb],
    [bowAt(yb) + off - d, yb], [bowAt(ya) + off - d, ya],
  ];

  sym(bb, (b, s) => {
    zWedge(b, s * (RAMP_W / 2 + 1.1), 2.2, raked(y0, y1 + 1.6, 3.0), { color: BROWN });
  });
  // the recessed doorway the ramp closes over
  zWedge(bb, 0, RAMP_W, raked(y0, y1, 2.6, -0.7), { color: C.black });
  // lintel
  zWedge(bb, 0, RAMP_W + 4.4, raked(y1, y1 + 1.7, 3.0), { color: BROWN });
  // sill the ramp hinges off
  zWedge(bb, 0, RAMP_W + 4.4, raked(y0 - 1.1, y0, 3.0), { color: IRON });

  // bow shoulder ribs either side of the hatch
  sym(bb, (b, s) => {
    for (let y = HINGE_Y + 2; y < ROOF_Y - 3.5; y += 5.0) {
      zWedge(b, s * 11.2, 3.4, raked(y, y + 1.3, 2.2), { color: OCHRE });
    }
  });
}

/**
 * Flank plating. Without this the sides are a 40-stud blank wall; ribs and
 * hatches give the light something to catch and sell the scale.
 */
function flanks(bb) {
  sym(bb, (b, s) => {
    const x = bodyHalfW(16.0);
    // vertical ribs, each stopping where the raked bow cuts it off
    for (let z = 22; z > -28; z -= 5.6) {
      const yTop = Math.min(ROOF_Y - 1.2, HULL_Y0 + (BOW_Z - z) / RAKE - 1.4);
      if (yTop < HULL_Y0 + 4) continue;
      b.brick(s * x, HULL_Y0 + 0.8, z, 0.55, 1.5, {
        h: yTop - HULL_Y0 - 0.8, color: BROWN, studs: false, free: true,
      });
      b.brick(s * x, yTop, z, 0.75, 2.1, { h: 0.9, color: IRON, studs: false, free: true });
    }
    // service hatches
    for (const [z, y] of [[16, 12.0], [4, 12.0], [-8, 12.0], [-20, 15.0]]) {
      b.brick(s * x, y, z, 0.4, 3.4, { h: 4.4, color: OCHRE, studs: false, free: true });
      b.brick(s * (x + 0.2), y + 0.5, z, 0.3, 2.4, {
        h: 3.4, color: BROWN, studs: false, free: true,
      });
    }
    // a long rubbing strake low down
    b.brick(s * (x + 0.1), HULL_Y0 + 1.4, -2.0, 0.5, 44.0, {
      h: 1.0, color: IRON, studs: false, free: true,
    });
  });
}

/** Stern: exhaust stacks, vents and a scatter of machinery. */
function stern(bb, rand) {
  const sz = sternAt(20.0);
  sym(bb, (b, s) => {
    b.cyl(s * 6.5, ROOF_Y - 1.0, sternAt(ROOF_Y) + 3.4, 1.9, 7.0, {
      color: IRON, seg: 10, stud: false,
    });
    b.cyl(s * 6.5, ROOF_Y + 6.0, sternAt(ROOF_Y) + 3.4, 2.2, 0.9, {
      color: DARKIRON, seg: 10, stud: false,
    });
    b.brick(s * 10.5, HULL_Y0 + 2.0, sz - 0.6, 4.0, 1.2, {
      h: 16.0, color: IRON, studs: false, free: true,
    });
  });
  // radiator grille across the stern face
  for (let y = HULL_Y0 + 3.0; y < ROOF_Y - 4.0; y += 2.4) {
    bb.brick(0, y, sternAt(y) - 0.5, 15.0, 1.0, {
      h: 1.4, color: DARKIRON, studs: false, free: true,
    });
  }
  greebleField(bb, rand, {
    x0: -8, x1: 8, z0: sz - 1.1, z1: sz - 1.1, y: HULL_Y0 + 2.0, count: 26,
    maxW: 3, maxD: 1, colors: [IRON, DARKIRON, C.black, BROWN],
  });
}

/** Lit slit windows and running lamps. */
function windows(bb) {
  // the row of lit slits high on the bow, under the roof lip
  for (let i = -2; i <= 2; i++) {
    const y = ROOF_Y - 4.0;
    const z = bowAt(y) + 0.4;
    bb.brick(i * 4.2, y, z, 2.8, 0.9, { h: 1.7, color: C.black, studs: false, free: true });
    litTile(bb, i * 4.2, y + 0.35, z + 0.4, 2.1, 0.5, { color: C.transYellow, h: 1.0 });
  }
  sym(bb, (b, s) => {
    // flank portholes
    for (const z of [10, 1, -9, -19]) {
      const y = 20.0;
      b.cyl(s * (bodyHalfW(y) + 0.05), y, z, 0.9, 0.5, {
        axis: 'x', color: BROWN, seg: 8, stud: false,
      });
      b.cyl(s * (bodyHalfW(y) + 0.32), y, z, 0.6, 0.28, {
        axis: 'x', color: C.transYellow, finish: FINISH.GLOW, seg: 8, stud: false,
      });
    }
    // lamps either side of the hatch
    const ly = HINGE_Y + 16.6;
    b.cyl(s * 9.0, ly, bowAt(ly) + 0.6, 0.85, 0.8, { axis: 'z', color: IRON, seg: 8, stud: false });
    b.cyl(s * 9.0, ly, bowAt(ly) + 1.2, 0.62, 0.3, {
      axis: 'z', color: C.transYellow, finish: FINISH.GLOW, seg: 8, stud: false,
    });
  });
}

/* -------------------------------------------------------------------- ramp */

/**
 * The boarding ramp, built lying flat in local coordinates and hinged at its
 * back edge (local z = 0) so a rotation about X swings it from stowed (raked
 * back flush with the bow) down to lying on the sand.
 */
function rampPanel() {
  const bb = new BrickBuilder({ studs: false, bevel: true, cullStuds: false });
  const W = RAMP_W, L = RAMP_LEN;
  bb.brick(0, -P(3), L / 2, W, L, { h: P(3), color: RUST, studs: false });
  for (let i = 1; i * 2.2 < L - 0.6; i++) {
    bb.brick(0, 0, i * 2.2, W - 1.2, 0.9, {
      h: P(1), color: BROWN, studs: false, tile: true, free: true,
    });
  }
  sym(bb, (b, s) => {
    b.brick(s * (W / 2 - 0.4), 0, L / 2, 0.8, L, {
      h: P(2), color: OCHRE, studs: false, free: true,
    });
    b.cyl(s * (W / 2 - 1.4), -P(2), 0.2, 0.55, 2.2, { axis: 'x', color: IRON, seg: 8, stud: false });
  });
  // lip that bites into the sand
  bb.brick(0, -P(3), L - 0.3, W - 1.0, 0.9, {
    h: P(2), color: IRON, studs: false, tile: true, free: true,
  });

  const g = bb.build();
  const grp = new THREE.Group();
  grp.name = 'ramp';
  grp.add(g);
  return grp;
}

/* ---------------------------------------------------------------- assembly */

function buildSandcrawler() {
  const rand = mulberry32(0x5a11d);
  const bb = new BrickBuilder({ studs: false, bevel: true, cullStuds: false });
  courses(bb);
  roof(bb);
  bowFace(bb);
  flanks(bb);
  stern(bb, rand);
  windows(bb);
  bb.node('cockpit', 0, ROOF_Y - 4.0, bowAt(ROOF_Y - 4.0) - 2.0);
  const shell = bb.build();

  const inner = new THREE.Group();
  inner.add(shell);

  const tl = trackUnit(), tr = trackUnit();
  tl.position.x = -TRACK_X;
  tr.position.x = TRACK_X;
  inner.add(tl, tr);

  // Track contact patch on y = 0, centred on X and Z. Measured on the hull and
  // tracks only -- the ramp joins afterwards so that dropping it does not drag
  // the origin forward with it.
  const model = recentre(inner, { y: 'bottom' });

  /*
   * The panel hangs below its own local plane, and stowing it rotates that
   * thickness outward, so the hinge is set back along the bow normal by a bit
   * more than the panel is thick. Otherwise the closed ramp bulges out of the
   * door frame.
   */
  const nl = Math.hypot(RAKE, 1);
  const inset = 0.95;
  const hingeY = HINGE_Y - inset * (RAKE / nl);
  const hingeZ = bowAt(HINGE_Y) - inset * (1 / nl);

  const pivot = new THREE.Group();
  pivot.name = 'rampPivot';
  pivot.position.set(0, hingeY, hingeZ);
  const ramp = rampPanel();
  pivot.add(ramp);
  inner.add(pivot);

  const nodes = { ...shell.userData.nodes };
  Object.assign(nodes, { ramp, trackL: tl, trackR: tr });
  inner.userData.nodes = nodes;
  model.userData.nodes = nodes;

  /*
   * Rotating the panel about X sends its tip, local (0, 0, L), to
   * (y, z) = (-L sin phi, L cos phi).
   *   open   -- tip drops exactly HINGE_Y to reach the sand
   *   stowed -- tip runs up the bow, so y : z has to match the rake 1 : -RAKE,
   *             which puts phi in the third quadrant
   */
  const OPEN = Math.asin(Math.min(0.99, hingeY / RAMP_LEN));
  const STOWED = Math.atan2(RAKE, 1) - Math.PI;
  let ramped = 0;
  const apply = () => { pivot.rotation.x = THREE.MathUtils.lerp(STOWED, OPEN, ramped); };
  model.userData.setRamp = (v) => { ramped = THREE.MathUtils.clamp(v, 0, 1); apply(); };
  model.userData.getRamp = () => ramped;
  apply();

  const glow = glowRig(shell);
  // Jawa lamps run off dirty power, so the whole rig flickers together.
  model.userData.update = (t) => {
    glow.set(0.88 + Math.sin(t * 3.1) * 0.06 + Math.sin(t * 11.7) * 0.05);
  };
  return model;
}

register('sandcrawler', (opts = {}) => {
  const m = buildSandcrawler();
  if (opts.ramp !== undefined) m.userData.setRamp(+opts.ramp);
  return m;
}, {
  notes: 'Jawa sandcrawler, 58 long x 34 tall, tracks resting on y = 0, bow at +Z. '
    + 'userData.setRamp(0..1), 0 = stowed; nodes ramp, bridge, roofHatch, cockpit, trackL, trackR',
});
