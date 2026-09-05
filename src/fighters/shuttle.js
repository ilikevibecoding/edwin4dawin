// Procedural tri-wing Imperial-style shuttle (original kit-bash evoking the classic look), parked with its two
// side wings folded UP for landing. Everything is built from primitives and faceted lofts.
//
//   buildShuttle(kit, position, yaw)  kit-bash the shuttle into the caller's Kit in ROOM-LOCAL coordinates:
//                                     `position` is the deck point under the shuttle's centre, `yaw` rotates
//                                     it about +y (yaw 0: nose along -z). Adds a hull collider and one floodlight.
//   buildShuttleDetached(materials)   the same shuttle in its own Kit, built into a THREE.Group (origin at the
//                                     deck point under the centre, nose -z) for future use (a flying shuttle,
//                                     the exterior docking bay …). Group.userData.colliders holds the AABBs.
//   SHUTTLE                           dimensions (for the room builder: footprint, folded height)
//
// Shuttle frame: metres, y up from the deck, nose along -z, x to starboard. The body is ~21 m long and sits
// 1.6 m above the deck on three landing legs; the folded wings reach 15.4 m (≈ 2.3 × the 4.9 m body incl.
// the canopy), the dorsal fin 14.9 m (the shuttle bay is 18 m tall, the pad clear radius is 12 m).
//
// Materials: interior-domain keys only (the shuttle lives inside the bay): impPanel1 tinted PALETTE.impWhite /
// impGrey for the hull, paintedMetal (matte, seamless) for the solid wing and fin plates, impTrim for frames /
// edges / seams, impMetal for machinery, impGloss for the windows, emitBlue for lights and the idling engines,
// emitWhiteDim for the lit pane in the open hatch (the warm spill is a light). hullPlate* would ignore the bay's lights.
import * as THREE from "three";
import { Kit, prism } from "../kit.js";
import { PALETTE } from "../materials.js";

export const SHUTTLE = {
  length: 21.2, // z extent (nose tip to engine face)
  bodyWidth: 4.8,
  footprintRadius: 11.7, // everything (wings folded) within this radius of `position` (engine face corners)
  heightFolded: 15.4, // folded wing tips
  finHeight: 14.9,
  bellyY: 1.6, // hull underside above the deck
  wingTilt: 0.21, // rad off vertical when folded
  wingSpan: 11.4, // hinge to tip
};

const WHITE = PALETTE.impWhite;
const GREY = PALETTE.impGrey;
const GREY_DARK = PALETTE.impGreyDark;
const BLACK = PALETTE.impBlack;
const CHARCOAL = PALETTE.impCharcoal;
const PLATE = new THREE.Color("#c9ccd2"); // solid pale wing / fin plate
const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------
/** Loft two convex polygons ([x, y][] with the same length, CCW seen from +z) at z0 / z1 into a faceted solid. */
export function loft(a, z0, b, z1) {
  if (z1 < z0) [a, z0, b, z1] = [b, z1, a, z0];
  const n = a.length;
  const pos = [];
  const tri = (p, q, r) => pos.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a0 = [a[i][0], a[i][1], z0];
    const a1 = [a[j][0], a[j][1], z0];
    const b0 = [b[i][0], b[i][1], z1];
    const b1 = [b[j][0], b[j][1], z1];
    tri(a0, a1, b1);
    tri(a0, b1, b0);
  }
  for (let i = 1; i < n - 1; i++) {
    tri([a[0][0], a[0][1], z0], [a[i + 1][0], a[i + 1][1], z0], [a[i][0], a[i][1], z0]);
    tri([b[0][0], b[0][1], z1], [b[i][0], b[i][1], z1], [b[i + 1][0], b[i + 1][1], z1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** Chamfered octagonal hull section: width w at mid height, wb at the bottom, wt at the top, y0..y1, chamfer c. */
function oct(w, wb, wt, y0, y1, c) {
  return [
    [-wb / 2, y0],
    [wb / 2, y0],
    [w / 2, y0 + c],
    [w / 2, y1 - c],
    [wt / 2, y1],
    [-wt / 2, y1],
    [-w / 2, y1 - c],
    [-w / 2, y0 + c],
  ];
}
function rect(w, y0, y1) {
  return [
    [-w / 2, y0],
    [w / 2, y0],
    [w / 2, y1],
    [-w / 2, y1],
  ];
}

/**
 * Places primitives given in a local frame (matrix) into a Kit. Sub-frames (wings) chain matrices.
 * add() opts: { pos, rot | quat, color, texel, uv, uvScale, uvRect } like Kit.add; the geometry is transformed
 * into room space here so the Kit's world-UV projection sees final coordinates.
 */
class Frame {
  constructor(kit, matrix) {
    this.kit = kit;
    this.matrix = matrix.clone();
  }
  sub(matrix) {
    return new Frame(this.kit, this.matrix.clone().multiply(matrix));
  }
  add(mat, geo, opts = {}) {
    const { pos = [0, 0, 0], rot = null, quat = null, ...rest } = opts;
    const q = new THREE.Quaternion();
    if (quat) q.copy(quat);
    else if (rot) q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m).applyMatrix4(this.matrix);
    return this.kit.add(mat, geo, rest);
  }
  box(mat, cx, cy, cz, sx, sy, sz, opts = {}) {
    return this.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, cy, cz], ...opts });
  }
  /** Cylinder along an axis ('x' | 'y' | 'z'); opts.r2 = far-end radius (tapers), opts.segments, opts.open. */
  cyl(mat, cx, cy, cz, r, len, axis = "y", opts = {}) {
    const { r2, open = false, segments = 14, texel = 1, ...rest } = opts;
    const g = new THREE.CylinderGeometry(r2 !== undefined ? r2 : r, r, len, segments, 1, open);
    const rot = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    return this.add(mat, g, { pos: [cx, cy, cz], rot, uv: "scale", uvScale: [2 * Math.PI * r * texel, len * texel], ...rest });
  }
  /** Rod between two local points. */
  rod(mat, p0, p1, r, opts = {}) {
    const a = new THREE.Vector3(...p0);
    const b = new THREE.Vector3(...p1);
    const d = b.clone().sub(a);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
    const mid = a.add(b).multiplyScalar(0.5);
    const { segments = 10, ...rest } = opts;
    return this.add(mat, new THREE.CylinderGeometry(r, r, len, segments), { pos: [mid.x, mid.y, mid.z], quat: q, ...rest });
  }
  /** Thin bar in the local xy plane from (x0, y0) to (x1, y1) at depth z, `w` wide, `d` deep. */
  bar(mat, x0, y0, x1, y1, z, w, d, opts = {}) {
    const { extend = 0, ...rest } = opts;
    const len = Math.hypot(x1 - x0, y1 - y0) + extend;
    return this.add(mat, new THREE.BoxGeometry(len, w, d), { pos: [(x0 + x1) / 2, (y0 + y1) / 2, z], rot: [0, 0, Math.atan2(y1 - y0, x1 - x0)], ...rest });
  }
  point(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.matrix);
  }
  /** Axis-aligned collider of a local box (the box is re-fitted after the rotation). */
  collider(min, max, tag = "") {
    const box = new THREE.Box3();
    for (let i = 0; i < 8; i++) box.expandByPoint(this.point(i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]));
    this.kit.collider(box.min.toArray(), box.max.toArray(), tag);
  }
}

// ---------------------------------------------------------------------------
// the shuttle
// ---------------------------------------------------------------------------
// hull sections (z along the shuttle, nose -z)
const Z_TAIL = 8.6; // end of the constant section
const Z_MID = -1.6; // start of the nose taper
const Z_NOSE = -8.6; // nose cone base
const Z_TIP = -10.4;
const Z_ENG = 10.8; // engine face
const BELLY = SHUTTLE.bellyY;
const TOP = 5.4;
const S_MID = oct(SHUTTLE.bodyWidth, 3.2, 2.9, BELLY, TOP, 0.95);
const S_NOSE = oct(2.5, 1.7, 1.5, 2.6, 4.9, 0.5);
const S_TIP = oct(1.0, 0.7, 0.6, 3.35, 4.15, 0.2);
const S_ENG = oct(4.0, 2.8, 2.4, 2.0, 5.0, 0.7);

function hull(F) {
  const P = { color: WHITE, texel: 1 };
  F.add("impPanel1", loft(S_MID, Z_MID, S_MID, Z_TAIL), P);
  F.add("impPanel1", loft(S_MID, Z_MID, S_NOSE, Z_NOSE), P);
  F.add("impPanel1", loft(S_NOSE, Z_NOSE, S_TIP, Z_TIP), { color: GREY, texel: 1 });
  F.add("impPanel1", loft(S_MID, Z_TAIL, S_ENG, Z_ENG), { color: GREY, texel: 1 });
  // panel seams: black bands where the sections meet, a dorsal spine and belly keel
  for (const z of [Z_MID, Z_TAIL]) F.add("impTrim", loft(S_MID.map(([x, y]) => [x * 1.012, y + (y - 3.5) * 0.012]), z - 0.09, S_MID.map(([x, y]) => [x * 1.012, y + (y - 3.5) * 0.012]), z + 0.09), { color: BLACK, texel: 1 });
  F.add("impTrim", loft(S_NOSE.map(([x, y]) => [x * 1.03, y + (y - 3.75) * 0.03]), Z_NOSE - 0.08, S_NOSE.map(([x, y]) => [x * 1.03, y + (y - 3.75) * 0.03]), Z_NOSE + 0.08), { color: BLACK, texel: 1 });
  F.box("impTrim", 0, TOP + 0.05, (Z_MID + Z_TAIL) / 2, 0.55, 0.14, Z_TAIL - Z_MID - 0.4, { color: BLACK, texel: 1 });
  F.box("impTrim", 0, BELLY - 0.04, 3.2, 0.9, 0.1, 9.6, { color: CHARCOAL, texel: 1 });
  // lateral panel lines (raised strips) on both flanks
  for (const s of [-1, 1]) {
    const x = s * (SHUTTLE.bodyWidth / 2 + 0.02);
    F.box("impTrim", x, 3.9, 3.4, 0.05, 0.08, 8.4, { color: BLACK, texel: 1 });
    F.box("impTrim", x, 2.75, 3.4, 0.05, 0.08, 8.4, { color: BLACK, texel: 1 });
    for (const z of [0.6, 3.6, 6.6]) F.box("impPanel1", x + s * 0.01, 3.33, z, 0.07, 1.0, 2.1, { color: GREY, texel: 1 });
    // wing-root fairing along the hinge
    F.box("impMetal", s * 2.25, 4.15, 2.75, 0.7, 0.55, 9.0, { color: CHARCOAL, texel: 1 });
    F.box("impTrim", s * 2.3, 3.75, 2.75, 0.5, 0.25, 9.2, { color: BLACK, texel: 1 });
  }
  // sensor blisters on the forward flanks and the twin cannons under the nose
  for (const s of [-1, 1]) {
    F.add("impMetal", new THREE.SphereGeometry(0.22, 12, 8), { pos: [s * 1.61, 3.5, -6.4], color: GREY_DARK, texel: 2 });
    F.box("impTrim", s * 0.72, 2.35, -7.9, 0.34, 0.4, 1.6, { color: BLACK, texel: 1 });
    F.cyl("impMetal", s * 0.72, 2.3, -9.55, 0.09, 1.9, "z", { color: CHARCOAL, segments: 10, r2: 0.07 });
    F.cyl("impTrim", s * 0.72, 2.3, -10.45, 0.12, 0.14, "z", { color: BLACK, segments: 10 });
  }
  // comms mast aft of the fin
  F.cyl("impMetal", 0.9, TOP + 0.75, 7.6, 0.04, 1.5, "y", { color: CHARCOAL, segments: 8 });
  F.box("impTrim", 0.9, TOP + 1.5, 7.6, 0.3, 0.05, 0.05, { color: BLACK });
  // ventral floodlight (lights the ramp) and belly running lights
  F.add("emitBlue", new THREE.CircleGeometry(0.28, 14), { pos: [0, BELLY - 0.115, 0.5], rot: [Math.PI / 2, 0, 0], color: 0xffffff, uv: "keep" });
  F.cyl("impTrim", 0, BELLY - 0.05, 0.5, 0.36, 0.12, "y", { color: BLACK, segments: 14, open: true });
  for (const s of [-1, 1]) F.box("emitBlue", s * 1.7, BELLY - 0.03, 7.0, 0.16, 0.06, 0.4, { color: 0xffffff, uv: "keep" });
}

function cockpit(F) {
  // raised canopy module on the forward hull, a steep windshield wedge in front
  // (the lofts' undersides sit inside the tapering hull so no gap opens under them)
  const base0 = rect(2.7, 4.9, 6.45);
  const base1 = rect(2.35, 4.7, 6.15);
  F.add("impPanel1", loft(base0, -4.2, base1, -7.0), { color: GREY, texel: 1 });
  const wedge0 = rect(2.35, 4.7, 6.15);
  const wedge1 = rect(1.9, 4.5, 5.2);
  F.add("impPanel1", loft(wedge0, -7.0, wedge1, -8.7), { color: GREY, texel: 1 });
  // windshield: dark glass slab on the wedge's sloping top, black frame around it
  const dz = 1.7;
  const dy = 6.15 - 5.2;
  const slope = Math.atan2(dy, dz);
  const cz = -7.85;
  const cy = (6.15 + 5.2) / 2;
  const len = Math.hypot(dz, dy);
  F.box("impTrim", 0, cy + 0.03, cz, 2.1, 0.08, len + 0.1, { color: BLACK, rot: [-slope, 0, 0], texel: 1 });
  F.box("impGloss", 0, cy + 0.07, cz, 1.85, 0.05, len - 0.25, { color: 0xffffff, rot: [-slope, 0, 0] });
  // centre post of the windshield
  F.box("impTrim", 0, cy + 0.1, cz, 0.08, 0.06, len - 0.2, { color: BLACK, rot: [-slope, 0, 0] });
  // side windows on the canopy base
  for (const s of [-1, 1]) {
    const x = s * (2.55 / 2);
    F.box("impTrim", x + s * 0.01, 5.85, -5.9, 0.06, 0.62, 2.2, { color: BLACK });
    F.box("impGloss", x + s * 0.04, 5.85, -5.9, 0.04, 0.46, 1.9, { color: 0xffffff });
    F.box("impTrim", x + s * 0.045, 5.85, -5.9, 0.03, 0.5, 0.06, { color: BLACK }); // mullion
  }
  // canopy roof hatch and antenna
  F.cyl("impTrim", 0, 6.47, -5.2, 0.45, 0.08, "y", { color: BLACK, segments: 16 });
  F.cyl("impMetal", 0, 6.53, -5.2, 0.36, 0.06, "y", { color: GREY_DARK, segments: 16 });
  F.cyl("impMetal", -0.75, 6.75, -4.8, 0.03, 0.7, "y", { color: CHARCOAL, segments: 6 });
}

function fin(F) {
  // swept trapezoid in the (u = -z, v = y) plane, rotated so u -> -z: a thin (0.3 m) solid plate, taller than
  // the folded wings' hinge line reaches, with three dark seams instead of framed inset panels
  const FH = SHUTTLE.finHeight;
  const outline = [
    [1.0, TOP - 0.1],
    [-6.7, TOP - 0.1],
    [-6.2, FH],
    [-4.0, FH],
  ];
  const rot = [0, Math.PI / 2, 0];
  F.add("paintedMetal", prism(outline, 0.3), { rot, color: PLATE, texel: 1 });
  // frame: leading edge, tip cap, trailing edge, root fairing (bars drawn in the fin's own frame)
  const fin = F.sub(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  fin.bar("impTrim", 1.0, TOP - 0.1, -4.0, FH, 0, 0.22, 0.34, { color: BLACK, extend: 0.2, texel: 1 });
  fin.bar("impTrim", -4.0, FH, -6.2, FH, 0, 0.22, 0.34, { color: BLACK, extend: 0.2, texel: 1 });
  fin.bar("impTrim", -6.7, TOP - 0.1, -6.2, FH, 0, 0.2, 0.34, { color: BLACK, extend: 0.2, texel: 1 });
  fin.bar("impTrim", 1.2, TOP + 0.35, -6.9, TOP + 0.35, 0, 0.9, 0.8, { color: BLACK, texel: 1 });
  // three dark seams per face, following the sweep
  for (const f of [-1, 1]) {
    for (const k of [0.3, 0.55, 0.78]) {
      const x0 = 1.0 + (-6.7 - 1.0) * k;
      const x1 = -4.0 + (-6.2 + 4.0) * k;
      fin.bar("impTrim", x0, TOP + 0.5, x1, FH - 0.4, f * 0.155, 0.07, 0.02, { color: BLACK, texel: 1 });
    }
    fin.bar("impTrim", -0.9, TOP + 3.6, -5.6, TOP + 3.6, f * 0.155, 0.07, 0.02, { color: BLACK, texel: 1 });
  }
  // nav light on the tip trailing corner
  fin.add("emitBlue", new THREE.SphereGeometry(0.1, 8, 6), { pos: [-6.0, FH + 0.05, 0], color: 0xffffff, uv: "keep" });
}

/** One folded wing; s = -1 port, +1 starboard. Wing frame: x = chord (forward), y = span from the hinge, z = normal. */
function wing(F, s) {
  const tilt = SHUTTLE.wingTilt;
  const X = new THREE.Vector3(0, 0, -1);
  const Y = new THREE.Vector3(s * Math.sin(tilt), Math.cos(tilt), 0);
  const Z = new THREE.Vector3().crossVectors(X, Y);
  const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(s * 2.45, 4.15, 0);
  const W = F.sub(m);
  const span = SHUTTLE.wingSpan;
  // one solid pale plate tapering to a 2.3 m tip chord (root chord 8.8 m); only the edges are framed
  const outline = [
    [1.4, 0.45],
    [-7.4, 0.45],
    [-5.9, span],
    [-3.6, span],
  ];
  W.add("paintedMetal", prism(outline, 0.42), { color: PLATE, texel: 1 });
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % 4];
    W.bar("impTrim", x0, y0, x1, y1, 0, 0.2, 0.5, { color: BLACK, extend: 0.18, texel: 1 });
  }
  // four dark seams per face: three spanwise (converging with the taper), one chordwise at mid-span
  for (const f of [-1, 1]) {
    const z = f * 0.225;
    for (const k of [0.22, 0.5, 0.78]) {
      const x0 = 1.4 + (-7.4 - 1.4) * k;
      const x1 = -3.6 + (-5.9 + 3.6) * k;
      W.bar("impTrim", x0, 0.8, x1, span - 0.5, z, 0.08, 0.025, { color: BLACK, texel: 1 });
    }
    const v = span * 0.5;
    const kk = (v - 0.45) / (span - 0.45);
    W.bar("impTrim", 1.4 + (-3.6 - 1.4) * kk - 0.3, v, -7.4 + (-5.9 + 7.4) * kk + 0.3, v, z, 0.08, 0.025, { color: BLACK, texel: 1 });
  }
  // hinge barrel with brackets, actuator struts to the hull
  W.cyl("impMetal", -3.0, 0.0, 0, 0.5, 8.6, "x", { color: CHARCOAL, segments: 16, texel: 1 });
  for (const x of [-6.6, -3.0, 0.6]) W.box("impTrim", x, 0.1, 0, 0.5, 0.9, 1.1, { color: BLACK, texel: 1 });
  W.rod("impMetal", [-3.0, 2.6, s * -0.4], [-3.0, 0.9, s * -1.5], 0.08, { color: GREY_DARK });
  W.rod("impMetal", [-5.6, 2.6, s * -0.4], [-5.6, 0.9, s * -1.5], 0.08, { color: GREY_DARK });
  // slim tip fairing with a nav light
  W.cyl("impMetal", -4.75, span + 0.12, 0, 0.2, 2.5, "x", { color: CHARCOAL, segments: 10, r2: 0.12 });
  W.add("emitBlue", new THREE.SphereGeometry(0.11, 8, 6), { pos: [-3.5, span + 0.12, 0], color: 0xffffff, uv: "keep" });
}

function gear(F) {
  // three legs: heavy grey oleo strut in a charcoal housing, drag brace, wide pad with a black shoe
  const leg = (x, z, yTop, braceDir) => {
    const yPad = 0.16;
    const h = yTop - yPad;
    F.cyl("impMetal", x, yTop - h * 0.3, z, 0.3, h * 0.6, "y", { color: CHARCOAL, segments: 12 });
    F.cyl("impMetal", x, yPad + h * 0.35, z, 0.17, h * 0.7, "y", { color: GREY, segments: 10 });
    F.cyl("impTrim", x, yPad + 0.42, z, 0.26, 0.24, "y", { color: BLACK, segments: 12 }); // axle collar
    F.box("impMetal", x, yPad / 2 + 0.06, z, 1.4, yPad, 1.8, { color: CHARCOAL, texel: 1 });
    F.box("impTrim", x, yPad + 0.1, z, 0.9, 0.1, 1.2, { color: BLACK, texel: 1 });
    F.rod("impMetal", [x, yTop - 0.2, z + braceDir * 1.3], [x, yPad + 0.5, z + braceDir * 0.15], 0.07, { color: GREY_DARK });
    // gear well doors hanging open either side
    F.box("impPanel1", x - 0.8, yTop - 0.55, z, 0.06, 1.1, 1.9, { color: GREY, rot: [0, 0, 0.35], texel: 1 });
    F.box("impPanel1", x + 0.8, yTop - 0.55, z, 0.06, 1.1, 1.9, { color: GREY, rot: [0, 0, -0.35], texel: 1 });
  };
  leg(0, -5.6, 2.22, 1);
  leg(-1.6, 5.6, BELLY + 0.02, -1);
  leg(1.6, 5.6, BELLY + 0.02, -1);
}

function ramp(F) {
  // hinged under the forward hull, lowered to the deck, edge-lit; the open hatch above it glows warm
  const hinge = [1.66, -3.3];
  const foot = [0.06, -7.5];
  const dz = foot[1] - hinge[1];
  const dy = foot[0] - hinge[0];
  const len = Math.hypot(dz, dy);
  const a = Math.atan2(dy, -dz); // pitch about x so the slab's long axis runs from the hinge down to the foot
  const cy = (hinge[0] + foot[0]) / 2;
  const cz = (hinge[1] + foot[1]) / 2;
  F.box("impMetal", 0, cy, cz, 2.0, 0.14, len, { color: GREY_DARK, rot: [a, 0, 0], texel: 1 });
  F.box("impTrim", 0, cy + 0.09, cz, 1.6, 0.03, len - 0.3, { color: CHARCOAL, rot: [a, 0, 0], texel: 1 });
  for (const s of [-1, 1]) {
    F.box("impTrim", s * 1.0, cy + 0.12, cz, 0.08, 0.16, len, { color: BLACK, rot: [a, 0, 0], texel: 1 });
    F.box("emitBlue", s * 0.92, cy + 0.15, cz, 0.05, 0.03, len - 0.4, { color: 0xffffff, rot: [a, 0, 0], uv: "keep" });
  }
  // hatch: a black surround hanging under the belly with a warm lit pane (the cabin behind the open hatch);
  // the hull loft is solid, so the doorway is built proud of the belly rather than cut into it
  const hz = hinge[1] + 1.1;
  F.box("impTrim", 0, BELLY - 0.14, hz, 2.4, 0.28, 2.4, { color: BLACK, texel: 1 });
  F.box("emitWhiteDim", 0, BELLY - 0.29, hz, 1.9, 0.02, 1.9, { uv: "keep" }); // shares the bay fixtures' key (the warm spill is the light below); mesh budget ≤ 50
  for (const s of [-1, 1]) F.box("impTrim", s * 0.62, BELLY - 0.3, hz, 0.06, 0.04, 1.9, { color: BLACK }); // door tracks
  // hydraulic rams
  for (const s of [-1, 1]) F.rod("impMetal", [s * 1.05, hinge[0] + 0.1, hinge[1] + 0.6], [s * 1.05, foot[0] + 0.45, foot[1] + 2.0], 0.06, { color: GREY });
}

function engines(F) {
  const zf = Z_ENG + 0.02;
  // aft face housing and three nozzles (two main, one auxiliary above)
  F.box("impTrim", 0, 3.5, zf - 0.02, 3.6, 2.6, 0.12, { color: BLACK, texel: 1 });
  const nozzle = (x, y, r) => {
    F.cyl("impTrim", x, y, zf + 0.35, r, 0.75, "z", { color: BLACK, segments: 20, open: true, r2: r * 0.86 });
    F.cyl("impMetal", x, y, zf + 0.12, r * 0.86, 0.3, "z", { color: CHARCOAL, segments: 20 });
    F.add("emitBlue", new THREE.CircleGeometry(r * 0.62, 20), { pos: [x, y, zf + 0.3], color: 0xffffff, uv: "keep" });
  };
  nozzle(-0.95, 3.2, 0.72);
  nozzle(0.95, 3.2, 0.72);
  nozzle(0, 4.55, 0.42);
  // heat-exchanger fins on the engine block flanks (following the block's taper)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) F.box("impTrim", s * 2.26, 2.8 + i * 0.45, 9.7, 0.14, 0.08, 1.6, { color: BLACK, rot: [0, -s * 0.18, 0], texel: 1 });
}

/**
 * Kit-bash the shuttle into `kit`. Room-local: `position` is the deck point under the shuttle's centre,
 * `yaw` about +y (0: nose -z). Adds two colliders (hull, ramp) and a floodlight declaration under the belly.
 */
export function buildShuttle(kit, position, yaw = 0) {
  const p = position.isVector3 ? position : new THREE.Vector3(position[0], position[1], position[2]);
  const root = new Frame(kit, new THREE.Matrix4().makeRotationY(yaw).setPosition(p));
  hull(root);
  cockpit(root);
  fin(root);
  wing(root, -1);
  wing(root, 1);
  gear(root);
  ramp(root);
  engines(root);
  // one hull collider (covers the legs and the ramp too; the folded wings are above head height)
  root.collider([-2.6, 0, Z_TIP - 0.3], [2.6, TOP + 1.2, Z_ENG + 0.8], "shuttle");
  if (typeof kit.light === "function") {
    // warm interior spill out of the open hatch, down the ramp onto the deck
    const l = root.point(0, BELLY - 0.6, -2.4);
    kit.light({ type: "point", pos: [l.x, l.y, l.z], color: 0xffd9a8, intensity: 9, distance: 14, decay: 2, priority: 0.5 });
  }
  return SHUTTLE;
}

/** The shuttle in its own Kit, built into a Group (origin: deck point under the centre, nose -z). */
export function buildShuttleDetached(materials) {
  const kit = new Kit(materials);
  buildShuttle(kit, new THREE.Vector3(0, 0, 0), 0);
  const group = new THREE.Group();
  group.name = "shuttle";
  kit.build(group);
  group.userData.colliders = kit.colliders;
  group.userData.lights = kit.lights;
  return group;
}
