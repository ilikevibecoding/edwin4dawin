/**
 * Kit-bash library: small reusable mechanical parts that get assembled into
 * shelters, launchers, radars and vehicles. Keeping the parts here means the
 * asset modules read as assembly instructions rather than geometry soup.
 *
 * Geometry is shared/cloned aggressively and static detail is merged where it
 * makes sense, to keep draw calls low.
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  matSteel, matSteelDark, matRubber, matChrome, matHazard, makeLamp, matEmissive,
} from './materials.js';

// Shared primitive geometries -------------------------------------------------
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cylHi: new THREE.CylinderGeometry(1, 1, 1, 24),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cone: new THREE.ConeGeometry(1, 1, 16),
  torus: new THREE.TorusGeometry(1, 0.1, 8, 24),
  plane: new THREE.PlaneGeometry(1, 1),
};
export const SHARED = G;

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(G.box, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cyl(r, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(seg > 12 ? (seg > 18 ? G.cylHi : G.cyl) : G.cylLo, mat);
  m.scale.set(r, h, r); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function tube(r, h, mat, ax = 'y') {
  const m = cyl(r, h, mat);
  if (ax === 'x') m.rotation.z = Math.PI / 2;
  if (ax === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

export function sphere(r, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(G.sphere, mat);
  m.scale.setScalar(r); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cone(r, h, mat) {
  const m = new THREE.Mesh(G.cone, mat);
  m.scale.set(r, h, r);
  m.castShadow = true;
  return m;
}

/** Box with bevelled edges - reads far better under rim light than a raw cube. */
export function chamferBox(w, h, d, chamfer = 0.02, mat) {
  const key = `cb:${w},${h},${d},${chamfer}`;
  if (!chamferBox.cache) chamferBox.cache = new Map();
  let geo = chamferBox.cache.get(key);
  if (!geo) {
    const shape = new THREE.Shape();
    const hw = w / 2, hh = h / 2, c = Math.min(chamfer, Math.min(w, h) * 0.35);
    shape.moveTo(-hw + c, -hh);
    shape.lineTo(hw - c, -hh); shape.lineTo(hw, -hh + c);
    shape.lineTo(hw, hh - c); shape.lineTo(hw - c, hh);
    shape.lineTo(-hw + c, hh); shape.lineTo(-hw, hh - c);
    shape.lineTo(-hw, -hh + c); shape.closePath();
    geo = new THREE.ExtrudeGeometry(shape, {
      depth: d, bevelEnabled: true, bevelThickness: c * 0.6,
      bevelSize: c * 0.6, bevelSegments: 1, steps: 1,
    });
    geo.translate(0, 0, -d / 2);
    geo.computeVertexNormals();
    chamferBox.cache.set(key, geo);
  }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Fasteners and small detail
// ---------------------------------------------------------------------------

let boltGeo = null;
function getBoltGeo() {
  if (!boltGeo) {
    const head = new THREE.CylinderGeometry(1, 1, 0.6, 6);
    const washer = new THREE.CylinderGeometry(1.35, 1.35, 0.18, 8);
    washer.translate(0, -0.3, 0);
    boltGeo = BufferGeometryUtils.mergeGeometries([head, washer]);
  }
  return boltGeo;
}

/** Instanced bolt heads placed by a callback - cheap high-frequency detail. */
export function bolts(count, radius, placer, mat = matSteelDark()) {
  const inst = new THREE.InstancedMesh(getBoltGeo(), mat, count);
  inst.castShadow = false; inst.receiveShadow = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(radius, radius, radius);
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    placer(i, p, n);
    q.setFromUnitVectors(up, n.lengthSq() > 0 ? n.clone().normalize() : up);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

/** Bolts evenly spaced around a circular flange. */
export function flangeBolts(count, ringRadius, boltRadius, y, mat) {
  return bolts(count, boltRadius, (i, p, n) => {
    const a = (i / count) * Math.PI * 2;
    p.set(Math.cos(a) * ringRadius, y, Math.sin(a) * ringRadius);
    n.set(0, 1, 0);
  }, mat);
}

/** Bolts in a rectangular perimeter on a vertical face (normal +Z). */
export function panelBolts(w, h, spacing, boltRadius, z, mat) {
  const pts = [];
  const nx = Math.max(2, Math.round(w / spacing));
  const ny = Math.max(2, Math.round(h / spacing));
  for (let i = 0; i <= nx; i++) {
    pts.push([-w / 2 + (i / nx) * w, -h / 2]);
    pts.push([-w / 2 + (i / nx) * w, h / 2]);
  }
  for (let j = 1; j < ny; j++) {
    pts.push([-w / 2, -h / 2 + (j / ny) * h]);
    pts.push([w / 2, -h / 2 + (j / ny) * h]);
  }
  return bolts(pts.length, boltRadius, (i, p, n) => {
    p.set(pts[i][0], pts[i][1], z);
    n.set(0, 0, 1);
  }, mat);
}

// ---------------------------------------------------------------------------
// Cables, hoses, pipes
// ---------------------------------------------------------------------------

/** Catenary-ish sag curve between two points. */
export function catenaryPoints(a, b, sag = 0.4, segments = 12) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return pts;
}

const cableMatCache = new Map();
export function cableMaterial(color = '#141414', rough = 0.9) {
  const k = color + rough;
  if (!cableMatCache.has(k)) {
    cableMatCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.1 }));
  }
  return cableMatCache.get(k);
}

/** Tube following a point list. Used for power cables, hydraulic hoses, conduit. */
export function cable(points, radius = 0.02, mat = cableMaterial(), tubular = 10, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/** Slack cable run from a to b with sag, ready to drop into a group. */
export function saggingCable(a, b, sag, radius = 0.025, mat = cableMaterial()) {
  return cable(catenaryPoints(a, b, sag, 10), radius, mat, 14, 6);
}

/** Merged bundle of several parallel sagging cables. */
export function cableBundle(a, b, count = 3, sag = 0.3, radius = 0.022, mat = cableMaterial()) {
  const geos = [];
  const perp = new THREE.Vector3().subVectors(b, a).normalize()
    .cross(new THREE.Vector3(0, 1, 0)).normalize();
  for (let i = 0; i < count; i++) {
    const off = perp.clone().multiplyScalar((i - (count - 1) / 2) * radius * 2.6);
    const pts = catenaryPoints(a.clone().add(off), b.clone().add(off), sag * (0.85 + i * 0.12), 10);
    const curve = new THREE.CatmullRomCurve3(pts);
    geos.push(new THREE.TubeGeometry(curve, 12, radius, 5, false));
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, mat);
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Mechanisms
// ---------------------------------------------------------------------------

/**
 * Hydraulic ram. Returns a group whose `extend(t)` slides the rod out.
 * Barrel points +Y from origin; rod extends beyond it.
 */
export function hydraulicRam(barrelLen, barrelR, rodR, stroke) {
  const g = new THREE.Group();
  const barrel = cyl(barrelR, barrelLen, matSteelDark(), 0, barrelLen / 2, 0, 12);
  g.add(barrel);
  // End caps and ports
  g.add(cyl(barrelR * 1.18, barrelLen * 0.06, matSteel(), 0, barrelLen * 0.03, 0, 12));
  g.add(cyl(barrelR * 1.18, barrelLen * 0.06, matSteel(), 0, barrelLen * 0.97, 0, 12));
  const port = cyl(barrelR * 0.22, barrelR * 1.2, matSteel(), 0, barrelLen * 0.12, 0, 6);
  port.rotation.z = Math.PI / 2; port.position.x = barrelR;
  g.add(port);

  const rod = new THREE.Group();
  const shaft = cyl(rodR, stroke * 1.05, matChrome(), 0, stroke * 0.52, 0, 12);
  rod.add(shaft);
  rod.add(cyl(rodR * 1.5, rodR * 1.2, matSteel(), 0, stroke * 1.03, 0, 10));
  rod.position.y = barrelLen * 0.95;
  g.add(rod);

  g.userData.rod = rod;
  g.userData.baseY = barrelLen * 0.95;
  g.extend = (t) => { rod.position.y = g.userData.baseY + stroke * Math.max(0, Math.min(1, t)); };
  g.extend(0);
  return g;
}

const _ramUp = new THREE.Vector3(0, 1, 0);
const _ramDir = new THREE.Vector3();
const _ramQ = new THREE.Quaternion();

/**
 * Two-point hydraulic actuator: pinned at its own origin, always pointing at a
 * moving anchor with the rod covering whatever gap is left. Unlike
 * `hydraulicRam`, whose angle is baked at build time, this one stays visually
 * attached to an erector through its whole travel.
 *
 * Call `aim(pointInParentSpace)` whenever the mechanism moves.
 */
export function pinnedRam(barrelLen, barrelR, rodR, mat = matSteelDark()) {
  const g = new THREE.Group();
  const barrel = cyl(barrelR, barrelLen, mat, 0, barrelLen / 2, 0, 14);
  g.add(barrel);
  g.add(cyl(barrelR * 1.22, barrelLen * 0.05, matSteel(), 0, barrelLen * 0.028, 0, 14));
  g.add(cyl(barrelR * 1.22, barrelLen * 0.05, matSteel(), 0, barrelLen * 0.972, 0, 14));
  // Base clevis and pivot pin
  g.add(box(barrelR * 2.6, barrelR * 1.1, barrelR * 2.4, matSteel(), 0, 0, 0));
  g.add(cyl(barrelR * 0.4, barrelR * 3.0, matChrome(), 0, 0, 0, 10).rotateZ(Math.PI / 2));
  // Feed ports and a hose loop down the barrel
  for (const f of [0.12, 0.88]) {
    const port = cyl(barrelR * 0.24, barrelR * 1.3, matSteel(), barrelR, barrelLen * f, 0, 6);
    port.rotation.z = Math.PI / 2;
    g.add(port);
  }

  // Rod: a unit-height cylinder scaled along Y, with the eye riding its tip.
  const shaft = cyl(rodR, 1, matChrome(), 0, 0.5, 0, 12);
  g.add(shaft);
  const eye = new THREE.Group();
  eye.add(cyl(rodR * 1.7, rodR * 1.5, matSteel(), 0, 0, 0, 12));
  eye.add(cyl(rodR * 0.5, rodR * 3.2, matChrome(), 0, 0, 0, 10).rotateZ(Math.PI / 2));
  g.add(eye);

  const seat = barrelLen * 0.9;
  g.userData.rod = shaft;
  g.userData.eye = eye;
  g.userData.noMerge = true;
  shaft.userData.noMerge = true;
  eye.userData.noMerge = true;

  /** Point the barrel at `target` (parent space) and extend the rod to reach. */
  g.aim = (target) => {
    _ramDir.copy(target).sub(g.position);
    const dist = Math.max(seat + 0.05, _ramDir.length());
    _ramDir.normalize();
    _ramQ.setFromUnitVectors(_ramUp, _ramDir);
    g.quaternion.copy(_ramQ);
    const ext = dist - seat;
    shaft.scale.y = ext;
    shaft.position.y = seat + ext / 2;
    eye.position.y = dist;
  };
  g.aim(new THREE.Vector3(0, barrelLen * 1.2, 0));
  return g;
}

/** Simple truss / lattice frame in the XY plane, extruded thin in Z. */
export function trussPanel(w, h, bays = 3, thickness = 0.06, mat = matSteel()) {
  const geos = [];
  const addBar = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const g = new THREE.BoxGeometry(len, thickness, thickness);
    const m = new THREE.Matrix4()
      .makeRotationZ(Math.atan2(y2 - y1, x2 - x1))
      .setPosition((x1 + x2) / 2, (y1 + y2) / 2, 0);
    g.applyMatrix4(m);
    geos.push(g);
  };
  addBar(-w / 2, -h / 2, w / 2, -h / 2);
  addBar(-w / 2, h / 2, w / 2, h / 2);
  for (let i = 0; i <= bays; i++) {
    const x = -w / 2 + (i / bays) * w;
    addBar(x, -h / 2, x, h / 2);
  }
  for (let i = 0; i < bays; i++) {
    const x0 = -w / 2 + (i / bays) * w, x1 = -w / 2 + ((i + 1) / bays) * w;
    if (i % 2 === 0) addBar(x0, -h / 2, x1, h / 2);
    else addBar(x0, h / 2, x1, -h / 2);
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Vertical ladder with rungs and side rails. */
export function ladder(height, width = 0.42, mat = matSteel()) {
  const geos = [];
  const railR = 0.022;
  for (const sx of [-1, 1]) {
    const g = new THREE.CylinderGeometry(railR, railR, height, 6);
    g.translate(sx * width / 2, height / 2, 0);
    geos.push(g);
  }
  const rungs = Math.max(2, Math.floor(height / 0.3));
  for (let i = 0; i < rungs; i++) {
    const g = new THREE.CylinderGeometry(railR * 0.8, railR * 0.8, width, 6);
    g.rotateZ(Math.PI / 2);
    g.translate(0, 0.16 + (i / rungs) * (height - 0.2), 0);
    geos.push(g);
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, mat);
  m.castShadow = true;
  return m;
}

/** Handrail following a polyline of ground points. */
export function handrail(pathPoints, height = 1.05, mat = matSteel()) {
  const geos = [];
  const r = 0.026;
  for (let i = 0; i < pathPoints.length; i++) {
    const p = pathPoints[i];
    const g = new THREE.CylinderGeometry(r, r, height, 6);
    g.translate(p.x, height / 2, p.z);
    geos.push(g);
    if (i < pathPoints.length - 1) {
      const q = pathPoints[i + 1];
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      for (const hy of [height, height * 0.55]) {
        const bar = new THREE.CylinderGeometry(r * 0.8, r * 0.8, len, 6);
        bar.rotateZ(Math.PI / 2);
        bar.rotateY(-Math.atan2(q.z - p.z, q.x - p.x));
        bar.translate((p.x + q.x) / 2, hy, (p.z + q.z) / 2);
        geos.push(bar);
      }
    }
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, mat);
  m.castShadow = true;
  return m;
}

/** Grated walkway / deck plate. */
export function gratingDeck(w, d, mat = matSteelDark()) {
  const geos = [];
  const bars = Math.max(3, Math.round(w / 0.12));
  for (let i = 0; i < bars; i++) {
    const g = new THREE.BoxGeometry(0.035, 0.05, d);
    g.translate(-w / 2 + (i + 0.5) * (w / bars), 0, 0);
    geos.push(g);
  }
  const cross = Math.max(2, Math.round(d / 0.5));
  for (let i = 0; i < cross; i++) {
    const g = new THREE.BoxGeometry(w, 0.028, 0.03);
    g.translate(0, -0.014, -d / 2 + (i + 0.5) * (d / cross));
    geos.push(g);
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(merged, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Louvered vent / radiator grille panel. */
export function grille(w, h, slats = 7, mat = matSteelDark()) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.03, mat, 0, 0, -0.02));
  for (let i = 0; i < slats; i++) {
    const s = box(w * 0.94, h / slats * 0.6, 0.035, matSteel(), 0, -h / 2 + (i + 0.5) * (h / slats), 0);
    s.rotation.x = -0.5;
    g.add(s);
  }
  return g;
}

/**
 * Warning / status lamp. `shared` lets site beacons batch together; status
 * lamps that need independent control leave it false.
 */
export function warningLamp(color = '#ffb028', radius = 0.06, intensity = 3, shared = true) {
  const g = new THREE.Group();
  const mat = makeLamp(color, intensity, shared);
  const dome = new THREE.Mesh(SHARED.sphere, mat);
  dome.scale.setScalar(radius);
  g.add(dome);
  const cage = cyl(radius * 1.1, radius * 0.4, matSteelDark(), 0, -radius * 0.7, 0, 8);
  g.add(cage);
  g.userData.mat = mat;
  g.userData.baseIntensity = intensity;
  g.setOn = (on, mult = 1) => { mat.emissiveIntensity = on ? intensity * mult : 0.02; };
  return g;
}

/** Floodlight head: housing, lens, and an optional real SpotLight. */
export function floodlightHead(color = '#ffe6b8', size = 0.5) {
  const g = new THREE.Group();
  const housing = chamferBox(size, size * 0.72, size * 0.26, 0.03, matSteelDark());
  g.add(housing);
  const lens = new THREE.Mesh(SHARED.plane, matEmissive('#fff2d0', 2.2));
  lens.scale.set(size * 0.86, size * 0.6, 1);
  lens.position.z = size * 0.14;
  g.add(lens);
  // Hood
  for (const [sx, sy] of [[0, 1], [0, -1]]) {
    const hood = box(size * 0.92, 0.02, size * 0.2, matSteelDark(), 0, sy * size * 0.37, size * 0.22);
    hood.rotation.x = sy * 0.35;
    g.add(hood);
  }
  g.userData.lens = lens;
  g.userData.lensMat = lens.material;
  return g;
}

/** Antenna whip / dipole cluster. */
export function antennaMast(height, mat = matSteelDark()) {
  const g = new THREE.Group();
  const segs = 3;
  let y = 0, r = 0.05;
  for (let i = 0; i < segs; i++) {
    const h = height / segs;
    g.add(cyl(r, h, mat, 0, y + h / 2, 0, 8));
    y += h; r *= 0.62;
  }
  // Cross dipoles
  for (let i = 0; i < 3; i++) {
    const yy = height * (0.35 + i * 0.2);
    const bar = cyl(0.014, height * 0.13, mat, 0, yy, 0, 5);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
  }
  const tip = warningLamp('#ff3b30', 0.035, 4);
  tip.position.y = height + 0.03;
  g.add(tip);
  g.userData.tipLamp = tip;
  return g;
}

/** Yagi-style directional antenna on a short post. */
export function yagiAntenna(len = 1.4, mat = matSteel()) {
  const g = new THREE.Group();
  const boom = cyl(0.02, len, mat, 0, 0, 0, 6);
  boom.rotation.x = Math.PI / 2;
  g.add(boom);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = len * (0.42 - t * 0.2);
    const el = cyl(0.012, w, mat, 0, 0, -len / 2 + t * len, 5);
    el.rotation.z = Math.PI / 2;
    g.add(el);
  }
  return g;
}

/** Equipment / transit case with latches. */
export function equipmentCase(w, h, d, mat) {
  const g = new THREE.Group();
  g.add(chamferBox(w, h, d, Math.min(w, h, d) * 0.08, mat));
  // Lid seam
  g.add(box(w * 1.01, 0.012, d * 1.01, matSteelDark(), 0, h * 0.18, 0));
  // Latches
  for (const sx of [-0.3, 0.3]) {
    g.add(box(w * 0.12, h * 0.1, 0.02, matChrome(), sx * w, h * 0.18, d / 2 + 0.005));
  }
  // Corner protectors
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(box(w * 0.1, h * 0.1, d * 0.1, matSteelDark(), sx * w * 0.45, -h * 0.45, sz * d * 0.45));
    g.add(box(w * 0.1, h * 0.1, d * 0.1, matSteelDark(), sx * w * 0.45, h * 0.45, sz * d * 0.45));
  }
  // Handle
  const handle = new THREE.Mesh(SHARED.torus, matSteelDark());
  handle.scale.set(w * 0.16, w * 0.16, 1);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, h * 0.42, 0);
  g.add(handle);
  return g;
}

/** Sandbag / HESCO style barrier segment. */
export function barrierBlock(w, h, d, mat) {
  const g = new THREE.Group();
  const cols = Math.max(2, Math.round(w / 1.2));
  for (let i = 0; i < cols; i++) {
    const bw = w / cols;
    const cell = chamferBox(bw * 0.98, h, d, 0.04, mat);
    cell.position.set(-w / 2 + (i + 0.5) * bw, h / 2, 0);
    g.add(cell);
    // Wire mesh cage lines
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.99, h * 1.01, d * 1.01),
      new THREE.MeshBasicMaterial({ color: 0x2a2a28, wireframe: true, transparent: true, opacity: 0.35 }),
    );
    frame.position.copy(cell.position);
    g.add(frame);
  }
  return g;
}

/** Concrete jersey barrier. */
export function jerseyBarrier(len, mat) {
  if (!jerseyBarrier.geo) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.35, 0); shape.lineTo(0.35, 0); shape.lineTo(0.28, 0.28);
    shape.lineTo(0.14, 0.5); shape.lineTo(0.12, 1.0); shape.lineTo(-0.12, 1.0);
    shape.lineTo(-0.14, 0.5); shape.lineTo(-0.28, 0.28); shape.closePath();
    jerseyBarrier.geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    jerseyBarrier.geo.rotateY(Math.PI / 2);
    jerseyBarrier.geo.computeVertexNormals();
  }
  const m = new THREE.Mesh(jerseyBarrier.geo, mat);
  m.scale.z = 1; m.scale.x = len;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Cable tray / conduit run along the ground. */
export function cableTray(len, mat = matSteelDark()) {
  const g = new THREE.Group();
  g.add(box(len, 0.02, 0.34, mat, 0, 0.02, 0));
  g.add(box(len, 0.12, 0.02, mat, 0, 0.08, -0.16));
  g.add(box(len, 0.12, 0.02, mat, 0, 0.08, 0.16));
  const runs = Math.max(2, Math.round(len / 2));
  for (let i = 0; i < runs; i++) {
    g.add(box(0.05, 0.16, 0.36, mat, -len / 2 + (i + 0.5) * (len / runs), 0.08, 0));
  }
  // Bundled cables inside the tray
  for (let i = 0; i < 3; i++) {
    const c = cyl(0.03, len * 0.98, cableMaterial(i === 1 ? '#20201c' : '#101014'), 0, 0.055, -0.09 + i * 0.09, 6);
    c.rotation.z = Math.PI / 2;
    g.add(c);
  }
  return g;
}

/** Wheel + hub assembly. */
export function wheel(radius, width) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18, 1), matRubber());
  t.rotation.z = Math.PI / 2;
  t.castShadow = true;
  g.add(t);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width * 1.04, 12), matSteel());
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const nut = cyl(radius * 0.05, width * 1.1, matSteelDark(),
      0, Math.cos(a) * radius * 0.34, Math.sin(a) * radius * 0.34, 6);
    nut.rotation.z = Math.PI / 2;
    g.add(nut);
  }
  return g;
}

/** Levelling jack leg with pad; `deploy(t)` lowers the pad. */
export function jackLeg(len = 0.9) {
  const g = new THREE.Group();
  const ram = hydraulicRam(len * 0.6, 0.06, 0.04, len * 0.4);
  ram.rotation.x = Math.PI;
  ram.position.y = len * 0.6;
  g.add(ram);
  const pad = cyl(0.2, 0.05, matSteelDark(), 0, 0.03, 0, 10);
  g.add(pad);
  g.userData.pad = pad;
  g.deploy = (t) => {
    ram.extend(t);
    pad.position.y = 0.03 - t * 0.02;
  };
  return g;
}

/** Diesel generator set on a skid. */
export function generatorSet(mat) {
  const g = new THREE.Group();
  g.add(box(2.6, 0.16, 1.3, matSteelDark(), 0, 0.08, 0));
  const body = chamferBox(2.4, 1.1, 1.15, 0.06, mat);
  body.position.y = 0.72;
  g.add(body);
  const gr = grille(0.9, 0.7, 8);
  gr.position.set(-1.21, 0.72, 0);
  gr.rotation.y = -Math.PI / 2;
  g.add(gr);
  // Exhaust stack
  g.add(cyl(0.08, 1.1, matSteelDark(), 0.9, 1.7, -0.4, 10));
  g.add(cyl(0.1, 0.12, matSteelDark(), 0.9, 2.28, -0.4, 10));
  // Control box
  g.add(box(0.5, 0.42, 0.1, matSteelDark(), 0.4, 1.0, 0.6));
  const lamp = warningLamp('#39ff9e', 0.035, 2.4);
  lamp.position.set(0.4, 1.24, 0.66);
  g.add(lamp);
  g.userData.lamp = lamp;
  // Fuel line + power cable stubs
  g.add(cyl(0.05, 0.7, matSteelDark(), -0.6, 1.35, 0.3, 8));
  return g;
}

/** Small camo-net awning on poles - breaks up hard silhouettes. */
export function camoNetAwning(w, d, h, color = '#54603f') {
  const g = new THREE.Group();
  const seg = 6;
  const geo = new THREE.PlaneGeometry(w, d, seg, seg);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const sag = Math.cos((x / w) * Math.PI) * Math.cos((y / d) * Math.PI);
    pos.setZ(i, -0.28 * (1 - Math.abs(sag)) - 0.1 * Math.sin(x * 3 + y * 2));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide,
    transparent: true, opacity: 0.94,
  });
  const net = new THREE.Mesh(geo, mat);
  net.rotation.x = -Math.PI / 2;
  net.position.y = h;
  net.castShadow = true;
  g.add(net);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(cyl(0.035, h, matSteelDark(), sx * w * 0.46, h / 2, sz * d * 0.46, 6));
  }
  return g;
}

/**
 * Merge static meshes that share a material into single draw calls.
 *
 * Subtrees marked `userData.noMerge` (anything that moves at runtime) are
 * skipped entirely, as are instanced, transparent and per-object-animated
 * meshes. World transforms are baked relative to `root`, so this must only be
 * called on a group whose own transform is final.
 */
export function optimizeStatic(root, { minMeshes = 2 } = {}) {
  const byMat = new Map();
  root.updateMatrixWorld(true);

  const walk = (o) => {
    if (o !== root && (o.userData.noMerge || o.userData.dynamic)) return;
    if (o.isMesh && !o.isInstancedMesh && !o.material.transparent && !o.material.alphaTest) {
      const key = o.material.uuid;
      if (!byMat.has(key)) byMat.set(key, { mat: o.material, meshes: [] });
      byMat.get(key).meshes.push(o);
    }
    for (const child of o.children) walk(child);
  };
  walk(root);

  const merged = [];
  byMat.forEach(({ mat, meshes }) => {
    if (meshes.length < minMeshes) return;
    // Extruded shapes come back non-indexed while primitives are indexed, so
    // normalise the whole batch one way or the other before merging.
    const allIndexed = meshes.every((m) => !!m.geometry.index);
    const geos = [];
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const m of meshes) {
      let g = m.geometry.clone();
      if (!allIndexed && g.index) g = g.toNonIndexed();
      const local = new THREE.Matrix4().copy(rootInv).multiply(m.matrixWorld);
      g.applyMatrix4(local);
      // Normalise attributes so merging never fails on mismatched sets
      for (const name of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      }
      if (!g.attributes.uv) {
        const count = g.attributes.position.count;
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      geos.push(g);
    }
    try {
      const mergedGeo = BufferGeometryUtils.mergeGeometries(geos, false);
      if (mergedGeo) {
        const mesh = new THREE.Mesh(mergedGeo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        merged.push(mesh);
        for (const m of meshes) m.parent && m.parent.remove(m);
      }
    } catch (e) {
      // Leave the meshes alone if the merge is not possible.
    }
    geos.forEach((g) => g.dispose());
  });
  merged.forEach((m) => root.add(m));
  return merged.length;
}
