/**
 * GeometryKit.ts — low-level procedural geometry helpers for the level builder.
 *
 * The single most important job here is producing boxes with:
 *   1. Chamfered (bevelled) edges, so every edge catches a specular highlight
 *      instead of reading as a razor-sharp CG plane.
 *   2. WORLD-SCALED UVs. `THREE.BoxGeometry` maps each face to 0..1 regardless
 *      of the face's real size, which stretches a tiled PBR texture badly. Here
 *      each face's UV range is proportional to its real dimensions divided by
 *      the material's `worldSize` (metres per tile), so texel density is uniform
 *      no matter how big the wall is.
 *
 * Everything returns a plain `THREE.BufferGeometry` with position/normal/uv
 * (no tangents — MeshStandardMaterial derives them from screen-space
 * derivatives, which is fine), so results can be freely merged with
 * `BufferGeometryUtils.mergeGeometries` to cut draw calls.
 */

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SurfaceType, SurfaceUserData } from '../core/Contracts';

export type Vec3 = [number, number, number];

export interface BoxOpts {
  /** Edge bevel size in metres. */
  chamfer?: number;
  /** Metres per texture tile (from `materials.worldSizeOf(kind)`). */
  uvScale?: number;
  /** Random UV phase so identical walls don't tile in lockstep. */
  uvOffset?: [number, number];
}

const V = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Internal triangle-soup builder
// ---------------------------------------------------------------------------

class GeoBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];

  private planarUV(p: Vec3, n: Vec3, s: number, off: [number, number]): [number, number] {
    const ax = Math.abs(n[0]);
    const ay = Math.abs(n[1]);
    const az = Math.abs(n[2]);
    let u: number;
    let v: number;
    if (ax >= ay && ax >= az) {
      u = p[2];
      v = p[1];
    } else if (ay >= ax && ay >= az) {
      u = p[0];
      v = p[2];
    } else {
      u = p[0];
      v = p[1];
    }
    return [u / s + off[0], v / s + off[1]];
  }

  tri(p0: Vec3, p1: Vec3, p2: Vec3, desired: Vec3, s: number, off: [number, number]) {
    // Auto-correct winding so the face points along `desired`.
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    if (nx * desired[0] + ny * desired[1] + nz * desired[2] < 0) {
      const t = p1;
      p1 = p2;
      p2 = t;
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
    const n: Vec3 = [nx * inv, ny * inv, nz * inv];
    for (const p of [p0, p1, p2]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(n[0], n[1], n[2]);
      const t = this.planarUV(p, n, s, off);
      this.uv.push(t[0], t[1]);
    }
  }

  quad(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, desired: Vec3, s: number, off: [number, number]) {
    this.tri(p0, p1, p2, desired, s, off);
    this.tri(p0, p2, p3, desired, s, off);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

// ---------------------------------------------------------------------------
// Chamfered box — the workhorse
// ---------------------------------------------------------------------------

export function chamferedBox(w: number, h: number, d: number, opts: BoxOpts = {}): THREE.BufferGeometry {
  const s = opts.uvScale ?? 2;
  const off = opts.uvOffset ?? [0, 0];
  const c = Math.max(0.001, Math.min(opts.chamfer ?? 0.02, Math.min(w, h, d) * 0.49));
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const b = new GeoBuilder();

  const Px = (sx: number, sy: number, sz: number): Vec3 => [sx * hx, sy * (hy - c), sz * (hz - c)];
  const Py = (sx: number, sy: number, sz: number): Vec3 => [sx * (hx - c), sy * hy, sz * (hz - c)];
  const Pz = (sx: number, sy: number, sz: number): Vec3 => [sx * (hx - c), sy * (hy - c), sz * hz];

  // 6 main faces
  b.quad(Px(1, 1, 1), Px(1, 1, -1), Px(1, -1, -1), Px(1, -1, 1), [1, 0, 0], s, off);
  b.quad(Px(-1, 1, 1), Px(-1, -1, 1), Px(-1, -1, -1), Px(-1, 1, -1), [-1, 0, 0], s, off);
  b.quad(Py(-1, 1, -1), Py(1, 1, -1), Py(1, 1, 1), Py(-1, 1, 1), [0, 1, 0], s, off);
  b.quad(Py(-1, -1, -1), Py(-1, -1, 1), Py(1, -1, 1), Py(1, -1, -1), [0, -1, 0], s, off);
  b.quad(Pz(-1, -1, 1), Pz(1, -1, 1), Pz(1, 1, 1), Pz(-1, 1, 1), [0, 0, 1], s, off);
  b.quad(Pz(-1, -1, -1), Pz(-1, 1, -1), Pz(1, 1, -1), Pz(1, -1, -1), [0, 0, -1], s, off);

  // 12 edge bevels
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const n: Vec3 = norm(sx, sy, 0);
      b.quad(Px(sx, sy, -1), Px(sx, sy, 1), Py(sx, sy, 1), Py(sx, sy, -1), n, s, off);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const n: Vec3 = norm(sx, 0, sz);
      b.quad(Px(sx, -1, sz), Px(sx, 1, sz), Pz(sx, 1, sz), Pz(sx, -1, sz), n, s, off);
    }
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const n: Vec3 = norm(0, sy, sz);
      b.quad(Py(-1, sy, sz), Py(1, sy, sz), Pz(1, sy, sz), Pz(-1, sy, sz), n, s, off);
    }
  }

  // 8 corner triangles
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const n: Vec3 = norm(sx, sy, sz);
        b.tri(Px(sx, sy, sz), Py(sx, sy, sz), Pz(sx, sy, sz), n, s, off);
      }
    }
  }

  return b.build();
}

/** Cheap 6-face box with world-scaled UVs (for large flat surfaces / ground). */
export function worldBox(w: number, h: number, d: number, opts: BoxOpts = {}): THREE.BufferGeometry {
  const s = opts.uvScale ?? 2;
  const off = opts.uvOffset ?? [0, 0];
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const b = new GeoBuilder();
  b.quad([hx, hy, hz], [hx, hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [1, 0, 0], s, off);
  b.quad([-hx, hy, hz], [-hx, -hy, hz], [-hx, -hy, -hz], [-hx, hy, -hz], [-1, 0, 0], s, off);
  b.quad([-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz], [0, 1, 0], s, off);
  b.quad([-hx, -hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz], [0, -1, 0], s, off);
  b.quad([-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1], s, off);
  b.quad([-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz], [0, 0, -1], s, off);
  return b.build();
}

/** Horizontal (XZ) plane facing +Y, centred at origin, world-scaled UVs. */
export function worldPlane(w: number, d: number, uvScale = 2, off: [number, number] = [0, 0]): THREE.BufferGeometry {
  const hx = w / 2;
  const hz = d / 2;
  const b = new GeoBuilder();
  b.quad([-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz], [0, 1, 0], uvScale, off);
  return b.build();
}

/** Cylinder with UVs scaled to metres (pipes, palm trunks, barrels, poles). */
export function worldCylinder(
  rTop: number,
  rBot: number,
  height: number,
  radial: number,
  uvScale = 2,
  cap = true
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, height, radial, 1, !cap);
  const uv = g.getAttribute('uv');
  const circ = (Math.PI * (rTop + rBot)) / uvScale;
  const vspan = height / uvScale;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * vspan);
  }
  uv.needsUpdate = true;
  return g;
}

// ---------------------------------------------------------------------------
// Transform + merge utilities
// ---------------------------------------------------------------------------

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();

/** Return a transformed COPY (position baked in) ready for merging. */
export function placed(
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rx = 0,
  rz = 0,
  scale = 1
): THREE.BufferGeometry {
  const g = geo.clone();
  E.set(rx, ry, rz, 'YXZ');
  Q.setFromEuler(E);
  M.compose(V.set(x, y, z), Q, new THREE.Vector3(scale, scale, scale));
  g.applyMatrix4(M);
  return g;
}

/** Merge a batch of geometries, welding coincident verts to shrink them. */
export function mergeAll(geos: THREE.BufferGeometry[], weld = false): THREE.BufferGeometry {
  const filtered = geos.filter((g) => g.getAttribute('position') && g.getAttribute('position').count > 0);
  if (filtered.length === 0) return new THREE.BufferGeometry();
  // mergeGeometries requires every input to agree on having an index (or not).
  // Normalise everything to non-indexed and keep only position/normal/uv so
  // primitives from three (indexed) merge cleanly with our custom soup.
  const temps: THREE.BufferGeometry[] = [];
  const norm = filtered.map((g) => {
    let out = g.getIndex() ? g.toNonIndexed() : g;
    if (out !== g) temps.push(out);
    // Strip any attributes beyond the three we standardise on.
    const keep = new Set(['position', 'normal', 'uv']);
    let stripped = false;
    for (const name of Object.keys(out.attributes)) {
      if (!keep.has(name)) {
        if (out === g) {
          out = out.clone();
          temps.push(out);
          stripped = true;
        }
        out.deleteAttribute(name);
      }
    }
    void stripped;
    return out;
  });
  let merged = mergeGeometries(norm, false);
  for (const t of temps) t.dispose();
  if (!merged) merged = filtered[0].clone();
  if (weld) {
    try {
      merged = mergeVertices(merged, 1e-4);
    } catch {
      /* mergeVertices throws on mismatched attributes — ignore */
    }
  }
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

// ---------------------------------------------------------------------------
// Mesh helpers
// ---------------------------------------------------------------------------

export function tagSurface(
  obj: THREE.Object3D,
  surface: SurfaceType,
  collider = false,
  extra?: Partial<SurfaceUserData>
): void {
  const ud = obj.userData as SurfaceUserData;
  ud.surface = surface;
  if (collider) ud.collider = true;
  if (extra) Object.assign(ud, extra);
}

/** Freeze a static object so three skips its per-frame matrix recompute. */
export function freeze(obj: THREE.Object3D): void {
  obj.updateMatrix();
  obj.matrixAutoUpdate = false;
  obj.matrixWorldNeedsUpdate = true;
}

function norm(x: number, y: number, z: number): Vec3 {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
