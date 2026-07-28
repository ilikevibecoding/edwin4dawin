/**
 * Vertex ambient occlusion for code-authored models.
 *
 * A gun assembled from two hundred separate solids has no idea that the
 * magazine is inside the magwell or that the charging handle sits in a slot,
 * and without that the parts read as parts rather than as one machined object.
 * Baking a cheap occlusion term into the vertex colour is what glues them
 * together: it darkens the seam under the handguard, the inside of the trigger
 * guard, the recess behind the ejection port.
 *
 * The method is deliberately crude and fast — voxelise every triangle into an
 * occupancy grid, then cone-trace a handful of fixed directions per vertex —
 * because it runs at load time on the main thread and a weapon has to be ready
 * before the first frame.
 */

export interface AOSurface {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: ArrayLike<number>;
  /** Added to `positions` to reach the shared model space. */
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

/** 16 directions on a sphere, evenly spread by the golden-angle spiral. */
const DIRS = (() => {
  const n = 16;
  const out = new Float32Array(n * 3);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * i + 1) / n;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const a = i * ga;
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = Math.sin(a) * r;
    out[i * 3 + 2] = z;
  }
  return out;
})();

export function bakeVertexAO(
  surfaces: AOSurface[],
  resolution = 72,
  strength = 0.62,
  steps = 5,
): void {
  if (surfaces.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const s of surfaces) {
    const p = s.positions;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i] + s.offsetX;
      const y = p[i + 1] + s.offsetY;
      const z = p[i + 2] + s.offsetZ;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const longest = Math.max(sizeX, sizeY, sizeZ);
  if (!(longest > 0)) return;

  const cell = longest / resolution;
  const pad = 2;
  const nx = Math.max(1, Math.ceil(sizeX / cell) + pad * 2);
  const ny = Math.max(1, Math.ceil(sizeY / cell) + pad * 2);
  const nz = Math.max(1, Math.ceil(sizeZ / cell) + pad * 2);
  const originX = minX - pad * cell;
  const originY = minY - pad * cell;
  const originZ = minZ - pad * cell;
  const grid = new Uint8Array(nx * ny * nz);

  const mark = (x: number, y: number, z: number): void => {
    const i = Math.floor((x - originX) / cell);
    const j = Math.floor((y - originY) / cell);
    const k = Math.floor((z - originZ) / cell);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return;
    grid[(k * ny + j) * nx + i] = 1;
  };

  const occupied = (x: number, y: number, z: number): boolean => {
    const i = Math.floor((x - originX) / cell);
    const j = Math.floor((y - originY) / cell);
    const k = Math.floor((z - originZ) / cell);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return false;
    return grid[(k * ny + j) * nx + i] === 1;
  };

  // Voxelise: sample each triangle on a barycentric lattice fine enough that no
  // cell along the surface is missed.
  const half = cell * 0.5;
  for (const s of surfaces) {
    const p = s.positions;
    const ix = s.indices;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t] * 3;
      const b = ix[t + 1] * 3;
      const c = ix[t + 2] * 3;
      const ax = p[a] + s.offsetX;
      const ay = p[a + 1] + s.offsetY;
      const az = p[a + 2] + s.offsetZ;
      const bx = p[b] + s.offsetX;
      const by = p[b + 1] + s.offsetY;
      const bz = p[b + 2] + s.offsetZ;
      const cx = p[c] + s.offsetX;
      const cy = p[c + 1] + s.offsetY;
      const cz = p[c + 2] + s.offsetZ;
      const e0 = Math.max(Math.abs(bx - ax), Math.abs(by - ay), Math.abs(bz - az));
      const e1 = Math.max(Math.abs(cx - ax), Math.abs(cy - ay), Math.abs(cz - az));
      const n = Math.min(12, Math.max(1, Math.ceil(Math.max(e0, e1) / half)));
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const u = i / n;
          const v = j / n;
          const w = 1 - u - v;
          mark(ax * w + bx * u + cx * v, ay * w + by * u + cy * v, az * w + bz * u + cz * v);
        }
      }
    }
  }

  // Cone trace. Rays start a little off the surface so a vertex never occludes
  // itself, and each step contributes less than the last so contact darkening
  // stays tight instead of washing the whole part down.
  const dirCount = DIRS.length / 3;
  for (const s of surfaces) {
    const p = s.positions;
    const nrm = s.normals;
    const col = s.colors;
    for (let i = 0; i < p.length; i += 3) {
      const px = p[i] + s.offsetX;
      const py = p[i + 1] + s.offsetY;
      const pz = p[i + 2] + s.offsetZ;
      const vnx = nrm[i];
      const vny = nrm[i + 1];
      const vnz = nrm[i + 2];
      const ox = px + vnx * cell * 0.9;
      const oy = py + vny * cell * 0.9;
      const oz = pz + vnz * cell * 0.9;
      let occ = 0;
      let total = 0;
      for (let d = 0; d < dirCount; d++) {
        const dx = DIRS[d * 3];
        const dy = DIRS[d * 3 + 1];
        const dz = DIRS[d * 3 + 2];
        const ndot = dx * vnx + dy * vny + dz * vnz;
        if (ndot <= 0.05) continue;
        total += ndot;
        for (let st = 0; st < steps; st++) {
          const dist = cell * (1.0 + st * 1.7 + st * st * 0.55);
          if (occupied(ox + dx * dist, oy + dy * dist, oz + dz * dist)) {
            occ += ndot * (1 - st / steps);
            break;
          }
        }
      }
      const ao = total > 0 ? 1 - strength * (occ / total) : 1;
      col[i] *= ao;
      col[i + 1] *= ao;
      col[i + 2] *= ao;
    }
  }
}
