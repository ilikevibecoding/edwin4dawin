import * as THREE from 'three';
import { Kit, PLATE, BRICK } from './kit.js';
import { C, SW } from './palette.js';
import { FINISH } from '../core/materials.js';
import { makeRng } from '../core/rng.js';

/*
 * Starships.
 *
 * Every builder returns a THREE.Group with the nose pointing -Z, centred on
 * x = 0, straddling y = 0. Sizes are LEGO set scale, not in-universe scale, but
 * the ships are consistent with each other: an X-wing is 26 studs long, a Star
 * Destroyer 165.
 *
 * Runtime contract (see each builder for specifics):
 *   userData.engines   [Object3D]  at each nozzle exhaust, local -Z pointing aft
 *   userData.points    {Vector3}   muzzles, dishes, hardpoints (kit attach points)
 *   userData.turrets   [Object3D]  yaw on the turret, pitch on turret.userData.gun
 *   userData.update(t, dt)         anything that animates on its own
 */

// ------------------------------------------------------------------ helpers --

/*
 * kit.poly takes its polygon in the (x, y) plane of a Shape and then rotates
 * the extrusion up, which lands the second coordinate on -Z; kit.profile does
 * the same to its first coordinate. Both wrappers below let the rest of this
 * file be written in honest ship coordinates: polyXZ points are (x, z) with
 * -z forward, profZY points are (z, y).
 */
function polyXZ(kit, x, y, z, pts, h, color, opts) {
  return kit.poly(x, y, z, pts.map((p) => [p[0], -p[1]]), h, color, opts);
}

function profZY(kit, x, y, z, pts, w, color, opts) {
  return kit.profile(x, y, z, pts.map((p) => [-p[0], p[1]]), w, color, opts);
}

/** Half-width table [[z, halfWidth], ...] -> closed (x, z) outline. */
function outlineFrom(table, { s = 1, z0 = null, z1 = null, inset = 0 } = {}) {
  const halfWidth = (z) => {
    for (let i = 0; i < table.length - 1; i++) {
      const [za, wa] = table[i];
      const [zb, wb] = table[i + 1];
      if (z >= za && z <= zb) return wa + (wb - wa) * ((z - za) / (zb - za));
    }
    return z < table[0][0] ? table[0][1] : table[table.length - 1][1];
  };
  const zs = [];
  if (z0 !== null) zs.push(z0);
  for (const [z] of table) if ((z0 === null || z > z0) && (z1 === null || z < z1)) zs.push(z);
  if (z1 !== null) zs.push(z1);
  const pts = [];
  for (const z of zs) pts.push([Math.max(0.08, halfWidth(z) * s - inset), z]);
  for (let i = zs.length - 1; i >= 0; i--) pts.push([-Math.max(0.08, halfWidth(zs[i]) * s - inset), zs[i]]);
  return pts;
}

/**
 * Ring of parts around the Z axis. fn(i, angle) runs inside a frame whose +Y
 * points radially outward, so a bottom-anchored brick grows away from the axis.
 */
function ringZ(kit, n, r, z, fn, { start = 0, span = Math.PI * 2 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = start + (span === Math.PI * 2 ? (i / n) : (n === 1 ? 0.5 : i / (n - 1))) * span;
    kit.push().translate(Math.cos(a) * r, Math.sin(a) * r, z).rotZ(a - Math.PI / 2);
    fn(i, a);
    kit.pop();
  }
}

/**
 * Recessed engine nozzle pointing aft. A dark flared shell from z to z+len, a
 * glow disc sunk inside it and a proud rim ring so the glow reads as recessed.
 */
function nozzle(kit, x, y, z, r, len, opts = {}) {
  const shell = opts.shell ?? C.darkBluishGray;
  const glow = opts.glow ?? SW.engineBlue;
  const rim = opts.rim ?? C.gunmetal;
  const seg = opts.seg ?? 14;
  kit.cone(x, y, z, r * (opts.taper ?? 0.84), r, len, shell, { axis: 'z', seg });
  kit.cyl(x, y, z + len - 0.16, r * 0.7, 0.26, glow, {
    axis: 'z', seg, finish: FINISH.glow, emissive: opts.emissive ?? 2.4,
  });
  kit.torus(x, y, z + len + 0.2, r * 0.95, 0.13, rim, { seg: seg + 4, tseg: 5 });
  return z + len + 0.4;
}

/** Object3D at an exhaust plane; its local -Z (three.js forward) points aft. */
function engineNode(name, x, y, z, r = 1) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  o.rotation.y = Math.PI;
  o.userData.radius = r;
  return o;
}

/** Glow-tipped gun barrel running forward along -Z. Returns the muzzle z. */
function barrel(kit, x, y, z0, len, r, color, opts = {}) {
  const seg = opts.seg ?? 10;
  kit.cyl(x, y, z0 - len, r, len, color, { axis: 'z', seg });
  kit.torus(x, y, z0 - len + 0.25, r * 1.28, r * 0.34, opts.band ?? C.darkBluishGray, { seg: 12, tseg: 5 });
  kit.cyl(x, y, z0 - len - 0.28, r * 0.66, 0.3, opts.tip ?? C.gunmetal, { axis: 'z', seg });
  kit.cyl(x, y, z0 - len - 0.36, r * 0.5, 0.14, opts.glow ?? SW.blasterRed, {
    axis: 'z', seg, finish: FINISH.glow, emissive: 2.6,
  });
  return z0 - len - 0.42;
}

/** Scatter of darker tiles: what keeps a big flat plate from reading as card. */
function panelGrid(kit, rng, y, x0, x1, z0, z1, colors, opts = {}) {
  const stepX = opts.stepX ?? 3;
  const stepZ = opts.stepZ ?? 3.5;
  const w = opts.w ?? 2;
  const d = opts.d ?? 2;
  const h = opts.h ?? 0.24;
  const p = opts.p ?? 0.55;
  for (let x = x0; x <= x1 - w; x += stepX) {
    for (let z = z0; z <= z1 - d; z += stepZ) {
      if (!rng.bool(p)) continue;
      kit.tile(x + w / 2, y, z + d / 2, w, d, rng.pick(colors), { h });
    }
  }
}

const GREEBLE = [
  [0.6, 0.3, 0.6], [1.0, 0.4, 0.6], [0.6, 0.4, 1.2],
  [1.2, 0.24, 1.2], [0.8, 0.6, 0.8], [1.6, 0.3, 0.8],
];

/** Small machinery in a strip. Sizes come from a fixed set so they batch. */
function greeble(kit, rng, x0, x1, y, z0, z1, opts = {}) {
  const n = opts.n ?? 10;
  const cols = opts.cols ?? [C.darkBluishGray, C.gunmetal, C.flatSilver, C.black];
  for (let i = 0; i < n; i++) {
    const x = rng.range(x0, x1);
    const z = rng.range(z0, z1);
    const c = rng.pick(cols);
    if (rng.bool(0.28)) {
      kit.cyl(x, y, z, rng.pick([0.22, 0.3, 0.4]), rng.pick([0.3, 0.5, 0.8]), c, { seg: 10 });
    } else {
      const g = rng.pick(GREEBLE);
      kit.box(x, y, z, g[0], g[1], g[2], c, {});
    }
  }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ------------------------------------------------------------------- X-wing --

const XW = {
  pivotX: 1.45,
  pivotY: 0.55,
  pivotZ: 5.0,
  closed: 0.062,      // ~3.5 degrees
  open: 0.44,         // ~25 degrees
  tipX: 9.5,          // wing tip, measured out from the pivot
};

/** One of the four S-foils: engine nacelle, wing plate, wingtip cannon. */
function xwingWing(side, tier) {
  const kit = new Kit(`xwing-wing-${side > 0 ? 'r' : 'l'}${tier > 0 ? 'u' : 'd'}`);
  const HULL = C.veryLightGray;
  const PANEL = C.lightBluishGray;
  const DARK = C.darkBluishGray;
  const nx = side * 1.35;                 // nacelle centreline
  const ny = tier * 0.5;

  // --- engine nacelle -----------------------------------------------------
  kit.cyl(nx, ny, -4.1, 1.08, 7.0, PANEL, { axis: 'z', seg: 16 });
  kit.torus(nx, ny, -4.05, 1.06, 0.18, DARK, { seg: 16, tseg: 6 });
  kit.cyl(nx, ny, -4.0, 0.84, 0.2, C.black, { axis: 'z', seg: 14 });
  kit.torus(nx, ny, -1.9, 1.1, 0.13, C.flatSilver, { seg: 16, tseg: 5 });
  kit.torus(nx, ny, 0.6, 1.1, 0.13, C.flatSilver, { seg: 16, tseg: 5 });
  kit.cyl(nx, ny, -1.85, 1.02, 2.45, DARK, { axis: 'z', seg: 16 });
  // intake trunking along the top of the nacelle
  kit.box(nx, ny + 0.94, -3.0, 0.8, 0.4, 2.0, DARK, {});
  kit.box(nx, ny + 0.94, 0.4, 0.6, 0.3, 1.6, C.red, {});
  kit.box(nx, ny - 1.0, -1.0, 0.8, 0.4, 4.0, DARK, {});
  nozzle(kit, nx, ny, 2.5, 1.02, 1.0, { seg: 16 });
  // nacelle-to-wing fairing
  kit.box(side * 2.2, ny - 0.5, -0.6, 1.1, 1.0, 5.8, HULL, {});
  kit.box(side * 0.55, ny - 0.45, 0.8, 1.6, 0.9, 3.4, PANEL, {});
  kit.cyl(side * 0.15, ny, 1.6, 0.42, 1.4, DARK, { axis: 'x', rot: [0, 0, side * -Math.PI / 2], seg: 12 });

  // --- wing plate ---------------------------------------------------------
  const tipX = XW.tipX;
  polyXZ(kit, 0, -0.26, 0, [
    [side * 1.9, -3.4], [side * tipX, -0.6], [side * tipX, 2.7], [side * 1.9, 4.0],
  ], 0.52, HULL);
  const skin = [
    [side * 2.4, -2.8], [side * (tipX - 0.5), -0.45], [side * (tipX - 0.5), 2.3], [side * 2.4, 3.4],
  ];
  polyXZ(kit, 0, 0.26, 0, skin, 0.22, PANEL);
  polyXZ(kit, 0, -0.46, 0, skin, 0.22, PANEL);
  // the red flash along the outer wing
  polyXZ(kit, 0, 0.44, 0, [
    [side * 4.6, -1.6], [side * (tipX - 0.4), -0.3], [side * (tipX - 0.4), 0.8], [side * 4.6, -0.2],
  ], 0.2, C.red);
  // ribs, so the wing does not read as a single slab
  for (let i = 0; i < 4; i++) {
    const x = side * (3.1 + i * 1.7);
    kit.tile(x, 0.46, 1.6 - i * 0.35, 1, 3, i === 1 ? C.red : PANEL, { h: 0.22 });
    kit.tile(x, -0.68, 1.3 - i * 0.3, 1, 2, DARK, { h: 0.22 });
  }
  // wingtip block + cannon mount
  kit.box(side * (tipX + 0.6), -0.3, 0.6, 1.2, 0.8, 3.6, PANEL, {});
  kit.box(side * (tipX + 0.6), 0.5, 1.2, 0.8, 0.5, 1.6, DARK, {});

  // --- wingtip laser cannon ----------------------------------------------
  const cx = side * (tipX + 0.6);
  kit.cyl(cx, 0.0, 2.9, 0.44, 3.4, C.flatSilver, { axis: 'z', seg: 12 });
  kit.cyl(cx, 0.0, -0.4, 0.5, 3.4, PANEL, { axis: 'z', seg: 12 });
  kit.torus(cx, 0.0, -0.35, 0.54, 0.14, DARK, { seg: 14, tseg: 5 });
  kit.torus(cx, 0.0, 2.85, 0.54, 0.14, DARK, { seg: 14, tseg: 5 });
  const muzzleZ = barrel(kit, cx, 0.0, -0.4, 5.4, 0.34, C.gunmetal, {});
  kit.box(cx, -0.7, 1.4, 0.5, 0.4, 2.2, DARK, {});

  const g = kit.build();
  const muzzle = new THREE.Object3D();
  muzzle.name = 'muzzle';
  muzzle.position.set(cx, 0, muzzleZ);
  g.add(muzzle);
  const eng = engineNode('engine', nx, ny, 3.95, 1.02);
  g.add(eng);
  g.userData.muzzle = muzzle;
  g.userData.engine = eng;
  g.userData.side = side;
  g.userData.tier = tier;
  return g;
}

/**
 * T-65 X-wing. 26 long, 24 span, four S-foils that lock into the attack X.
 *
 *   userData.setSFoils(amount)   0 = closed, 1 = fully open
 *   userData.engines[4]          upper-left, lower-left, upper-right, lower-right
 *   userData.points.gunL1/L2/R1/R2   cannon muzzles (1 = upper, 2 = lower)
 *   userData.muzzles.gunL1...    the same four as live Object3Ds
 *   userData.canopy              hinged at the rear; rotation.x opens it
 *   userData.wings[4]
 */
export function buildXwing({ sFoils = false } = {}) {
  const kit = new Kit('xwing');
  const rng = makeRng('xwing');
  const HULL = C.veryLightGray;
  const PANEL = C.lightBluishGray;
  const DARK = C.darkBluishGray;

  // ---- fuselage ---------------------------------------------------------
  const TABLE = [
    [-12.4, 0.78], [-10.6, 1.12], [-7.6, 1.40], [-3.4, 1.58],
    [1.6, 1.72], [6.4, 1.80], [10.6, 1.70],
  ];
  polyXZ(kit, 0, -0.85, 0, outlineFrom(TABLE), 1.25, HULL);
  polyXZ(kit, 0, -1.24, 0, outlineFrom(TABLE, { s: 0.82, z0: -9.5 }), 0.4, DARK);
  polyXZ(kit, 0, 0.4, 0, outlineFrom(TABLE, { s: 0.94, z0: -11.4 }), 0.4, PANEL);

  // nose: two tapering steps and a cone tip
  polyXZ(kit, 0, -0.7, 0, [[0.74, -12.4], [0.5, -14.2], [-0.5, -14.2], [-0.74, -12.4]], 1.15, HULL);
  polyXZ(kit, 0, -0.5, 0, [[0.5, -14.2], [0.34, -15.0], [-0.34, -15.0], [-0.5, -14.2]], 0.85, PANEL);
  kit.cone(0, -0.06, -15.4, 0.2, 0.34, 0.45, C.red, { axis: 'z', seg: 12 });
  kit.tile(0, 0.32, -13.3, 1, 3, C.red, { h: 0.22 });
  kit.sym((s) => {
    // torpedo tubes flanking the nose
    kit.cyl(s * 0.62, -0.34, -12.9, 0.3, 1.9, DARK, { axis: 'z', seg: 10 });
    kit.cyl(s * 0.62, -0.34, -14.85, 0.22, 0.3, C.black, { axis: 'z', seg: 10 });
    kit.tile(s * 1.0, 0.32, -9.6, 1, 4, C.red, { h: 0.22 });
    kit.tile(s * 1.15, 0.32, -5.0, 1, 3, PANEL, { h: 0.22 });
    // side panel lines
    kit.box(s * 1.56, -0.75, -8.0, 0.16, 0.5, 5.0, PANEL, {});
    kit.box(s * 1.72, -0.7, 0.5, 0.16, 0.4, 7.0, PANEL, {});
  });

  // ---- cockpit tub ------------------------------------------------------
  kit.box(0, 0.8, -3.5, 3.0, 0.24, 4.8, C.black, {});
  kit.sym((s) => {
    kit.box(s * 1.42, 0.8, -3.5, 0.36, 0.8, 4.8, PANEL, {});
  });
  // fairing sloping up to the windscreen
  profZY(kit, 0, 0.8, 0, [[-8.6, 0], [-5.9, 0], [-5.9, 0.72], [-8.6, 0.06]], 2.7, HULL);
  kit.box(0, 0.9, -5.85, 2.4, 0.6, 0.4, DARK, {});          // instrument hood
  kit.tile(0, 1.5, -5.85, 2, 1, C.black, { h: 0.2 });
  kit.stud(-0.45, 1.7, -5.85, C.red);
  kit.stud(0.45, 1.7, -5.85, C.green);
  kit.box(0, 1.04, -2.4, 1.4, 0.44, 1.1, DARK, {});          // seat pan
  kit.box(0, 1.04, -1.7, 1.4, 1.4, 0.4, DARK, {});           // seat back
  kit.box(0, 0.8, -1.15, 3.0, 1.5, 0.5, PANEL, {});          // rear bulkhead

  // ---- spine, astromech socket, rear deck -------------------------------
  kit.box(0, 0.8, 2.2, 2.9, 0.7, 6.0, PANEL, {});
  kit.torus(0, 1.5, 0.4, 1.0, 0.18, DARK, { rot: [Math.PI / 2, 0, 0], seg: 16, tseg: 6 });
  kit.cyl(0, 1.36, 0.4, 0.94, 0.16, C.black, { seg: 16 });
  // R2 unit dropped into the socket
  kit.cyl(0, 1.42, 0.4, 0.8, 0.55, SW.r2White, { seg: 16 });
  kit.sphere(0, 2.02, 0.4, 0.8, SW.r2Blue, { seg: 16 });
  kit.cyl(0, 2.06, -0.32, 0.17, 0.3, C.black, { axis: 'z', seg: 10 });
  kit.cyl(0, 2.74, 0.4, 0.22, 0.24, SW.r2Silver, { seg: 10 });
  kit.sym((s) => {
    kit.box(s * 0.98, 1.5, 0.4, 0.42, 0.55, 1.5, SW.r2Blue, {});
  });

  // rear deck greebles + panel lines
  panelGrid(kit, rng, 1.5, -1.3, 1.3, 3.4, 9.6, [PANEL, DARK, C.flatSilver],
    { stepX: 1.4, stepZ: 1.6, w: 1, d: 1, p: 0.6 });
  greeble(kit, rng, -1.1, 1.1, 1.5, 4.2, 9.2, { n: 12 });
  kit.box(0, 1.5, 9.0, 2.2, 0.7, 1.3, DARK, {});
  kit.sym((s) => {
    kit.tile(s * 1.35, 0.8, 6.0, 1, 6, C.red, { h: 0.22 });
    kit.box(s * 1.5, -0.5, 7.6, 0.5, 0.9, 3.0, DARK, {});
    // wing-root fairing so the S-foil hinge has something to grow out of
    kit.box(s * 1.62, -0.95, 4.6, 0.7, 2.5, 3.4, PANEL, {});
    kit.cyl(s * 1.4, 0.55, 5.0, 0.34, 0.9, C.flatSilver, { axis: 'x', rot: [0, 0, s * -Math.PI / 2], seg: 12 });
    kit.cyl(s * 1.4, -0.55, 5.0, 0.34, 0.9, C.flatSilver, { axis: 'x', rot: [0, 0, s * -Math.PI / 2], seg: 12 });
    // belly detail
    kit.tile(s * 0.7, -1.3, -4.0, 1, 8, DARK, { h: 0.22 });
    kit.cyl(s * 0.8, -1.5, 2.6, 0.3, 0.3, C.gunmetal, { seg: 10 });
  });

  const group = kit.build({ name: 'xwing' });

  // ---- canopy: hinged at the rear ---------------------------------------
  const ck = new Kit('xwing-canopy');
  profZY(ck, 0, 0, 0, [[-4.7, 0], [0, 0], [0, 1.15], [-1.1, 1.18], [-4.7, 0.3]], 2.66, C.transLightBlue,
    { finish: FINISH.glass, opacity: 0.32, castShadow: false });
  ck.sym((s) => {
    ck.box(s * 1.34, 0.0, -2.3, 0.22, 0.62, 4.7, PANEL, {});
    ck.box(s * 0.72, 1.05, -1.4, 0.14, 0.22, 2.8, PANEL, {});
  });
  ck.box(0, 1.12, -0.55, 2.66, 0.2, 1.1, PANEL, {});
  ck.box(0, 0.0, -4.75, 2.2, 0.5, 0.3, PANEL, {});
  const canopy = ck.build({ name: 'canopy' });
  canopy.position.set(0, 1.62, -1.1);
  group.add(canopy);

  // ---- S-foils -----------------------------------------------------------
  const wings = [];
  const engines = [];
  const muzzles = {};
  for (const side of [-1, 1]) {
    for (const tier of [1, -1]) {
      const w = xwingWing(side, tier);
      w.position.set(side * XW.pivotX, tier * XW.pivotY, XW.pivotZ);
      group.add(w);
      wings.push(w);
      engines.push(w.userData.engine);
      const name = `gun${side < 0 ? 'L' : 'R'}${tier > 0 ? 1 : 2}`;
      muzzles[name] = w.userData.muzzle;
      w.userData.pointName = name;
    }
  }

  const setSFoils = (amount) => {
    const a = clamp01(amount);
    const ang = XW.closed + (XW.open - XW.closed) * a;
    for (const w of wings) {
      w.rotation.z = w.userData.side * w.userData.tier * ang;
      w.updateMatrix();
      const p = group.userData.points[w.userData.pointName];
      p.copy(w.userData.muzzle.position).applyMatrix4(w.matrix);
    }
    group.userData.sFoils = a;
  };
  for (const name of Object.keys(muzzles)) group.userData.points[name] = new THREE.Vector3();

  group.userData.engines = engines;
  group.userData.muzzles = muzzles;
  group.userData.canopy = canopy;
  group.userData.wings = wings;
  group.userData.setSFoils = setSFoils;
  setSFoils(sFoils ? 1 : 0);
  return group;
}

// -------------------------------------------------------------- TIE fighter --

/** Elongated hexagon in (z, y) for a TIE solar array wing. */
function tiePanelOutline(d, h, k = 0.44) {
  return [[d, 0], [d * k, h], [-d * k, h], [-d, 0], [-d * k, -h], [d * k, -h]];
}

/**
 * TIE/ln fighter. 16 wide.
 *   userData.engines[2]
 *   userData.points.gunL / gunR   twin chin cannons
 */
export function buildTieFighter() {
  const kit = new Kit('tie');
  const rng = makeRng('tie-fighter');
  const HULL = C.darkBluishGray;
  const TRIM = C.lightBluishGray;
  const DARK = SW.vaderBlack;

  // ---- cockpit ball ------------------------------------------------------
  kit.sphere(0, 0, 0, 2.35, HULL, { seg: 22 });
  kit.torus(0, 0, 0, 2.3, 0.2, C.black, { rot: [Math.PI / 2, 0, 0], seg: 22, tseg: 6 });
  kit.torus(0, 0, 0, 2.28, 0.16, HULL, { seg: 22, tseg: 6 });

  // flat hexagonal viewport on the nose
  kit.cyl(0, 0, -2.42, 1.78, 0.26, C.black, { axis: 'z', seg: 6, rot: [Math.PI / 2, 0, 0] });
  kit.cyl(0, 0, -2.52, 1.4, 0.22, C.transBlack, {
    axis: 'z', seg: 12, finish: FINISH.trans, opacity: 0.7, rot: [Math.PI / 2, 0, 0],
  });
  ringZ(kit, 6, 1.54, -2.64, () => kit.box(0, -0.13, 0, 1.85, 0.26, 0.3, DARK, {}), { start: Math.PI / 6 });
  kit.cyl(0, 0, -2.68, 0.34, 0.2, C.flatSilver, { axis: 'z', seg: 10 });
  kit.sym((s) => kit.box(s * 1.35, -0.4, -2.6, 0.3, 0.8, 0.24, TRIM, {}));

  // hull bands and hatch detail
  kit.sym((s) => {
    kit.box(s * 1.5, 1.5, 0.4, 0.9, 0.3, 1.6, TRIM, { rot: [0, 0, s * -0.5] });
    kit.tile(s * 1.1, 1.92, -0.6, 1, 2, C.black, { h: 0.2 });
    kit.cyl(s * 1.9, -1.0, 0.2, 0.24, 0.5, C.flatSilver, { rot: [0, 0, s * -1.1], seg: 10 });
    kit.box(s * 1.75, -1.1, 1.1, 0.5, 0.3, 1.2, DARK, { rot: [0, 0, s * -1.0] });
  });
  kit.cyl(0, 2.16, -0.2, 0.5, 0.4, TRIM, { seg: 12 });
  kit.cyl(0, 2.5, -0.2, 0.2, 0.3, C.flatSilver, { seg: 10 });

  // ---- twin chin cannons -------------------------------------------------
  kit.box(0, -2.25, -1.6, 2.0, 0.75, 1.5, DARK, {});
  const gun = {};
  kit.sym((s) => {
    const z = barrel(kit, s * 0.74, -2.0, -1.7, 2.4, 0.24, C.gunmetal, { band: DARK });
    gun[s < 0 ? 'gunL' : 'gunR'] = [s * 0.74, -2.0, z];
  });
  kit.point('gunL', ...gun.gunL);
  kit.point('gunR', ...gun.gunR);

  // ---- engine deck at the back ------------------------------------------
  kit.box(0, -0.55, 1.9, 2.5, 1.15, 0.9, HULL, {});
  greeble(kit, rng, -1.0, 1.0, 0.6, 1.8, 2.4, { n: 6 });
  const engines = [];
  kit.sym((s) => {
    nozzle(kit, s * 0.85, -0.05, 1.9, 0.6, 0.8, { seg: 12, glow: SW.blasterRed, emissive: 2.0 });
    engines.push(engineNode(`engine${s < 0 ? 'L' : 'R'}`, s * 0.85, -0.05, 3.1, 0.6));
  });

  // ---- struts ------------------------------------------------------------
  kit.sym((s) => {
    kit.box(s * 4.3, -0.45, 0, 4.6, 0.9, 1.7, HULL, {});
    kit.box(s * 4.3, -0.8, 0, 4.4, 0.4, 2.3, DARK, {});
    kit.box(s * 4.3, 0.45, 0, 3.4, 0.24, 1.1, TRIM, {});
    kit.cyl(s * 2.0, 0, 0, 0.62, 1.4, HULL, { axis: 'x', rot: [0, 0, s * -Math.PI / 2], seg: 12 });
    kit.cyl(s * 5.4, 0, 0, 0.78, 1.3, HULL, { axis: 'x', rot: [0, 0, s * -Math.PI / 2], seg: 14 });
    kit.torus(s * 6.35, 0, 0, 0.82, 0.18, C.black, { rot: [0, 0, Math.PI / 2], seg: 14, tseg: 5 });
  });

  // ---- solar array wings -------------------------------------------------
  const PD = 4.5;      // half depth
  const PH = 5.6;      // half height
  const hex = tiePanelOutline(PD, PH);
  kit.sym((s) => {
    const px = s * 7.5;
    profZY(kit, px, 0, 0, hex, 1.15, DARK);
    // rim frame, one bar per hexagon edge
    for (let i = 0; i < 6; i++) {
      const a = hex[i];
      const b = hex[(i + 1) % 6];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(b[1] - a[1], -(b[0] - a[0]));
      kit.push().translate(px, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2).rotX(ang);
      kit.box(0, -0.2, 0, 1.5, 0.4, len, HULL, {});
      kit.pop();
    }
    // radial spars from the hub to each vertex, both faces
    for (let i = 0; i < 6; i++) {
      const v = hex[i];
      const len = Math.hypot(v[0], v[1]);
      const ang = Math.atan2(v[1], -v[0]);
      for (const f of [-1, 1]) {
        kit.push().translate(px + f * 0.66, v[1] / 2, v[0] / 2).rotX(ang);
        kit.box(0, -0.14, 0, 0.34, 0.28, len - 0.6, HULL, {});
        kit.pop();
      }
    }
    // quilted black tiles between the spars
    for (let i = 0; i < 6; i++) {
      const a = ((i / 6) * Math.PI * 2) + Math.PI / 6;
      for (const rr of [0.3, 0.58, 0.82]) {
        const py = Math.sin(a) * PH * rr;
        const pz = Math.cos(a) * PD * rr;
        for (const f of [-1, 1]) {
          kit.box(px + f * 0.64, py - 0.9, pz, 0.28, 1.8, 1.8, C.black, {});
        }
      }
    }
    // hub
    kit.cyl(px, 0, 0, 1.1, 1.7, HULL, { axis: 'x', rot: [0, 0, -Math.PI / 2], seg: 14 });
    kit.cyl(px + s * 0.85, 0, 0, 0.6, 0.4, C.flatSilver, { axis: 'x', rot: [0, 0, s * -Math.PI / 2], seg: 12 });
  });

  const group = kit.build({ name: 'tie' });
  for (const e of engines) group.add(e);
  group.userData.engines = engines;
  return group;
}

// -------------------------------------------------------------- escape pod --

/**
 * Class-6 escape pod. 9 long.
 *   userData.engines[3]
 */
export function buildEscapePod() {
  const kit = new Kit('escapepod');
  const rng = makeRng('escape-pod');
  const SHELL = C.white;
  const TRIM = C.lightBluishGray;
  const DARK = C.darkBluishGray;
  const R = 1.58;

  kit.cone(0, 0, -4.5, 0.62, R, 1.8, SHELL, { axis: 'z', seg: 14 });
  kit.cyl(0, 0, -2.7, R, 5.5, SHELL, { axis: 'z', seg: 14 });
  kit.cone(0, 0, 2.8, R, R * 0.82, 0.9, TRIM, { axis: 'z', seg: 14 });
  kit.cyl(0, 0, -4.56, 0.6, 0.22, DARK, { axis: 'z', seg: 12 });

  // dark viewport band around the shoulders
  kit.cyl(0, 0, -2.65, R * 1.08, 1.15, C.black, { axis: 'z', seg: 14 });
  ringZ(kit, 8, R * 1.1, -2.1, () => {
    kit.box(0, -0.09, 0, 0.78, 0.18, 0.8, C.transLightBlue,
      { finish: FINISH.trans, opacity: 0.62, emissive: 0.4, castShadow: false });
  }, { start: Math.PI / 8 });

  // hoops and longitudinal ribs
  kit.torus(0, 0, -1.3, R * 1.04, 0.15, TRIM, { seg: 16, tseg: 5 });
  kit.torus(0, 0, 1.5, R * 1.04, 0.15, TRIM, { seg: 16, tseg: 5 });
  ringZ(kit, 8, R, 0.1, (i) => {
    kit.box(0, 0, 0, 0.44, 0.16, 2.7, i % 2 ? TRIM : DARK, {});
  }, { start: Math.PI / 8 });
  ringZ(kit, 4, R, -2.0, () => kit.box(0, 0, 0, 0.3, 0.3, 0.5, DARK, {}), { start: Math.PI / 4 });

  // dorsal hatch and greebles
  kit.box(0, R - 0.05, 0.3, 1.7, 0.34, 2.0, TRIM, {});
  kit.tile(0, R + 0.28, 0.3, 1, 2, DARK, { h: 0.2 });
  kit.tile(0, R + 0.02, -1.6, 2, 1, C.red, { h: 0.2 });
  greeble(kit, rng, -0.7, 0.7, R - 0.05, 1.6, 2.5, { n: 5 });

  const engines = [];
  const ez = 3.5;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * 0.82;
    const y = Math.sin(a) * 0.82;
    nozzle(kit, x, y, ez, 0.5, 0.7, { seg: 12, glow: SW.engineCyan, emissive: 2.0 });
    engines.push(engineNode(`engine${i}`, x, y, ez + 1.3, 0.5));
  }
  kit.cyl(0, 0, ez - 0.2, 1.3, 0.5, DARK, { axis: 'z', seg: 14 });

  const group = kit.build({ name: 'escapepod' });
  for (const e of engines) group.add(e);
  group.userData.engines = engines;
  return group;
}

// -------------------------------------------------------------- Tantive IV --

/**
 * CR90 corvette. 60 long: hammerhead command section, tapering hull, eleven
 * engines in three stepped tiers.
 *   userData.engines[11]
 *   userData.points.dish
 */
export function buildTantiveIV() {
  const kit = new Kit('tantive');
  const rng = makeRng('tantive-iv');
  const HULL = C.white;
  const PANEL = C.lightBluishGray;
  const DARK = C.darkBluishGray;
  const TRIM = SW.hullGrayDark;

  // ---- hull plan: half-width along z ------------------------------------
  const TABLE = [
    [-16.0, 1.55], [-12.0, 2.1], [-6.0, 3.2], [0.0, 4.4],
    [8.0, 5.8], [16.0, 6.8], [21.5, 7.0],
  ];
  polyXZ(kit, 0, -1.3, 0, outlineFrom(TABLE), 1.9, HULL);                          // mid
  polyXZ(kit, 0, -2.5, 0, outlineFrom(TABLE, { inset: 0.9, z0: -13 }), 1.2, PANEL); // lower
  polyXZ(kit, 0, 0.6, 0, outlineFrom(TABLE, { inset: 0.75 }), 1.0, HULL);           // upper
  polyXZ(kit, 0, 1.6, 0, outlineFrom(TABLE, { inset: 2.4, z0: -10 }), 0.5, PANEL);  // deck skin
  polyXZ(kit, 0, -3.0, 0, outlineFrom(TABLE, { inset: 2.6, z0: -8 }), 0.5, DARK);   // keel

  // dorsal spine
  polyXZ(kit, 0, 2.1, 0, [[1.7, -9.0], [2.3, 18.0], [-2.3, 18.0], [-1.7, -9.0]], 0.9, HULL);
  polyXZ(kit, 0, 3.0, 0, [[1.1, -7.0], [1.5, 16.5], [-1.5, 16.5], [-1.1, -7.0]], 0.4, PANEL);

  // panel break-up on the big flat surfaces
  panelGrid(kit, rng, 2.1, -6.4, 6.4, -8.0, 20.0, [PANEL, TRIM, DARK], { stepX: 2.6, stepZ: 3.0, w: 2, d: 2, p: 0.5 });
  panelGrid(kit, rng, -3.5, -5.0, 5.0, -6.0, 19.0, [TRIM, DARK], { stepX: 2.8, stepZ: 3.2, w: 2, d: 2, p: 0.4 });
  kit.sym((s) => {
    // window strips and hull ribs down the flanks
    for (let i = 0; i < 7; i++) {
      const z = -8 + i * 4.2;
      const w = 1.9 + i * 0.14;
      kit.box(s * (w + 1.35), -0.6, z, 0.2, 0.5, 2.4, C.transLightBlue,
        { finish: FINISH.trans, opacity: 0.55, emissive: 0.5, castShadow: false });
      kit.box(s * (w + 1.2), -1.1, z + 2.2, 0.26, 1.6, 0.4, TRIM, {});
    }
    // ventral fins
    polyXZ(kit, 0, -2.2, 0, [[s * 4.0, 4.0], [s * 8.4, 12.0], [s * 8.4, 15.0], [s * 4.0, 9.0]], 0.4, PANEL);
    kit.box(s * 6.2, -2.4, 12.5, 1.6, 0.5, 2.4, DARK, {});
    // dorsal greeble trenches
    greeble(kit, rng, s * 2.6, s * 5.4, 1.6, 2.0, 16.0, { n: 9 });
    kit.tile(s * 3.2, 2.1, 8.0, 2, 6, TRIM, { h: 0.22 });
  });

  // ---- hammerhead command section ---------------------------------------
  kit.cone(0, 0, -21.6, 3.45, 1.9, 3.2, HULL, { axis: 'z', seg: 18 });       // shoulder
  kit.cyl(0, 0, -25.6, 3.45, 4.0, HULL, { axis: 'z', seg: 18 });             // drum
  kit.cone(0, 0, -28.4, 2.0, 3.45, 2.8, HULL, { axis: 'z', seg: 18 });       // bow taper
  kit.cyl(0, 0, -29.4, 1.85, 1.0, PANEL, { axis: 'z', seg: 16 });
  kit.cone(0, 0, -30.0, 0.9, 1.85, 0.6, PANEL, { axis: 'z', seg: 16 });
  // ring of bridge viewports
  kit.torus(0, 0, -26.4, 3.5, 0.22, PANEL, { seg: 22, tseg: 6 });
  kit.torus(0, 0, -24.2, 3.5, 0.22, PANEL, { seg: 22, tseg: 6 });
  ringZ(kit, 14, 3.4, -25.3, () => {
    kit.box(0, 0, 0, 1.0, 0.2, 1.5, C.transLightBlue,
      { finish: FINISH.trans, opacity: 0.6, emissive: 0.7, castShadow: false });
  });
  ringZ(kit, 7, 3.42, -27.9, () => kit.box(0, 0, 0, 1.1, 0.24, 0.9, PANEL, {}));
  ringZ(kit, 4, 2.6, -30.4, () => kit.box(0, 0, 0, 0.7, 0.22, 0.5, DARK, {}), { start: Math.PI / 4 });
  // neck
  kit.box(0, -1.4, -19.0, 3.4, 2.8, 6.0, PANEL, {});
  kit.sym((s) => {
    kit.box(s * 1.85, -1.5, -19.0, 0.4, 2.4, 5.0, DARK, {});
    kit.box(s * 1.2, 1.4, -19.4, 1.0, 0.4, 4.4, TRIM, {});
    greeble(kit, rng, s * 0.6, s * 1.5, 1.4, -21.0, -17.0, { n: 4 });
  });

  // ---- comms dish on the spine ------------------------------------------
  kit.cyl(0, 3.4, 3.0, 0.6, 0.7, PANEL, { seg: 12 });
  kit.cyl(0, 4.1, 3.0, 0.32, 0.5, C.flatSilver, { seg: 10 });
  kit.cone(0, 4.5, 3.0, 2.0, 0.4, 0.7, PANEL, { rot: [0, 0, 0], seg: 20 });
  kit.torus(0, 5.2, 3.0, 1.9, 0.14, TRIM, { rot: [Math.PI / 2, 0, 0], seg: 20, tseg: 5 });
  kit.cyl(0, 5.2, 3.0, 0.16, 0.6, C.gunmetal, { seg: 8 });
  kit.point('dish', 0, 5.4, 3.0);
  // secondary sensor cluster
  kit.cyl(0, 3.4, -3.5, 0.5, 1.2, DARK, { seg: 12 });
  kit.sphere(0, 4.7, -3.5, 0.55, C.transLightBlue, { seg: 12, finish: FINISH.trans, opacity: 0.6 });

  // ---- engine bank: 5 + 4 + 2, stepped up and forward -------------------
  const engines = [];
  const tiers = [
    { n: 5, y: -1.5, z: 22.0, r: 1.32, dx: 2.85 },
    { n: 4, y: 0.9, z: 21.2, r: 1.16, dx: 2.6 },
    { n: 2, y: 2.9, z: 20.2, r: 1.0, dx: 1.7 },
  ];
  // housing steps behind the hull
  kit.box(0, -2.7, 21.3, 14.0, 2.6, 3.0, PANEL, {});
  kit.box(0, -0.1, 20.6, 11.4, 2.4, 3.2, PANEL, {});
  kit.box(0, 2.3, 19.7, 5.6, 2.2, 3.2, PANEL, {});
  kit.box(0, 4.5, 19.0, 3.0, 0.5, 2.4, DARK, {});
  for (const t of tiers) {
    for (let i = 0; i < t.n; i++) {
      const x = (i - (t.n - 1) / 2) * t.dx;
      kit.cyl(x, t.y, t.z - 1.2, t.r * 1.02, 1.4, PANEL, { axis: 'z', seg: 14 });
      const end = nozzle(kit, x, t.y, t.z, t.r, 2.4, { seg: 14, emissive: 2.6 });
      engines.push(engineNode(`engine${engines.length}`, x, t.y, end + 0.3, t.r));
    }
  }
  kit.sym((s) => {
    greeble(kit, rng, s * 2.0, s * 6.4, 1.1, 19.0, 21.5, { n: 6 });
    kit.box(s * 6.2, -1.6, 21.0, 1.4, 2.0, 2.6, DARK, {});
  });

  const group = kit.build({ name: 'tantive' });
  for (const e of engines) group.add(e);
  group.userData.engines = engines;
  return group;
}

// ----------------------------------------------------------------- exhibits --

export const EXHIBITS = {
  xwing: () => buildXwing(),
  'xwing-open': () => buildXwing({ sFoils: true }),
  tie: () => buildTieFighter(),
  escapepod: () => buildEscapePod(),
  tantive: () => buildTantiveIV(),
};
