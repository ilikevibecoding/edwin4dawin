// Procedural craft geometry for sys-traffic. Everything is built from three.js primitives, coloured per
// vertex (so one material serves every instance) and merged into a single BufferGeometry per craft.
// Attributes: position, normal, color, aEmit (vec3 baked radiance), aPart (0 body, 1/2 wings, 3 ramp).
// Local frames: nose toward -Z at yaw 0, +Y up, wings along ±X. Units are metres.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();

/** Shuttle fold parameters shared by the geometry builder and the vertex shader in materials.js. */
export const SHUTTLE_SPEC = {
  hingeX: 2.05, // wing hinge x (mirrored for the port wing)
  hingeY: 1.35, // wing hinge height
  spreadAngle: -0.2, // radians, slight droop in flight
  foldedAngle: 1.52, // radians, wings up for parking (87°)
  rampHingeY: -2.05,
  rampHingeZ: -3.0,
  rampAngle: -0.24, // radians the ramp drops when deployed (free end toward the nose)
  length: 21.0,
  standHeight: 2.85, // origin height above the pad when parked on its skids
};

// Colours (hex fallbacks so the builders work even before the Imperial palette lands).
export function craftColours(PALETTE = {}) {
  const c = (k, hex) => (PALETTE[k] ? PALETTE[k].getHex() : hex);
  return {
    hull: c("impHullDark", 0x6f747c),
    hullLight: c("impHullLight", 0xa7abb1),
    panel: c("impBlack", 0x111214),
    frame: c("impMid", 0x5a5e66),
    dark: c("impDark", 0x33363c),
    glass: 0x07090d,
    amber: c("impAmber", 0xffa028),
    red: c("impRed", 0xff2a1a),
    engine: 0x9fc4ff,
  };
}

function flipWinding(geo) {
  const attrs = Object.values(geo.attributes);
  const count = geo.attributes.position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    for (const a of attrs) {
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.getComponent(i + 1, k);
        a.setComponent(i + 1, k, a.getComponent(i + 2, k));
        a.setComponent(i + 2, k, t);
      }
    }
  }
}

class Builder {
  constructor() {
    this.parts = [];
    this.tris = 0;
  }
  /**
   * @param {THREE.BufferGeometry} geo consumed
   * @param {object} o { pos, rot (euler xyz radians) | quat, scale, color (hex), emit ([r,g,b] radiance), part }
   */
  add(geo, o = {}) {
    const { pos = [0, 0, 0], rot = null, quat = null, scale = null, color = 0xffffff, emit = null, part = 0 } = o;
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    else _q.identity();
    if (scale) _s.set(scale[0], scale[1], scale[2]);
    else _s.set(1, 1, 1);
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s);
    geo.applyMatrix4(_m);
    if (geo.index) geo = geo.toNonIndexed();
    for (const key of Object.keys(geo.attributes)) if (key !== "position" && key !== "normal") geo.deleteAttribute(key);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (_m.determinant() < 0) flipWinding(geo);
    const n = geo.attributes.position.count;
    const col = new THREE.Color(color);
    const carr = new Float32Array(n * 3);
    const earr = new Float32Array(n * 3);
    const parr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      carr[i * 3] = col.r;
      carr[i * 3 + 1] = col.g;
      carr[i * 3 + 2] = col.b;
      if (emit) {
        earr[i * 3] = emit[0];
        earr[i * 3 + 1] = emit[1];
        earr[i * 3 + 2] = emit[2];
      }
      parr[i] = part;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(carr, 3));
    geo.setAttribute("aEmit", new THREE.BufferAttribute(earr, 3));
    geo.setAttribute("aPart", new THREE.BufferAttribute(parr, 1));
    this.parts.push(geo);
    this.tris += n / 3;
    return geo;
  }
  box(sx, sy, sz, o) {
    return this.add(new THREE.BoxGeometry(sx, sy, sz), o);
  }
  /** cylinder along an axis ('x'|'y'|'z'); r1 = radius at the +axis end, r2 at the -axis end */
  cyl(r1, r2, len, seg, axis, o = {}) {
    const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1, !!o.open);
    if (o.spin) g.rotateY(o.spin);
    if (axis === "x") g.rotateZ(-Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    const { open, spin, ...rest } = o;
    return this.add(g, rest);
  }
  build() {
    const merged = mergeGeometries(this.parts, false);
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    merged.userData.tris = this.tris;
    return merged;
  }
}

function hexShape(h, l, scale = 1) {
  // TIE-style wing outline in the (z, y) plane: pointed top/bottom, long vertical front/back edges
  const hy = (h / 2) * scale;
  const hz = (l / 2) * scale;
  const sy = hy * 0.57;
  const s = new THREE.Shape();
  s.moveTo(0, hy);
  s.lineTo(hz, sy);
  s.lineTo(hz, -sy);
  s.lineTo(0, -hy);
  s.lineTo(-hz, -sy);
  s.lineTo(-hz, sy);
  s.closePath();
  return { shape: s, verts: [[0, hy], [hz, sy], [hz, -sy], [0, -hy], [-hz, -sy], [-hz, sy]] };
}

// Extrude a shape along local +z, centre the depth, then map shape (x, y, depth) -> world (z, y, x) so the
// plate stands in the YZ plane with its thickness along x. shape.x becomes world z.
function plateYZ(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/**
 * TIE-style fighter: cockpit sphere r 2.2, octagonal forward viewport, twin-engine block aft, two 1.4 m
 * pylons and two hexagonal solar-panel wings 7.0 tall x 5.6 long x 0.25 thick with a raised frame and six
 * radial spars. Span 7.7 m (wing faces at |x| 3.85). ~940 triangles.
 */
export function buildFighter(PALETTE) {
  const C = craftColours(PALETTE);
  const b = new Builder();
  const R = 2.2;
  b.add(new THREE.SphereGeometry(R, 14, 10), { color: C.hull });
  // forward viewport: octagonal bezel ring, recessed glass, four crossing struts (8 spokes)
  b.cyl(1.08, 1.08, 0.34, 8, "z", { pos: [0, 0, -2.08], color: C.frame });
  b.add(new THREE.CircleGeometry(0.9, 8), { pos: [0, 0, -2.26], rot: [0, Math.PI, 0], color: C.glass, emit: [0.02, 0.05, 0.09] });
  for (let i = 0; i < 4; i++) b.box(0.05, 1.8, 0.05, { pos: [0, 0, -2.24], rot: [0, 0, (i * Math.PI) / 4], color: C.frame });
  // top hatch (octagonal)
  b.cyl(0.72, 0.72, 0.26, 8, "y", { pos: [0, R - 0.05, 0], color: C.frame });
  // aft engine block + twin nozzles with baked pale-blue emissive throats
  b.box(2.4, 1.7, 1.1, { pos: [0, -0.1, 2.05], color: C.dark });
  for (const sx of [-1, 1]) {
    b.cyl(0.44, 0.52, 0.72, 8, "z", { pos: [sx * 0.72, -0.1, 2.85], color: C.frame, open: true });
    b.add(new THREE.CircleGeometry(0.43, 8), { pos: [sx * 0.72, -0.1, 3.21], color: C.engine, emit: [0.12, 0.2, 0.38] });
  }
  // twin cannons under the chin (thin tip forward)
  for (const sx of [-1, 1]) b.cyl(0.15, 0.11, 1.9, 6, "z", { pos: [sx * 0.55, -1.72, -1.55], color: C.dark, open: true });
  // belly access hatch + two upper sensor boxes
  b.box(1.2, 0.28, 1.5, { pos: [0, -2.1, 0.35], color: C.dark });
  for (const sx of [-1, 1]) b.box(0.34, 0.3, 0.42, { pos: [sx * 0.95, 1.62, -1.2], color: C.dark });
  // pylons: collar at the sphere, 1.4 m tube (x 2.2..3.6), square boss at the wing root
  for (const sx of [-1, 1]) {
    b.cyl(0.62, 0.62, 0.28, 8, "x", { pos: [sx * 2.16, 0, 0], color: C.frame, open: true });
    b.cyl(0.42, 0.42, 1.4, 6, "x", { pos: [sx * 2.9, 0, 0], color: C.hull, open: true, spin: Math.PI / 6 });
    b.box(0.8, 0.8, 0.8, { pos: [sx * 3.35, 0, 0], color: C.frame });
  }
  // wings: outer face at |x| 3.85 (span 7.70 — the hangar's grip pads sit at 3.96). Panel x 3.55..3.80,
  // raised frame 3.45..3.85 (5 cm proud outside, 10 cm inside), six spars and a hub inset 2 cm from the frame faces
  const H = 7.0;
  const L = 5.6;
  const T = 0.25;
  const outer = hexShape(H, L, 1.0);
  const ring = hexShape(H, L, 1.03).shape;
  ring.holes.push(hexShape(H, L, 0.9).shape);
  for (const sx of [-1, 1]) {
    b.add(plateYZ(outer.shape, T), { pos: [sx * (3.55 + T / 2), 0, 0], color: C.panel });
    b.add(plateYZ(ring, 0.4), { pos: [sx * 3.65, 0, 0], color: C.frame });
    for (const [vz, vy] of outer.verts) {
      const len = Math.hypot(vz, vy) * 0.94;
      const ang = Math.atan2(vz, vy);
      b.box(0.36, len, 0.22, { pos: [sx * 3.65, vy * 0.47, vz * 0.47], rot: [ang, 0, 0], color: C.frame });
    }
    b.cyl(0.78, 0.78, 0.4, 6, "x", { pos: [sx * 3.64, 0, 0], color: C.hull, spin: Math.PI / 6 });
  }
  return b.build();
}

/**
 * Shuttle-style craft: ~21 m fuselage (12-sided prism + tapered nose), raised cockpit, fixed dorsal fin,
 * two large folding wings hinged at the shoulders (aPart 1/2), landing skids and a boarding ramp (aPart 3).
 * Fold state is a per-instance attribute (see materials.js). ~1.0k triangles.
 */
export function buildShuttle(PALETTE) {
  const C = craftColours(PALETTE);
  const S = SHUTTLE_SPEC;
  const b = new Builder();
  const spin = Math.PI / 12; // flat faces top/bottom/sides on a 12-gon
  const squash = [0.92, 1, 1];
  // fuselage: main prism z -5..+8, tapered nose -10.5..-5, nose cap
  b.cyl(2.1, 2.1, 13, 12, "z", { pos: [0, 0, 1.5], color: C.hullLight, spin, scale: squash });
  b.cyl(2.1, 0.95, 5.5, 12, "z", { pos: [0, -0.25, -7.75], color: C.hullLight, spin, scale: squash });
  b.cyl(0.95, 0.35, 1.3, 12, "z", { pos: [0, -0.45, -11.15], color: C.dark, spin });
  // plating seams: dark bands around the prism
  for (const z of [-3.2, 0.6, 4.6]) b.cyl(2.14, 2.14, 0.18, 12, "z", { pos: [0, 0, z], color: C.dark, spin, open: true, scale: squash });
  // dorsal spine + cockpit block with windscreen and side glazing
  b.box(1.3, 0.4, 11.5, { pos: [0, 2.15, 2.0], color: C.frame });
  b.box(2.7, 1.5, 3.6, { pos: [0, 2.55, -5.4], color: C.hullLight });
  b.box(2.3, 0.95, 0.12, { pos: [0, 2.72, -7.22], rot: [-0.55, 0, 0], color: C.glass, emit: [0.03, 0.06, 0.1] });
  for (const sx of [-1, 1]) b.box(0.08, 0.6, 1.7, { pos: [sx * 1.36, 2.7, -5.4], color: C.glass, emit: [0.03, 0.06, 0.1] });
  b.box(1.0, 0.25, 0.9, { pos: [0, 3.36, -5.0], color: C.dark });
  // dorsal fin: swept-back quad plate (root z -3..3.4, tip z 0.3..2.3 at y 8.6), darker inset, edge strips
  const fin = new THREE.Shape();
  fin.moveTo(-3.0, 2.2);
  fin.lineTo(3.4, 2.2);
  fin.lineTo(2.3, 8.6);
  fin.lineTo(0.3, 8.6);
  fin.closePath();
  b.add(plateYZ(fin, 0.3), { color: C.hullLight });
  const finIn = new THREE.Shape();
  finIn.moveTo(-2.0, 3.0);
  finIn.lineTo(2.6, 3.0);
  finIn.lineTo(1.9, 7.8);
  finIn.lineTo(0.7, 7.8);
  finIn.closePath();
  b.add(plateYZ(finIn, 0.36), { color: C.panel });
  b.box(0.42, 7.2, 0.3, { pos: [0, 5.4, -1.35], rot: [0.477, 0, 0], color: C.frame });
  b.box(0.42, 6.5, 0.3, { pos: [0, 5.4, 2.85], rot: [-0.17, 0, 0], color: C.frame });
  b.box(0.42, 0.3, 2.3, { pos: [0, 8.6, 1.3], color: C.frame });
  // shoulders (hinge housings), fixed to the body
  for (const sx of [-1, 1]) b.box(0.9, 1.3, 5.2, { pos: [sx * 2.0, S.hingeY, 0.6], color: C.frame });
  // wings (aPart 1 starboard, 2 port): tapered plate, raised edge frame, spars, tip cannon pod
  for (const sx of [-1, 1]) {
    const part = sx > 0 ? 1 : 2;
    const root = S.hingeX;
    const tip = root + 9.6;
    const w = new THREE.Shape();
    w.moveTo(sx * root, -2.8);
    w.lineTo(sx * tip, -0.9);
    w.lineTo(sx * tip, 2.5);
    w.lineTo(sx * root, 4.2);
    w.closePath();
    const plate = new THREE.ExtrudeGeometry(w, { depth: 0.34, bevelEnabled: false, curveSegments: 1 });
    plate.translate(0, 0, -0.17);
    plate.rotateX(Math.PI / 2);
    b.add(plate, { pos: [0, S.hingeY, 0], color: C.panel, part });
    const edge = (x0, z0, x1, z1, h = 0.46) => {
      const ax = sx * x0;
      const bx = sx * x1;
      const len = Math.hypot(bx - ax, z1 - z0);
      const ang = -Math.atan2(z1 - z0, bx - ax);
      b.box(len, h, 0.34, { pos: [(ax + bx) * 0.5, S.hingeY, (z0 + z1) * 0.5], rot: [0, ang, 0], color: C.frame, part });
    };
    edge(root, -2.8, tip, -0.9);
    edge(tip, -0.9, tip, 2.5);
    edge(tip, 2.5, root, 4.2);
    edge(root + 0.4, -2.8, root + 0.4, 4.2);
    edge(root, 0.2, tip, 0.7, 0.42);
    edge(root + 3.8, -2.2, root + 3.8, 3.7, 0.42);
    edge(root + 6.8, -1.5, root + 6.8, 3.1, 0.42);
    b.cyl(0.26, 0.3, 3.4, 8, "z", { pos: [sx * (tip - 0.2), S.hingeY, 0.2], color: C.dark, part });
  }
  // engines: three nozzles with emissive throats on a rear plate
  b.box(3.9, 3.7, 0.3, { pos: [0, -0.1, 8.05], color: C.dark });
  for (const [x, y] of [[0, 0.5], [-1.3, -0.75], [1.3, -0.75]]) {
    b.cyl(0.62, 0.78, 1.3, 10, "z", { pos: [x, y, 8.75], color: C.frame, open: true });
    b.add(new THREE.CircleGeometry(0.6, 10), { pos: [x, y, 9.38], color: C.engine, emit: [0.1, 0.17, 0.32] });
  }
  // landing skids: one forward, two aft (feet bottom at y -2.85 = standHeight)
  for (const [x, z] of [[0, -6.5], [-1.7, 5.2], [1.7, 5.2]]) {
    b.box(0.3, 0.9, 0.3, { pos: [x, -2.3, z], color: C.dark });
    b.box(0.75, 0.22, 1.8, { pos: [x, -2.74, z], color: C.dark });
  }
  // belly pod + side greebles + cabin windows + sensor dome + antenna
  b.box(2.3, 0.8, 6.5, { pos: [0, -1.95, 2.2], color: C.dark });
  for (const sx of [-1, 1]) {
    b.box(0.25, 0.9, 2.6, { pos: [sx * 1.98, 0.6, -2.0], color: C.frame });
    b.box(0.25, 0.6, 1.8, { pos: [sx * 1.98, -0.9, 3.6], color: C.dark });
    for (let i = 0; i < 4; i++) b.box(0.08, 0.32, 0.5, { pos: [sx * 2.0, 1.0, -0.6 + i * 1.1], color: C.glass, emit: [0.05, 0.08, 0.12] });
  }
  b.cyl(0.25, 0.65, 0.5, 10, "y", { pos: [0.9, 2.5, 4.6], color: C.frame });
  b.cyl(0.04, 0.04, 2.6, 4, "y", { pos: [-0.9, 3.5, 5.2], color: C.dark, open: true });
  // boarding ramp (aPart 3): plate + two side rails, hinged at the belly, free end toward the nose
  b.box(2.0, 0.14, 3.5, { pos: [0, S.rampHingeY - 0.07, S.rampHingeZ - 1.75], color: C.hull, part: 3 });
  for (const sx of [-1, 1]) b.box(0.12, 0.35, 3.5, { pos: [sx * 0.95, S.rampHingeY + 0.1, S.rampHingeZ - 1.75], color: C.frame, part: 3 });
  const geo = b.build();
  geo.setAttribute("aFold", new THREE.InstancedBufferAttribute(new Float32Array(2), 1));
  return geo;
}

/**
 * Rack clamp arm: pivot at the origin (hangs from the rack's overhead beam), 2.6 m arm down -Y, rubber
 * contact pad at the tip, amber status stripe. Rotates about Z (see effects.js makeClamps). Instanced twice
 * per rack slot.
 */
export const CLAMP_ARM = 2.6;
export function buildClamp(PALETTE) {
  const C = craftColours(PALETTE);
  const b = new Builder();
  b.cyl(0.18, 0.18, 0.6, 6, "z", { color: C.frame, open: true, spin: Math.PI / 6 });
  b.box(0.22, CLAMP_ARM - 0.2, 0.34, { pos: [0, -(CLAMP_ARM - 0.2) / 2, 0], color: C.frame });
  b.box(0.14, 0.3, 0.14, { pos: [0, -1.0, 0.24], color: C.amber, emit: [0.6, 0.35, 0.05] });
  b.box(0.44, 0.2, 0.6, { pos: [0, -CLAMP_ARM - 0.08, 0], color: C.panel });
  return b.build();
}

/**
 * Eight unit cones stretched by the beam shader: aCone 0..3 are the halo cones of the four emitters, 4..7
 * the bright inner cores of the same emitters. Radius 1 at both ends, y 0 (emitter) .. 1 (target).
 */
export function buildBeamCones(segments = 18) {
  const geos = [];
  for (let c = 0; c < 8; c++) {
    const g = new THREE.CylinderGeometry(1, 1, 1, c < 4 ? segments : 8, 3, true).toNonIndexed();
    g.translate(0, 0.5, 0);
    for (const key of Object.keys(g.attributes)) if (key !== "position") g.deleteAttribute(key);
    const n = g.attributes.position.count;
    g.setAttribute("aCone", new THREE.BufferAttribute(new Float32Array(n).fill(c), 1));
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  merged.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -80, 32), 200);
  return merged;
}
