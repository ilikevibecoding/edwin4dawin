import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../core/Rng';

/**
 * Shared geometry construction helpers.
 *
 * The hulls in this production are *lofted*: a 2D cross-section is swept along
 * the ship's axis with a per-station scale. That keeps silhouettes under
 * deliberate control (a handful of named stations) instead of scattering
 * thousands of raw vertex coordinates through the codebase.
 */

export interface LoftStation {
  /** Position along the sweep axis (local +Z). */
  z: number;
  /** Half-width multiplier for this station. */
  sx: number;
  /** Half-height multiplier for this station. */
  sy: number;
  /** Vertical offset of the section centre. */
  oy?: number;
}

/**
 * Sweep a closed 2D profile (points listed counter-clockwise in XY, roughly
 * within [-1,1]) through a list of stations. Produces a watertight hull with
 * end caps and cylindrical UVs.
 */
export function loftGeometry(
  profile: THREE.Vector2[],
  stations: LoftStation[],
  capStart = true,
  capEnd = true,
  /** Tiles of the panel texture around the girth and along the length. */
  uvScale: THREE.Vector2 = new THREE.Vector2(1, 1),
): THREE.BufferGeometry {
  const n = profile.length;
  const m = stations.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let totalLength = 0;
  for (let i = 1; i < m; i++) totalLength += Math.abs(stations[i].z - stations[i - 1].z);
  let run = 0;

  for (let s = 0; s < m; s++) {
    const st = stations[s];
    if (s > 0) run += Math.abs(st.z - stations[s - 1].z);
    const v = totalLength > 0 ? run / totalLength : 0;
    for (let i = 0; i <= n; i++) {
      const p = profile[i % n];
      positions.push(p.x * st.sx, p.y * st.sy + (st.oy ?? 0), st.z);
      uvs.push((i / n) * uvScale.x, v * uvScale.y);
    }
  }

  const ring = n + 1;
  for (let s = 0; s < m - 1; s++) {
    for (let i = 0; i < n; i++) {
      const a = s * ring + i;
      const b = s * ring + i + 1;
      const c = (s + 1) * ring + i + 1;
      const d = (s + 1) * ring + i;
      indices.push(a, b, d, b, c, d);
    }
  }

  const capVerts: number[] = [];
  const capUvs: number[] = [];
  const addCap = (st: LoftStation, flip: boolean) => {
    const centreIndex = positions.length / 3 + capVerts.length / 3;
    capVerts.push(0, st.oy ?? 0, st.z);
    capUvs.push(0.5, 0.5);
    for (let i = 0; i <= n; i++) {
      const p = profile[i % n];
      capVerts.push(p.x * st.sx, p.y * st.sy + (st.oy ?? 0), st.z);
      capUvs.push(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    }
    for (let i = 0; i < n; i++) {
      const a = centreIndex;
      const b = centreIndex + 1 + i;
      const c = centreIndex + 2 + i;
      if (flip) indices.push(a, c, b);
      else indices.push(a, b, c);
    }
  };
  if (capStart) addCap(stations[0], true);
  if (capEnd) addCap(stations[m - 1], false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...positions, ...capVerts], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([...uvs, ...capUvs], 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Sweep an *open* 2D profile along Z, producing a one-sided ribbon. This is how
 * the corridor shell (floor, curved walls, ceiling) is built as a single strip.
 */
export function ribbonGeometry(
  profile: THREE.Vector2[],
  z0: number,
  z1: number,
  segments = 1,
  uvScale = new THREE.Vector2(1, 1),
  flip = false,
): THREE.BufferGeometry {
  const n = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Arc length along the profile gives a uniform, stretch-free UV.
  const arc: number[] = [0];
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + profile[i].distanceTo(profile[i - 1]));
  const total = arc[n - 1] || 1;

  for (let s = 0; s <= segments; s++) {
    const f = s / segments;
    const z = z0 + (z1 - z0) * f;
    for (let i = 0; i < n; i++) {
      positions.push(profile[i].x, profile[i].y, z);
      uvs.push((arc[i] / total) * uvScale.x, f * ((z1 - z0) / total) * uvScale.y * total * 0.05);
    }
  }
  for (let s = 0; s < segments; s++) {
    for (let i = 0; i < n - 1; i++) {
      const a = s * n + i;
      const b = s * n + i + 1;
      const c = (s + 1) * n + i + 1;
      const d = (s + 1) * n + i;
      if (flip) indices.push(a, d, b, b, d, c);
      else indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Rounded-rectangle profile with independent corner radius, in [-1,1]. */
export function roundedRectProfile(radius = 0.3, segmentsPerCorner = 4): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const r = Math.min(0.99, radius);
  const corners: Array<[number, number, number]> = [
    [1 - r, 1 - r, 0],
    [-(1 - r), 1 - r, Math.PI / 2],
    [-(1 - r), -(1 - r), Math.PI],
    [1 - r, -(1 - r), (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= segmentsPerCorner; i++) {
      const a = a0 + (i / segmentsPerCorner) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  return pts;
}

/** Regular n-gon profile, flat side down. */
export function polygonProfile(sides: number, phase = Math.PI / 2): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = phase + (i / sides) * Math.PI * 2;
    pts.push(new THREE.Vector2(Math.cos(a), Math.sin(a)));
  }
  return pts;
}

/**
 * The Imperial wedge cross-section: flat belly, steeply chamfered flanks and a
 * narrow dorsal plate. Everything about the destroyer's read comes from this.
 */
export function wedgeProfile(topWidth = 0.42, bellyDrop = 0.55): THREE.Vector2[] {
  return [
    new THREE.Vector2(topWidth, 1),
    new THREE.Vector2(-topWidth, 1),
    new THREE.Vector2(-1, -bellyDrop),
    new THREE.Vector2(-0.94, -1),
    new THREE.Vector2(0.94, -1),
    new THREE.Vector2(1, -bellyDrop),
  ];
}

/** Box with chamfered edges - reads far better than a raw cube under rim light. */
export function bevelBox(w: number, h: number, d: number, bevel = 0.06): THREE.BufferGeometry {
  const b = Math.min(bevel, Math.min(w, h, d) * 0.4);
  const profile = [
    new THREE.Vector2(1, 1 - (2 * b) / h),
    new THREE.Vector2(1 - (2 * b) / w, 1),
    new THREE.Vector2(-1 + (2 * b) / w, 1),
    new THREE.Vector2(-1, 1 - (2 * b) / h),
    new THREE.Vector2(-1, -1 + (2 * b) / h),
    new THREE.Vector2(-1 + (2 * b) / w, -1),
    new THREE.Vector2(1 - (2 * b) / w, -1),
    new THREE.Vector2(1, -1 + (2 * b) / h),
  ];
  const geo = loftGeometry(profile, [
    { z: -d / 2, sx: (w / 2) * (1 - (2 * b) / w), sy: (h / 2) * (1 - (2 * b) / h) },
    { z: -d / 2 + b, sx: w / 2, sy: h / 2 },
    { z: d / 2 - b, sx: w / 2, sy: h / 2 },
    { z: d / 2, sx: (w / 2) * (1 - (2 * b) / w), sy: (h / 2) * (1 - (2 * b) / h) },
  ]);
  return geo;
}

export interface GreebleOptions {
  count: number;
  /** Scatter area. Only the two axes perpendicular to `face` are sampled. */
  bounds: THREE.Box3;
  /** Which hull face the greebles sit on. */
  face: '+y' | '-y' | '+x' | '-x';
  /** Box dimensions: width and depth across the face, height along the normal. */
  minSize: THREE.Vector3;
  maxSize: THREE.Vector3;
  /** Chance a greeble is a cylinder (pipe/tank) rather than a box. */
  cylinderChance?: number;
  /**
   * Hull surface offset along the normal at a point on the face. Returning null
   * rejects the sample, which is how greebles are kept off the empty space
   * beyond a tapering hull instead of floating next to it.
   */
  surface?: (a: number, b: number) => number | null;
  /** Random yaw about the face normal, in radians. */
  yawJitter?: number;
}

const FACE_AXES: Record<GreebleOptions['face'], { normal: THREE.Vector3; u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z'; n: 'x' | 'y' | 'z'; sign: number }> = {
  '+y': { normal: new THREE.Vector3(0, 1, 0), u: 'x', v: 'z', n: 'y', sign: 1 },
  '-y': { normal: new THREE.Vector3(0, -1, 0), u: 'x', v: 'z', n: 'y', sign: -1 },
  '+x': { normal: new THREE.Vector3(1, 0, 0), u: 'z', v: 'y', n: 'x', sign: 1 },
  '-x': { normal: new THREE.Vector3(-1, 0, 0), u: 'z', v: 'y', n: 'x', sign: -1 },
};

/**
 * Scatter small boxes and cylinders over a hull face and merge them into one
 * geometry. This is the surface-detail pass for both ships; the count scales
 * with the quality preset, and `surface` keeps every piece welded to the hull
 * even where the hull tapers.
 */
export function greebleField(rng: Rng, opts: GreebleOptions): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  const axes = FACE_AXES[opts.face];
  const min = opts.bounds.min;
  const max = opts.bounds.max;
  const cylChance = opts.cylinderChance ?? 0.18;
  const yawJitter = opts.yawJitter ?? 0;

  for (let i = 0; i < opts.count; i++) {
    const a = rng.range(min[axes.u], max[axes.u]);
    const b = rng.range(min[axes.v], max[axes.v]);
    const offset = opts.surface ? opts.surface(a, b) : (axes.sign > 0 ? max[axes.n] : min[axes.n]);
    if (offset === null || !Number.isFinite(offset)) continue;

    const w = rng.range(opts.minSize.x, opts.maxSize.x);
    const h = rng.range(opts.minSize.y, opts.maxSize.y);
    const d = rng.range(opts.minSize.z, opts.maxSize.z);

    let g: THREE.BufferGeometry;
    if (rng.bool(cylChance)) {
      const r = Math.min(w, d) * 0.5;
      g = new THREE.CylinderGeometry(r, r, h, 8, 1);
    } else {
      g = new THREE.BoxGeometry(w, h, d);
      if (yawJitter > 0) g.rotateY(rng.signed(yawJitter));
    }
    // Geometry is authored Y-up; rotate it so Y points along the face normal.
    if (axes.n === 'x') g.rotateZ(axes.sign > 0 ? -Math.PI / 2 : Math.PI / 2);
    else if (axes.sign < 0) g.rotateX(Math.PI);

    // Sink the greeble halfway into the hull so it reads as an attached fitting.
    const pos = new THREE.Vector3();
    pos[axes.u] = a;
    pos[axes.v] = b;
    pos[axes.n] = offset + axes.sign * h * 0.25;
    g.translate(pos.x, pos.y, pos.z);
    parts.push(g);
  }
  if (!parts.length) return null;
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Linear interpolation across a loft's stations, used by greeble placement to
 * ask "how tall/wide is the hull at this station?".
 */
export function stationLookup(stations: LoftStation[], key: 'sx' | 'sy' | 'oy'): (z: number) => number {
  const sorted = [...stations].sort((a, b) => a.z - b.z);
  return (z: number): number => {
    if (z <= sorted[0].z) return sorted[0][key] ?? 0;
    const last = sorted[sorted.length - 1];
    if (z >= last.z) return last[key] ?? 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (z >= sorted[i].z && z <= sorted[i + 1].z) {
        const f = (z - sorted[i].z) / (sorted[i + 1].z - sorted[i].z);
        const a = sorted[i][key] ?? 0;
        const b = sorted[i + 1][key] ?? 0;
        return a + (b - a) * f;
      }
    }
    return last[key] ?? 0;
  };
}

/** Long recessed trench running along an axis - the classic hull "canyon". */
export function trenchGeometry(length: number, width: number, depth: number, segments = 1): THREE.BufferGeometry {
  const half = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half * 0.72, -depth);
  shape.lineTo(half * 0.72, -depth);
  shape.lineTo(half, 0);
  shape.lineTo(half, depth * 0.05);
  shape.lineTo(-half, depth * 0.05);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: segments });
  geo.translate(0, 0, -length / 2);
  return geo;
}

/**
 * Merge a list of geometries into one.
 *
 * three's merge helper requires every input to agree on whether it is indexed
 * and on its attribute set. Primitives disagree in practice (polyhedra and
 * extrusions are non-indexed, boxes and cylinders are indexed), so this
 * normalises first: it strips indices if any input lacks one, and keeps only
 * the attributes common to all inputs.
 */
export function mergeAll(geometries: (THREE.BufferGeometry | null)[]): THREE.BufferGeometry | null {
  const valid = geometries.filter((g): g is THREE.BufferGeometry => !!g);
  if (!valid.length) return null;
  if (valid.length === 1) return valid[0];

  const anyUnindexed = valid.some((g) => g.getIndex() === null);
  const prepared = valid.map((g) => (anyUnindexed && g.getIndex() ? g.toNonIndexed() : g));

  let common: string[] = Object.keys(prepared[0].attributes);
  for (const g of prepared) {
    const keys = new Set(Object.keys(g.attributes));
    common = common.filter((k) => keys.has(k));
  }
  for (const g of prepared) {
    for (const key of Object.keys(g.attributes)) {
      if (!common.includes(key)) g.deleteAttribute(key);
    }
  }

  const merged = BufferGeometryUtils.mergeGeometries(prepared, false);
  if (!merged) {
    console.warn('[geometry] mergeAll produced no geometry', { count: prepared.length, common });
  }
  for (let i = 0; i < prepared.length; i++) {
    prepared[i].dispose();
    if (prepared[i] !== valid[i]) valid[i].dispose();
  }
  return merged;
}

/** Fold a transformed copy of a geometry into a list (used for mirroring). */
export function mirrored(geo: THREE.BufferGeometry, axis: 'x' | 'y' | 'z' = 'x'): THREE.BufferGeometry {
  const clone = geo.clone();
  const s = new THREE.Matrix4().makeScale(axis === 'x' ? -1 : 1, axis === 'y' ? -1 : 1, axis === 'z' ? -1 : 1);
  clone.applyMatrix4(s);
  const index = clone.getIndex();
  if (index) {
    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const t = arr[i];
      arr[i] = arr[i + 2];
      arr[i + 2] = t;
    }
    index.needsUpdate = true;
  }
  clone.computeVertexNormals();
  return clone;
}

export { BufferGeometryUtils };
