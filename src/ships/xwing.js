import * as THREE from 'three';
import { register } from '../registry.js';
import { BrickBuilder } from '../lego/brick.js';
import {
  recentre, glowRig, sym, mrot,
  PLATE, BRICK, P, C, FINISH,
} from './_util.js';

/*
 * T-65 X-wing. 30 studs nose to engine bell, 27 studs across with the S-foils
 * open.
 *
 * The four wings are separate groups on their own roll pivots so a scene can
 * open and close the S-foils: group.userData.setSFoils(0..1), 0 = cruise
 * (wings stacked), 1 = attack position (~26 degrees of split).
 *
 * Nose at +Z. Fuselage centreline at y = 0; the wing roots sit at +/-1.9.
 */

const WHITE = C.white, GRAY = C.lightBluishGray, DARK = C.darkBluishGray;

const NOSE_Z = 15.5;
const WING_Z = -3.0;           // pivot z, at the wing roots
const WING_Y = 1.55;           // pivot height above/below the centreline
const SFOIL_ANGLE = 0.23;      // radians each wing rolls when open

/** Fuselage, cockpit, nose and the R2 socket. */
function body(bb) {
  // ---- long nose: stepped plates tapering to a point -------------------
  const noseBands = [
    { z: 14.4, w: 2, h: P(3), y: -0.6 },
    { z: 12.6, w: 3, h: P(4), y: -0.8 },
    { z: 10.4, w: 4, h: P(5), y: -1.0 },
    { z: 8.2, w: 4, h: P(6), y: -1.2 },
  ];
  for (const b of noseBands) {
    bb.brick(0, b.y, b.z, b.w, 2.2, { h: b.h, color: WHITE, studs: false });
  }
  bb.cone(0, -0.15, NOSE_Z + 0.5, 0.55, 1.4, { color: DARK, rx: Math.PI / 2, seg: 10 });
  bb.brick(0, -0.35, NOSE_Z - 0.4, 1.6, 1.2, { h: P(2), color: DARK, studs: false });
  // nose slopes: down at the front, up into the cockpit
  bb.slope(0, 0.6, 13.0, 3.2, 3, { h: P(2), color: WHITE, rot: Math.PI / 2 });
  bb.slope(0, 0.6, 10.0, 2.6, 4, { h: P(3), color: WHITE, rot: Math.PI / 2 });
  bb.slope(0, -1.2, 12.8, 3.0, 3, { h: P(3), color: WHITE, rot: Math.PI / 2, inverted: true });
  // red flashes down the nose
  sym(bb, (b, s) => {
    b.brick(s * 1.05, 0.6, 11.6, 0.9, 5.6, { h: P(1), color: C.red, finish: FINISH.SOLID, tile: true, studs: false, free: true });
    b.brick(s * 1.55, -0.4, 9.4, 0.4, 4, { h: P(2), color: C.red, finish: FINISH.SOLID, studs: false, free: true });
  });
  // laser targeting sensors
  sym(bb, (b, s) => b.cyl(s * 0.9, 0.6, 14.6, 0.22, P(1), { color: DARK, seg: 6, stud: false }));

  // ---- centre fuselage -------------------------------------------------
  bb.brick(0, -1.2, 5.2, 5, 6.6, { h: P(4), color: WHITE, studs: false });
  bb.brick(0, -1.2, -1.0, 6, 6.0, { h: P(4), color: GRAY, studs: false });
  bb.brick(0, 0.4, 2.0, 5, 12.0, { h: P(4), color: WHITE, studs: false });
  bb.brick(0, 0.4, -4.6, 6, 5.2, { h: P(4), color: GRAY, studs: false });
  bb.brick(0, -1.2, -6.8, 5, 3.6, { h: P(6), color: DARK, studs: false });

  // ---- cockpit ---------------------------------------------------------
  const cz = 5.4;
  bb.brick(0, 2.0, cz, 4, 4.6, { h: P(1), color: DARK, studs: false });
  bb.brick(0, 2.4, cz - 2.0, 4, 1.0, { h: P(4), color: GRAY, studs: false });   // headrest
  bb.brick(0, 2.4, cz + 0.4, 3, 2.0, { h: P(2), color: C.darkRed, studs: false }); // seat
  // canopy: trans front slope + trans top, opaque frame rails
  bb.curveSlope(0, 2.4, cz + 1.6, 2.4, 3.6, {
    h: P(5), color: C.transLightBlue, finish: FINISH.TRANS, rot: -Math.PI / 2, segments: 4,
  });
  bb.brick(0, 2.4 + P(5) - P(1), cz - 0.4, 3.6, 3.0, {
    h: P(1), color: C.transLightBlue, finish: FINISH.TRANS, studs: false,
  });
  sym(bb, (b, s) => {
    b.brick(s * 1.85, 2.4, cz + 0.2, 0.4, 4.0, { h: P(5), color: WHITE, studs: false });
  });
  bb.brick(0, 2.4 + P(5), cz - 1.6, 3.6, 1.2, { h: P(1), color: WHITE, tile: true, studs: false });
  bb.node('cockpit', 0, 3.0, cz + 0.4);

  // ---- astromech socket behind the cockpit -----------------------------
  const rz = 1.4;
  bb.brick(0, 2.0, rz, 4, 3.4, { h: P(1), color: GRAY, studs: false });
  bb.cyl(0, 2.4, rz, 1.45, P(1), { color: DARK, seg: 12, stud: false });
  bb.cyl(0, 2.4, rz, 1.15, P(2), { color: C.black, seg: 12, stud: false });
  sym(bb, (b, s) => b.brick(s * 1.9, 2.0, rz, 0.6, 3.4, { h: P(3), color: WHITE, studs: false }));
  bb.node('r2socket', 0, 2.8, rz);

  // ---- dorsal spine back to the engines --------------------------------
  bb.brick(0, 2.0, -2.6, 4, 4.6, { h: P(2), color: GRAY, studs: false });
  bb.brick(0, 2.8, -3.4, 2, 3.0, { h: P(2), color: C.red, finish: FINISH.SOLID, tile: true });
  sym(bb, (b, s) => {
    b.slope(s * 2.4, 2.0, -2.6, 1, 4.6, { h: P(2), color: WHITE, rot: mrot(s) });
    b.brick(s * 2.9, 0.4, -1.0, 0.4, 6, { h: P(2), color: C.red, finish: FINISH.SOLID, studs: false, free: true });
  });

  // ---- underside -------------------------------------------------------
  bb.brick(0, -2.4, 3.0, 4, 8, { h: P(3), color: GRAY, studs: false });
  bb.brick(0, -2.8, 0.0, 3, 4, { h: P(1), color: DARK, tile: true, studs: false });
  sym(bb, (b, s) => {
    b.cyl(s * 1.2, -2.9, 4.6, 0.5, P(2), { color: DARK, seg: 8, stud: false });
    b.brick(s * 1.6, -2.4, -3.0, 1.2, 4, { h: P(2), color: DARK, studs: false, free: true });
  });

  // ---- rear bulkhead ---------------------------------------------------
  bb.brick(0, -1.2, -8.4, 4, 0.8, { h: P(9), color: DARK, studs: false });
  bb.cyl(0, 0.4, -8.9, 0.9, 1.0, { axis: 'z', color: C.flatSilver, finish: FINISH.SOLID, seg: 10, stud: false });
}

/**
 * One S-foil, built in local coordinates around the pivot at the origin:
 * engine nacelle inboard, wing panel running out to +X, cannon on the tip.
 */
function wing(index, upper) {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  const sy = upper ? 1 : -1;      // which way the nacelle detailing faces

  // ---- engine nacelle ---------------------------------------------------
  bb.cyl(2.1, 0, 0.4, 1.35, 7.6, { axis: 'z', color: WHITE, seg: 14, stud: false });
  bb.cyl(2.1, 0, 3.1, 1.5, 1.0, { axis: 'z', color: GRAY, seg: 14, stud: false });
  bb.cyl(2.1, 0, 4.0, 1.45, 0.9, { axis: 'z', color: DARK, seg: 14, stud: false });
  bb.cyl(2.1, 0, 4.3, 1.15, 0.5, { axis: 'z', color: C.black, seg: 12, stud: false });  // intake
  bb.cyl(2.1, 0, -2.1, 1.5, 1.4, { axis: 'z', color: GRAY, seg: 14, stud: false });
  // one glow colour only: four wings x two buckets is already eight draw calls
  bb.cyl(2.1, 0, -3.4, 1.35, 1.6, { axis: 'z', color: DARK, seg: 14, stud: false });
  bb.cyl(2.1, 0, -4.1, 1.1, 0.5, { axis: 'z', color: C.transLightBlue, finish: FINISH.GLOW, seg: 14, stud: false });
  bb.cyl(2.1, 0, -4.35, 0.6, 0.3, { axis: 'z', color: C.transLightBlue, finish: FINISH.GLOW, seg: 10, stud: false });
  bb.node(`engine${index}`, 2.1, 0, -4.6);
  // nacelle greebles + red band
  bb.cyl(2.1, 0, 2.2, 1.42, 0.4, { axis: 'z', color: C.red, finish: FINISH.SOLID, seg: 14, stud: false });
  bb.brick(2.1, sy * 1.05, 1.0, 1.6, 4.0, { h: P(1), color: GRAY, tile: true, studs: false, free: true });
  bb.brick(2.1, sy * 1.05 - (sy > 0 ? 0 : P(1)), -1.4, 1.2, 1.6, { h: P(1), color: C.red, finish: FINISH.SOLID, tile: true, studs: false, free: true });

  // ---- wing panel: tapered stack of plates ------------------------------
  const root = 3.2, tip = 11.6;
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const x0 = root + (i / bands) * (tip - root);
    const x1 = root + ((i + 1) / bands) * (tip - root);
    const xc = (x0 + x1) / 2;
    const d = 5.0 - i * 0.42;                 // chord narrows toward the tip
    const zc = -0.3 - i * 0.22;               // slight sweep back
    bb.brick(xc, -P(1), zc, x1 - x0, d, { h: P(2), color: WHITE, studs: false });
    bb.brick(xc, P(1), zc, x1 - x0, d - 1.2, { h: P(1), color: i % 2 ? GRAY : WHITE, studs: i > 1 });
    bb.brick(xc, -P(2), zc, x1 - x0, d - 1.6, { h: P(1), color: DARK, tile: true, studs: false });
  }
  // leading / trailing edge wedges so the panel is not a plain slab
  bb.prism([[root, 2.3], [tip, 1.0], [tip, 2.0], [root, 2.9]], P(2), {
    rx: Math.PI / 2, y: 0, color: WHITE,
  });
  bb.prism([[root, -2.9], [tip, -2.4], [tip, -1.5], [root, -2.3]], P(2), {
    rx: Math.PI / 2, y: 0, color: GRAY,
  });
  // red wing flash
  bb.brick(6.0, P(2), -0.6, 4.4, 1.4, { h: P(1), color: C.red, finish: FINISH.SOLID, tile: true, studs: false, free: true });
  bb.brick(4.2, P(2), 1.2, 1.6, 1.4, { h: P(1), color: C.red, finish: FINISH.SOLID, tile: true, studs: false, free: true });

  // ---- wingtip cannon: long enough to reach past the cockpit ------------
  const gx = 11.9;
  bb.brick(gx, -P(2), 0.2, 1.7, 4.2, { h: P(4), color: GRAY, studs: false });
  bb.cyl(gx, 0, 1.4, 0.68, 5.6, { axis: 'z', color: DARK, seg: 12, stud: false });
  bb.cyl(gx, 0, 4.4, 0.56, 0.9, { axis: 'z', color: GRAY, seg: 12, stud: false });
  bb.cyl(gx, 0, 8.8, 0.24, 8.0, { axis: 'z', color: C.flatSilver, finish: FINISH.SOLID, seg: 8, stud: false });
  bb.cyl(gx, 0, 13.1, 0.34, 0.9, { axis: 'z', color: C.red, finish: FINISH.SOLID, seg: 8, stud: false });
  bb.cyl(gx, 0, -2.6, 0.46, 3.4, { axis: 'z', color: DARK, seg: 8, stud: false });
  bb.cyl(gx, 0, -5.3, 0.3, 2.0, { axis: 'z', color: C.flatSilver, finish: FINISH.SOLID, seg: 8, stud: false });
  bb.node(`gun${index}`, gx, 0, 13.8);

  const g = bb.build();
  const grp = new THREE.Group();
  grp.name = `sfoil${index}`;
  grp.add(g);
  grp.userData.nodes = g.userData.nodes;
  return grp;
}

function buildXwing() {
  const bb = new BrickBuilder({ studs: true, studSeg: 8, bevel: true, cullStuds: true });
  body(bb);
  const shell = bb.build();

  const inner = new THREE.Group();
  inner.add(shell);
  const nodes = { ...shell.userData.nodes };

  // Four S-foils: 0 upper-right, 1 upper-left, 2 lower-right, 3 lower-left.
  const pivots = [];
  const specs = [
    [0, 1, 1], [1, -1, 1], [2, 1, -1], [3, -1, -1],
  ];
  for (const [index, sx, sv] of specs) {
    const w = wing(index, sv > 0);
    const pivot = new THREE.Group();
    pivot.name = `pivot${index}`;
    pivot.position.set(0, WING_Y * sv, WING_Z);
    pivot.scale.x = sx;                       // true mirror, normals stay right
    pivot.add(w);
    inner.add(pivot);
    pivots.push({ pivot, sx, sv });
    Object.assign(nodes, w.userData.nodes);
    nodes[`sfoil${index}`] = pivot;
  }
  inner.userData.nodes = nodes;

  let open = 1;
  const apply = () => {
    for (const { pivot, sx, sv } of pivots) {
      // rolling about Z splits the pairs; sx flips the sense for the port side
      pivot.rotation.z = sx * sv * SFOIL_ANGLE * open;
    }
  };
  // Roll the wings out before measuring, or the origin lands off the centreline.
  apply();

  const model = recentre(inner, { y: 'centre' });
  const glow = glowRig(shell, ...pivots.map((p) => p.pivot));

  model.userData.setSFoils = (v) => { open = THREE.MathUtils.clamp(v, 0, 1); apply(); };
  model.userData.getSFoils = () => open;

  model.userData.update = (t) => {
    glow.set(0.9 + Math.sin(t * 6.4) * 0.09 + Math.sin(t * 15.1) * 0.04);
  };
  return model;
}

register('xwing', (opts = {}) => {
  const m = buildXwing();
  if (opts.sfoils !== undefined) m.userData.setSFoils(+opts.sfoils);
  return m;
}, {
  notes: 'T-65 X-wing, 30 studs long, 27 span open. userData.setSFoils(0..1); '
    + 'nodes gun0..3, engine0..3, r2socket, cockpit, sfoil0..3',
});
