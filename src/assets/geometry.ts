import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../core/Random';

/**
 * Geometry construction helpers shared by every asset factory.
 *
 * The rule followed throughout the project: an asset builds a handful of merged
 * geometries (one per material) instead of hundreds of individual meshes. That
 * keeps draw calls low enough for software rasterisers and integrated GPUs.
 */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

export interface Placement {
  pos?: [number, number, number] | THREE.Vector3;
  rot?: [number, number, number] | THREE.Euler;
  scale?: [number, number, number] | number | THREE.Vector3;
}

export function placementMatrix(p: Placement, out = new THREE.Matrix4()): THREE.Matrix4 {
  const pos = Array.isArray(p.pos) ? _v.set(p.pos[0], p.pos[1], p.pos[2]) : (p.pos ?? _v.set(0, 0, 0));
  const rot = Array.isArray(p.rot) ? _e.set(p.rot[0], p.rot[1], p.rot[2]) : (p.rot ?? _e.set(0, 0, 0));
  const s = p.scale;
  const scale =
    typeof s === 'number'
      ? new THREE.Vector3(s, s, s)
      : Array.isArray(s)
        ? new THREE.Vector3(s[0], s[1], s[2])
        : (s ?? new THREE.Vector3(1, 1, 1));
  _q.setFromEuler(rot as THREE.Euler);
  return out.compose(pos as THREE.Vector3, _q, scale);
}

/** Clone `geo`, apply a placement, and return the copy. */
export function placed(geo: THREE.BufferGeometry, p: Placement): THREE.BufferGeometry {
  const g = geo.clone();
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

export function box(
  w: number,
  h: number,
  d: number,
  p: Placement = {},
  segments: [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, segments[0], segments[1], segments[2]);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  radial = 16,
  p: Placement = {},
  open = false,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, radial, 1, open);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

export function sphere(r: number, wSeg = 16, hSeg = 12, p: Placement = {}): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, wSeg, hSeg);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

export function capsuleGeo(r: number, len: number, p: Placement = {}, cap = 6, radial = 10): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, len, cap, radial);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

export function cone(r: number, h: number, radial = 12, p: Placement = {}): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, radial);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

export function torus(r: number, tube: number, p: Placement = {}, radial = 8, tubular = 24): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, radial, tubular);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

/** Merge a list of geometries, tolerating empty input. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const usable = parts.filter((p) => p && p.getAttribute('position'));
  if (usable.length === 0) return new THREE.BufferGeometry();
  if (usable.length === 1) return usable[0];
  // mergeGeometries requires a consistent attribute set; strip extras.
  const keep = ['position', 'normal', 'uv'];
  for (const g of usable) {
    for (const name of Object.keys(g.attributes)) {
      if (!keep.includes(name)) g.deleteAttribute(name);
    }
    if (!g.getAttribute('uv')) {
      const count = g.getAttribute('position').count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals();
  }
  const merged = mergeGeometries(usable, false);
  for (const g of usable) g.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Convenience: merge parts and wrap in a mesh. */
export function meshOf(
  parts: THREE.BufferGeometry[],
  material: THREE.Material,
  name = '',
): THREE.Mesh {
  const mesh = new THREE.Mesh(merge(parts), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Lofting
// ---------------------------------------------------------------------------

export interface LoftSection {
  /** Cross-section outline in the XY plane, counter-clockwise. */
  points: Array<[number, number]>;
  z: number;
}

/**
 * Skin a series of cross-sections along +Z.
 *
 * All sections must contain the same number of points. Optionally caps the
 * first and last rings with a triangle fan around their centroid.
 */
export function loft(sections: LoftSection[], capStart = true, capEnd = true): THREE.BufferGeometry {
  const rings = sections.length;
  const n = sections[0].points.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < rings; s++) {
    const sec = sections[s];
    for (let i = 0; i < n; i++) {
      positions.push(sec.points[i][0], sec.points[i][1], sec.z);
      uvs.push(i / n, s / Math.max(1, rings - 1));
    }
  }
  for (let s = 0; s < rings - 1; s++) {
    for (let i = 0; i < n; i++) {
      const a = s * n + i;
      const b = s * n + ((i + 1) % n);
      const c = (s + 1) * n + ((i + 1) % n);
      const d = (s + 1) * n + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  const capRing = (ringIndex: number, flip: boolean): void => {
    const sec = sections[ringIndex];
    let cx = 0;
    let cy = 0;
    for (const p of sec.points) {
      cx += p[0];
      cy += p[1];
    }
    cx /= n;
    cy /= n;
    const centerIdx = positions.length / 3;
    positions.push(cx, cy, sec.z);
    uvs.push(0.5, 0.5);
    const base = ringIndex * n;
    for (let i = 0; i < n; i++) {
      const a = base + i;
      const b = base + ((i + 1) % n);
      if (flip) indices.push(centerIdx, b, a);
      else indices.push(centerIdx, a, b);
    }
  };

  if (capStart) capRing(0, true);
  if (capEnd) capRing(rings - 1, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  ensureOutwardWinding(geo);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Flip triangle winding if the closed mesh ends up inside-out.
 * Uses the signed volume of the tetrahedra spanned by each face and the origin.
 */
export function ensureOutwardWinding(geo: THREE.BufferGeometry): void {
  const index = geo.getIndex();
  const pos = geo.getAttribute('position');
  if (!index) return;
  let vol = 0;
  const arr = index.array;
  for (let i = 0; i < arr.length; i += 3) {
    const a = arr[i] * 3;
    const b = arr[i + 1] * 3;
    const c = arr[i + 2] * 3;
    const p = pos.array as ArrayLike<number>;
    vol +=
      (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
        p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
        p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) /
      6;
  }
  if (vol >= 0) return;
  for (let i = 0; i < arr.length; i += 3) {
    const t = arr[i + 1];
    (arr as Uint32Array)[i + 1] = arr[i + 2];
    (arr as Uint32Array)[i + 2] = t;
  }
  index.needsUpdate = true;
}

/** Resample a 2D outline to exactly `n` points by even arc-length spacing. */
export function resampleOutline(points: Array<[number, number]>, n: number): Array<[number, number]> {
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLens.push(l);
    total += l;
  }
  const out: Array<[number, number]> = [];
  let acc = 0;
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (seg < segLens.length - 1 && acc + segLens[seg] < target) {
      acc += segLens[seg];
      seg++;
    }
    const t = segLens[seg] > 1e-9 ? (target - acc) / segLens[seg] : 0;
    const a = points[seg];
    const b = points[(seg + 1) % points.length];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Greebling
// ---------------------------------------------------------------------------

export interface GreebleOptions {
  /** Local-space rectangle in the XZ plane the greebles are scattered across. */
  width: number;
  depth: number;
  /** Constant surface height, or a function of local (x, z) for curved hulls. */
  y: number | ((x: number, z: number) => number | null);
  count: number;
  minSize: number;
  maxSize: number;
  minHeight: number;
  maxHeight: number;
  rng: Rng;
  /** Acceptance mask in local (x, z) space; 0 rejects, 1 always accepts. */
  mask?: (x: number, z: number) => number;
  /** Bias box footprints to be long in Z (hull runs) instead of square. */
  elongate?: number;
  /** Offset applied to every generated box. */
  origin?: [number, number, number];
  /** Grow boxes downward from the surface instead of upward. */
  downward?: boolean;
  /**
   * Footprint test run after a size is drawn. Unlike `mask`, which only sees a
   * point, this receives the box half-extents, so a caller can guarantee the
   * whole plate lands inside a tapering hull instead of overhanging the
   * silhouette as a row of loose flakes.
   */
  fits?: (x: number, z: number, halfX: number, halfZ: number) => boolean;
  /** Sink plates into the surface by this fraction of their height. */
  bite?: number;
}

/**
 * Scatter small boxes across a rectangular patch to break up large flat hulls.
 * Returns a single merged geometry.
 */
export function greebleField(o: GreebleOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const [ox, oy, oz] = o.origin ?? [0, 0, 0];
  const dir = o.downward ? -1 : 1;
  let attempts = 0;
  let placedCount = 0;
  while (placedCount < o.count && attempts < o.count * 8) {
    attempts++;
    const x = (o.rng.next() - 0.5) * o.width;
    const z = (o.rng.next() - 0.5) * o.depth;
    if (o.mask && o.rng.next() > o.mask(x, z)) continue;
    const surface = typeof o.y === 'function' ? o.y(x, z) : o.y;
    if (surface === null || surface === undefined || !Number.isFinite(surface)) continue;
    const sx = o.rng.range(o.minSize, o.maxSize);
    const sz = sx * (o.elongate ? o.rng.range(1, o.elongate) : o.rng.range(0.6, 1.6));
    const sy = o.rng.range(o.minHeight, o.maxHeight);
    const turned = o.rng.bool(0.15);
    const halfX = (turned ? sz : sx) * 0.5;
    const halfZ = (turned ? sx : sz) * 0.5;
    if (o.fits && !o.fits(x, z, halfX, halfZ)) continue;
    // Seat plates slightly into the hull so their lower edge never floats.
    const bite = o.bite ?? 0.25;
    parts.push(
      box(sx, sy, sz, {
        pos: [ox + x, oy + surface + dir * sy * (0.5 - bite), oz + z],
        rot: [0, turned ? Math.PI / 2 : 0, 0],
      }),
    );
    placedCount++;
  }
  return merge(parts);
}

/** Long recessed channels running along Z — Imperial hull trenches. */
export function trenchLines(
  count: number,
  length: number,
  spread: number,
  y: number,
  rng: Rng,
  width = 1.6,
  depth = 1.2,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng.spread(spread * 0.5);
    const zc = rng.spread(length * 0.22);
    const len = length * rng.range(0.25, 0.7);
    parts.push(box(width * rng.range(0.6, 1.6), depth, len, { pos: [x, y, zc] }));
  }
  return merge(parts);
}

/** Thin antenna masts and dish clusters. */
export function antennaCluster(rng: Rng, count: number, radius: number, height: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.spread(0.4);
    const r = radius * rng.range(0.3, 1);
    const h = height * rng.range(0.4, 1);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    parts.push(cyl(0.06 * height, 0.09 * height, h, 5, { pos: [x, h / 2, z] }));
    if (rng.bool(0.4)) {
      parts.push(sphere(0.14 * height, 6, 4, { pos: [x, h, z] }));
    } else {
      parts.push(box(0.3 * height, 0.05 * height, 0.3 * height, { pos: [x, h, z], rot: [rng.spread(0.5), a, 0] }));
    }
  }
  return merge(parts);
}

/** A rounded slab: cheap stand-in for chamfered plating. */
export function slab(w: number, h: number, d: number, bevel: number, p: Placement = {}): THREE.BufferGeometry {
  const parts = [
    box(w, h - bevel * 2, d, { pos: [0, 0, 0] }),
    box(w - bevel * 2, h, d - bevel * 2, { pos: [0, 0, 0] }),
    box(w - bevel * 2, h - bevel * 2, d, { pos: [0, 0, 0] }),
  ];
  const g = merge(parts);
  g.applyMatrix4(placementMatrix(p, _m));
  return g;
}

/** Multiply a geometry's UVs — used to tile hull textures over huge surfaces. */
export function scaleUV(geo: THREE.BufferGeometry, su: number, sv: number): THREE.BufferGeometry {
  const uv = geo.getAttribute('uv');
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Build a smooth Catmull-Rom curve from tuples. */
export function curveFrom(points: Array<[number, number, number]>, tension = 0.5): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'catmullrom',
    tension,
  );
}
