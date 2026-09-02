/**
 * Scalar-field helpers and a naive "surface nets" mesher used to build the glove hand as one smooth,
 * indexed BufferGeometry. Everything works on plain numbers (no allocations in the inner loops).
 * Units: metres.
 */

/** Polynomial smooth minimum (blends two distance fields over a band of width k). */
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Distance to a segment a→b with radius interpolated r1→r2 (a round cone; fine approximation for mild tapers). */
export function sdCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const pax = px - ax;
  const pay = py - ay;
  const paz = pz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  let t = (pax * bax + pay * bay + paz * baz) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = pax - bax * t;
  const dy = pay - bay * t;
  const dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * t);
}

export function sdSphere(px, py, pz, cx, cy, cz, r) {
  const dx = px - cx;
  const dy = py - cy;
  const dz = pz - cz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

/** Approximate ellipsoid distance (Quilez). */
export function sdEllipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx;
  const y = (py - cy) / ry;
  const z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz));
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}

export function sdRoundBox(px, py, pz, cx, cy, cz, hx, hy, hz, r) {
  const qx = Math.abs(px - cx) - hx;
  const qy = Math.abs(py - cy) - hy;
  const qz = Math.abs(pz - cz) - hz;
  const mx = qx > 0 ? qx : 0;
  const my = qy > 0 ? qy : 0;
  const mz = qz > 0 ? qz : 0;
  return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

/** Numerical gradient (tetrahedron technique, 4 evaluations). Writes into out[0..2]; returns the length. */
export function gradient(field, x, y, z, out, eps = 0.0006) {
  const a = field(x + eps, y - eps, z - eps);
  const b = field(x - eps, y - eps, z + eps);
  const c = field(x - eps, y + eps, z - eps);
  const d = field(x + eps, y + eps, z + eps);
  let gx = a - b - c + d;
  let gy = -a - b + c + d;
  let gz = -a + b - c + d;
  const len = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
  out[0] = gx / len;
  out[1] = gy / len;
  out[2] = gz / len;
  return len;
}

/**
 * Naive surface nets over a regular grid. Returns { positions: Float32Array, indices: Uint32Array, adjacency }.
 * The zero level set of `field` is meshed inside [min, max] with cell size h. Faces are wound against the field
 * gradient so they face outwards (three.js CCW front faces).
 */
export function surfaceNets(field, min, max, h) {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1;
  const ny = Math.ceil((max[1] - min[1]) / h) + 1;
  const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const vals = new Float32Array(nx * ny * nz);
  const X = (i) => min[0] + i * h;
  const Y = (j) => min[1] + j * h;
  const Z = (k) => min[2] + k * h;
  let idx = 0;
  for (let k = 0; k < nz; k++) {
    const z = Z(k);
    for (let j = 0; j < ny; j++) {
      const y = Y(j);
      for (let i = 0; i < nx; i++) vals[idx++] = field(X(i), y, z);
    }
  }
  const V = (i, j, k) => vals[i + nx * (j + ny * k)];

  const cx = nx - 1;
  const cy = ny - 1;
  const cz = nz - 1;
  const cellVert = new Int32Array(cx * cy * cz).fill(-1);
  const cellMask = new Uint8Array(cx * cy * cz);
  const positions = [];
  // corner offsets in bit order: bit0 = x, bit1 = y, bit2 = z
  const co = [];
  for (let c = 0; c < 8; c++) co.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
  const edges = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if (((a ^ b) & ((a ^ b) - 1)) === 0) edges.push([a, b]); // differ in exactly one bit
  const cv = new Float32Array(8);

  for (let k = 0; k < cz; k++) {
    for (let j = 0; j < cy; j++) {
      for (let i = 0; i < cx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = V(i + co[c][0], j + co[c][1], k + co[c][2]);
          cv[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (let e = 0; e < edges.length; e++) {
          const a = edges[e][0];
          const b = edges[e][1];
          const va = cv[a];
          const vb = cv[b];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          sx += co[a][0] + (co[b][0] - co[a][0]) * t;
          sy += co[a][1] + (co[b][1] - co[a][1]) * t;
          sz += co[a][2] + (co[b][2] - co[a][2]) * t;
          n++;
        }
        const ci = i + cx * (j + cy * k);
        cellVert[ci] = positions.length / 3;
        cellMask[ci] = mask;
        positions.push(X(i) + (sx / n) * h, Y(j) + (sy / n) * h, Z(k) + (sz / n) * h);
      }
    }
  }

  // Quads: for each cell, for each axis edge leaving corner 0, connect the 4 cells sharing that edge.
  const quads = [];
  const stride = [1, cx, cx * cy];
  for (let k = 0; k < cz; k++) {
    for (let j = 0; j < cy; j++) {
      for (let i = 0; i < cx; i++) {
        const ci = i + cx * (j + cy * k);
        const v0 = cellVert[ci];
        if (v0 < 0) continue;
        const mask = cellMask[ci];
        const inside0 = (mask & 1) !== 0;
        const ijk = [i, j, k];
        for (let a = 0; a < 3; a++) {
          const bit = 1 << (1 << a); // corner along axis a from corner 0 (1, 2 or 4)
          const insideA = (mask & bit) !== 0;
          if (insideA === inside0) continue;
          const iu = (a + 1) % 3;
          const iv = (a + 2) % 3;
          if (ijk[iu] === 0 || ijk[iv] === 0) continue;
          const du = stride[iu];
          const dv = stride[iv];
          const v1 = cellVert[ci - du];
          const v2 = cellVert[ci - du - dv];
          const v3 = cellVert[ci - dv];
          if (v1 < 0 || v2 < 0 || v3 < 0) continue;
          if (inside0) quads.push(v0, v1, v2, v3);
          else quads.push(v0, v3, v2, v1);
        }
      }
    }
  }

  // Orient quads with the field gradient (robust to convention slips), then triangulate on the shorter diagonal.
  const pos = new Float32Array(positions);
  const g = [0, 0, 0];
  const indices = [];
  for (let q = 0; q < quads.length; q += 4) {
    let a = quads[q];
    let b = quads[q + 1];
    let c = quads[q + 2];
    let d = quads[q + 3];
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2];
    const cxp = pos[c * 3], cyp = pos[c * 3 + 1], czp = pos[c * 3 + 2];
    const dx = pos[d * 3], dy = pos[d * 3 + 1], dz = pos[d * 3 + 2];
    // normal from the diagonals
    const e1x = cxp - ax, e1y = cyp - ay, e1z = czp - az;
    const e2x = dx - bx, e2y = dy - by, e2z = dz - bz;
    const nxq = e1y * e2z - e1z * e2y;
    const nyq = e1z * e2x - e1x * e2z;
    const nzq = e1x * e2y - e1y * e2x;
    gradient(field, (ax + bx + cxp + dx) * 0.25, (ay + by + cyp + dy) * 0.25, (az + bz + czp + dz) * 0.25, g);
    if (nxq * g[0] + nyq * g[1] + nzq * g[2] < 0) {
      const t = b;
      b = d;
      d = t;
    }
    const dAC = e1x * e1x + e1y * e1y + e1z * e1z;
    const dBD = e2x * e2x + e2y * e2y + e2z * e2z;
    if (dAC <= dBD) indices.push(a, b, c, a, c, d);
    else indices.push(a, b, d, b, c, d);
  }

  return { positions: pos, indices: new Uint32Array(indices), quads: new Uint32Array(quads) };
}

/** Vertex adjacency (array of Int32Array neighbour lists) from quads. */
export function buildAdjacency(vertexCount, quads) {
  const sets = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) sets[i] = new Set();
  for (let q = 0; q < quads.length; q += 4) {
    for (let e = 0; e < 4; e++) {
      const a = quads[q + e];
      const b = quads[q + ((e + 1) & 3)];
      sets[a].add(b);
      sets[b].add(a);
    }
  }
  return sets.map((s) => Int32Array.from(s));
}

/**
 * Laplacian relaxation with re-projection onto the zero level set: regularises the surface-net triangles while
 * keeping the mesh exactly on the field surface.
 */
export function relaxOnSurface(field, positions, adjacency, iterations = 3, lambda = 0.5) {
  const n = positions.length / 3;
  const tmp = new Float32Array(positions.length);
  const g = [0, 0, 0];
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      const nb = adjacency[i];
      if (nb.length === 0) {
        tmp[i * 3] = positions[i * 3];
        tmp[i * 3 + 1] = positions[i * 3 + 1];
        tmp[i * 3 + 2] = positions[i * 3 + 2];
        continue;
      }
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (let j = 0; j < nb.length; j++) {
        ax += positions[nb[j] * 3];
        ay += positions[nb[j] * 3 + 1];
        az += positions[nb[j] * 3 + 2];
      }
      ax /= nb.length;
      ay /= nb.length;
      az /= nb.length;
      tmp[i * 3] = positions[i * 3] + (ax - positions[i * 3]) * lambda;
      tmp[i * 3 + 1] = positions[i * 3 + 1] + (ay - positions[i * 3 + 1]) * lambda;
      tmp[i * 3 + 2] = positions[i * 3 + 2] + (az - positions[i * 3 + 2]) * lambda;
    }
    for (let i = 0; i < n; i++) {
      let x = tmp[i * 3];
      let y = tmp[i * 3 + 1];
      let z = tmp[i * 3 + 2];
      for (let s = 0; s < 2; s++) {
        const d = field(x, y, z);
        gradient(field, x, y, z, g);
        x -= d * g[0];
        y -= d * g[1];
        z -= d * g[2];
      }
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
  }
}

/** Smooth normals from the field gradient. */
export function fieldNormals(field, positions) {
  const n = positions.length / 3;
  const normals = new Float32Array(positions.length);
  const g = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    gradient(field, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], g);
    normals[i * 3] = g[0];
    normals[i * 3 + 1] = g[1];
    normals[i * 3 + 2] = g[2];
  }
  return normals;
}

/** Cheap ambient occlusion from the field: how much free space lies along the normal. 1 = fully open. */
export function fieldAO(field, positions, normals, steps = [0.002, 0.005, 0.01, 0.018, 0.03]) {
  const n = positions.length / 3;
  const ao = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
    let occ = 0;
    let wsum = 0;
    for (let s = 0; s < steps.length; s++) {
      const t = steps[s];
      const d = field(x + nx * t, y + ny * t, z + nz * t);
      const w = 1 / (1 + s);
      occ += w * Math.max(0, Math.min(1, 1 - d / t));
      wsum += w;
    }
    ao[i] = 1 - occ / wsum;
  }
  return ao;
}
