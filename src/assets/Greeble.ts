import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Rng } from '../core/Rng';

/**
 * Surface detail helpers.
 *
 * Hull "greeble" is scattered with an instanced box mesh so that a thousand
 * plates cost one draw call. Static clusters that never move are merged.
 */

const unitBox = new THREE.BoxGeometry(1, 1, 1);

export interface GreebleSpec {
  /** Local-space position on the surface. */
  position: THREE.Vector3;
  /** Surface normal the plate should sit on. */
  normal: THREE.Vector3;
  size: THREE.Vector3;
  /** Rotation about the surface normal. */
  spin: number;
}

const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _spinQ = new THREE.Quaternion();
const _one = new THREE.Vector3(1, 1, 1);

/** Build an InstancedMesh of boxes laid flat against a surface. */
export function greebleInstances(
  specs: GreebleSpec[],
  material: THREE.Material,
  name = 'greeble',
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(unitBox, material, Math.max(1, specs.length));
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  specs.forEach((s, i) => {
    _q.setFromUnitVectors(_up, s.normal);
    _spinQ.setFromAxisAngle(s.normal, s.spin);
    _q.premultiply(_spinQ);
    _m.compose(s.position, _q, s.size);
    mesh.setMatrixAt(i, _m);
  });
  if (specs.length === 0) {
    _m.compose(new THREE.Vector3(0, -1e6, 0), _q.identity(), _one);
    mesh.setMatrixAt(0, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Scatter plates over a rectangular patch of a plane, avoiding a keep-out
 * radius list (used to keep hangars, trenches and towers clear).
 */
export function scatterOnPlane(
  rng: Rng,
  opts: {
    count: number;
    /** Returns the surface point for planar coords (u,v) in [-1,1]. */
    map: (u: number, v: number) => THREE.Vector3 | null;
    normal: THREE.Vector3;
    sizeRange: [number, number];
    heightRange: [number, number];
    elongation?: number;
  },
): GreebleSpec[] {
  const out: GreebleSpec[] = [];
  for (let i = 0; i < opts.count; i++) {
    const u = rng.range(-1, 1);
    const v = rng.range(-1, 1);
    const p = opts.map(u, v);
    if (!p) continue;
    const s = rng.range(opts.sizeRange[0], opts.sizeRange[1]);
    const elong = opts.elongation ?? 1;
    out.push({
      position: p,
      normal: opts.normal.clone(),
      size: new THREE.Vector3(
        s * rng.range(0.5, 1.6),
        rng.range(opts.heightRange[0], opts.heightRange[1]),
        s * rng.range(0.5, 1.6) * elong,
      ),
      spin: rng.bool(0.7) ? 0 : rng.range(0, Math.PI),
    });
  }
  return out;
}

/**
 * Structured surface detail.
 *
 * Real capital-ship hulls read as city blocks: rectangles aligned to the keel,
 * in a handful of related sizes, separated by service lanes. Purely random
 * scatter reads as litter, so plates are laid on a jittered grid instead and
 * every one keeps the hull's axes.
 */
export function blockField(
  rng: Rng,
  opts: {
    /** Cells along the ship's length. */
    rows: number;
    /** Cells across the ship's beam. */
    cols: number;
    /** Maps cell centre coords in [-1,1] to a surface point, or null to skip. */
    map: (u: number, v: number) => SurfaceSample | null;
    /** Cell footprint in local units, (across, along); may vary with position. */
    cell: [number, number] | ((u: number, v: number) => [number, number]);
    heightRange: [number, number];
    /** Chance a cell is left bare. */
    sparsity?: number;
  },
): GreebleSpec[] {
  const out: GreebleSpec[] = [];
  const sparsity = opts.sparsity ?? 0.35;
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      if (rng.bool(sparsity)) continue;
      const v = (r + 0.5) / opts.rows * 2 - 1;
      const u = (c + 0.5) / opts.cols * 2 - 1;
      const ju = u + rng.spread(0.3 / opts.cols);
      const jv = v + rng.spread(0.3 / opts.rows);
      const sample = opts.map(ju, jv);
      if (!sample) continue;
      const cell = typeof opts.cell === 'function' ? opts.cell(ju, jv) : opts.cell;
      // Two plate families: wide low pans and narrower long ribs.
      const rib = rng.bool(0.4);
      const w = cell[0] * (rib ? rng.range(0.2, 0.42) : rng.range(0.45, 0.82));
      const d = cell[1] * (rib ? rng.range(0.6, 0.95) : rng.range(0.3, 0.7));
      const h = rng.range(opts.heightRange[0], opts.heightRange[1]);
      out.push({
        position: sample.position.clone().addScaledVector(sample.normal, h * 0.4),
        normal: sample.normal,
        size: new THREE.Vector3(w, h, d),
        spin: 0,
      });
    }
  }
  return out;
}

/** A point on a curved surface together with its outward normal. */
export interface SurfaceSample {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Scatter plates over a curved surface.
 *
 * Unlike `scatterOnPlane` the normal comes back per sample, so plates on a
 * cylinder or a lofted wedge lie flat against the hull instead of hovering
 * over it wherever the surface curves away.
 */
export function scatterOnSurface(
  rng: Rng,
  opts: {
    count: number;
    map: (u: number, v: number) => SurfaceSample | null;
    sizeRange: [number, number];
    heightRange: [number, number];
    elongation?: number;
  },
): GreebleSpec[] {
  const out: GreebleSpec[] = [];
  for (let i = 0; i < opts.count; i++) {
    const sample = opts.map(rng.range(-1, 1), rng.range(-1, 1));
    if (!sample) continue;
    const s = rng.range(opts.sizeRange[0], opts.sizeRange[1]);
    const elong = opts.elongation ?? 1;
    const h = rng.range(opts.heightRange[0], opts.heightRange[1]);
    out.push({
      // Sink the plate half its own thickness so it grows out of the hull.
      position: sample.position.clone().addScaledVector(sample.normal, h * 0.35),
      normal: sample.normal,
      size: new THREE.Vector3(s * rng.range(0.5, 1.5), h, s * rng.range(0.5, 1.5) * elong),
      spin: rng.bool(0.75) ? 0 : rng.range(0, Math.PI),
    });
  }
  return out;
}

/** Merge a list of positioned geometries into one buffer (static detail). */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error('Failed to merge geometry parts');
  return merged;
}

/** Box helper that bakes its transform, ready for merging. */
export function boxAt(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rot?: THREE.Euler,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rot) g.rotateX(rot.x), g.rotateY(rot.y), g.rotateZ(rot.z);
  g.translate(x, y, z);
  return g;
}

/**
 * Grid-lofted surface. `fn` returns a position for parameters (u,v) in [0,1];
 * UVs are the parameters scaled by `uvScale` so panel textures tile evenly.
 *
 * Pass `uvFn` when the surface widens along its length: scaling the raw
 * parameters stretches plating badly on a wedge, whereas mapping UVs to real
 * distance keeps every panel roughly square.
 */
export function parametricSurface(
  nu: number,
  nv: number,
  fn: (u: number, v: number, out: THREE.Vector3) => void,
  uvScale: [number, number] = [1, 1],
  flipWinding = false,
  uvFn?: (u: number, v: number, out: THREE.Vector2) => void,
): THREE.BufferGeometry {
  const positions = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uvs = new Float32Array((nu + 1) * (nv + 1) * 2);
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const uv = new THREE.Vector2();
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const u = i / nu;
      const v = j / nv;
      fn(u, v, p);
      const k = (i * (nv + 1) + j) * 3;
      positions[k] = p.x;
      positions[k + 1] = p.y;
      positions[k + 2] = p.z;
      const t = (i * (nv + 1) + j) * 2;
      if (uvFn) {
        uvFn(u, v, uv);
        uvs[t] = uv.x;
        uvs[t + 1] = uv.y;
      } else {
        uvs[t] = u * uvScale[0];
        uvs[t + 1] = v * uvScale[1];
      }
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j;
      const b = a + 1;
      const c = a + (nv + 1);
      const d = c + 1;
      if (flipWinding) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Rectangular frustum (tapered box) with its base on y = 0. */
export function frustumBox(
  bottomW: number,
  bottomD: number,
  topW: number,
  topD: number,
  height: number,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.70710678, 0.70710678, 1, 4, 1, false);
  g.rotateY(Math.PI / 4);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const top = y > 0;
    pos.setX(i, pos.getX(i) * (top ? topW : bottomW) * 2);
    pos.setZ(i, pos.getZ(i) * (top ? topD : bottomD) * 2);
    pos.setY(i, (y + 0.5) * height);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Emissive strip/window instances. */
export function windowStrip(
  positions: THREE.Vector3[],
  size: THREE.Vector2,
  material: THREE.Material,
  normal: THREE.Vector3,
): THREE.InstancedMesh {
  const plane = new THREE.PlaneGeometry(size.x, size.y);
  const mesh = new THREE.InstancedMesh(plane, material, Math.max(1, positions.length));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  const m = new THREE.Matrix4();
  positions.forEach((p, i) => {
    m.compose(p, q, _one);
    mesh.setMatrixAt(i, m);
  });
  if (positions.length === 0) {
    m.compose(new THREE.Vector3(0, -1e6, 0), q, _one);
    mesh.setMatrixAt(0, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}
