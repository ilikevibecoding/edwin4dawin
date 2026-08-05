// Kit-bash geometry helpers. Everything is built from primitives, lathe/extrude
// profiles and merged buffer geometry so the whole base stays procedural.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const MERGE_ATTRS = ['position', 'normal', 'uv'];

/**
 * Merge a list of {geometry, matrix} pairs into one geometry. Inputs are
 * normalised to non-indexed position/normal/uv so primitives from different
 * generators (extrude, lathe, plane, torus) can be kit-bashed freely.
 */
export function mergeParts(parts) {
  const geos = [];
  for (const p of parts) {
    let g = p.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (g.index) {
      const flat = g.toNonIndexed();
      g.dispose();
      g = flat;
    }
    for (const name of Object.keys(g.attributes)) {
      if (!MERGE_ATTRS.includes(name)) g.deleteAttribute(name);
    }
    g.morphAttributes = {};
    g.groups = [];
    if (p.matrix) g.applyMatrix4(p.matrix);
    geos.push(g);
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error('mergeParts: incompatible geometry set');
  return merged;
}

export function transform({ pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'));
  m.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(scale[0], scale[1], scale[2]));
  return m;
}

/** Box with chamfered edges — reads far better than a raw BoxGeometry. */
export function chamferBox(w, h, d, c = 0.03, seg = 1) {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const cc = Math.min(c, hw * 0.9, hh * 0.9);
  shape.moveTo(-hw + cc, -hh);
  shape.lineTo(hw - cc, -hh);
  shape.lineTo(hw, -hh + cc);
  shape.lineTo(hw, hh - cc);
  shape.lineTo(hw - cc, hh);
  shape.lineTo(-hw + cc, hh);
  shape.lineTo(-hw, hh - cc);
  shape.lineTo(-hw, -hh + cc);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelSize: cc * 0.8,
    bevelThickness: cc * 0.8,
    bevelSegments: seg,
    curveSegments: 1,
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

/** Corrugated / ribbed panel used on shelters and container walls. */
export function corrugatedPanel(w, h, ribs = 12, depth = 0.05) {
  const seg = ribs * 4;
  const g = new THREE.PlaneGeometry(w, h, seg, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = (x / w + 0.5) * ribs * Math.PI * 2;
    pos.setZ(i, Math.sin(t) * depth);
  }
  g.computeVertexNormals();
  return g;
}

export function cylinder(r1, r2, h, seg = 16, open = false) {
  return new THREE.CylinderGeometry(r1, r2, h, seg, 1, open);
}

/** Row of hex/round bolt heads for surface detail. */
export function boltRow(count, spacing, r = 0.02, h = 0.012, axis = 'x') {
  const parts = [];
  const g = new THREE.CylinderGeometry(r, r * 0.85, h, 6);
  for (let i = 0; i < count; i++) {
    const o = (i - (count - 1) / 2) * spacing;
    const pos = axis === 'x' ? [o, 0, 0] : axis === 'y' ? [0, o, 0] : [0, 0, o];
    parts.push({ geometry: g, matrix: transform({ pos, rot: [Math.PI / 2, 0, 0] }) });
  }
  const m = mergeParts(parts);
  g.dispose();
  return m;
}

/** Random-ish surface greebles (vents, boxes, conduit) for panel faces. */
export function greebleField(w, h, rng, { count = 14, maxSize = 0.22, depth = 0.05 } = {}) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const sw = rng.range(0.05, maxSize);
    const sh = rng.range(0.04, maxSize * 0.7);
    const sd = rng.range(depth * 0.4, depth);
    const g = chamferBox(sw, sh, sd, Math.min(sw, sh) * 0.12);
    parts.push({
      geometry: g,
      matrix: transform({ pos: [rng.range(-w / 2 + sw, w / 2 - sw), rng.range(-h / 2 + sh, h / 2 - sh), sd / 2] }),
    });
  }
  const m = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return m;
}

/** Catenary curve between two points; sag is in metres. */
export function catenary(a, b, sag = 0.5, segments = 18) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function cableGeometry(a, b, sag = 0.5, radius = 0.03, tubular = 16, radial = 5) {
  const curve = catenary(a, b, sag, Math.max(6, tubular));
  return new THREE.TubeGeometry(curve, tubular, radius, radial, false);
}

/** Poly-line tube through arbitrary points, e.g. hose runs and conduit. */
export function pathTube(points, radius = 0.04, radial = 6, closed = false, tension = 0.5) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', tension);
  return new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), radius, radial, closed);
}

/** Truss / lattice mast segment. */
export function trussSegment(width, height, radius = 0.035) {
  const parts = [];
  const legs = [
    [-width / 2, -width / 2],
    [width / 2, -width / 2],
    [width / 2, width / 2],
    [-width / 2, width / 2],
  ];
  const leg = cylinder(radius, radius, height, 6);
  for (const [x, z] of legs) parts.push({ geometry: leg, matrix: transform({ pos: [x, height / 2, z] }) });
  const diagLen = Math.hypot(width, height);
  const diag = cylinder(radius * 0.6, radius * 0.6, diagLen, 5);
  for (let i = 0; i < 4; i++) {
    const a = legs[i];
    const b = legs[(i + 1) % 4];
    const mid = [(a[0] + b[0]) / 2, height / 2, (a[1] + b[1]) / 2];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    parts.push({
      geometry: diag,
      matrix: transform({ pos: mid, rot: [0, -ang, Math.atan2(width, height) * (i % 2 === 0 ? 1 : -1)] }),
    });
  }
  const ring = new THREE.TorusGeometry(width * 0.71, radius * 0.55, 4, 8);
  for (const y of [0.02, height - 0.02]) {
    parts.push({ geometry: ring, matrix: transform({ pos: [0, y, 0], rot: [Math.PI / 2, Math.PI / 4, 0] }) });
  }
  const g = mergeParts(parts);
  leg.dispose();
  diag.dispose();
  ring.dispose();
  return g;
}

export function ladder(height, width = 0.42, rungGap = 0.3) {
  const parts = [];
  const rail = cylinder(0.022, 0.022, height, 6);
  parts.push({ geometry: rail, matrix: transform({ pos: [-width / 2, height / 2, 0] }) });
  parts.push({ geometry: rail, matrix: transform({ pos: [width / 2, height / 2, 0] }) });
  const rung = cylinder(0.014, 0.014, width, 5);
  const n = Math.max(2, Math.floor(height / rungGap));
  for (let i = 0; i < n; i++) {
    parts.push({ geometry: rung, matrix: transform({ pos: [0, (i + 0.5) * (height / n), 0], rot: [0, 0, Math.PI / 2] }) });
  }
  const g = mergeParts(parts);
  rail.dispose();
  rung.dispose();
  return g;
}

export function handrail(points, height = 1.05) {
  const parts = [];
  const post = cylinder(0.024, 0.024, height, 6);
  for (const p of points) parts.push({ geometry: post, matrix: transform({ pos: [p.x, height / 2, p.z] }) });
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const ang = Math.atan2(b.z - a.z, b.x - a.x);
    const bar = cylinder(0.02, 0.02, len, 6);
    for (const hy of [height, height * 0.52]) {
      parts.push({ geometry: bar, matrix: transform({ pos: [mid.x, hy, mid.z], rot: [0, -ang, Math.PI / 2] }) });
    }
  }
  const g = mergeParts(parts);
  post.dispose();
  return g;
}

/** Simple wheel with sidewall and hub detail. */
export function wheel(radius = 0.52, width = 0.34) {
  const parts = [];
  const tire = new THREE.CylinderGeometry(radius, radius, width, 18, 1, false);
  parts.push({ geometry: tire, matrix: transform({ rot: [0, 0, Math.PI / 2] }) });
  const hub = new THREE.CylinderGeometry(radius * 0.46, radius * 0.46, width * 1.04, 12);
  parts.push({ geometry: hub, matrix: transform({ rot: [0, 0, Math.PI / 2] }) });
  const nut = new THREE.CylinderGeometry(radius * 0.06, radius * 0.06, width * 1.14, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    parts.push({
      geometry: nut,
      matrix: transform({ pos: [0, Math.sin(a) * radius * 0.3, Math.cos(a) * radius * 0.3], rot: [0, 0, Math.PI / 2] }),
    });
  }
  const g = mergeParts(parts);
  tire.dispose();
  hub.dispose();
  nut.dispose();
  return g;
}

/** Lathe-profile nose cone / nozzle bell. */
export function latheProfile(points, segments = 20) {
  const pts = points.map((p) => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

export function ribbedTube(length, radius, ribs = 6, ribR = 1.09, seg = 18) {
  const parts = [];
  const body = cylinder(radius, radius, length, seg);
  parts.push({ geometry: body });
  const ring = new THREE.TorusGeometry(radius * ribR, radius * 0.055, 5, seg);
  for (let i = 0; i < ribs; i++) {
    const y = -length / 2 + ((i + 0.5) / ribs) * length;
    parts.push({ geometry: ring, matrix: transform({ pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }) });
  }
  const g = mergeParts(parts);
  body.dispose();
  ring.dispose();
  return g;
}

/** Screw-in hydraulic ram: outer barrel plus visible polished rod. */
export function hydraulicRam(barrelLen, rodLen, r = 0.055) {
  const parts = [];
  const barrel = cylinder(r, r, barrelLen, 10);
  parts.push({ geometry: barrel, matrix: transform({ pos: [0, barrelLen / 2, 0] }) });
  const cap = cylinder(r * 1.22, r * 1.22, r * 0.7, 10);
  parts.push({ geometry: cap, matrix: transform({ pos: [0, r * 0.4, 0] }) });
  parts.push({ geometry: cap, matrix: transform({ pos: [0, barrelLen - r * 0.4, 0] }) });
  const rod = cylinder(r * 0.55, r * 0.55, rodLen, 8);
  parts.push({ geometry: rod, matrix: transform({ pos: [0, barrelLen + rodLen / 2 - 0.02, 0] }) });
  const eye = new THREE.TorusGeometry(r * 0.62, r * 0.24, 5, 10);
  parts.push({ geometry: eye, matrix: transform({ pos: [0, barrelLen + rodLen, 0], rot: [0, Math.PI / 2, 0] }) });
  const g = mergeParts(parts);
  barrel.dispose();
  cap.dispose();
  rod.dispose();
  eye.dispose();
  return g;
}

/** Aim an object along a direction, keeping +Y as its local forward axis. */
const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
export function orientY(object, dir) {
  _q.setFromUnitVectors(_up, dir.clone().normalize());
  object.quaternion.copy(_q);
}

export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        for (const k of Object.keys(m)) {
          const v = m[k];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      }
    }
  });
}

export { BufferGeometryUtils };
