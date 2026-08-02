// Geometry construction kit. Everything visible in the film is assembled from
// these primitives -- there are no imported meshes anywhere in the project.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RNG } from '../util/rng.js';
import { TAU } from '../util/math.js';

/**
 * Extrudes between two same-cardinality polygons given in the XZ plane, one at
 * y=0 and one at y=height. This one primitive covers the Star Destroyer's dart
 * hull, superstructure blocks, trench walls, sandcrawler bodies and more.
 *
 * Vertices are [x, z] or [x, z, y] -- the optional third component overrides
 * the face height for that corner, which is how the Star Destroyer gets its
 * wedge profile (nose almost flat, stern 250 m tall) out of a single call.
 *
 * @param {Array<[number,number,number?]>} bottom polygon, counter-clockwise in XZ
 * @param {Array<[number,number,number?]>} top    polygon with the same vertex count
 */
export function prismoid(bottom, top, height, { uvScale = 0.02, capUV = 0.02 } = {}) {
  const n = bottom.length;
  const pos = [];
  const norm = [];
  const uv = [];

  const pushTri = (a, b, c, uva, uvb, uvc) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const nrm = new THREE.Vector3().crossVectors(ab, ac).normalize();
    for (const [p, t] of [[a, uva], [b, uvb], [c, uvc]]) {
      pos.push(p.x, p.y, p.z);
      norm.push(nrm.x, nrm.y, nrm.z);
      uv.push(t[0], t[1]);
    }
  };

  const B = bottom.map(([x, z, y]) => new THREE.Vector3(x, y ?? 0, z));
  const T = top.map(([x, z, y]) => new THREE.Vector3(x, y ?? height, z));

  // Side walls.
  let uRun = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const edgeLen = B[i].distanceTo(B[j]);
    const u0 = uRun * uvScale;
    const u1 = (uRun + edgeLen) * uvScale;
    uRun += edgeLen;
    const vTop = B[i].distanceTo(T[i]) * uvScale;
    pushTri(B[i], B[j], T[j], [u0, 0], [u1, 0], [u1, vTop]);
    pushTri(B[i], T[j], T[i], [u0, 0], [u1, vTop], [u0, vTop]);
  }

  // Caps (fan triangulation; all our polygons are convex). Input polygons are
  // counter-clockwise in the XZ plane, which puts the bottom cap's front face
  // on -Y and the top cap's on +Y.
  for (let i = 1; i < n - 1; i++) {
    pushTri(B[0], B[i], B[i + 1],
      [B[0].x * capUV, B[0].z * capUV], [B[i].x * capUV, B[i].z * capUV], [B[i + 1].x * capUV, B[i + 1].z * capUV]);
    pushTri(T[0], T[i + 1], T[i],
      [T[0].x * capUV, T[0].z * capUV], [T[i + 1].x * capUV, T[i + 1].z * capUV], [T[i].x * capUV, T[i].z * capUV]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Mirrors a polygon across X while preserving winding order. Scaling a mesh by
 * -1 would flip its normals inside out, so mirrored parts (left wings, left
 * mandibles) are built from mirrored polygons instead.
 */
export function mirrorPoly(poly) {
  return poly.map(([x, z, y]) => (y === undefined ? [-x, z] : [-x, z, y])).reverse();
}

/** Box whose front face can differ in size from its back face. */
export function taperedBox(w0, h0, w1, h1, len, { uvScale = 0.05, shearY = 0 } = {}) {
  const geo = prismoid(
    [[-w0 / 2, -len / 2], [w0 / 2, -len / 2], [w1 / 2, len / 2], [-w1 / 2, len / 2]],
    [[-w0 / 2, -len / 2], [w0 / 2, -len / 2], [w1 / 2, len / 2], [-w1 / 2, len / 2]],
    1,
    { uvScale },
  );
  // The prismoid above is unit-height; scale Y into place, then squash the far
  // end if the caller asked for different front/back heights.
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const t = (z + len / 2) / len;
    const hh = (h0 + (h1 - h0) * t) / 2;
    p.setY(i, (p.getY(i) - 0.5) * hh * 2 + shearY * t);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Regular n-gon plate extruded along Y (TIE wings, hatches, greeble discs). */
export function ngonPlate(radius, sides, thickness, { rotate = 0, uvScale = 0.05 } = {}) {
  const poly = [];
  for (let i = 0; i < sides; i++) {
    const a = rotate + (i / sides) * TAU;
    poly.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  const geo = prismoid(poly, poly, thickness, { uvScale });
  geo.translate(0, -thickness / 2, 0);
  return geo;
}

/** Cheap sphere-cap dome. */
export function dome(radius, { segments = 16, rings = 8, phi = Math.PI / 2 } = {}) {
  return new THREE.SphereGeometry(radius, segments, rings, 0, TAU, 0, phi);
}

/** Concave dish (superlaser emplacement, radar dishes). */
export function dish(radius, depth, { segments = 24, rings = 6 } = {}) {
  const pts = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    pts.push(new THREE.Vector2(radius * t, -depth * (1 - t * t)));
  }
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.scale(-1, 1, 1); // face inward
  return geo;
}

/** Rounded-end capsule along Z (fuselages, engine pods). */
export function capsule(radius, length, { radial = 12, cap = 5 } = {}) {
  const geo = new THREE.CapsuleGeometry(radius, length, cap, radial);
  geo.rotateX(Math.PI / 2);
  return geo;
}

export function cyl(rTop, rBottom, height, radial = 12, { openEnded = false, alongZ = false } = {}) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, height, radial, 1, openEnded);
  if (alongZ) geo.rotateX(Math.PI / 2);
  return geo;
}

export function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

/**
 * Scatters small boxes over a rectangular patch and merges them into a single
 * geometry -- the classic "greeble" trick for making a smooth hull read as a
 * kilometre-long machine.
 */
export function greebleField({
  seed = 1,
  count = 120,
  width = 10,
  depth = 10,
  y = 0,
  sizeMin = 0.08,
  sizeMax = 0.5,
  heightMin = 0.03,
  heightMax = 0.3,
  shrinkTowardNose = 0,
  mask = null,
} = {}) {
  const r = new RNG(seed);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const x = r.float(-width / 2, width / 2);
    const z = r.float(-depth / 2, depth / 2);
    if (mask && !mask(x, z)) continue;
    let s = r.float(sizeMin, sizeMax);
    if (shrinkTowardNose) {
      const t = (z + depth / 2) / depth;
      s *= 1 - shrinkTowardNose * t;
    }
    const h = r.float(heightMin, heightMax);
    const g = new THREE.BoxGeometry(s * r.float(0.6, 1.8), h, s * r.float(0.6, 2.4));
    g.translate(x, y + h / 2, z);
    if (r.bool(0.25)) g.rotateY(0); // keep axis-aligned; rotation is rarely visible at these scales
    parts.push(g);
  }
  if (!parts.length) return new THREE.BufferGeometry();
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Merge a list of [geometry, matrix] pairs into one buffer geometry. */
export function mergeAll(list) {
  const geos = list.map(([g, m]) => {
    const c = g.clone();
    if (m) c.applyMatrix4(m);
    return c;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

/** Helper: build a Matrix4 from position / euler / scale in one call. */
export function mat(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(px, py, pz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
}

/** Adds a mesh to a parent with position/rotation/scale in one line. */
export function addMesh(parent, geo, material, { pos, rot, scale, name, renderOrder } = {}) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale !== undefined) {
    if (Array.isArray(scale)) m.scale.set(scale[0], scale[1], scale[2]);
    else m.scale.setScalar(scale);
  }
  if (name) m.name = name;
  if (renderOrder !== undefined) m.renderOrder = renderOrder;
  parent.add(m);
  return m;
}

/** Recursively dispose a subtree's geometries (materials are pooled/shared). */
export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && o.material.__owned) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
}

/** Low-poly humanoid: readable in silhouette, ~200 triangles. */
export function humanoid({
  height = 1.8,
  build = 1,
  headScale = 1,
  material,
} = {}) {
  const g = new THREE.Group();
  const u = height / 1.8;
  const parts = [];
  const push = (geo, m) => parts.push([geo, m]);

  push(box(0.42 * u * build, 0.6 * u, 0.26 * u * build), mat(0, 1.32 * u, 0)); // chest
  push(box(0.34 * u * build, 0.34 * u, 0.24 * u * build), mat(0, 0.98 * u, 0)); // waist
  push(box(0.2 * u * headScale, 0.24 * u * headScale, 0.2 * u * headScale), mat(0, 1.76 * u, 0)); // head
  push(cyl(0.06 * u, 0.05 * u, 0.12 * u, 6), mat(0, 1.62 * u, 0)); // neck
  // arms
  for (const s of [-1, 1]) {
    push(box(0.12 * u, 0.46 * u, 0.13 * u), mat(s * 0.28 * u * build, 1.35 * u, 0));
    push(box(0.1 * u, 0.42 * u, 0.11 * u), mat(s * 0.3 * u * build, 0.96 * u, 0.02 * u));
  }
  // legs
  for (const s of [-1, 1]) {
    push(box(0.15 * u, 0.46 * u, 0.16 * u), mat(s * 0.11 * u, 0.6 * u, 0));
    push(box(0.13 * u, 0.44 * u, 0.14 * u), mat(s * 0.11 * u, 0.19 * u, 0));
    push(box(0.14 * u, 0.08 * u, 0.26 * u), mat(s * 0.11 * u, 0.04 * u, 0.05 * u));
  }
  const geo = mergeAll(parts);
  const mesh = new THREE.Mesh(geo, material);
  g.add(mesh);
  g.userData.mesh = mesh;
  return g;
}
