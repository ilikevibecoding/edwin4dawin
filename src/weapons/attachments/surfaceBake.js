/**
 * Pure typed-array surface baking for the view model (no three.js dependency so it can be unit-tested in Node):
 *
 *   TriBVH            median-split bounding-volume hierarchy over a triangle soup with closest-hit raycasts
 *   classifyEdges     welds a mesh, finds sharp convex / concave edges (dihedral angle) and flood-fills "face
 *                     groups" across smooth edges so every triangle knows the sharp edges of its own surface
 *   bakeUVMaps        rasterises an indexed mesh into its UV atlas and writes RGBA8: R = hemisphere AO,
 *                     G = convex-edge proximity (edge wear mask), B = concave-edge proximity (cavity / grime),
 *                     A = coverage; islands are padded so bilinear / mip filtering never bleeds the background
 *   bakeVertexAO      hemisphere AO per vertex (for procedural attachment meshes whose UVs are not an atlas)
 *
 * Units: metres. All positions must already be in one common frame (gunRoot space).
 */

/* ------------------------------------------------------------------------------------------- BVH */

export class TriBVH {
  /** @param {Float32Array} tris 9 floats per triangle (ax ay az bx by bz cx cy cz) */
  constructor(tris, leafSize = 4) {
    this.tris = tris;
    this.count = tris.length / 9;
    this.leafSize = leafSize;
    const n = this.count;
    this.order = new Uint32Array(n);
    const cen = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      this.order[i] = i;
      const o = i * 9;
      cen[i * 3] = (tris[o] + tris[o + 3] + tris[o + 6]) / 3;
      cen[i * 3 + 1] = (tris[o + 1] + tris[o + 4] + tris[o + 7]) / 3;
      cen[i * 3 + 2] = (tris[o + 2] + tris[o + 5] + tris[o + 8]) / 3;
    }
    this._cen = cen;
    // node arrays (grown as needed): bounds, left child (or -1), start, count
    const maxNodes = Math.max(4, n * 2);
    this.bmin = new Float32Array(maxNodes * 3);
    this.bmax = new Float32Array(maxNodes * 3);
    this.left = new Int32Array(maxNodes).fill(-1);
    this.right = new Int32Array(maxNodes).fill(-1);
    this.axis = new Int8Array(maxNodes);
    this.start = new Int32Array(maxNodes);
    this.num = new Int32Array(maxNodes);
    this.nodeCount = 0;
    if (n > 0) this._build(0, n);
    this._cen = null;
    // leaf-ordered triangle records for the traversal: vertex a + the two edge vectors (Möller–Trumbore
    // needs nothing else), contiguous per leaf so a leaf visit is one linear scan
    const rec = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = this.order[i] * 9;
      const r = i * 9;
      rec[r] = tris[o];
      rec[r + 1] = tris[o + 1];
      rec[r + 2] = tris[o + 2];
      rec[r + 3] = tris[o + 3] - tris[o];
      rec[r + 4] = tris[o + 4] - tris[o + 1];
      rec[r + 5] = tris[o + 5] - tris[o + 2];
      rec[r + 6] = tris[o + 6] - tris[o];
      rec[r + 7] = tris[o + 7] - tris[o + 1];
      rec[r + 8] = tris[o + 8] - tris[o + 2];
    }
    this.rec = rec;
  }

  _bounds(node, s, e) {
    const t = this.tris;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = s; i < e; i++) {
      const o = this.order[i] * 9;
      for (let k = 0; k < 9; k += 3) {
        const x = t[o + k], y = t[o + k + 1], z = t[o + k + 2];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
      }
    }
    const eps = 1e-6;
    this.bmin[node * 3] = x0 - eps;
    this.bmin[node * 3 + 1] = y0 - eps;
    this.bmin[node * 3 + 2] = z0 - eps;
    this.bmax[node * 3] = x1 + eps;
    this.bmax[node * 3 + 1] = y1 + eps;
    this.bmax[node * 3 + 2] = z1 + eps;
  }

  _build(s, e) {
    const node = this.nodeCount++;
    this._bounds(node, s, e);
    this.start[node] = s;
    this.num[node] = e - s;
    if (e - s <= this.leafSize) return node;
    // split on the longest axis of the centroid bounds, at the median
    const cen = this._cen;
    let cx0 = Infinity, cy0 = Infinity, cz0 = Infinity, cx1 = -Infinity, cy1 = -Infinity, cz1 = -Infinity;
    for (let i = s; i < e; i++) {
      const c = this.order[i] * 3;
      const x = cen[c], y = cen[c + 1], z = cen[c + 2];
      if (x < cx0) cx0 = x;
      if (x > cx1) cx1 = x;
      if (y < cy0) cy0 = y;
      if (y > cy1) cy1 = y;
      if (z < cz0) cz0 = z;
      if (z > cz1) cz1 = z;
    }
    const dx = cx1 - cx0, dy = cy1 - cy0, dz = cz1 - cz0;
    const axis = dx >= dy && dx >= dz ? 0 : dy >= dz ? 1 : 2;
    if (Math.max(dx, dy, dz) < 1e-9) return node; // degenerate: leave as a big leaf
    const sub = this.order.subarray(s, e);
    const keyed = Array.from(sub, (id) => id);
    keyed.sort((a, b) => cen[a * 3 + axis] - cen[b * 3 + axis]);
    for (let i = 0; i < keyed.length; i++) sub[i] = keyed[i];
    const mid = (s + e) >> 1;
    this.axis[node] = axis;
    this.left[node] = this._build(s, mid);
    this.right[node] = this._build(mid, e);
    return node;
  }

  /**
   * Hit distance of the ray in (tmin, tmax), or Infinity. Double-sided. Children are visited near-first, so
   * with `anyHit` the first hit found is usually the closest one (good enough for occlusion weighting).
   */
  raycast(ox, oy, oz, dx, dy, dz, tmin, tmax, anyHit = false) {
    const idx = 1 / dx, idy = 1 / dy, idz = 1 / dz;
    const stack = this._stack || (this._stack = new Int32Array(128));
    let sp = 0;
    stack[sp++] = 0;
    let best = tmax;
    const t = this.rec;
    const bmin = this.bmin, bmax = this.bmax;
    const left = this.left, right = this.right, axisArr = this.axis;
    while (sp > 0) {
      const node = stack[--sp];
      const n3 = node * 3;
      // slab test
      let t1 = (bmin[n3] - ox) * idx, t2 = (bmax[n3] - ox) * idx;
      let tn = t1 < t2 ? t1 : t2, tf = t1 < t2 ? t2 : t1;
      t1 = (bmin[n3 + 1] - oy) * idy;
      t2 = (bmax[n3 + 1] - oy) * idy;
      if (t1 < t2) {
        if (t1 > tn) tn = t1;
        if (t2 < tf) tf = t2;
      } else {
        if (t2 > tn) tn = t2;
        if (t1 < tf) tf = t1;
      }
      t1 = (bmin[n3 + 2] - oz) * idz;
      t2 = (bmax[n3 + 2] - oz) * idz;
      if (t1 < t2) {
        if (t1 > tn) tn = t1;
        if (t2 < tf) tf = t2;
      } else {
        if (t2 > tn) tn = t2;
        if (t1 < tf) tf = t1;
      }
      if (tn > tf || tf < tmin || tn > best) continue;
      const l = this.left[node];
      if (l < 0) {
        const s = this.start[node] * 9, e = s + this.num[node] * 9;
        for (let o = s; o < e; o += 9) {
          // Möller–Trumbore
          const ax = t[o], ay = t[o + 1], az = t[o + 2];
          const e1x = t[o + 3], e1y = t[o + 4], e1z = t[o + 5];
          const e2x = t[o + 6], e2y = t[o + 7], e2z = t[o + 8];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-12 && det < 1e-12) continue;
          const inv = 1 / det;
          const tx = ox - ax, ty = oy - ay, tz = oz - az;
          const u = (tx * px + ty * py + tz * pz) * inv;
          if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
          const v = (dx * qx + dy * qy + dz * qz) * inv;
          if (v < 0 || u + v > 1) continue;
          const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (tt > tmin && tt < best) {
            best = tt;
            if (anyHit) return best;
          }
        }
      } else {
        // push the far child first so the near one is popped next
        const a = axisArr[node];
        const dirPos = a === 0 ? dx >= 0 : a === 1 ? dy >= 0 : dz >= 0;
        if (dirPos) {
          stack[sp++] = right[node];
          stack[sp++] = l;
        } else {
          stack[sp++] = l;
          stack[sp++] = right[node];
        }
      }
    }
    return best < tmax ? best : Infinity;
  }
}

/* --------------------------------------------------------------------------------------- sampling */

/** Cosine-weighted hemisphere directions (tangent space, z up) from a Hammersley set. */
export function hemisphereSamples(n) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // radical inverse base 2
    let bits = i;
    bits = ((bits << 16) | (bits >>> 16)) >>> 0;
    bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
    bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
    bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
    bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;
    const u = (i + 0.5) / n;
    const v = bits * 2.3283064365386963e-10;
    const r = Math.sqrt(u);
    const phi = 2 * Math.PI * v;
    out[i * 3] = r * Math.cos(phi);
    out[i * 3 + 1] = r * Math.sin(phi);
    out[i * 3 + 2] = Math.sqrt(Math.max(0, 1 - u));
  }
  return out;
}

const _t = new Float64Array(3);
const _b = new Float64Array(3);
/** Rays actually cast by aoAtPoint (the adaptive early-out makes the count data-dependent). */
export const rayCounter = { cast: 0 };
function orthonormalBasis(nx, ny, nz, rot) {
  // Frisvad / Duff et al. branchless ONB, then rotate about n by `rot`
  const sign = nz >= 0 ? 1 : -1;
  const a = -1 / (sign + nz);
  const bb = nx * ny * a;
  let tx = 1 + sign * nx * nx * a, ty = sign * bb, tz = -sign * nx;
  let bx = bb, by = sign + ny * ny * a, bz = -ny;
  const c = Math.cos(rot), s = Math.sin(rot);
  _t[0] = tx * c + bx * s;
  _t[1] = ty * c + by * s;
  _t[2] = tz * c + bz * s;
  _b[0] = bx * c - tx * s;
  _b[1] = by * c - ty * s;
  _b[2] = bz * c - tz * s;
}

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Hemisphere AO at a point: 1 = fully open. `maxDist` metres; hits are weighted by (1 - t / maxDist).
 * Adaptive: the first `probe` (well-spread, low-discrepancy) directions are cast first and the rest only if
 * one of them hit — most of a rifle's surface is fully open, and those points cost 4 rays instead of 8–10.
 */
export function aoAtPoint(bvh, samples, px, py, pz, nx, ny, nz, maxDist, rot, offset = 0.0003, probe = 4) {
  orthonormalBasis(nx, ny, nz, rot);
  const n = samples.length / 3;
  const ox = px + nx * offset, oy = py + ny * offset, oz = pz + nz * offset;
  let occ = 0;
  let hits = 0;
  const first = Math.min(probe, n);
  for (let i = 0; i < n; i++) {
    if (i === first && hits === 0) {
      rayCounter.cast += first;
      return 1;
    }
    const sx = samples[i * 3], sy = samples[i * 3 + 1], sz = samples[i * 3 + 2];
    const dx = _t[0] * sx + _b[0] * sy + nx * sz;
    const dy = _t[1] * sx + _b[1] * sy + ny * sz;
    const dz = _t[2] * sx + _b[2] * sy + nz * sz;
    const t = bvh.raycast(ox, oy, oz, dx, dy, dz, 1e-5, maxDist, true);
    if (t !== Infinity) {
      occ += 1 - t / maxDist;
      hits++;
    }
  }
  rayCounter.cast += n;
  return 1 - occ / n;
}

/* -------------------------------------------------------------------------------- edge analysis */

/**
 * Sharp-edge classification for an indexed mesh (positions/normals per vertex, Uint index).
 * Returns { edges: [{ a, b (vertex ids), sign (+1 convex / -1 concave), angle }], triGroup: Int32Array,
 *           groupEdges: Map(group -> edge index list), faceNormal: Float32Array(3 per tri) }.
 */
export function classifyEdges(position, index, { sharpAngle = 0.42, weldEps = 2e-5 } = {}) {
  const triCount = index.length / 3;
  // weld by quantised position
  const weld = new Int32Array(position.length / 3);
  const map = new Map();
  let wCount = 0;
  const q = 1 / weldEps;
  for (let v = 0; v < weld.length; v++) {
    const key = `${Math.round(position[v * 3] * q)},${Math.round(position[v * 3 + 1] * q)},${Math.round(position[v * 3 + 2] * q)}`;
    let id = map.get(key);
    if (id === undefined) {
      id = wCount++;
      map.set(key, id);
    }
    weld[v] = id;
  }
  // face normals + centroids
  const faceNormal = new Float32Array(triCount * 3);
  const centroid = new Float32Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
    const ax = position[a * 3], ay = position[a * 3 + 1], az = position[a * 3 + 2];
    const e1x = position[b * 3] - ax, e1y = position[b * 3 + 1] - ay, e1z = position[b * 3 + 2] - az;
    const e2x = position[c * 3] - ax, e2y = position[c * 3 + 1] - ay, e2z = position[c * 3 + 2] - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1;
    faceNormal[t * 3] = nx / l;
    faceNormal[t * 3 + 1] = ny / l;
    faceNormal[t * 3 + 2] = nz / l;
    centroid[t * 3] = (ax + position[b * 3] + position[c * 3]) / 3;
    centroid[t * 3 + 1] = (ay + position[b * 3 + 1] + position[c * 3 + 1]) / 3;
    centroid[t * 3 + 2] = (az + position[b * 3 + 2] + position[c * 3 + 2]) / 3;
  }
  // edge map: welded pair -> triangles
  const edgeTris = new Map();
  const edgeVerts = new Map();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const va = index[t * 3 + k], vb = index[t * 3 + ((k + 1) % 3)];
      const wa = weld[va], wb = weld[vb];
      if (wa === wb) continue;
      const key = wa < wb ? wa * wCount + wb : wb * wCount + wa;
      let arr = edgeTris.get(key);
      if (!arr) {
        arr = [];
        edgeTris.set(key, arr);
        edgeVerts.set(key, [va, vb]);
      }
      arr.push(t);
    }
  }
  // union-find over triangles for smooth face groups; sharp edges list
  const parent = new Int32Array(triCount);
  for (let i = 0; i < triCount; i++) parent[i] = i;
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[a] = b;
  };
  const edges = [];
  const cosSharp = Math.cos(sharpAngle);
  for (const [key, tris] of edgeTris) {
    if (tris.length !== 2) continue; // open or non-manifold: ignore
    const t1 = tris[0], t2 = tris[1];
    const d = faceNormal[t1 * 3] * faceNormal[t2 * 3] + faceNormal[t1 * 3 + 1] * faceNormal[t2 * 3 + 1] + faceNormal[t1 * 3 + 2] * faceNormal[t2 * 3 + 2];
    if (d > cosSharp) {
      union(t1, t2);
      continue;
    }
    // convex if triangle 2's centroid lies below triangle 1's plane
    const cx = centroid[t2 * 3] - centroid[t1 * 3], cy = centroid[t2 * 3 + 1] - centroid[t1 * 3 + 1], cz = centroid[t2 * 3 + 2] - centroid[t1 * 3 + 2];
    const side = faceNormal[t1 * 3] * cx + faceNormal[t1 * 3 + 1] * cy + faceNormal[t1 * 3 + 2] * cz;
    const [va, vb] = edgeVerts.get(key);
    edges.push({ a: va, b: vb, t1, t2, sign: side < 0 ? 1 : -1, angle: Math.acos(Math.max(-1, Math.min(1, d))) });
  }
  const triGroup = new Int32Array(triCount);
  for (let i = 0; i < triCount; i++) triGroup[i] = find(i);
  const groupEdges = new Map();
  edges.forEach((e, i) => {
    for (const g of [triGroup[e.t1], triGroup[e.t2]]) {
      let l = groupEdges.get(g);
      if (!l) {
        l = [];
        groupEdges.set(g, l);
      }
      if (l[l.length - 1] !== i) l.push(i);
    }
  });
  return { edges, triGroup, groupEdges, faceNormal, weld };
}

/** Squared distance from point p to segment ab (arrays, offsets). */
function segDist2(px, py, pz, ax, ay, az, bx, by, bz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const l2 = abx * abx + aby * aby + abz * abz;
  let t = l2 > 0 ? (apx * abx + apy * aby + apz * abz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
  return dx * dx + dy * dy + dz * dz;
}

/* ---------------------------------------------------------------------------------- UV atlas bake */

/**
 * Rasterise `mesh` ({ position, normal, uv, index }, gun space) into a size×size RGBA8 atlas.
 * opts: { bvh, aoSamples = 16, aoDist = 0.06, aoRes = size / 2, wearWidth = 0.0022, cavityWidth = 0.004,
 *         sharpAngle, pad = 3, out (Uint8ClampedArray to accumulate into; default fresh) }
 * Returns { data: Uint8ClampedArray(size*size*4), coverage: Uint8Array, stats }.
 */
export function bakeUVMaps(mesh, size, opts = {}) {
  const { position: P, normal: N, uv: UV, index: I } = mesh;
  const bvh = opts.bvh;
  const aoSamples = opts.aoSamples ?? 16;
  const aoDist = opts.aoDist ?? 0.06;
  const aoRes = opts.aoRes ?? size >> 1;
  const wearWidth = opts.wearWidth ?? 0.0022;
  const cavityWidth = opts.cavityWidth ?? 0.004;
  const pad = opts.pad ?? 3;
  const data = opts.out ?? new Uint8ClampedArray(size * size * 4);
  const coverage = opts.coverage ?? new Uint8Array(size * size);
  const t0 = now();

  const { edges, triGroup, groupEdges, faceNormal } = classifyEdges(P, I, { sharpAngle: opts.sharpAngle ?? 0.42 });
  const triCount = I.length / 3;

  // per-triangle nearby sharp edges (of its own smooth group) within reach of the wider mask
  const reach = Math.max(wearWidth, cavityWidth) * 1.5;
  const nearby = new Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const list = groupEdges.get(triGroup[t]);
    if (!list) continue;
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    let x0 = Math.min(P[a * 3], P[b * 3], P[c * 3]) - reach, x1 = Math.max(P[a * 3], P[b * 3], P[c * 3]) + reach;
    let y0 = Math.min(P[a * 3 + 1], P[b * 3 + 1], P[c * 3 + 1]) - reach, y1 = Math.max(P[a * 3 + 1], P[b * 3 + 1], P[c * 3 + 1]) + reach;
    let z0 = Math.min(P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]) - reach, z1 = Math.max(P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]) + reach;
    const near = [];
    for (const ei of list) {
      const e = edges[ei];
      const ex0 = Math.min(P[e.a * 3], P[e.b * 3]), ex1 = Math.max(P[e.a * 3], P[e.b * 3]);
      const ey0 = Math.min(P[e.a * 3 + 1], P[e.b * 3 + 1]), ey1 = Math.max(P[e.a * 3 + 1], P[e.b * 3 + 1]);
      const ez0 = Math.min(P[e.a * 3 + 2], P[e.b * 3 + 2]), ez1 = Math.max(P[e.a * 3 + 2], P[e.b * 3 + 2]);
      if (ex1 < x0 || ex0 > x1 || ey1 < y0 || ey0 > y1 || ez1 < z0 || ez0 > z1) continue;
      near.push(e);
    }
    if (near.length) nearby[t] = near;
  }

  // AO grid (lower resolution) — computed lazily per covered cell, then bilinearly upsampled
  const aoGrid = new Float32Array(aoRes * aoRes).fill(-1);
  const aoCov = new Uint8Array(aoRes * aoRes);
  const samples = hemisphereSamples(aoSamples);
  const ratio = aoRes / size;

  // rasterise: texel -> triangle, barycentrics
  const triId = new Int32Array(size * size).fill(-1);
  const w0a = new Float32Array(size * size);
  const w1a = new Float32Array(size * size);
  const rays0 = rayCounter.cast;
  for (let t = 0; t < triCount; t++) {
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    // row 0 = v 0 (upload with texture.flipY = false)
    const ax = UV[a * 2] * size, ay = UV[a * 2 + 1] * size;
    const bx = UV[b * 2] * size, by = UV[b * 2 + 1] * size;
    const cx = UV[c * 2] * size, cy = UV[c * 2 + 1] * size;
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(area) < 1e-12) continue;
    const inv = 1 / area;
    // conservative half-texel expansion in barycentric space (≈ edge length based)
    const per = Math.hypot(bx - ax, by - ay) + Math.hypot(cx - bx, cy - by) + Math.hypot(ax - cx, ay - cy);
    const tol = Math.min(0.5, (0.75 * per) / Math.max(1e-6, Math.abs(area)));
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1)), x1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx) + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - 1)), y1 = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy) + 1));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        let w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) * inv;
        let w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) * inv;
        let w2 = 1 - w0 - w1;
        if (w0 < -tol || w1 < -tol || w2 < -tol) continue;
        const i = y * size + x;
        const inside = w0 >= 0 && w1 >= 0 && w2 >= 0;
        if (triId[i] >= 0 && !inside) continue; // do not let a padded fringe overwrite a real interior texel
        // clamp barycentrics for the fringe so the position stays on the triangle
        if (!inside) {
          w0 = Math.max(0, w0);
          w1 = Math.max(0, w1);
          w2 = Math.max(0, w2);
          const s = w0 + w1 + w2 || 1;
          w0 /= s;
          w1 /= s;
        }
        triId[i] = t;
        w0a[i] = w0;
        w1a[i] = w1;
        coverage[i] = inside ? 2 : Math.max(coverage[i], 1);
      }
    }
  }

  // per texel maps
  const wearW2 = wearWidth * wearWidth, cavW2 = cavityWidth * cavityWidth;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const t = triId[i];
      if (t < 0) continue;
      const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
      const w0 = w0a[i], w1 = w1a[i], w2 = 1 - w0 - w1;
      const px = P[a * 3] * w0 + P[b * 3] * w1 + P[c * 3] * w2;
      const py = P[a * 3 + 1] * w0 + P[b * 3 + 1] * w1 + P[c * 3 + 1] * w2;
      const pz = P[a * 3 + 2] * w0 + P[b * 3 + 2] * w1 + P[c * 3 + 2] * w2;
      // edge proximity
      let dConv = Infinity, dConc = Infinity;
      const near = nearby[t];
      if (near) {
        for (let k = 0; k < near.length; k++) {
          const e = near[k];
          const d2 = segDist2(px, py, pz, P[e.a * 3], P[e.a * 3 + 1], P[e.a * 3 + 2], P[e.b * 3], P[e.b * 3 + 1], P[e.b * 3 + 2]);
          if (e.sign > 0) {
            if (d2 < dConv) dConv = d2;
          } else if (d2 < dConc) dConc = d2;
        }
      }
      const wear = dConv < wearW2 ? 1 - Math.sqrt(dConv / wearW2) : 0;
      const cav = dConc < cavW2 ? 1 - Math.sqrt(dConc / cavW2) : 0;
      // AO from the coarse grid
      let ao = 1;
      if (bvh) {
        const gx = Math.min(aoRes - 1, Math.floor((x + 0.5) * ratio)), gy = Math.min(aoRes - 1, Math.floor((y + 0.5) * ratio));
        const gi = gy * aoRes + gx;
        if (aoGrid[gi] < 0) {
          // smooth normal at this texel
          let nx = N[a * 3] * w0 + N[b * 3] * w1 + N[c * 3] * w2;
          let ny = N[a * 3 + 1] * w0 + N[b * 3 + 1] * w1 + N[c * 3 + 1] * w2;
          let nz = N[a * 3 + 2] * w0 + N[b * 3 + 2] * w1 + N[c * 3 + 2] * w2;
          const fl = Math.hypot(nx, ny, nz) || 1;
          nx /= fl;
          ny /= fl;
          nz /= fl;
          // offset along the face normal (safer for flat-shaded meshes than the smooth normal)
          const fx = faceNormal[t * 3], fy = faceNormal[t * 3 + 1], fz = faceNormal[t * 3 + 2];
          aoGrid[gi] = aoAtPoint(bvh, samples, px + fx * 0.0004, py + fy * 0.0004, pz + fz * 0.0004, nx, ny, nz, aoDist, hash2(gx, gy) * 6.2832, 0.0002);
          aoCov[gi] = 1;
        }
        ao = aoGrid[gi];
      }
      const o = i * 4;
      data[o] = Math.round(ao * 255);
      data[o + 1] = Math.round(wear * 255);
      data[o + 2] = Math.round(cav * 255);
      data[o + 3] = 255;
    }
  }
  // Smooth the AO channel (grid-resolution box blur, in atlas space, restricted to covered texels) to hide sampling noise.
  if (bvh) blurChannel(data, coverage, size, 0, Math.max(1, Math.round(1 / ratio)));
  // pad islands outward so filtering never pulls in the empty background
  dilate(data, coverage, size, pad);
  return { data, coverage, stats: { ms: now() - t0, rays: rayCounter.cast - rays0, edges: edges.length, tris: triCount } };
}

function blurChannel(data, coverage, size, ch, r) {
  const tmp = new Float32Array(size * size);
  const cnt = new Float32Array(size * size);
  // horizontal
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (!coverage[i]) continue;
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= size) continue;
        const j = y * size + xx;
        if (!coverage[j]) continue;
        s += data[j * 4 + ch];
        n++;
      }
      tmp[i] = s;
      cnt[i] = n;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (!coverage[i]) continue;
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= size) continue;
        const j = yy * size + x;
        if (!coverage[j]) continue;
        s += tmp[j];
        n += cnt[j];
      }
      if (n > 0) data[i * 4 + ch] = Math.round(s / n);
    }
  }
}

function dilate(data, coverage, size, passes) {
  let cov = coverage;
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(cov);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        if (cov[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= size) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= size) continue;
            const j = yy * size + xx;
            if (!cov[j]) continue;
            r += data[j * 4];
            g += data[j * 4 + 1];
            b += data[j * 4 + 2];
            n++;
          }
        }
        if (n) {
          data[i * 4] = Math.round(r / n);
          data[i * 4 + 1] = Math.round(g / n);
          data[i * 4 + 2] = Math.round(b / n);
          data[i * 4 + 3] = 255;
          next[i] = 1;
        }
      }
    }
    cov = next;
  }
  // texels never reached: neutral (open AO, no wear/cavity) so mip levels average toward neutral
  for (let i = 0; i < size * size; i++) {
    if (!cov[i]) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 0;
    }
  }
}

/* ---------------------------------------------------------------------------------- vertex AO */

/**
 * Per-vertex hemisphere AO for a (possibly non-indexed) mesh: { position, normal } in gun space.
 * Vertices sharing position+normal are evaluated once. Returns Float32Array(vertexCount).
 */
export function bakeVertexAO(mesh, bvh, { samples = 12, maxDist = 0.05, offset = 0.0003 } = {}) {
  const { position: P, normal: N } = mesh;
  const count = P.length / 3;
  const out = new Float32Array(count);
  const dirs = hemisphereSamples(samples);
  const cache = new Map();
  const q = 1 / 5e-5;
  const rays0 = rayCounter.cast;
  for (let v = 0; v < count; v++) {
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2];
    let nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const key = `${Math.round(px * q)},${Math.round(py * q)},${Math.round(pz * q)},${Math.round(nx * 20)},${Math.round(ny * 20)},${Math.round(nz * 20)}`;
    let ao = cache.get(key);
    if (ao === undefined) {
      ao = aoAtPoint(bvh, dirs, px, py, pz, nx, ny, nz, maxDist, hash2(v, 7) * 6.2832, offset);
      cache.set(key, ao);
    }
    out[v] = ao;
  }
  return { ao: out, rays: rayCounter.cast - rays0, unique: cache.size };
}

/**
 * Per-triangle edge-wear factor for a non-indexed mesh ({ position } in gun space; welded internally):
 * 1 for triangles that lie within `width` of a sharp convex edge of their own polygon (bevel / chamfer strips,
 * small chamfered faces), fading to 0 at 2×width. Large flat faces stay 0 even though they border sharp edges,
 * so the wear band is exactly the bevel geometry — mm-wide whatever the triangle size — instead of a gradient
 * across the face. Optional `ao` (per vertex) gates wear to exposed geometry (recessed edges don't get rubbed).
 * Returns Float32Array(vertexCount) with the same value on a triangle's three corners.
 */
export function bakeTriangleWear(mesh, { sharpAngle = 0.3, width = 0.001, ao = null } = {}) {
  const P = mesh.position;
  const count = P.length / 3;
  let index = mesh.index;
  if (!index) {
    index = new Uint32Array(count);
    for (let i = 0; i < count; i++) index[i] = i;
  }
  const triCount = index.length / 3;
  const { edges } = classifyEdges(P, index, { sharpAngle });
  const triEdges = new Map();
  for (const e of edges) {
    if (e.sign <= 0) continue;
    for (const t of [e.t1, e.t2]) {
      let l = triEdges.get(t);
      if (!l) {
        l = [];
        triEdges.set(t, l);
      }
      l.push(e);
    }
  }
  const out = new Float32Array(count);
  const smooth = (x) => {
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  };
  for (const [t, list] of triEdges) {
    const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
    const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3;
    const cy = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3;
    const cz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    let d2 = Infinity;
    for (const e of list) {
      const d = segDist2(cx, cy, cz, P[e.a * 3], P[e.a * 3 + 1], P[e.a * 3 + 2], P[e.b * 3], P[e.b * 3 + 1], P[e.b * 3 + 2]);
      if (d < d2) d2 = d;
    }
    let w = 1 - smooth((Math.sqrt(d2) - width) / width);
    if (ao) w *= smooth((((ao[a] + ao[b] + ao[c]) / 3) - 0.45) / 0.4);
    if (w <= 0) continue;
    out[a] = out[b] = out[c] = w;
  }
  return out;
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
