import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/*
 * Unit system: 1 world unit = 1 stud pitch = 8 mm.
 * Everything else derives from that so models keep real LEGO proportions.
 */
export const STUD = 1.0;            // stud pitch (8 mm)
export const PLATE = 0.4;           // plate height (3.2 mm)
export const BRICK = PLATE * 3;     // brick height (9.6 mm)
export const STUD_R = 0.3;          // stud radius (2.4 mm)
export const STUD_H = 0.225;        // stud height (1.8 mm)
export const SEAM = 0.008;          // hairline so stacked bricks read as separate parts
export const BEVEL = 0.045;         // edge chamfer radius

export const P = (n) => n * PLATE;  // n plates -> world units
export const B = (n) => n * BRICK;  // n bricks -> world units

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

/** Normalise to non-indexed so every part can be merged with every other part. */
export function flatten(geom) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  if (!g.attributes.uv) {
    const n = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  // Strip anything exotic so merges never fail on attribute mismatch.
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** Rounded (chamfered) box, centred at origin. */
export function boxGeo(w, h, d, bevel = BEVEL) {
  const key = `box:${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)},${bevel}`;
  return cached(key, () => {
    if (bevel <= 0) return flatten(new THREE.BoxGeometry(w, h, d));
    const r = Math.min(bevel, Math.min(w, h, d) * 0.28);
    return flatten(new RoundedBoxGeometry(w, h, d, 1, r));
  });
}

/** The stud on top of a brick. */
export function studGeo(r = STUD_R, h = STUD_H, seg = 10) {
  return cached(`stud:${r},${h},${seg}`, () => {
    const g = flatten(new THREE.CylinderGeometry(r, r, h, seg, 1, false));
    g.translate(0, h / 2, 0);
    return g;
  });
}

/** Hollow-ish anti-stud dimple used on exposed underside plates. */
export function tubeGeo(r = 0.32, h = P(1), seg = 8) {
  return cached(`tube:${r},${h},${seg}`, () => {
    const g = flatten(new THREE.CylinderGeometry(r, r, h, seg, 1, true));
    g.translate(0, h / 2, 0);
    return g;
  });
}

export function cylGeo(rt, rb, h, seg = 14, open = false) {
  return cached(`cyl:${rt},${rb},${h},${seg},${open}`, () =>
    flatten(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)));
}

export function coneGeo(r, h, seg = 14) {
  return cached(`cone:${r},${h},${seg}`, () => flatten(new THREE.ConeGeometry(r, h, seg)));
}

export function sphereGeo(r, seg = 16, rings = 12) {
  return cached(`sph:${r},${seg},${rings}`, () => flatten(new THREE.SphereGeometry(r, seg, rings)));
}

/** Half sphere -- R2 style droid domes, radar dishes. */
export function domeGeo(r, seg = 16, rings = 8) {
  return cached(`dome:${r},${seg},${rings}`, () =>
    flatten(new THREE.SphereGeometry(r, seg, rings, 0, Math.PI * 2, 0, Math.PI / 2)));
}

export function torusGeo(r, tube, seg = 16, tseg = 8) {
  return cached(`tor:${r},${tube},${seg},${tseg}`, () =>
    flatten(new THREE.TorusGeometry(r, tube, tseg, seg)));
}

/**
 * Extrude a 2D profile along Z. The workhorse for slopes, wedges, windscreens,
 * hull plates and every odd shape a starship needs.
 * @param {Array<[number,number]>} pts profile in XY, CCW
 * @param {number} depth extrusion depth (centred on Z)
 */
export function prismGeo(pts, depth, bevel = BEVEL * 0.7) {
  const key = `pri:${pts.map((p) => p.map((v) => v.toFixed(3)).join(',')).join(';')}|${depth}|${bevel}`;
  return cached(key, () => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    const useBevel = bevel > 0 && depth > bevel * 3;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: useBevel ? depth - bevel * 2 : depth,
      bevelEnabled: useBevel,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 1,
      curveSegments: 1,
      steps: 1,
    });
    g.translate(0, 0, -depth / 2 + (useBevel ? bevel : 0));
    return flatten(g);
  });
}

/** Classic slope brick: tall at +X, sloping down toward -X. */
export function slopeGeo(w, h, d, bevel = BEVEL * 0.7) {
  return prismGeo([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, 0.0001]], d, bevel);
}

/** Inverted slope: material hangs from the top. */
export function slopeInvGeo(w, h, d, bevel = BEVEL * 0.7) {
  return prismGeo([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h], [-w / 2, h]], d, bevel);
}

/** Wedge plate -- triangular plate for wings. Right angle at (-w/2,-d/2). */
export function wedgeGeo(w, d, h, mirror = false) {
  const key = `wed:${w},${d},${h},${mirror}`;
  return cached(key, () => {
    const s = mirror ? -1 : 1;
    const g = prismGeo(
      [[-w / 2, -d / 2 * s], [w / 2, -d / 2 * s], [-w / 2, d / 2 * s]],
      h, BEVEL * 0.6,
    ).clone();
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

/** Curved slope / windscreen profile (quarter-round front). */
export function curveSlopeGeo(w, h, d, segments = 5) {
  const pts = [[-w / 2, 0], [w / 2, 0]];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2);
    pts.push([w / 2 - (1 - Math.cos(a)) * w, Math.sin(a) * h]);
  }
  return prismGeo(pts, d, BEVEL * 0.6);
}

/** Long thin bar: antennae, blaster barrels, lightsaber hilts. */
export function barGeo(r, len, seg = 8) {
  return cached(`bar:${r},${len},${seg}`, () => {
    const g = flatten(new THREE.CylinderGeometry(r, r, len, seg));
    return g;
  });
}

export function ringGeo(rIn, rOut, seg = 24) {
  return cached(`ring:${rIn},${rOut},${seg}`, () => flatten(new THREE.RingGeometry(rIn, rOut, seg)));
}

export function planeGeo(w, h) {
  return cached(`pl:${w},${h}`, () => flatten(new THREE.PlaneGeometry(w, h)));
}

export function disposeParts() {
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
}
