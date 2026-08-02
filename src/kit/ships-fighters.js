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
/**
 * Slope centred in x/z. `w` is always the width across x and `d` the run along
 * z, whichever way the slope faces.
 *
 * The builder authors its ramp descending toward +x and spins it a quarter turn
 * for the '+z'/'-z' facings, which swaps the geometry's own w/d -- so those are
 * exchanged here and the caller never has to think about it.
 */
function cslope(b, cx, y, cz, w, d, h, color, opts = {}) {
  const dir = opts.dir || '+x';
  const spun = dir === '+z' || dir === '-z';
  const W = spun ? d : w;
  const D = spun ? w : d;
  return b.slope(cx - W / 2, y, cz - D / 2, W, D, h, color, { ...opts, dir });
}
function cwedge(b, cx, y, cz, w, d, h, color, opts) {
  return b.wedge(cx - w / 2, y, cz - d / 2, w, d, h, color, opts);
}

/**
 * Mirror-safe right-triangular plate, centred at (+/-cx, cz). The right angle
 * sits at the inboard corner so the hypotenuse reads as a swept edge; the
 * square edge is aft by default, or forward with `opts.forward`.
 *
 * Mirroring uses quarter turns rather than a negative scale (which would invert
 * face winding). A quarter turn also swaps the wedge's own w/d, so those are
 * exchanged before the call.
 */
function cornerWedge(b, sx, cx, y, cz, w, d, h, color, opts = {}) {
  // right-angle corner: rot 0 = (-x,-z), 1 = (+x,-z), 2 = (+x,+z), 3 = (-x,+z)
  const rot = sx > 0 ? (opts.forward ? 3 : 0) : opts.forward ? 2 : 1;
  const swap = rot === 1 || rot === 3;
  const W = swap ? d : w;
  const D = swap ? w : d;
  const x = sx > 0 ? cx : -cx;
  return b.wedge(x - W / 2, y, cz - D / 2, W, D, h, color, { ...opts, rot });
}

/** Swept leading edge: wide at the aft end, tapering to a point outboard. */
function sweepWedge(b, sx, cx, y, cz, w, d, h, color, opts = {}) {
  return cornerWedge(b, sx, cx, y, cz, w, d, h, color, opts);
}

/**
 * Cylinder lying along z (fore/aft), centred at (cx, cy, cz). `len` in studs.
 * `opts.spin` rolls it about its own axis, which is how low-segment cylinders
 * get used as correctly oriented hexagonal plates.
 */
function zcyl(b, cx, cy, cz, r, len, color, opts = {}) {
  const h = len * PY;
  return b.cyl(cx, cy - h / 2, cz, r, h, color, { ...opts, rot: [Math.PI / 2, opts.spin || 0, 0] });
}
/** Cylinder lying along x (across the hull), centred at (cx, cy, cz). */
function xcyl(b, cx, cy, cz, r, len, color, opts = {}) {
  const h = len * PY;
  return b.cyl(cx, cy - h / 2, cz, r, h, color, { ...opts, rot: [opts.spin || 0, 0, Math.PI / 2] });
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
  ctile(b, 0, 4.5, 1.8, 1.2, 0.8, C.trim);

  // bubble canopy: a squashed hemisphere with a sloped windscreen in front
  b.push();
  b.translate(0, 3.7, 0.4);
  b.scale(1, 0.6, 1.4);
  b.sphere(0, 0, 0, 1.5, C.glass, { segments: 18, phiLen: Math.PI / 2, finish: 'trans', opacity: 0.42 });
  b.pop();
  cslope(b, 0, 3.7, 2.35, 2.6, 1.5, 2.6, C.glass, { dir: '+z', finish: 'trans', opacity: 0.42 });

  // canopy frame ribs and the rear fairing that blends into the droid socket
  for (const sx of [-1, 1]) cpanel(b, sx * 1.42, 3.7, 0.5, 0.22, 4.2, 1.4, C.metal);
  xcyl(b, 0, 5.7, -1.3, 0.16, 2.7, C.metal, { segments: 8, studs: false });
  cslope(b, 0, 3.7, -2.1, 2.4, 1.4, 2.2, C.hull, { dir: '-z' });

  // astromech socket + the droid's dome poking out of it
  ycyl(b, 0, 3.5, -3.1, 1.2, 1, C.metal, { segments: 14, studs: false });
  ycyl(b, 0, 4.1, -3.1, 1.02, 0.5, C.gunMetal, { segments: 14, studs: false });
  b.sphere(0, 4.3, -3.1, 0.92, C.droid, { segments: 16, phiLen: Math.PI / 2 });
  cpanel(b, 0, 4.9, -2.4, 0.62, 0.4, 1.2, C.droidTrim); // eye
  for (const sx of [-1, 1]) cpanel(b, sx * 0.62, 4.7, -3.4, 0.34, 0.8, 1, C.droidTrim);
  ycyl(b, 0, 6.2, -3.1, 0.13, 0.8, C.gunMetal, { segments: 6, studs: false });
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

// ===========================================================================
// TIE FIGHTER  --  ball cockpit, two pylons, two hexagonal solar panels
// ===========================================================================

/** A hexagon vertex points up when an x-axis cylinder is rolled a quarter turn. */
const HEX_UP = -Math.PI / 2;
/** ...and a flat edge sits on top after another 30 degrees. */
const HEX_FLAT = Math.PI / 6;

/**
 * The ball cockpit: a sphere with a raised equator band, the hexagonal front
 * window, a top hatch, chin guns and the ion engine cluster at the back.
 */
function tieBall(b, C, R, guns, engines, opts = {}) {
  b.sphere(0, 0, 0, R, C.hull, { segments: 20 });

  // raised bands, so the ball is not a bare sphere
  zcyl(b, 0, 0, 0.9, R * 1.015, 0.4, C.trim, { segments: 20, studs: false });
  zcyl(b, 0, 0, -1.3, R * 0.98, 0.5, C.trim, { segments: 20, studs: false });

  // hexagonal window: raised frame, a black backing so the glass reads dark
  // instead of showing the light hull through it, then the glass itself
  zcyl(b, 0, 0, R * 0.78, 2.1, 0.8, C.trim, { segments: 6, spin: HEX_FLAT, studs: false });
  zcyl(b, 0, 0, R * 0.8, 1.78, 0.55, C.frame, { segments: 6, spin: HEX_FLAT, studs: false });
  zcyl(b, 0, 0, R * 0.9, 1.62, 0.3, C.glass, { segments: 6, spin: HEX_FLAT, studs: false, finish: 'glossy' });
  for (const sx of [-0.6, 0.6]) cpanel(b, sx, -1.4 * PY, R * 0.94, 0.2, 0.26, 2.8 * PY, C.trim);
  cpanel(b, 0, -0.15 * PY, R * 0.94, 3, 0.26, 0.3 * PY, C.trim);

  // top hatch
  ycyl(b, 0, R * 0.95 * PY, -0.2, 0.95, 0.8, C.trim, { segments: 12, studs: false });
  b.dish(0, (R * 0.95 + 0.35) * PY, -0.2, 0.85, 1.3, C.trim);

  // twin chin cannons
  for (const sx of [-1, 1]) {
    zcyl(b, sx * 0.9, -1.62 * PY, 1.5, 0.34, 1.9, C.frame, { segments: 10, studs: false });
    zcyl(b, sx * 0.9, -1.62 * PY, 2.55, 0.22, 1.6, C.gunMetal, { segments: 8, studs: false });
    guns.push(lego(sx * 0.9, -1.62 * PY, 3.4));
  }
  cpanel(b, 0, -2.05 * PY, 1.2, 2.4, 1.8, 0.5 * PY, C.trim);

  // ion engine cluster: a dark hexagonal plate with four glowing nozzles
  // (the x1 puts its engines in the tail instead)
  if (opts.rearEngines !== false) {
    zcyl(b, 0, 0, -R * 0.82, 1.85, 0.8, C.frame, { segments: 6, spin: HEX_FLAT, studs: false });
    for (const sy of [-1, 1]) {
      for (const sx of [-1, 1]) {
        zcyl(b, sx * 0.72, sy * 0.72 * PY, -R * 0.95, 0.42, 0.5, C.trim, { segments: 8, studs: false });
        zcyl(b, sx * 0.72, sy * 0.72 * PY, -R * 1.02, 0.3, 0.22, C.ion, { segments: 8, ...glow(C.ion, 2.4) });
        engines.push(lego(sx * 0.72, sy * 0.72 * PY, -R * 1.15));
      }
    }
  }

  // side greebles
  for (const sx of [-1, 1]) {
    cpanel(b, sx * (R * 0.66), -0.9 * PY, -0.4, 0.9, 1.6, 0.7 * PY, C.trim);
    cpanel(b, sx * (R * 0.6), 1.1 * PY, 0.7, 0.7, 1.2, 0.5 * PY, C.frame);
  }
}

/**
 * One hexagonal solar panel: a frame hexagon, a slightly smaller panel that
 * stands proud of it, six radial ribs and a hub. `px` is the panel centre.
 */
function tieWingPanel(b, C, px, r, opts = {}) {
  const spin = opts.spin ?? HEX_UP;
  const thick = opts.thick ?? 0.9;
  const inward = opts.inward ?? -Math.sign(px) * 0.55; // hub bulges toward the ball
  xcyl(b, px, 0, 0, r, thick, C.frame, { segments: 6, spin, studs: false });
  xcyl(b, px, 0, 0, r * 0.9, thick * 1.35, C.panel, { segments: 6, spin, studs: false });

  // radial ribs, thick enough to stand out on both faces
  b.push();
  b.translate(px, 0, 0);
  for (let k = 0; k < 6; k++) {
    b.push();
    b.rotateX((k * Math.PI) / 3 + (spin === HEX_UP ? 0 : Math.PI / 6));
    cbox(b, 0, 1.15 * PY, 0, thick * 1.9, 0.6, (r * 0.88 - 1.15) * PY, C.rib, { studs: false });
    b.pop();
  }
  b.pop();

  // hub where the pylon lands
  xcyl(b, px + inward * 0.5, 0, 0, 1.75, thick * 2.4, C.trim, { segments: 8, studs: false });
  xcyl(b, px + inward, 0, 0, 0.95, thick * 2.6, C.frame, { segments: 8, studs: false });
}

/**
 * @param {object} opts
 * @param {number} opts.hull  ball colour
 * @param {number} opts.panel wing panel colour
 * @param {number} opts.frame frame / greeble colour
 */
export async function buildTieFighter(opts = {}) {
  const C = {
    hull: opts.hull ?? COLORS.lightBluishGray,
    trim: opts.trim ?? COLORS.darkBluishGray,
    panel: opts.panel ?? COLORS.darkBluishGray,
    frame: opts.frame ?? COLORS.black,
    rib: opts.rib ?? COLORS.black,
    gunMetal: opts.gunMetal ?? COLORS.flatSilver,
    glass: opts.glass ?? COLORS.black,
    ion: opts.ion ?? 0xff5522,
  };
  const R = 2.55;
  const PANEL_X = 7.3;

  const b = new Bricks({ studSegments: 8 });
  const gunPoints = [];
  const enginePoints = [];
  tieBall(b, C, R, gunPoints, enginePoints);

  // collar through the ball, then a boxy pylon and hex fitting out to each panel
  xcyl(b, 0, 0, 0, 1.55, 6.4, C.trim, { segments: 10, studs: false });
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 4.5, -1.0 * PY, 0, 4.6, 2.05, 2 * PY, C.trim);
    xcyl(b, sx * 4.5, 0, 0, 1.15, 4.9, C.trim, { segments: 10, studs: false });
    xcyl(b, sx * 3.3, 0, 0, 1.4, 0.7, C.frame, { segments: 8, studs: false });
    xcyl(b, sx * 6.35, 0, 0, 1.5, 1.1, C.frame, { segments: 6, spin: HEX_UP, studs: false });
    cpanel(b, sx * 4.6, 1.02 * PY, 0, 2.6, 1.3, 0.5 * PY, C.frame);
    cpanel(b, sx * 4.6, -1.52 * PY, 0, 2.6, 1.3, 0.5 * PY, C.frame);
    cpanel(b, sx * 5.6, -0.55 * PY, 1.15, 1.4, 0.5, 1.1 * PY, C.frame);
    tieWingPanel(b, C, sx * PANEL_X, 6.4);
  }

  const root = new THREE.Group();
  root.name = 'tie-fighter';
  const mesh = b.build();
  root.add(mesh);
  root.userData.gunPoints = gunPoints;
  root.userData.enginePoints = enginePoints;
  const cockpit = new THREE.Group();
  cockpit.position.copy(lego(0, 0.15 * PY, 0.2));
  root.add(cockpit);
  root.userData.cockpit = cockpit;
  return finish(root, mesh);
}

// ===========================================================================
// TIE ADVANCED  --  the villain's x1: longer angular hull, bent wings
// ===========================================================================

/**
 * A bent hexagonal panel: a vertical centre band with a triangular cap above
 * and below, each folded forward about the band's edge. That fold is exactly
 * what gives the x1 its distinctive side profile.
 *
 * The caps are three-segment cylinders (triangular prisms) squashed to a third
 * of their height, which makes an isoceles triangle whose base matches the
 * hexagon's flats.
 */
function tieBentPanel(b, C, px, r, bend, thick = 0.9) {
  const halfW = 0.866 * r; // hexagon half-width across the flats
  const bandH = r; // the band spans y = -r/2 .. +r/2

  // centre band: frame slab with the panel standing proud of it
  cpanel(b, px, (-bandH / 2) * PY, 0, thick, halfW * 2, bandH * PY, C.frame);
  cpanel(b, px, (-bandH / 2 + 0.12) * PY, 0, thick * 1.4, halfW * 1.86, (bandH - 0.24) * PY, C.panel);

  for (const sy of [1, -1]) {
    b.push();
    b.translate(px, sy * (bandH / 2) * PY, 0); // the fold line
    b.rotateX(sy * bend);
    b.push();
    b.scale(1, 1 / 3, 1);
    const spin = sy > 0 ? -Math.PI / 2 : Math.PI / 2;
    xcyl(b, 0, sy * (r / 2) * PY, 0, r, thick, C.frame, { segments: 3, spin, studs: false });
    xcyl(b, 0, sy * (r / 2 - 0.12) * PY, 0, r * 0.84, thick * 1.4, C.panel, { segments: 3, spin, studs: false });
    b.pop();
    // rib running out to the folded tip
    cpanel(b, 0, sy > 0 ? 0.2 * PY : (-r * 0.42 - 0.2) * PY, 0, thick * 1.9, 0.55, r * 0.42 * PY, C.rib);
    b.pop();
  }

  // horizontal ribs and hub on the centre band
  for (const sy of [1, -1]) cpanel(b, px, sy * (bandH / 2 - 0.34) * PY, 0, thick * 1.9, halfW * 1.9, 0.34 * PY, C.rib);
  xcyl(b, px - Math.sign(px) * 0.75, 0, 0, 1.7, thick * 2.4, C.trim, { segments: 8, studs: false });
  xcyl(b, px - Math.sign(px) * 1.15, 0, 0, 0.95, thick * 2.6, C.rib, { segments: 8, studs: false });
}

/** The x1's elongated tail: a tapered box hull, dorsal spine and twin engines. */
function taTail(b, C, engines) {
  cpanel(b, 0, -1.3 * PY, -4.3, 3.3, 5.6, 2.6 * PY, C.hull);
  cslope(b, 0, 1.3 * PY, -7.1, 3.3, 1.6, 1.3 * PY, C.hull, { dir: '-z' });
  cslope(b, 0, -1.3 * PY, -7.1, 3.3, 1.6, 1.3 * PY, C.hull, { dir: '-z', inverted: true });
  for (const sx of [-1, 1]) cpanel(b, sx * 1.72, -1.0 * PY, -4.4, 0.3, 4.6, 2 * PY, C.trim);

  // dorsal spine
  cpanel(b, 0, 1.3 * PY, -4.0, 0.85, 5.2, 1.7 * PY, C.trim);
  cslope(b, 0, 1.3 * PY, -1.4, 0.85, 1.2, 1.7 * PY, C.trim, { dir: '+z' });
  cpanel(b, 0, 2.9 * PY, -4.4, 0.6, 3.2, 0.4 * PY, C.rib);
  // ventral keel
  cpanel(b, 0, -2.4 * PY, -4.2, 0.85, 4.4, 1.1 * PY, C.trim);

  // twin ion engines in the tail
  for (const sx of [-1, 1]) {
    zcyl(b, sx * 0.95, -0.1 * PY, -7.3, 0.72, 1.4, C.trim, { segments: 12, studs: false });
    zcyl(b, sx * 0.95, -0.1 * PY, -8.05, 0.5, 0.3, C.ion, { segments: 10, ...glow(C.ion, 2.4) });
    engines.push(lego(sx * 0.95, -0.1 * PY, -8.3));
  }
  // greeble plates along the tail flanks
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 1.4, 0.5 * PY, -2.6, 1.1, 1.6, 0.5 * PY, C.rib);
    cpanel(b, sx * 1.2, -2.0 * PY, -5.6, 1.2, 1.4, 0.5 * PY, C.rib);
    cpanel(b, sx * 1.78, 0.1 * PY, -4.5, 0.3, 2.4, 0.9 * PY, C.rib);
  }
}

/** @param {object} opts colours plus `bend` (radians the wing tips fold forward) */
export async function buildTieAdvanced(opts = {}) {
  const C = {
    hull: opts.hull ?? COLORS.trueBlack,
    trim: opts.trim ?? COLORS.black,
    panel: opts.panel ?? COLORS.trueBlack,
    frame: opts.frame ?? COLORS.black,
    rib: opts.rib ?? COLORS.darkBluishGray,
    gunMetal: opts.gunMetal ?? COLORS.flatSilver,
    glass: opts.glass ?? COLORS.trueBlack,
    ion: opts.ion ?? 0xff5522,
  };
  const R = 2.55;
  const b = new Bricks({ studSegments: 8 });
  const gunPoints = [];
  const enginePoints = [];

  tieBall(b, C, R, gunPoints, enginePoints, { rearEngines: false });
  taTail(b, C, enginePoints);

  // pointed prow, which the round TIE/ln does not have
  zcyl(b, 0, 0, 2.5, 2.05, 1.4, C.hull, { segments: 8, studs: false, rTop: 1.5 });
  zcyl(b, 0, 0, 3.7, 1.5, 1.1, C.trim, { segments: 8, studs: false, rTop: 0.85 });
  zcyl(b, 0, 0, 4.45, 0.5, 0.6, C.gunMetal, { segments: 8, studs: false });

  // pylons and the bent panels
  xcyl(b, 0, 0, 0, 1.6, 6.2, C.trim, { segments: 10, studs: false });
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 4.4, -1.1 * PY, 0, 4.6, 2.2, 2.2 * PY, C.hull);
    xcyl(b, sx * 4.4, 0, 0, 1.2, 4.8, C.trim, { segments: 10, studs: false });
    xcyl(b, sx * 3.2, 0, 0, 1.45, 0.7, C.frame, { segments: 8, studs: false });
    cpanel(b, sx * 4.5, 1.15 * PY, 0, 2.8, 1.4, 0.5 * PY, C.frame);
    cpanel(b, sx * 4.5, -1.65 * PY, 0, 2.8, 1.4, 0.5 * PY, C.frame);
    tieBentPanel(b, C, sx * 7.0, 6.2, opts.bend ?? 0.32);
  }

  const root = new THREE.Group();
  root.name = 'tie-advanced';
  const mesh = b.build();
  root.add(mesh);
  root.userData.gunPoints = gunPoints;
  root.userData.enginePoints = enginePoints;
  const cockpit = new THREE.Group();
  cockpit.position.copy(lego(0, 0.15 * PY, 0.2));
  root.add(cockpit);
  root.userData.cockpit = cockpit;
  return finish(root, mesh);
}

// ===========================================================================
// Y-WING  --  long boxy hull, exposed spine, two engine nacelles, a turret
// ===========================================================================

/** Forward hull: blunt prow, cockpit bubble and the twin nose cannons. */
function ywNose(b, C, guns) {
  cpanel(b, 0, -3.4, 8.2, 4.2, 4.4, 6.8, C.hull);
  cslope(b, 0, 1.4, 10.4, 3.6, 1.6, 2, C.hull, { dir: '+z' });
  cslope(b, 0, -3.4, 10.4, 3.6, 1.6, 2, C.hull, { dir: '+z', inverted: true });
  cpanel(b, 0, -1.6, 11.3, 2.6, 0.6, 3.2, C.metal);
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 2.14, -0.4, 8.4, 0.28, 3.6, 2, C.trim);
    cpanel(b, sx * 2.14, -3.2, 8.4, 0.28, 3.6, 1.4, C.metal);
  }

  // cockpit: dark sill, bubble canopy, and a headrest fairing behind it
  cpanel(b, 0, 3.4, 8.4, 3.4, 3.8, 0.7, C.metal);
  b.push();
  b.translate(0, 4.1, 8.3);
  b.scale(1, 0.62, 1.3);
  b.sphere(0, 0, 0, 1.42, C.glass, { segments: 16, phiLen: Math.PI / 2, finish: 'trans', opacity: 0.42 });
  b.pop();
  cslope(b, 0, 4.1, 9.9, 2.4, 1.4, 2.4, C.glass, { dir: '+z', finish: 'trans', opacity: 0.42 });
  cslope(b, 0, 4.1, 6.2, 2.6, 1.4, 2.2, C.hull, { dir: '-z' });

  // twin forward laser cannons under the prow
  for (const sx of [-1, 1]) {
    zcyl(b, sx * 1.35, -2.2, 10.8, 0.3, 3.4, C.metal, { segments: 10, studs: false });
    zcyl(b, sx * 1.35, -2.2, 12.6, 0.2, 1.2, C.gunMetal, { segments: 8, studs: false });
    guns.push(lego(sx * 1.35, -2.2, 13.2));
  }
}

/**
 * The famous stripped-hull spine: a raised keel with pipe runs, tanks and
 * greeble plates scattered by hash11 so it is busy but identical every run.
 */
function ywSpine(b, C, seed) {
  const z0 = -3.2;
  const z1 = 4.4;
  const zc = (z0 + z1) / 2;
  const len = z1 - z0;
  cpanel(b, 0, 2.2, zc, 2.8, len, 1.6, C.metal); // keel plate the machinery sits on
  for (const sx of [-1, 1]) {
    zcyl(b, sx * 1.02, 4.5, zc, 0.36, len, C.pipe, { segments: 8, studs: false }); // pipe runs
    cpanel(b, sx * 1.5, 2.6, zc, 0.34, len - 0.4, 2.8, C.metal);
  }
  zcyl(b, 0, 5.3, zc + 0.4, 0.52, len - 2.4, C.metal, { segments: 10, studs: false });

  // deterministic greebles: tanks, junction boxes and short pipes
  for (let i = 0; i < 18; i++) {
    const z = z0 + 0.5 + (i / 18) * (len - 1) + hash11(i, seed) * 0.3;
    const sx = hash11(i, seed + 11) < 0.5 ? -1 : 1;
    const kind = Math.floor(hash11(i, seed + 21) * 3);
    const w = 0.5 + hash11(i, seed + 31) * 0.5;
    if (kind === 0) cpanel(b, sx * (0.5 + hash11(i, seed + 41) * 0.7), 3.8, z, w, 0.9, 1.9, C.metal);
    else if (kind === 1) ycyl(b, sx * 0.9, 5.2, z, 0.34, 2, C.pipe, { segments: 8, studs: false });
    else zcyl(b, sx * 0.6, 5.0, z, 0.44, 1.1, C.metal, { segments: 8, studs: false });
  }
  // ribs across the spine, like exposed frame members
  for (let i = 0; i < 5; i++) cpanel(b, 0, 3.8, z0 + 0.7 + i * 1.7, 3.1, 0.35, 2.1, C.metal);
}

/**
 * Dorsal ion turret: a ring base, a domed housing and twin barrels tilted up
 * so they clear the canopy in front of it.
 */
function ywTurret(b, C, guns) {
  const z = 4.6;
  const tilt = -0.55; // radians, nose-up
  ycyl(b, 0, 3.2, z, 1.4, 1.6, C.metal, { segments: 12, studs: false });
  ycyl(b, 0, 4.6, z, 1.15, 1.2, C.trim, { segments: 12, studs: false });
  b.sphere(0, 5.9, z, 1.15, C.hull, { segments: 14, phiLen: Math.PI / 2 });
  cpanel(b, 0, 5.4, z, 2.5, 1.4, 1.2, C.metal);

  b.push();
  b.translate(0, 5.9, z);
  b.rotateX(tilt);
  for (const sx of [-1, 1]) {
    zcyl(b, sx * 0.52, 0, 1.9, 0.22, 3.8, C.gunMetal, { segments: 8, studs: false });
    zcyl(b, sx * 0.52, 0, 3.5, 0.3, 0.7, C.metal, { segments: 8, studs: false });
  }
  b.pop();
  const axis = new THREE.Vector3(1, 0, 0);
  for (const sx of [-1, 1]) {
    guns.push(lego(sx * 0.52, 0, 4).applyAxisAngle(axis, tilt).add(lego(0, 5.9, z)));
  }
}

/** One engine nacelle: intake, banded tube, greeble blocks, flared nozzle. */
function ywNacelle(b, C, sx, engines) {
  const x = sx * 5.3;
  const R = 1.38;
  zcyl(b, x, 0, -4, R, 15.6, C.hull, { segments: 14, studs: false });

  // intake at the front, with a dark recessed cone
  zcyl(b, x, 0, 4.05, R * 1.06, 1, C.metal, { segments: 14, studs: false });
  zcyl(b, x, 0, 3.5, R * 0.82, 1.2, C.dark, { segments: 12, studs: false, rTop: R * 0.5 });

  // banding
  for (const z of [1.6, -1.4, -7.2]) zcyl(b, x, 0, z, R * 1.03, 0.55, C.metal, { segments: 14, studs: false });
  zcyl(b, x, 0, -5.2, R * 1.02, 0.7, C.trim, { segments: 14, studs: false });

  // upper engine block and fin, lower greeble pods
  cpanel(b, x, R * 0.72 * PY, -6.6, 1.9, 5.2, 1.1 * PY, C.metal);
  cpanel(b, x, R * 1.2 * PY, -7.4, 0.55, 3.4, 1.1 * PY, C.trim);
  cpanel(b, x, -R * 1.28 * PY, -3.4, 1.5, 3.2, 0.7 * PY, C.metal);
  cpanel(b, x - sx * R * 0.98, -0.6 * PY, 0.4, 0.6, 2.6, 1.2 * PY, C.metal);
  ctile(b, x, R * 1.05 * PY, 1.4, 1, 3, C.trim);

  // flared exhaust nozzle: dark throat with a small glowing core inside it
  zcyl(b, x, 0, -11.4, R * 1.18, 1.6, C.metal, { segments: 14, studs: false, rTop: R * 0.96 });
  zcyl(b, x, 0, -11.95, R * 0.94, 0.8, C.dark, { segments: 12, studs: false });
  zcyl(b, x, 0, -12.2, R * 0.55, 0.25, C.engine, { segments: 12, ...glow(C.engine, 1.5) });
  engines.push(lego(x, 0, -12.5));
}

/** @param {object} opts colours (`hull`, `trim`, `metal`) and `seed` */
export async function buildYWing(opts = {}) {
  const C = {
    hull: opts.hull ?? COLORS.lightBluishGray,
    trim: opts.trim ?? COLORS.yellow,
    metal: opts.metal ?? COLORS.darkBluishGray,
    dark: opts.dark ?? COLORS.trueBlack,
    pipe: opts.pipe ?? COLORS.flatSilver,
    gunMetal: opts.gunMetal ?? COLORS.flatSilver,
    glass: opts.glass ?? COLORS.transLightBlue,
    engine: opts.engine ?? 0x88ddff,
  };
  const seed = opts.seed ?? 7;
  const b = new Bricks({ studSegments: 8 });
  const gunPoints = [];
  const enginePoints = [];

  // --- main fuselage: belly, core, deck
  cpanel(b, 0, -3.4, 1.4, 4, 19.2, 1.6, C.hull);
  cpanel(b, 0, -1.8, 1.4, 4, 19.2, 3, C.hull);
  cplate(b, 0, 1.2, 1.4, 4, 19.2, C.hull);
  cpanel(b, 0, 2.2, -5.6, 3.4, 6, 1, C.hull);
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 2.06, -3, 1.4, 0.3, 18, 4.4, C.metal);
    ctile(b, sx * 1.2, 2.2, 7.4, 1, 2, C.trim);
    cpanel(b, sx * 1.1, -3.9, -2.4, 1, 6, 0.6, C.metal); // belly greebles
    cpanel(b, sx * 1.3, -3.9, 5.6, 0.8, 3.4, 0.5, C.metal);
  }
  // aft reactor block, tapering into the tail
  cpanel(b, 0, -2.6, -8.4, 3.6, 3.6, 5.4, C.metal);
  cslope(b, 0, -2.6, -10.6, 3, 1.6, 5.4, C.metal, { dir: '-z' });
  for (const sx of [-1, 1]) ycyl(b, sx * 1.05, -0.4, -9.6, 0.42, 2.6, C.pipe, { segments: 8, studs: false });

  ywNose(b, C, gunPoints);
  ywSpine(b, C, seed);
  ywTurret(b, C, gunPoints);

  // --- outriggers out to each nacelle
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 3.7, -1.4, -0.6, 3.6, 4.6, 2.2, C.hull);
    cpanel(b, sx * 3.7, -2.6, -0.6, 2.6, 3.4, 1.2, C.metal);
    ctile(b, sx * 3.7, 0.8, -0.6, 1, 3, C.trim);
    ctile(b, sx * 3.7, 0.8, 1.4, 2, 1, C.metal);
    xcyl(b, sx * 3.7, -0.3, -3.4, 0.42, 3.4, C.metal, { segments: 8, studs: false });
    ywNacelle(b, C, sx, enginePoints);
  }

  const root = new THREE.Group();
  root.name = 'ywing';
  const mesh = b.build();
  root.add(mesh);
  root.userData.gunPoints = gunPoints;
  root.userData.enginePoints = enginePoints;
  const cockpit = new THREE.Group();
  cockpit.position.copy(lego(0, 4.4, 8.2));
  root.add(cockpit);
  root.userData.cockpit = cockpit;
  return finish(root, mesh);
}

// ===========================================================================
// LANDSPEEDER  --  X-34: open two-seater, three turbine intakes, no wheels
// ===========================================================================

/** Open cockpit tub: seats, dashboard, control yoke and the raked windscreen. */
function lsCockpit(b, C) {
  cpanel(b, 0, 1.4, 1.2, 3.6, 4.4, 0.5, C.metal); // floor of the tub
  for (const sx of [-1, 1]) {
    ctile(b, sx * 1.0, 1.9, 0.6, 1.5, 1.6, C.seat); // seat pan
    cslope(b, sx * 1.0, 1.9, -0.7, 1.5, 1.1, 2.4, C.seat, { dir: '+z' }); // back rest
  }
  cpanel(b, 0, 1.9, 2.6, 3.4, 1, 1.2, C.metal); // dash
  ctile(b, 0, 3.1, 2.6, 2.2, 0.8, C.trimDark);
  xcyl(b, 0, 3.5, 1.9, 0.14, 1.5, C.metal, { segments: 8, studs: false }); // yoke
  for (const sx of [-1, 1]) cpanel(b, sx * 0.72, 3.2, 1.9, 0.18, 0.7, 0.9, C.metal);

  // windscreen: a raked trans slope in a dark frame
  cslope(b, 0, 2.4, 3.1, 3.5, 1.5, 2.3, C.glass, { dir: '+z', finish: 'trans', opacity: 0.42 });
  for (const sx of [-1, 1]) cpanel(b, sx * 1.72, 2.4, 3.1, 0.22, 1.5, 2.3, C.trimDark);
  cpanel(b, 0, 2.2, 3.86, 3.6, 0.3, 0.6, C.trimDark);
}

/** @param {object} opts colours (`hull`, `pod`, `seat`) */
export async function buildLandspeeder(opts = {}) {
  const C = {
    hull: opts.hull ?? COLORS.orange,
    pod: opts.pod ?? COLORS.brightOrange,
    seat: opts.seat ?? COLORS.tan,
    metal: opts.metal ?? COLORS.darkBluishGray,
    trimDark: opts.trimDark ?? COLORS.black,
    dark: opts.dark ?? COLORS.trueBlack,
    gunMetal: opts.gunMetal ?? COLORS.flatSilver,
    glass: opts.glass ?? COLORS.transLightBlue,
  };
  const b = new Bricks({ studSegments: 8 });

  // --- central hull: belly, core and a studded rear deck
  cpanel(b, 0, -2.4, 0, 4, 10.8, 2.4, C.hull);
  cpanel(b, 0, 0, 0, 4.2, 10.8, 1.6, C.hull);
  cplate(b, 0, 1.6, -3.2, 4, 4, C.hull);
  ctile(b, 0, 2.6, -4, 2.4, 2.4, C.metal);
  cslope(b, 0, 1.6, -5.6, 4, 1.2, 1, C.hull, { dir: '-z' });
  cslope(b, 0, -2.4, -5.6, 4, 1.2, 1.4, C.hull, { dir: '-z', inverted: true });

  // --- side pods: a block with a rounded top rail and tapered ends, which is
  // what gives the X-34 its fat-hipped plan view
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 2.7, -2, -1, 1.4, 7.2, 3.2, C.pod);
    zcyl(b, sx * 2.95, 1.2, -1, 0.68, 7.2, C.pod, { segments: 12, studs: false });
    sweepWedge(b, sx, 2.7, -2, 3, 1.4, 0.9, 3.2, C.pod, { studs: false });
    cornerWedge(b, sx, 2.7, -2, -5, 1.4, 0.9, 3.2, C.pod, { studs: false, forward: true });
    cpanel(b, sx * 2.55, -2.3, -1.6, 1.5, 5.4, 0.6, C.metal); // skirt
    ctile(b, sx * 2.4, 1.6, -3.6, 1, 3, C.trimDark);
    for (let i = 0; i < 3; i++) cpanel(b, sx * 3.4, -0.6, 1.6 - i * 0.9, 0.24, 0.5, 1.4, C.trimDark);
  }

  // --- nose: slightly tapered front deck with the three turbine intakes
  cpanel(b, 0, -2.2, 5.7, 3.8, 1, 4.2, C.hull);
  cslope(b, 0, 1.6, 5.3, 4, 1.4, 1, C.hull, { dir: '+z' });
  cslope(b, 0, -2.4, 5.3, 4, 1.4, 1.2, C.hull, { dir: '+z', inverted: true });
  for (const x of [-1.34, 0, 1.34]) {
    zcyl(b, x, -0.4, 5.9, 0.66, 1.4, C.metal, { segments: 12, studs: false });
    zcyl(b, x, -0.4, 6.2, 0.5, 1, C.dark, { segments: 12, studs: false, rTop: 0.34 });
    zcyl(b, x, -0.4, 6.5, 0.7, 0.34, C.trimDark, { segments: 12, studs: false });
  }

  // --- surface detail and a rear bumper
  for (const sx of [-1, 1]) cpanel(b, sx * 1.4, -2.9, 3.2, 1, 2.4, 0.5, C.metal);
  cpanel(b, 0, -1.2, -6.1, 3.4, 0.5, 2.4, C.metal);
  ctile(b, 0, 1.6, 4.7, 2, 1, C.trimDark);
  lsCockpit(b, C);

  // --- repulsorlift pads instead of wheels
  for (const [x, z] of [[0, 4], [-1.9, -3.4], [1.9, -3.4]]) {
    ycyl(b, x, -2.7, z, 0.9, 0.6, C.metal, { segments: 12, studs: false });
    ycyl(b, x, -3.1, z, 0.64, 0.3, C.dark, { segments: 12, studs: false });
  }

  const root = new THREE.Group();
  root.name = 'landspeeder';
  const mesh = b.build();
  root.add(mesh);
  const cockpit = new THREE.Group();
  cockpit.position.copy(lego(-1.0, 4.6, 0.6));
  root.add(cockpit);
  root.userData.cockpit = cockpit;
  root.userData.seats = [lego(-1.0, 2.4, 0.6), lego(1.0, 2.4, 0.6)];
  return finish(root, mesh);
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
  tie: () => buildTieFighter(),
  'tie-advanced': () => buildTieAdvanced(),
  ywing: () => buildYWing(),
  landspeeder: () => buildLandspeeder(),
};
