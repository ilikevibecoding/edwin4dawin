/**
 * Naive Surface Nets isosurface extraction.
 *
 * One vertex per boundary cell (rather than per triangle as in marching cubes)
 * gives a smoother, lower-poly mesh with well-shaped quads — ideal for organic
 * bodies built from signed distance fields. Normals come from the analytic SDF
 * gradient, so the surface shades perfectly smoothly.
 */
import * as THREE from 'three';

export type SdfFn = (x: number, y: number, z: number) => number;

export interface SurfaceNetsOptions {
  dims: [number, number, number];
  min: THREE.Vector3;
  max: THREE.Vector3;
  isoLevel?: number;
}

export interface IsoSurface {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
}

const CUBE_CORNERS: [number, number, number][] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

const CUBE_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 4],
  [1, 3],
  [1, 5],
  [2, 3],
  [2, 6],
  [3, 7],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
];

/** Bitmask of crossed edges for each of the 256 corner sign combinations. */
const EDGE_TABLE = (() => {
  const table = new Int32Array(256);
  for (let mask = 0; mask < 256; mask++) {
    let edges = 0;
    for (let e = 0; e < 12; e++) {
      const [a, b] = CUBE_EDGES[e];
      if (((mask >> a) & 1) !== ((mask >> b) & 1)) edges |= 1 << e;
    }
    table[mask] = edges;
  }
  return table;
})();

export function surfaceNets(sdfFn: SdfFn, opts: SurfaceNetsOptions): IsoSurface {
  const [nx, ny, nz] = opts.dims;
  const iso = opts.isoLevel ?? 0;
  const { min, max } = opts;
  const dx = (max.x - min.x) / (nx - 1);
  const dy = (max.y - min.y) / (ny - 1);
  const dz = (max.z - min.z) / (nz - 1);

  const field = new Float32Array(nx * ny * nz);
  const at = (x: number, y: number, z: number) => x + nx * (y + ny * z);
  for (let z = 0; z < nz; z++) {
    const wz = min.z + z * dz;
    for (let y = 0; y < ny; y++) {
      const wy = min.y + y * dy;
      for (let x = 0; x < nx; x++) {
        field[at(x, y, z)] = sdfFn(min.x + x * dx, wy, wz) - iso;
      }
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const cellVertex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cellAt = (x: number, y: number, z: number) => x + (nx - 1) * (y + (ny - 1) * z);
  const h = Math.min(dx, dy, dz) * 0.5;
  const corner = new Float32Array(8);

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const [ox, oy, oz] = CUBE_CORNERS[c];
          const v = field[at(x + ox, y + oy, z + oz)];
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;

        const edges = EDGE_TABLE[mask];
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let count = 0;
        for (let e = 0; e < 12; e++) {
          if (!(edges & (1 << e))) continue;
          const [a, b] = CUBE_EDGES[e];
          const va = corner[a];
          const vb = corner[b];
          const denom = va - vb;
          const t = Math.abs(denom) < 1e-12 ? 0.5 : va / denom;
          const [ax, ay, az] = CUBE_CORNERS[a];
          const [bx, by, bz] = CUBE_CORNERS[b];
          sx += ax + (bx - ax) * t;
          sy += ay + (by - ay) * t;
          sz += az + (bz - az) * t;
          count++;
        }
        if (count === 0) continue;

        const px = min.x + (x + sx / count) * dx;
        const py = min.y + (y + sy / count) * dy;
        const pz = min.z + (z + sz / count) * dz;
        cellVertex[cellAt(x, y, z)] = positions.length / 3;
        positions.push(px, py, pz);
        // Analytic gradient: smooth normals even on a coarse grid
        let gx = sdfFn(px + h, py, pz) - sdfFn(px - h, py, pz);
        let gy = sdfFn(px, py + h, pz) - sdfFn(px, py - h, pz);
        let gz = sdfFn(px, py, pz + h) - sdfFn(px, py, pz - h);
        const gl = Math.hypot(gx, gy, gz) || 1;
        gx /= gl;
        gy /= gl;
        gz /= gl;
        normals.push(gx, gy, gz);
      }
    }
  }

  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };

  // For every crossed axis-aligned edge, join the four surrounding cells
  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const s0 = field[at(x, y, z)] < 0;
        if (y > 0 && z > 0 && s0 !== field[at(x + 1, y, z)] < 0) {
          quad(
            cellVertex[cellAt(x, y - 1, z - 1)],
            cellVertex[cellAt(x, y, z - 1)],
            cellVertex[cellAt(x, y, z)],
            cellVertex[cellAt(x, y - 1, z)],
            s0
          );
        }
        if (x > 0 && z > 0 && s0 !== field[at(x, y + 1, z)] < 0) {
          quad(
            cellVertex[cellAt(x - 1, y, z - 1)],
            cellVertex[cellAt(x, y, z - 1)],
            cellVertex[cellAt(x, y, z)],
            cellVertex[cellAt(x - 1, y, z)],
            !s0
          );
        }
        if (x > 0 && y > 0 && s0 !== field[at(x, y, z + 1)] < 0) {
          quad(
            cellVertex[cellAt(x - 1, y - 1, z)],
            cellVertex[cellAt(x, y - 1, z)],
            cellVertex[cellAt(x, y, z)],
            cellVertex[cellAt(x - 1, y, z)],
            s0
          );
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    vertexCount: positions.length / 3,
  };
}

// ---------------------------------------------------------------------------
// SDF primitives and operators
// ---------------------------------------------------------------------------

export const sdf = {
  capsule(
    px: number, py: number, pz: number,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    r: number
  ): number {
    const pax = px - ax;
    const pay = py - ay;
    const paz = pz - az;
    const bax = bx - ax;
    const bay = by - ay;
    const baz = bz - az;
    const denom = bax * bax + bay * bay + baz * baz;
    let h = denom < 1e-12 ? 0 : (pax * bax + pay * bay + paz * baz) / denom;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
  },

  /** Tapered capsule — limbs read far more naturally than constant radius. */
  roundCone(
    px: number, py: number, pz: number,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    r1: number, r2: number
  ): number {
    const pax = px - ax;
    const pay = py - ay;
    const paz = pz - az;
    const bax = bx - ax;
    const bay = by - ay;
    const baz = bz - az;
    const denom = bax * bax + bay * bay + baz * baz;
    let h = denom < 1e-12 ? 0 : (pax * bax + pay * bay + paz * baz) / denom;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    const d = Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h);
    return d - (r1 + (r2 - r1) * h);
  },

  roundBox(
    px: number, py: number, pz: number,
    cx: number, cy: number, cz: number,
    hx: number, hy: number, hz: number,
    r: number
  ): number {
    const qx = Math.abs(px - cx) - hx;
    const qy = Math.abs(py - cy) - hy;
    const qz = Math.abs(pz - cz) - hz;
    return (
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
      Math.min(Math.max(qx, Math.max(qy, qz)), 0) -
      r
    );
  },

  /** Smooth minimum — creates organic joins between primitives. */
  smin(a: number, b: number, k: number): number {
    if (k <= 0) return Math.min(a, b);
    const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
    return b * (1 - h) + a * h - k * h * (1 - h);
  },

  smax(a: number, b: number, k: number): number {
    if (k <= 0) return Math.max(a, b);
    const h = Math.max(0, Math.min(1, 0.5 - (0.5 * (b - a)) / k));
    return b * (1 - h) + a * h + k * h * (1 - h);
  },
};

export function isoToGeometry(iso: IsoSurface): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(iso.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(iso.normals, 3));
  g.setIndex(new THREE.BufferAttribute(iso.indices, 1));
  return g;
}
