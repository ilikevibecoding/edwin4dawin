import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Shared geometry construction helpers.
 * Owner: Opus 1 (interface), used by every art module.
 *
 * House rule from the visual bible: no razor-sharp CG edges on anything the
 * player sees closer than ~4 m. `bevelBox` is the default primitive; a plain
 * BoxGeometry is only acceptable for hidden collision proxies and far LODs.
 */

const GEO_CACHE = new Map();

/** Chamfered box. `bevel` is the edge radius in metres (default 8 mm). */
export function bevelBox(w, h, d, bevel = 0.008, seg = 1) {
  const b = Math.min(bevel, w / 2.05, h / 2.05, d / 2.05);
  const key = `bb:${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}:${b.toFixed(4)}:${seg}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, b);
    GEO_CACHE.set(key, g);
  }
  return g;
}

/** Sharp box — collision proxies, hidden faces and distant LOD only. */
export function box(w, h, d) {
  const key = `b:${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    GEO_CACHE.set(key, g);
  }
  return g;
}

export function plane(w, h, ws = 1, hs = 1) {
  const key = `p:${w.toFixed(4)}:${h.toFixed(4)}:${ws}:${hs}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h, ws, hs);
    GEO_CACHE.set(key, g);
  }
  return g;
}

export function cyl(rTop, rBot, h, seg = 16, open = false) {
  const key = `c:${rTop.toFixed(4)}:${rBot.toFixed(4)}:${h.toFixed(4)}:${seg}:${open}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    GEO_CACHE.set(key, g);
  }
  return g;
}

export function sphere(r, ws = 16, hs = 12) {
  const key = `s:${r.toFixed(4)}:${ws}:${hs}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(r, ws, hs);
    GEO_CACHE.set(key, g);
  }
  return g;
}

export function capsule(r, len, cs = 5, rs = 12) {
  const key = `cap:${r.toFixed(4)}:${len.toFixed(4)}:${cs}:${rs}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new THREE.CapsuleGeometry(r, len, cs, rs);
    GEO_CACHE.set(key, g);
  }
  return g;
}

export function torus(r, tube, rs = 8, ts = 20, arc = Math.PI * 2) {
  const key = `t:${r.toFixed(4)}:${tube.toFixed(4)}:${rs}:${ts}:${arc.toFixed(3)}`;
  let g = GEO_CACHE.get(key);
  if (!g) {
    g = new THREE.TorusGeometry(r, tube, rs, ts, arc);
    GEO_CACHE.set(key, g);
  }
  return g;
}

/** Lathe a 2-D profile (array of [x, y]) around Y. Good for cups, bottles, lamps. */
export function lathe(points, seg = 20) {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return g;
}

/** Extrude a closed 2-D outline along +Z with an optional bevel. */
export function extrude(outline, depth, bevel = 0.006, curveSeg = 2) {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: curveSeg,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

/** Rounded rectangle profile as an outline array, for extrude(). */
export function roundRectOutline(w, h, r, seg = 4) {
  const pts = [];
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const corners = [
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
    [hw, -hh, -Math.PI / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** Merge a list of {geometry, matrix} into one buffer geometry (single material). */
export function mergeParts(parts) {
  const geos = parts.map(({ geometry, matrix }) => {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    return g;
  });
  const merged = BGU.mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

export function matrixFrom(pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...scale));
  return m;
}

/**
 * Build a mesh group from a declarative part list.
 * Each part: { g: geometry, m: material, p:[x,y,z], r:[x,y,z], s:[x,y,z]|number, name, cast, receive }
 */
export function buildParts(parts, { castShadow = true, receiveShadow = true, name = '' } = {}) {
  const group = new THREE.Group();
  group.name = name;
  for (const part of parts) {
    if (!part) continue;
    const mesh = new THREE.Mesh(part.g, part.m);
    if (part.p) mesh.position.set(part.p[0], part.p[1], part.p[2]);
    if (part.r) mesh.rotation.set(part.r[0], part.r[1], part.r[2]);
    if (part.s !== undefined) {
      if (typeof part.s === 'number') mesh.scale.setScalar(part.s);
      else mesh.scale.set(part.s[0], part.s[1], part.s[2]);
    }
    mesh.castShadow = part.cast ?? castShadow;
    mesh.receiveShadow = part.receive ?? receiveShadow;
    if (part.name) mesh.name = part.name;
    if (part.userData) mesh.userData = { ...part.userData };
    group.add(mesh);
  }
  return group;
}

/** Simplified silhouette proxy used as the far LOD for small props. */
export function boundsProxy(object3d, material) {
  const b = new THREE.Box3().setFromObject(object3d);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  b.getSize(size);
  b.getCenter(center);
  const mesh = new THREE.Mesh(box(Math.max(size.x, 0.02), Math.max(size.y, 0.02), Math.max(size.z, 0.02)), material);
  mesh.position.copy(center);
  mesh.castShadow = true;
  return mesh;
}

/** Wrap detailed/simple variants into a THREE.LOD with distance thresholds. */
export function makeLod(levels) {
  const lod = new THREE.LOD();
  for (const { object, distance } of levels) lod.addLevel(object, distance);
  lod.autoUpdate = true;
  return lod;
}

export function disposeGeometryCache() {
  for (const g of GEO_CACHE.values()) g.dispose();
  GEO_CACHE.clear();
}

export function geometryCacheSize() {
  return GEO_CACHE.size;
}

export { BGU };
