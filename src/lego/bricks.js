/**
 * LEGO-style brick construction kit.
 *
 * Scale: 1 world unit = 1 stud pitch (8mm in the real world).
 *   PLATE = 0.4  (3.2mm)
 *   BRICK = 1.2  (9.6mm, three plates)
 * A minifig is 4 bricks (~5 units) tall.
 *
 * Every primitive is anchored centered on X/Z with its base sitting on y = 0,
 * so parts stack by simply adding heights.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const STUD = 1.0;
export const PLATE = 0.4;
export const BRICK = 1.2;
export const STUD_R = 0.3;
export const STUD_H = 0.22;
const BEVEL = 0.035;

/** Canonical LEGO-ish palette. */
export const C = {
  white: 0xf2f3f2,
  black: 0x1b2a34,
  darkGray: 0x545955,
  bluishGray: 0x6c6e68,
  lightGray: 0xa3a2a4,
  veryLightGray: 0xc8c9c7,
  silver: 0xb8bcbe,
  red: 0xc91a09,
  darkRed: 0x720e0f,
  blue: 0x0055bf,
  darkBlue: 0x0a3463,
  azure: 0x078bc9,
  yellow: 0xf2cd37,
  brightYellow: 0xffd500,
  orange: 0xfe8a18,
  darkOrange: 0xb15000,
  tan: 0xe4cd9e,
  darkTan: 0x958a73,
  brown: 0x583927,
  reddishBrown: 0x6d4224,
  green: 0x237841,
  darkGreen: 0x184632,
  sandGreen: 0xa0bcac,
  sandBlue: 0x6074a1,
  oliveGreen: 0x9b9a5a,
  purple: 0x81007b,
  gold: 0xaa7f2e,
  copper: 0xae7a59,
  flesh: 0xd09168,
  // transparents
  transClear: 0xfcfcfc,
  transRed: 0xd53019,
  transBlue: 0x7fc5e0,
  transGreen: 0x84b68d,
  transYellow: 0xf5cd2f,
  transOrange: 0xf08f1c,
  transNeonGreen: 0xd9e4a7,
};

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

const matCache = new Map();

/**
 * Cached LEGO ABS-looking material.
 * @param {number} color hex
 * @param {object} [o] {transparent, opacity, emissive, emissiveIntensity, metal, rough, flat, map}
 */
export function mat(color, o = {}) {
  const key = color + '|' + JSON.stringify(o);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? (o.metal ? 0.28 : 0.42),
    metalness: o.metal ?? 0.0,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    map: o.map || null,
    side: o.side || THREE.FrontSide,
    depthWrite: o.depthWrite ?? true,
  });
  if (o.flat) m.flatShading = true;
  matCache.set(key, m);
  return m;
}

/** Unlit glow material (for engines, sabers, bolts). */
export function glow(color, opacity = 1) {
  const key = 'glow' + color + opacity;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
  });
  matCache.set(key, m);
  return m;
}

/* ------------------------------------------------------------------ */
/* geometry helpers                                                    */
/* ------------------------------------------------------------------ */

const geoCache = new Map();
function cached(key, build) {
  let g = geoCache.get(key);
  if (!g) {
    g = build();
    geoCache.set(key, g);
  }
  return g;
}

/** Make a geometry mergeable: non-indexed, exactly position/normal/uv. */
export function norm(g) {
  let out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) {
    if (!['position', 'normal', 'uv'].includes(k)) out.deleteAttribute(k);
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) {
    const n = out.attributes.position.count;
    out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  return out;
}

function studGeo() {
  return cached('stud', () => {
    const g = norm(new THREE.CylinderGeometry(STUD_R, STUD_R * 0.985, STUD_H, 16, 1, false));
    g.translate(0, STUD_H / 2, 0);
    return g;
  });
}

/**
 * Grid of studs, merged into a single geometry.
 * @param {number} w studs across X
 * @param {number} d studs across Z
 * @param {number} y top surface height
 */
export function studGrid(w, d, y = 0, skip = null) {
  const parts = [];
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      if (skip && skip(i, j)) continue;
      const g = studGeo().clone();
      g.translate(i - (w - 1) / 2, y, j - (d - 1) / 2);
      parts.push(g);
    }
  }
  if (!parts.length) return null;
  return mergeGeometries(parts, false);
}

function boxGeo(w, h, d, bevel = BEVEL) {
  const key = `box${w}_${h}_${d}_${bevel}`;
  return cached(key, () => {
    const r = Math.min(bevel, w / 2.5, h / 2.5, d / 2.5);
    const g = norm(r > 0.004
      ? new RoundedBoxGeometry(w, h, d, 1, r)
      : new THREE.BoxGeometry(w, h, d));
    g.translate(0, h / 2, 0);
    return g;
  });
}

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */

/**
 * Rectangular brick / plate / tile.
 * @param {number} w width in studs (X)
 * @param {number} d depth in studs (Z)
 * @param {number} h height in world units (use BRICK / PLATE multiples)
 * @param {object} o {color, studs, ...material opts}
 * @returns {THREE.Mesh}
 */
export function brick(w, d, h = BRICK, o = {}) {
  const color = o.color ?? C.lightGray;
  const withStuds = o.studs !== false;
  const key = `brick${w}_${d}_${h}_${withStuds}_${o.bevel ?? BEVEL}`;
  const geo = cached(key, () => {
    const parts = [boxGeo(w, h, d, o.bevel).clone()];
    if (withStuds) {
      const s = studGrid(Math.round(w), Math.round(d), h, o.skipStud);
      if (s) parts.push(s);
    }
    return mergeGeometries(parts, false);
  });
  const m = new THREE.Mesh(geo, mat(color, o));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Flat tile (no studs). */
export function tile(w, d, h = PLATE, o = {}) {
  return brick(w, d, h, { ...o, studs: false });
}

/** Plate: 1/3 brick tall. */
export function plate(w, d, o = {}) {
  return brick(w, d, PLATE, o);
}

/**
 * Slope: full height h at -X edge, falling to hFront at +X edge.
 * Rotate the returned mesh to point it elsewhere.
 */
export function slope(w, d, h, hFront = 0, o = {}) {
  const key = `slope${w}_${d}_${h}_${hFront}`;
  const geo = cached(key, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, Math.max(hFront, 0.02));
    s.lineTo(-w / 2, h);
    s.closePath();
    const g = norm(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }));
    g.translate(0, 0, -d / 2);
    g.computeVertexNormals();
    return g;
  });
  const m = new THREE.Mesh(geo, mat(o.color ?? C.lightGray, o));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Generic extruded prism from a 2D polygon in the XZ plane.
 * @param {Array<[number,number]>} pts polygon points [x, z]
 * @param {number} h extrusion height (Y)
 */
export function prism(pts, h, o = {}) {
  const key = 'prism' + JSON.stringify(pts) + h + (o.bevel ?? 0.03);
  const geo = cached(key, () => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    const bev = o.bevel ?? 0.03;
    const g = norm(new THREE.ExtrudeGeometry(s, {
      depth: Math.max(h - bev * 2, 0.01),
      bevelEnabled: bev > 0,
      bevelSize: bev,
      bevelThickness: bev,
      bevelSegments: 1,
    }));
    g.rotateX(-Math.PI / 2);
    g.translate(0, h - bev, 0);
    g.computeVertexNormals();
    return g;
  });
  const m = new THREE.Mesh(geo, mat(o.color ?? C.lightGray, o));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Wedge plate: triangle, tip toward -Z, base at +Z. */
export function wedge(w, d, h = PLATE, o = {}) {
  return prism([[-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2]], h, o);
}

/** Round brick / cylinder. r in studs. */
export function cyl(r, h, o = {}) {
  const seg = o.seg ?? 20;
  const key = `cyl${r}_${h}_${seg}_${o.rTop ?? r}`;
  const geo = cached(key, () => {
    const g = norm(new THREE.CylinderGeometry(o.rTop ?? r, r, h, seg, 1, !!o.open));
    g.translate(0, h / 2, 0);
    return g;
  });
  const m = new THREE.Mesh(geo, o.glow ? glow(o.color, o.opacity ?? 1) : mat(o.color ?? C.lightGray, o));
  m.castShadow = m.receiveShadow = true;
  if (o.studs) {
    const s = new THREE.Mesh(studGeo(), m.material);
    s.position.y = h;
    s.castShadow = true;
    m.add(s);
  }
  return m;
}

export function cone(rBottom, rTop, h, o = {}) {
  return cyl(rBottom, h, { ...o, rTop });
}

export function sphere(r, o = {}) {
  const key = `sph${r}_${o.seg ?? 18}`;
  const geo = cached(key, () => {
    const g = norm(new THREE.SphereGeometry(r, o.seg ?? 18, Math.round((o.seg ?? 18) / 2)));
    g.translate(0, r, 0);
    return g;
  });
  const m = new THREE.Mesh(geo, o.glow ? glow(o.color, o.opacity ?? 1) : mat(o.color ?? C.lightGray, o));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Torus, lying flat (axis = Y). */
export function ring(r, tube, o = {}) {
  const geo = cached(`ring${r}_${tube}`, () => {
    const g = norm(new THREE.TorusGeometry(r, tube, 10, 28));
    g.rotateX(Math.PI / 2);
    return g;
  });
  const m = new THREE.Mesh(geo, o.glow ? glow(o.color, o.opacity ?? 1) : mat(o.color ?? C.lightGray, o));
  m.castShadow = true;
  return m;
}

/** Dish / radar (concave up when flipped). */
export function dish(r, h, o = {}) {
  const geo = cached(`dish${r}_${h}`, () => {
    const g = norm(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42));
    g.scale(1, h / (r * 0.42), 1);
    g.rotateX(Math.PI);
    return g;
  });
  const m = new THREE.Mesh(geo, mat(o.color ?? C.lightGray, { ...o, side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Thin bar / antenna / axle. */
export function bar(len, r = 0.09, o = {}) {
  const geo = cached(`bar${len}_${r}`, () => {
    const g = norm(new THREE.CylinderGeometry(r, r, len, 8));
    g.translate(0, len / 2, 0);
    return g;
  });
  const m = new THREE.Mesh(geo, o.glow ? glow(o.color, o.opacity ?? 1) : mat(o.color ?? C.silver, o));
  m.castShadow = true;
  return m;
}

/** A flat printed/decal panel, standing in the XY plane facing +Z. */
export function panel(w, h, texture, o = {}) {
  const geo = cached(`panel${w}_${h}`, () => new THREE.PlaneGeometry(w, h));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.45,
    metalness: 0,
    alphaTest: o.alphaTest ?? 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    color: o.color ?? 0xffffff,
  }));
  return m;
}

/* ------------------------------------------------------------------ */
/* assembly helpers                                                    */
/* ------------------------------------------------------------------ */

/** Position helper: returns the object after setting position. */
export function at(obj, x = 0, y = 0, z = 0) {
  obj.position.set(x, y, z);
  return obj;
}

/** Rotation helper (radians). */
export function rot(obj, x = 0, y = 0, z = 0) {
  obj.rotation.set(x, y, z);
  return obj;
}

/** Build a group from children. */
export function group(...children) {
  const g = new THREE.Group();
  for (const c of children.flat()) if (c) g.add(c);
  return g;
}

/** Mirror a built group across X (for symmetric ship halves). */
export function mirrorX(obj) {
  const c = obj.clone(true);
  c.scale.x *= -1;
  c.position.x *= -1;
  return c;
}

/**
 * Merge every mesh in a group into one mesh per material.
 * Big win for static models built from hundreds of bricks.
 */
export function bake(root) {
  const byMat = new Map();
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const keep = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.noBake) { keep.push(o); return; }
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const g = norm(o.geometry.clone());
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    // strip attributes that prevent merging
    for (const k of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    }
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    if (!byMat.has(m)) byMat.set(m, []);
    byMat.get(m).push(g);
  });
  const out = new THREE.Group();
  out.name = root.name;
  for (const [m, geos] of byMat) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = mesh.receiveShadow = true;
    out.add(mesh);
  }
  for (const k of keep) {
    k.updateMatrixWorld(true);
    const c = k.clone();
    c.matrix.copy(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld));
    c.matrix.decompose(c.position, c.quaternion, c.scale);
    out.add(c);
  }
  out.position.copy(root.position);
  out.quaternion.copy(root.quaternion);
  out.scale.copy(root.scale);
  return out;
}

/** Deterministic pseudo-random generator (so renders are reproducible). */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
