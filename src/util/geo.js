import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Kit-bash helpers. Every asset in the game is assembled from these primitives
 * and merged down so that a whole launcher or shelter is only a handful of
 * draw calls.
 */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Clone + transform a geometry. Rotation is XYZ Euler in radians. */
export function xform(geom, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const g = geom.clone();
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _v.set(pos[0], pos[1], pos[2]);
  _s.set(scale[0], scale[1], scale[2]);
  _m.compose(_v, _q, _s);
  g.applyMatrix4(_m);
  return g;
}

const MERGE_ATTRIBUTES = ['position', 'normal', 'uv'];

/**
 * Normalise a geometry so it can be merged with any other: only
 * position/normal/uv, always non-indexed, always with real normals.
 *
 * three's primitives disagree about indexing and about whether they carry uv1,
 * tangents and so on, and `mergeGeometries` refuses any mismatch.
 */
function normalizeForMerge(geom) {
  let g = geom;
  if (!g.attributes.normal) {
    g = g.clone();
    g.computeVertexNormals();
  }
  if (!g.attributes.uv) {
    if (g === geom) g = g.clone();
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (g.index) g = g.toNonIndexed();
  else if (g === geom) g = g.clone();
  for (const name of Object.keys(g.attributes)) {
    if (!MERGE_ATTRIBUTES.includes(name)) g.deleteAttribute(name);
  }
  g.clearGroups();
  g.morphAttributes = {};
  return g;
}

/** Merge a list of geometries, normalising attribute sets first. */
export function merge(list, useGroups = false) {
  const clean = list.filter(Boolean);
  if (clean.length === 0) return new THREE.BufferGeometry();
  const prepared = clean.map(normalizeForMerge);
  if (prepared.length === 1) return prepared[0];
  const g = mergeGeometries(prepared, useGroups);
  if (!g) {
    console.warn('[geo] merge failed, falling back to first geometry');
    return prepared[0];
  }
  return g;
}

/** Rounded box built by extruding a rounded rectangle - cheap bevels. */
export function roundedBox(w, h, d, radius = 0.04, steps = 2) {
  const r = Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const shape = new THREE.Shape();
  const x = -w / 2 + r;
  const y = -h / 2 + r;
  const ww = w - r * 2;
  const hh = h - r * 2;
  shape.moveTo(x, -h / 2);
  shape.lineTo(x + ww, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, y);
  shape.lineTo(w / 2, y + hh);
  shape.quadraticCurveTo(w / 2, h / 2, x + ww, h / 2);
  shape.lineTo(x, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, y + hh);
  shape.lineTo(-w / 2, y);
  shape.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: d - r * 2,
    bevelEnabled: true,
    bevelSize: r,
    bevelThickness: r,
    bevelSegments: steps,
    curveSegments: steps + 2
  });
  geom.translate(0, 0, -(d - r * 2) / 2);
  geom.computeVertexNormals();
  return geom;
}

/** Hollow tube segment. */
export function pipe(radius, length, thickness = 0.02, seg = 12) {
  const outer = new THREE.CylinderGeometry(radius, radius, length, seg, 1, true);
  const inner = new THREE.CylinderGeometry(radius - thickness, radius - thickness, length, seg, 1, true);
  inner.scale(1, 1, -1);
  const ringTop = new THREE.RingGeometry(radius - thickness, radius, seg, 1);
  ringTop.rotateX(-Math.PI / 2);
  ringTop.translate(0, length / 2, 0);
  const ringBot = ringTop.clone();
  ringBot.rotateX(Math.PI);
  ringBot.translate(0, -length, 0);
  return merge([outer, inner, ringTop, ringBot]);
}

/** Bolt head: a small hex prism, used by the hundred across the base. */
export function bolt(radius = 0.03, height = 0.02) {
  const g = new THREE.CylinderGeometry(radius, radius * 0.95, height, 6);
  return g;
}

/** A ladder of two rails and N rungs, running up +Y. */
export function ladder(height, width = 0.42, rungs = null, rail = 0.025) {
  const n = rungs ?? Math.max(2, Math.round(height / 0.32));
  const parts = [];
  const railGeo = new THREE.CylinderGeometry(rail, rail, height, 6);
  parts.push(xform(railGeo, [-width / 2, height / 2, 0]));
  parts.push(xform(railGeo, [width / 2, height / 2, 0]));
  const rungGeo = new THREE.CylinderGeometry(rail * 0.7, rail * 0.7, width, 5);
  rungGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i <= n; i++) {
    parts.push(xform(rungGeo, [0, (i / n) * height * 0.97 + 0.05, 0]));
  }
  return merge(parts);
}

/** Handrail: posts plus a top and mid rail around a rectangular deck. */
export function railing(w, d, height = 1.05, post = 0.03) {
  const parts = [];
  const hw = w / 2;
  const hd = d / 2;
  const corners = [];
  const stepsX = Math.max(2, Math.round(w / 0.9));
  const stepsZ = Math.max(2, Math.round(d / 0.9));
  for (let i = 0; i <= stepsX; i++) {
    const x = -hw + (w * i) / stepsX;
    corners.push([x, -hd], [x, hd]);
  }
  for (let i = 1; i < stepsZ; i++) {
    const z = -hd + (d * i) / stepsZ;
    corners.push([-hw, z], [hw, z]);
  }
  const postGeo = new THREE.CylinderGeometry(post, post, height, 6);
  for (const [x, z] of corners) parts.push(xform(postGeo, [x, height / 2, z]));
  const bar = (len, pos, rotY) =>
    xform(new THREE.CylinderGeometry(post * 0.8, post * 0.8, len, 6), pos, [Math.PI / 2, 0, rotY]);
  for (const h of [height, height * 0.55]) {
    parts.push(bar(d, [-hw, h, 0], Math.PI / 2));
    parts.push(bar(d, [hw, h, 0], Math.PI / 2));
    parts.push(bar(w, [0, h, -hd], 0));
    parts.push(bar(w, [0, h, hd], 0));
  }
  return merge(parts);
}

/** A hanging cable between two points, sagging under its own weight. */
export function cable(a, b, sag = 0.4, radius = 0.02, segments = 14) {
  const pts = [];
  const from = new THREE.Vector3().fromArray(a);
  const to = new THREE.Vector3().fromArray(b);
  const dist = from.distanceTo(to);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(from, to, t);
    p.y -= Math.sin(t * Math.PI) * sag * Math.min(1, dist / 4);
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, segments, radius, 5, false);
}

/** Corrugated panel (shelters, container walls). */
export function corrugated(w, h, depth = 0.05, ribs = null) {
  const n = ribs ?? Math.max(4, Math.round(w / 0.28));
  const parts = [];
  const back = new THREE.BoxGeometry(w, h, depth * 0.6);
  parts.push(back);
  const ribGeo = new THREE.CylinderGeometry(depth, depth, h, 6, 1, false, 0, Math.PI);
  ribGeo.rotateY(Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / n;
    parts.push(xform(ribGeo, [x, 0, depth * 0.3]));
  }
  return merge(parts);
}

/** Truss lattice between two heights - antenna masts, gantries. */
export function truss(height, width = 0.5, bays = null, bar = 0.022) {
  const n = bays ?? Math.max(3, Math.round(height / 0.7));
  const parts = [];
  const legs = [
    [-width / 2, -width / 2],
    [width / 2, -width / 2],
    [width / 2, width / 2],
    [-width / 2, width / 2]
  ];
  const legGeo = new THREE.CylinderGeometry(bar, bar, height, 6);
  for (const [x, z] of legs) parts.push(xform(legGeo, [x, height / 2, z]));
  const bayH = height / n;
  for (let i = 0; i <= n; i++) {
    const y = i * bayH;
    for (let l = 0; l < 4; l++) {
      const a = legs[l];
      const b = legs[(l + 1) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      parts.push(
        xform(
          new THREE.CylinderGeometry(bar * 0.65, bar * 0.65, len, 5),
          [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2],
          [0, -ang, Math.PI / 2]
        )
      );
      if (i < n) {
        // Diagonal brace.
        const dy = bayH;
        const dlen = Math.hypot(len, dy);
        const tilt = Math.atan2(dy, len);
        parts.push(
          xform(
            new THREE.CylinderGeometry(bar * 0.55, bar * 0.55, dlen, 5),
            [(a[0] + b[0]) / 2, y + dy / 2, (a[1] + b[1]) / 2],
            [0, -ang, Math.PI / 2 - tilt * (l % 2 === 0 ? 1 : -1)]
          )
        );
      }
    }
  }
  return merge(parts);
}

/** Hydraulic ram: a barrel with a chromed rod poking out. */
export function hydraulic(length, radius = 0.06, extend = 0.4) {
  const barrel = new THREE.CylinderGeometry(radius, radius, length * (1 - extend), 10);
  barrel.translate(0, (length * (1 - extend)) / 2, 0);
  const eye1 = new THREE.TorusGeometry(radius * 0.8, radius * 0.35, 6, 10);
  eye1.rotateY(Math.PI / 2);
  return { barrel: merge([barrel, eye1]), rodRadius: radius * 0.55 };
}

/** Ribbed exhaust nozzle cone. */
export function nozzle(rIn, rOut, length, seg = 14) {
  const cone = new THREE.CylinderGeometry(rOut, rIn, length, seg, 3, true);
  const lip = new THREE.TorusGeometry(rOut, rOut * 0.08, 6, seg);
  lip.rotateX(Math.PI / 2);
  lip.translate(0, length / 2, 0);
  return merge([cone, lip]);
}

/** Warhead/nose ogive: a lathed profile that reads far better than a cone. */
export function ogive(radius, length, seg = 16, sharpness = 0.62) {
  const pts = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = radius * Math.pow(Math.sin((1 - t) * Math.PI * 0.5), sharpness);
    pts.push(new THREE.Vector2(Math.max(0.0012, r), t * length));
  }
  return new THREE.LatheGeometry(pts, seg);
}

/** Simple grid-arranged sandbag / barrier row helper. */
export function repeatAlong(geom, from, to, count, jitter = 0, rngFn = Math.random) {
  const parts = [];
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.x += (rngFn() - 0.5) * jitter;
    p.z += (rngFn() - 0.5) * jitter;
    parts.push(xform(geom, p.toArray(), [0, (rngFn() - 0.5) * jitter, 0]));
  }
  return merge(parts);
}

/** Finalise a merged geometry, scrubbing any non-finite vertices first. */
export function finalize(geom, label = '') {
  if (!geom.attributes.normal) geom.computeVertexNormals();
  const pos = geom.attributes.position;
  if (pos) {
    const a = pos.array;
    let bad = 0;
    for (let i = 0; i < a.length; i++) {
      if (!Number.isFinite(a[i])) {
        a[i] = 0;
        bad++;
      }
    }
    if (bad > 0) {
      console.warn(`[geo] ${label || 'geometry'}: zeroed ${bad} non-finite position components`);
      pos.needsUpdate = true;
    }
    const nrm = geom.attributes.normal;
    if (nrm) {
      const n = nrm.array;
      let badN = 0;
      for (let i = 0; i < n.length; i += 3) {
        if (!Number.isFinite(n[i]) || !Number.isFinite(n[i + 1]) || !Number.isFinite(n[i + 2])) {
          n[i] = 0;
          n[i + 1] = 1;
          n[i + 2] = 0;
          badN++;
        }
      }
      if (badN > 0) nrm.needsUpdate = true;
    }
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}
