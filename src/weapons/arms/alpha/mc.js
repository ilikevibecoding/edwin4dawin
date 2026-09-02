import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';

/**
 * Marching cubes over a signed-distance field → indexed BufferGeometry with shared vertices and
 * analytic normals (SDF gradient). The grid is sized to the field's bounding box at a fixed cell size,
 * so nothing is wasted on empty space. Runs once per hand pose at load; the field is discarded after.
 *
 * Cube corner / edge numbering follows Paul Bourke's tables (as exported by three's MarchingCubes.js).
 */

// Corner offsets (Bourke order) and the 12 edges as [cornerA, cornerB].
const CORNER = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const EDGE = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];
// For each edge: the lower corner offset and axis (0=x,1=y,2=z) → unique global edge key.
const EDGE_LOWER = EDGE.map(([a, b]) => {
  const ca = CORNER[a];
  const cb = CORNER[b];
  const lower = [Math.min(ca[0], cb[0]), Math.min(ca[1], cb[1]), Math.min(ca[2], cb[2])];
  const axis = ca[0] !== cb[0] ? 0 : ca[1] !== cb[1] ? 1 : 2;
  return { lower, axis };
});

/**
 * @param {{dist:(x,y,z)=>number, min:Vector3, max:Vector3}} field
 * @param {number} cell  cell size in metres
 * @param {number} margin  padding around the field bounds
 * @returns {THREE.BufferGeometry} indexed geometry with position + normal
 */
export function polygonize(field, cell, margin = 0.006) {
  const ox = field.min.x - margin;
  const oy = field.min.y - margin;
  const oz = field.min.z - margin;
  const nx = Math.ceil((field.max.x + margin - ox) / cell) + 2;
  const ny = Math.ceil((field.max.y + margin - oy) / cell) + 2;
  const nz = Math.ceil((field.max.z + margin - oz) / cell) + 2;
  const n = nx * ny * nz;
  const values = new Float32Array(n);

  // Sample the field. Positive inside (negated SDF) to match the table convention used by three.js
  // (bit set when the corner is outside, i.e. value < iso = 0).
  let i = 0;
  for (let k = 0; k < nz; k++) {
    const z = oz + k * cell;
    for (let j = 0; j < ny; j++) {
      const y = oy + j * cell;
      for (let ii = 0; ii < nx; ii++) {
        values[i++] = -field.dist(ox + ii * cell, y, z);
      }
    }
  }

  const edgeVert = new Int32Array(n * 3).fill(-1);
  const positions = [];
  const indices = [];
  const idx = (x, y, z) => x + nx * (y + ny * z);
  const local = new Int32Array(12);
  const v = new Float32Array(8);

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let ii = 0; ii < nx - 1; ii++) {
        let cube = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNER[c];
          const val = values[idx(ii + o[0], j + o[1], k + o[2])];
          v[c] = val;
          if (val < 0) cube |= 1 << c;
        }
        const bits = edgeTable[cube];
        if (bits === 0) continue;
        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const { lower, axis } = EDGE_LOWER[e];
          const key = idx(ii + lower[0], j + lower[1], k + lower[2]) * 3 + axis;
          let vi = edgeVert[key];
          if (vi === -1) {
            const [a, b] = EDGE[e];
            const va = v[a];
            const vb = v[b];
            const t = Math.abs(vb - va) > 1e-12 ? (0 - va) / (vb - va) : 0.5;
            const ca = CORNER[a];
            const cb = CORNER[b];
            const px = ox + (ii + ca[0] + (cb[0] - ca[0]) * t) * cell;
            const py = oy + (j + ca[1] + (cb[1] - ca[1]) * t) * cell;
            const pz = oz + (k + ca[2] + (cb[2] - ca[2]) * t) * cell;
            vi = positions.length / 3;
            positions.push(px, py, pz);
            edgeVert[key] = vi;
          }
          local[e] = vi;
        }
        const base = cube << 4;
        for (let t = 0; triTable[base + t] !== -1; t += 3) {
          indices.push(local[triTable[base + t]], local[triTable[base + t + 1]], local[triTable[base + t + 2]]);
        }
      }
    }
  }

  const pos = new Float32Array(positions);
  const vcount = pos.length / 3;
  const nor = new Float32Array(pos.length);
  const eps = cell * 0.35;
  for (let vi = 0; vi < vcount; vi++) {
    const x = pos[vi * 3];
    const y = pos[vi * 3 + 1];
    const z = pos[vi * 3 + 2];
    let gx = field.dist(x + eps, y, z) - field.dist(x - eps, y, z);
    let gy = field.dist(x, y + eps, z) - field.dist(x, y - eps, z);
    let gz = field.dist(x, y, z + eps) - field.dist(x, y, z - eps);
    const l = Math.hypot(gx, gy, gz) || 1;
    nor[vi * 3] = gx / l;
    nor[vi * 3 + 1] = gy / l;
    nor[vi * 3 + 2] = gz / l;
  }

  // Make the winding agree with the outward (gradient) normals.
  let agree = 0;
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3;
    const b = indices[t + 1] * 3;
    const c = indices[t + 2] * 3;
    ab.set(pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]);
    ac.set(pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]);
    nn.crossVectors(ab, ac);
    agree += Math.sign(nn.x * nor[a] + nn.y * nor[a + 1] + nn.z * nor[a + 2]);
  }
  if (agree < 0) {
    for (let t = 0; t < indices.length; t += 3) {
      const tmp = indices[t + 1];
      indices[t + 1] = indices[t + 2];
      indices[t + 2] = tmp;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(vcount > 65535 ? new THREE.Uint32BufferAttribute(indices, 1) : new THREE.Uint16BufferAttribute(indices, 1));
  geo.userData.cells = [nx, ny, nz];
  return geo;
}
