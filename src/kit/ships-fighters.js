/**
 * Small craft and the battle-station surface, all built from the brick kit.
 *
 * Every craft is modelled the way a real LEGO set would be: chunky readable
 * silhouettes made of plates, slopes, wedges, cylinders and dishes, studs on
 * the upper surfaces, smooth tiles where a set would print or tile them, and
 * small greeble plates so no hull reads as a flat slab.
 *
 * CONVENTIONS
 *   - +z is forward for every craft, +y is up, and each craft is centred on
 *     the origin.
 *   - Coordinates passed to the builder are LEGO units: x/z in studs,
 *     y in plates (1 stud = 2.5 plates). Vertical dimensions that want to be
 *     "n studs tall" are written `n * PY`.
 *   - No Math.random(): all scatter comes from hash11(index, seed), so a
 *     greebled trench wall is byte-identical on every run.
 *   - Each model merges down to one mesh per material through `Bricks.build()`.
 *     The only separate meshes are the X-wing's four S-foil pivots, because
 *     they have to move.
 */
import * as THREE from 'three';
import { Bricks, PITCH, PLATE } from '../engine/brick.js';
import { COLORS } from '../engine/palette.js';
import { hash11 } from '../engine/rng.js';

/** Plates per stud. Vertical spans written in stud-equivalents scale by this. */
const PY = PITCH / PLATE; // 2.5

// ---------------------------------------------------------------------------
// Placement helpers
//
// The builder anchors parts at their minimum corner, which is right for
// stacking bricks but awkward for symmetric vehicles. These wrappers take a
// centre in x/z (still a bottom-anchored y) so a part and its mirror image are
// just `cx` and `-cx` -- no negative scaling, which would invert face winding.
// ---------------------------------------------------------------------------

function cbox(b, cx, y, cz, w, d, h, color, opts) {
  return b.box(cx - w / 2, y, cz - d / 2, w, d, h, color, opts);
}
function cplate(b, cx, y, cz, w, d, color, opts) {
  return cbox(b, cx, y, cz, w, d, 1, color, opts);
}
function ctile(b, cx, y, cz, w, d, color, opts = {}) {
  return cbox(b, cx, y, cz, w, d, 1, color, { ...opts, studs: false });
}
function cpanel(b, cx, y, cz, w, d, h, color, opts = {}) {
  return cbox(b, cx, y, cz, w, d, h, color, { ...opts, studs: false });
}
function cslope(b, cx, y, cz, w, d, h, color, opts) {
  return b.slope(cx - w / 2, y, cz - d / 2, w, d, h, color, opts);
}
function cwedge(b, cx, y, cz, w, d, h, color, opts) {
  return b.wedge(cx - w / 2, y, cz - d / 2, w, d, h, color, opts);
}

/**
 * Wedge plate for a swept leading edge: the right angle sits at the inboard-aft
 * corner and the hypotenuse sweeps back as it goes outboard. `sx` picks the
 * side. Mirroring uses a quarter turn (which swaps the wedge's own w/d) rather
 * than a negative scale, so face winding stays correct.
 */
function sweepWedge(b, sx, cx, y, cz, w, d, h, color, opts = {}) {
  if (sx > 0) return b.wedge(cx - w / 2, y, cz - d / 2, w, d, h, color, { ...opts, rot: 0 });
  return b.wedge(-cx - d / 2, y, cz - w / 2, d, w, h, color, { ...opts, rot: 1 });
}

/** Cylinder lying along z (fore/aft), centred at (cx, cy, cz). `len` in studs. */
function zcyl(b, cx, cy, cz, r, len, color, opts = {}) {
  const h = len * PY;
  return b.cyl(cx, cy - h / 2, cz, r, h, color, { ...opts, rot: [Math.PI / 2, 0, 0] });
}
/** Cylinder lying along x (across the hull), centred at (cx, cy, cz). */
function xcyl(b, cx, cy, cz, r, len, color, opts = {}) {
  const h = len * PY;
  return b.cyl(cx, cy - h / 2, cz, r, h, color, { ...opts, rot: [0, 0, Math.PI / 2] });
}
/** Cylinder standing on y, centred on its height. `h` in plates. */
function ycyl(b, cx, cy, cz, r, h, color, opts = {}) {
  return b.cyl(cx, cy - h / 2, cz, r, h, color, opts);
}

/** LEGO coordinates -> a model-space Vector3 (what scenes and FX want). */
function lego(x, y, z) {
  return new THREE.Vector3(x * PITCH, y * PLATE, z * PITCH);
}

/** Emissive options for glowing strips, engine cores and window lights. */
function glow(color, intensity = 1.7) {
  return { studs: false, finish: 'glow', emissive: color, emissiveIntensity: intensity };
}

/** Sum the triangles of every mesh under an object, for budget checks. */
function countTriangles(obj) {
  let n = 0;
  obj.traverse((o) => {
    if (o.isMesh && o.geometry?.attributes?.position) n += o.geometry.attributes.position.count / 3;
  });
  return Math.round(n);
}

/**
 * Roll the `userData.parts` list of a sub-assembly into its parent's list,
 * transformed by the sub-assembly's local matrix, so `BrickBurst` can still
 * blow the whole model apart into individual bricks.
 */
function absorbParts(root, child) {
  child.updateMatrix();
  const q = new THREE.Quaternion().setFromEuler(child.rotation);
  for (const g of child.children) {
    if (!g.userData?.parts) continue;
    for (const p of g.userData.parts) {
      root.userData.parts.push({
        ...p,
        position: p.position.clone().applyMatrix4(child.matrix),
        quaternion: q.clone().multiply(p.quaternion),
      });
    }
  }
}

/** Finish a model: aggregate part lists and record the triangle count. */
function finish(root, ...built) {
  root.userData.parts = root.userData.parts || [];
  for (const g of built) if (g.userData?.parts) root.userData.parts.push(...g.userData.parts);
  root.userData.triangles = countTriangles(root);
  return root;
}

// ===========================================================================
// X-WING  --  T-65, four wings on S-foil pivots
// ===========================================================================

/**
 * Fuselage: three stacked layers so the flanks show a plate seam like a real
 * build, with a studded deck on top and greebles underneath.
 */
function xwFuselage(b, C) {
  const zc = -4; // centre of the 13-stud body, which runs z -10.5 .. +2.5

  cpanel(b, 0, -3, zc, 4, 13, 2, C.hullLow); // belly
  cpanel(b, 0, -1, zc, 4, 13, 3, C.hull); // core
  cplate(b, 0, 2, zc, 4, 13, C.hull); // studded deck

  // side rails: a thin darker strip along each flank breaks up the slab
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 2.05, -2.6, zc, 0.3, 12, 3.2, C.hullLow);
    cpanel(b, sx * 2.02, 1.2, -8.6, 0.36, 3.2, 1.6, C.metal);
  }

  // rear bulkhead and a couple of belly greebles
  cpanel(b, 0, -3, -10.65, 4.3, 0.5, 6, C.metal);
  cpanel(b, 0, -3.6, -7.5, 2.4, 3.6, 0.8, C.metal);
  cpanel(b, 0, -3.6, -1.5, 1.6, 5, 0.7, C.hullLow);
  for (const sx of [-1, 1]) cpanel(b, sx * 1.3, -3.5, -3.6, 0.9, 1.6, 0.6, C.metal);

  // dorsal spine detail between the cockpit and the engines
  ctile(b, 0, 3, -5.4, 1, 2, C.trim);
  ctile(b, 0, 3, -8.0, 1, 2, C.trim);
  ctile(b, 0, 3, -6.7, 1, 1, C.metal);
  cplate(b, 0, 3, -9.6, 2, 1.6, C.metal);
  for (const sx of [-1, 1]) {
    ctile(b, sx * 1.5, 3, -4.6, 1, 2, C.metal);
    ctile(b, sx * 1.5, 3, -8.4, 1, 3, C.metal);
  }
}

/** The four engine nacelles, in a 2x2 cluster on the flanks of the rear hull. */
function xwEngines(b, C, points) {
  const R = 1.05;
  for (const sy of [1, -1]) {
    for (const sx of [-1, 1]) {
      const x = sx * 2.0;
      const y = sy * 1.15 * PY;
      zcyl(b, x, y, -8.0, R, 5.6, C.hull, { segments: 14, studs: false });
      // black intake ring at the front, dark band aft of it
      zcyl(b, x, y, -5.35, R * 1.04, 0.7, C.metal, { segments: 14, studs: false });
      zcyl(b, x, y, -5.0, R * 0.8, 0.5, C.gunMetal, { segments: 12, studs: false, rTop: R * 0.62 });
      zcyl(b, x, y, -6.4, R * 1.03, 0.5, C.trim, { segments: 14, studs: false });
      zcyl(b, x, y, -9.4, R * 1.02, 0.4, C.metal, { segments: 14, studs: false });
      // nozzle: a short flared ring plus the glowing core
      zcyl(b, x, y, -10.7, R * 0.99, 0.9, C.metal, { segments: 14, studs: false, rTop: R * 0.86 });
      zcyl(b, x, y, -11.0, R * 0.78, 0.3, C.engine, { segments: 12, ...glow(C.engine, 2.2) });
      // a small intercooler box on the outboard face
      cpanel(b, sx * 2.9, y - 0.5, -7.4, 0.5, 2.2, 1.2, C.metal);
      points.push(lego(x, y, -11.2));
    }
  }
}

/** Long tapered nose with the front cannon, plus the red squadron stripes. */
function xwNose(b, C) {
  // stepped taper -- a real set does this with wedge plates and slopes
  cpanel(b, 0, -2.5, 3.5, 3.5, 2, 5, C.hull);
  cpanel(b, 0, -2, 5.35, 2.8, 1.7, 4, C.hull);
  cpanel(b, 0, -1.5, 7.0, 2.0, 1.5, 3, C.hull);
  cpanel(b, 0, -1.0, 8.15, 1.3, 0.8, 2, C.hullLow);

  // slopes smooth the steps, top and bottom
  cslope(b, 0, 2, 3.7, 3.4, 2.4, 1, C.hull, { dir: '+z' });
  cslope(b, 0, -3, 3.7, 3.4, 2.4, 1, C.hull, { dir: '+z', inverted: true });
  cslope(b, 0, 1.4, 5.5, 2.7, 1.8, 0.9, C.hull, { dir: '+z' });
  cslope(b, 0, -2.3, 5.5, 2.7, 1.8, 0.9, C.hull, { dir: '+z', inverted: true });
  cslope(b, 0, 0.9, 7.1, 1.9, 1.6, 0.8, C.hull, { dir: '+z' });
  cslope(b, 0, -1.7, 7.1, 1.9, 1.6, 0.8, C.hull, { dir: '+z', inverted: true });

  // red squadron flashes on the nose flanks and spine
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 1.78, -1.6, 3.6, 0.24, 1.8, 3.2, C.trim);
    cpanel(b, sx * 1.42, -1.2, 5.5, 0.22, 1.4, 2.4, C.trim);
  }
  ctile(b, 0, 2.5, 3.4, 1.4, 1.8, C.trim);
  ctile(b, 0, 2, 5.4, 1, 1, C.metal);

  // long thin front cannon
  zcyl(b, 0, 0, 8.9, 0.32, 1.1, C.metal, { segments: 12, studs: false });
  zcyl(b, 0, 0, 10.2, 0.17, 2.8, C.gunMetal, { segments: 10, studs: false });
  zcyl(b, 0, 0, 11.45, 0.24, 0.5, C.metal, { segments: 10, studs: false });
}

/** Canopy, pilot bay and the astromech socket behind it. */
function xwCockpit(b, C) {
  // dark sill the canopy clips into
  cpanel(b, 0, 3, 0.7, 3.5, 4.6, 0.7, C.metal);
  cpanel(b, 0, 3, -2.6, 2.8, 2.2, 0.7, C.metal);

  // pilot bay: a seat and an instrument block, visible through the canopy
  cpanel(b, 0, 3.7, -0.6, 1.5, 0.5, 2.4, C.metal);
  cpanel(b, 0, 3.7, 0.3, 1.6, 1.4, 0.8, C.gunMetal);
  cpanel(b, 0, 3.7, 1.8, 1.7, 0.8, 1.6, C.metal);

  // bubble canopy: a squashed hemisphere with a sloped windscreen in front
  b.push();
  b.translate(0, 3.7, 0.4);
  b.scale(1, 0.6, 1.4);
  b.sphere(0, 0, 0, 1.5, C.glass, { segments: 18, phiLen: Math.PI / 2, finish: 'trans', opacity: 0.52 });
  b.pop();
  cslope(b, 0, 3.7, 2.35, 2.6, 1.5, 2.6, C.glass, { dir: '+z', finish: 'trans', opacity: 0.52 });

  // canopy frame ribs and the rear fairing that blends into the droid socket
  for (const sx of [-1, 1]) cpanel(b, sx * 1.42, 3.7, 0.5, 0.22, 4.2, 1.4, C.metal);
  xcyl(b, 0, 5.7, -1.3, 0.16, 2.7, C.metal, { segments: 8, studs: false });
  cslope(b, 0, 3.7, -2.1, 2.4, 1.4, 2.2, C.hull, { dir: '-z' });

  // astromech socket + the droid's dome poking out of it
  ycyl(b, 0, 3.5, -3.1, 1.15, 1, C.metal, { segments: 14, studs: false });
  ycyl(b, 0, 4.1, -3.1, 0.98, 0.5, C.gunMetal, { segments: 14, studs: false });
  b.sphere(0, 4.3, -3.1, 0.82, C.droid, { segments: 14, phiLen: Math.PI / 2 });
  cpanel(b, 0, 4.5, -2.42, 0.5, 0.3, 1.1, C.droidTrim); // eye
  for (const sx of [-1, 1]) cpanel(b, sx * 0.55, 4.5, -3.35, 0.3, 0.7, 0.9, C.droidTrim);
  ycyl(b, 0, 5.9, -3.1, 0.12, 0.7, C.gunMetal, { segments: 6, studs: false });
}

/**
 * One S-foil. Built in wing-local coordinates: the hinge is at the origin, the
 * wing runs outboard along `sx * x`, and `sy` flips the greeble layer to the
 * far face so the upper and lower wings do not collide when the foils close.
 */
function xwWing(sx, sy, C) {
  const b = new Bricks({ studSegments: 8 });
  const X = (u) => sx * u; // outboard distance -> local x
  const Y = (y, h) => (sy > 0 ? y : -y - h); // flip a bottom-anchored y span

  // hinge block: kept inside the +/-1 plate envelope so the closed foils meet
  // instead of intersecting
  cpanel(b, X(1.5), -1, -0.1, 1.8, 5, 2, C.metal);
  xcyl(b, X(1.1), 0, -0.1, 0.45, 1.4, C.gunMetal, { segments: 10, studs: false });

  // Main wing: a rectangular plate with a straight trailing edge at z = -2.5,
  // plus one big wedge plate for the swept leading edge -- exactly how a set
  // does it, and it keeps the silhouette a clean straight line.
  cbox(b, X(5.45), Y(-1, 2), -1.05, 6.1, 2.9, 2, C.hull, { studs: false });
  sweepWedge(b, sx, 5.45, Y(-1, 2), 1.4, 6.1, 2, 2, C.hull, { studs: false });

  // outward face: studded plate, red squadron stripe, and a smaller wedge in a
  // second grey (similar triangle, so its edge stays parallel to the sweep)
  cplate(b, X(4.0), Y(1, 1), -1.0, 3, 3, C.hull);
  ctile(b, X(6.4), Y(1, 1), -1.0, 2, 3, C.trim);
  ctile(b, X(7.9), Y(1, 1), -1.2, 1, 2, C.metal);
  sweepWedge(b, sx, 4.69, Y(1, 1), 1.15, 4.58, 1.5, 1, C.hullLow, { studs: false });

  // tip block and the wingtip cannon
  cpanel(b, X(8.8), -1, -1.05, 1.2, 2.9, 2, C.metal);
  cpanel(b, X(8.8), Y(1, 0.8), -1.2, 1, 2, 0.8, C.metal);
  zcyl(b, X(9.1), 0, 1.1, 0.24, 9, C.gunMetal, { segments: 10, studs: false });
  zcyl(b, X(9.1), 0, 5.3, 0.34, 0.9, C.metal, { segments: 10, studs: false });
  zcyl(b, X(9.1), 0, 1.9, 0.32, 0.6, C.trim, { segments: 10, studs: false });
  zcyl(b, X(9.1), 0, -3.2, 0.3, 0.7, C.metal, { segments: 10, studs: false });
  return b;
}

/**
 * @param {object} opts
 * @param {number} opts.hull       main hull colour
 * @param {number} opts.hullLow    secondary hull colour
 * @param {number} opts.trim       squadron stripe colour
 * @param {number} opts.glass      canopy colour
 * @param {number} opts.sfoils     initial S-foil opening, 0..1
 * @param {number} opts.sfoilAngle radians the foils sweep at full open
 */
export async function buildXWing(opts = {}) {
  const C = {
    hull: opts.hull ?? COLORS.white,
    hullLow: opts.hullLow ?? COLORS.lightBluishGray,
    trim: opts.trim ?? COLORS.red,
    metal: opts.metal ?? COLORS.darkBluishGray,
    gunMetal: opts.gunMetal ?? COLORS.flatSilver,
    glass: opts.glass ?? COLORS.transLightBlue,
    engine: opts.engine ?? 0x88ddff,
    droid: opts.droid ?? COLORS.white,
    droidTrim: opts.droidTrim ?? COLORS.blue,
  };

  const root = new THREE.Group();
  root.name = 'xwing';

  const hull = new Bricks({ studSegments: 8 });
  const enginePoints = [];
  xwFuselage(hull, C);
  xwEngines(hull, C, enginePoints);
  xwNose(hull, C);
  xwCockpit(hull, C);
  const hullMesh = hull.build();
  root.add(hullMesh);

  // --- four wings on pivots, hinged about the fuselage axis
  const OPEN = opts.sfoilAngle ?? 0.42;
  const pivots = [];
  const gunLocal = [];
  const gunPoints = [];
  for (const sy of [1, -1]) {
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.copy(lego(sx * 2.0, sy * 1.1, -6.2));
      pivot.userData.sx = sx;
      pivot.userData.sy = sy;
      pivot.add(xwWing(sx, sy, C).build());
      root.add(pivot);
      pivots.push(pivot);
      gunLocal.push(lego(sx * 9.1, 0, 5.9));
      gunPoints.push(new THREE.Vector3());
    }
  }

  const euler = new THREE.Euler();
  /** 0 = foils closed (a straight wing), 1 = fully open (the X). */
  const setSFoils = (v) => {
    const a = THREE.MathUtils.clamp(v, 0, 1) * OPEN;
    for (let i = 0; i < pivots.length; i++) {
      const p = pivots[i];
      p.rotation.z = p.userData.sx * p.userData.sy * a;
      euler.set(0, 0, p.rotation.z);
      gunPoints[i].copy(gunLocal[i]).applyEuler(euler).add(p.position);
    }
    root.userData.sfoils = THREE.MathUtils.clamp(v, 0, 1);
  };

  root.userData.setSFoils = setSFoils;
  root.userData.enginePoints = enginePoints;
  root.userData.gunPoints = gunPoints;
  setSFoils(opts.sfoils ?? 1);

  // pilot's head, for parenting a minifig head or a camera
  const cockpit = new THREE.Group();
  cockpit.position.copy(lego(0, 4.1, 0.4));
  root.add(cockpit);
  root.userData.cockpit = cockpit;

  finish(root, hullMesh);
  for (const p of pivots) absorbParts(root, p);
  return root;
}

/** Turntable entries for preview.html. */
export const PREVIEW = {
  xwing: () => buildXWing(),
  'xwing-closed': async () => {
    const m = await buildXWing();
    m.userData.setSFoils(0);
    return m;
  },
  'xwing-open': async () => {
    const m = await buildXWing();
    m.userData.setSFoils(1);
    return m;
  },
};
