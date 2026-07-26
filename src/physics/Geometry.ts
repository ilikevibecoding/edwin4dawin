import * as THREE from 'three';

/**
 * Allocation-free geometric primitives for the physics system.
 *
 * Triangles are always passed as a `Float32Array` plus an offset so callers can
 * work directly against the packed world-space soup held by the BVH. Every
 * routine writes into caller-supplied output vectors and uses module-scoped
 * scratch, so nothing here allocates once the module is loaded.
 */

/** Distance below which two positions are treated as coincident. */
export const CONTACT_EPS = 1e-6;

/* ------------------------- point / segment ----------------------------- */

/** Closest point on segment ab to p. Returns the parametric position 0..1. */
export function closestPointOnSegment(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  out: THREE.Vector3,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len2 = dx * dx + dy * dy + dz * dz;
  let t = 0;
  if (len2 > 1e-12) {
    t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  }
  out.set(ax + dx * t, ay + dy * t, az + dz * t);
  return t;
}

/**
 * Closest points between segment (p0,q0) and segment (p1,q1).
 * Returns the squared distance between them. Ericson, RTCD 5.1.9.
 */
export function closestPointsSegmentSegment(
  p0x: number,
  p0y: number,
  p0z: number,
  q0x: number,
  q0y: number,
  q0z: number,
  p1x: number,
  p1y: number,
  p1z: number,
  q1x: number,
  q1y: number,
  q1z: number,
  out0: THREE.Vector3,
  out1: THREE.Vector3,
): number {
  const d0x = q0x - p0x;
  const d0y = q0y - p0y;
  const d0z = q0z - p0z;
  const d1x = q1x - p1x;
  const d1y = q1y - p1y;
  const d1z = q1z - p1z;
  const rx = p0x - p1x;
  const ry = p0y - p1y;
  const rz = p0z - p1z;

  const a = d0x * d0x + d0y * d0y + d0z * d0z;
  const e = d1x * d1x + d1y * d1y + d1z * d1z;
  const f = d1x * rx + d1y * ry + d1z * rz;

  let s = 0;
  let t = 0;
  const tiny = 1e-12;

  if (a <= tiny && e <= tiny) {
    s = 0;
    t = 0;
  } else if (a <= tiny) {
    s = 0;
    t = f / e;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  } else {
    const c = d0x * rx + d0y * ry + d0z * rz;
    if (e <= tiny) {
      t = 0;
      s = -c / a;
      s = s < 0 ? 0 : s > 1 ? 1 : s;
    } else {
      const b = d0x * d1x + d0y * d1y + d0z * d1z;
      const denom = a * e - b * b;
      if (denom > tiny) {
        s = (b * f - c * e) / denom;
        s = s < 0 ? 0 : s > 1 ? 1 : s;
      } else {
        s = 0;
      }
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = -c / a;
        s = s < 0 ? 0 : s > 1 ? 1 : s;
      } else if (t > 1) {
        t = 1;
        s = (b - c) / a;
        s = s < 0 ? 0 : s > 1 ? 1 : s;
      }
    }
  }

  out0.set(p0x + d0x * s, p0y + d0y * s, p0z + d0z * s);
  out1.set(p1x + d1x * t, p1y + d1y * t, p1z + d1z * t);
  const dx = out0.x - out1.x;
  const dy = out0.y - out1.y;
  const dz = out0.z - out1.z;
  return dx * dx + dy * dy + dz * dz;
}

/* ---------------------------- triangles -------------------------------- */

/**
 * Closest point on triangle `v[o..o+8]` to p, written into `out`.
 * Returns the squared distance. Ericson, RTCD 5.1.5.
 */
export function closestPointOnTriangle(
  px: number,
  py: number,
  pz: number,
  v: Float32Array,
  o: number,
  out: THREE.Vector3,
): number {
  const ax = v[o];
  const ay = v[o + 1];
  const az = v[o + 2];
  const bx = v[o + 3];
  const by = v[o + 4];
  const bz = v[o + 5];
  const cx = v[o + 6];
  const cy = v[o + 7];
  const cz = v[o + 8];

  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;

  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) {
    out.set(ax, ay, az);
    return sqDist(px, py, pz, ax, ay, az);
  }

  const bpx = px - bx;
  const bpy = py - by;
  const bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) {
    out.set(bx, by, bz);
    return sqDist(px, py, pz, bx, by, bz);
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const t = d1 / (d1 - d3);
    out.set(ax + abx * t, ay + aby * t, az + abz * t);
    return sqDist(px, py, pz, out.x, out.y, out.z);
  }

  const cpx = px - cx;
  const cpy = py - cy;
  const cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) {
    out.set(cx, cy, cz);
    return sqDist(px, py, pz, cx, cy, cz);
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const t = d2 / (d2 - d6);
    out.set(ax + acx * t, ay + acy * t, az + acz * t);
    return sqDist(px, py, pz, out.x, out.y, out.z);
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const t = (d4 - d3) / (d4 - d3 + (d5 - d6));
    out.set(bx + (cx - bx) * t, by + (cy - by) * t, bz + (cz - bz) * t);
    return sqDist(px, py, pz, out.x, out.y, out.z);
  }

  const denom = 1 / (va + vb + vc);
  const vv = vb * denom;
  const ww = vc * denom;
  out.set(ax + abx * vv + acx * ww, ay + aby * vv + acy * ww, az + abz * vv + acz * ww);
  return sqDist(px, py, pz, out.x, out.y, out.z);
}

function sqDist(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

const _stTri = new THREE.Vector3();
const _stSegA = new THREE.Vector3();
const _stSegB = new THREE.Vector3();

/**
 * Closest points between a segment and a triangle. Returns the squared
 * distance, or exactly 0 when the segment pierces the triangle.
 */
export function closestPointsSegmentTriangle(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  v: Float32Array,
  o: number,
  outSeg: THREE.Vector3,
  outTri: THREE.Vector3,
): number {
  const ax = v[o];
  const ay = v[o + 1];
  const az = v[o + 2];
  const bx = v[o + 3];
  const by = v[o + 4];
  const bz = v[o + 5];
  const cx = v[o + 6];
  const cy = v[o + 7];
  const cz = v[o + 8];

  // A segment that straddles the plane may pass through the face, in which
  // case the boundary-only tests below would report a spurious gap.
  const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
  const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
  const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const s0 = (p0.x - ax) * nx + (p0.y - ay) * ny + (p0.z - az) * nz;
  const s1 = (p1.x - ax) * nx + (p1.y - ay) * ny + (p1.z - az) * nz;
  if ((s0 < 0 && s1 > 0) || (s0 > 0 && s1 < 0)) {
    const t = s0 / (s0 - s1);
    const hx = p0.x + (p1.x - p0.x) * t;
    const hy = p0.y + (p1.y - p0.y) * t;
    const hz = p0.z + (p1.z - p0.z) * t;
    if (pointInTriangle(hx, hy, hz, v, o, nx, ny, nz)) {
      outSeg.set(hx, hy, hz);
      outTri.set(hx, hy, hz);
      return 0;
    }
  }

  let best = closestPointOnTriangle(p0.x, p0.y, p0.z, v, o, _stTri);
  outSeg.copy(p0);
  outTri.copy(_stTri);

  let d = closestPointOnTriangle(p1.x, p1.y, p1.z, v, o, _stTri);
  if (d < best) {
    best = d;
    outSeg.copy(p1);
    outTri.copy(_stTri);
  }

  d = closestPointsSegmentSegment(
    p0.x, p0.y, p0.z, p1.x, p1.y, p1.z,
    ax, ay, az, bx, by, bz,
    _stSegA, _stSegB,
  );
  if (d < best) {
    best = d;
    outSeg.copy(_stSegA);
    outTri.copy(_stSegB);
  }

  d = closestPointsSegmentSegment(
    p0.x, p0.y, p0.z, p1.x, p1.y, p1.z,
    bx, by, bz, cx, cy, cz,
    _stSegA, _stSegB,
  );
  if (d < best) {
    best = d;
    outSeg.copy(_stSegA);
    outTri.copy(_stSegB);
  }

  d = closestPointsSegmentSegment(
    p0.x, p0.y, p0.z, p1.x, p1.y, p1.z,
    cx, cy, cz, ax, ay, az,
    _stSegA, _stSegB,
  );
  if (d < best) {
    best = d;
    outSeg.copy(_stSegA);
    outTri.copy(_stSegB);
  }

  return best;
}

/** Barycentric containment test for a point already known to lie on the plane. */
function pointInTriangle(
  px: number,
  py: number,
  pz: number,
  v: Float32Array,
  o: number,
  nx: number,
  ny: number,
  nz: number,
): boolean {
  // Compare the signs of the three edge cross products against the face normal.
  const ax = v[o];
  const ay = v[o + 1];
  const az = v[o + 2];
  const bx = v[o + 3];
  const by = v[o + 4];
  const bz = v[o + 5];
  const cx = v[o + 6];
  const cy = v[o + 7];
  const cz = v[o + 8];

  let ex = bx - ax;
  let ey = by - ay;
  let ez = bz - az;
  let fx = px - ax;
  let fy = py - ay;
  let fz = pz - az;
  if ((ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz < 0) {
    return false;
  }

  ex = cx - bx;
  ey = cy - by;
  ez = cz - bz;
  fx = px - bx;
  fy = py - by;
  fz = pz - bz;
  if ((ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz < 0) {
    return false;
  }

  ex = ax - cx;
  ey = ay - cy;
  ez = az - cz;
  fx = px - cx;
  fy = py - cy;
  fz = pz - cz;
  return (ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz >= 0;
}

/**
 * Möller–Trumbore ray/triangle test, double sided.
 * Returns the hit distance along a unit-length direction, or -1.
 */
export function rayTriangle(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  v: Float32Array,
  o: number,
): number {
  const ax = v[o];
  const ay = v[o + 1];
  const az = v[o + 2];
  const e1x = v[o + 3] - ax;
  const e1y = v[o + 4] - ay;
  const e1z = v[o + 5] - az;
  const e2x = v[o + 6] - ax;
  const e2y = v[o + 7] - ay;
  const e2z = v[o + 8] - az;

  const px = dy * e2z - dz * e2y;
  const py = dz * e2x - dx * e2z;
  const pz = dx * e2y - dy * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (det > -1e-12 && det < 1e-12) return -1;
  const inv = 1 / det;

  const tx = ox - ax;
  const ty = oy - ay;
  const tz = oz - az;
  const u = (tx * px + ty * py + tz * pz) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return -1;

  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const vv = (dx * qx + dy * qy + dz * qz) * inv;
  if (vv < -1e-6 || u + vv > 1 + 1e-6) return -1;

  return (e2x * qx + e2y * qy + e2z * qz) * inv;
}

/* ------------------------------ sweeps --------------------------------- */

const _toiSeg0 = new THREE.Vector3();
const _toiSeg1 = new THREE.Vector3();
const _toiOnSeg = new THREE.Vector3();
const _toiOnTri = new THREE.Vector3();

/** Contact tolerance for swept queries; roughly a tenth of a millimetre. */
const TOI_TOL = 1e-4;

/**
 * Time of impact of a capsule swept along a unit direction against one
 * triangle, by conservative advancement.
 *
 * The distance between two convex shapes is a convex function of the sweep
 * parameter, so advancing by the current gap is guaranteed never to skip a
 * contact, and a gap that stops shrinking proves the shapes miss entirely.
 * Returns the hit distance, or -1 when the sweep misses.
 */
export function capsuleTriangleTOI(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  radius: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  v: Float32Array,
  o: number,
): number {
  let t = 0;
  let prev = Infinity;
  for (let iter = 0; iter < 32; iter++) {
    _toiSeg0.set(p0.x + dx * t, p0.y + dy * t, p0.z + dz * t);
    _toiSeg1.set(p1.x + dx * t, p1.y + dy * t, p1.z + dz * t);
    const gap =
      Math.sqrt(closestPointsSegmentTriangle(_toiSeg0, _toiSeg1, v, o, _toiOnSeg, _toiOnTri)) -
      radius;
    if (gap <= TOI_TOL) return t;
    // The gap stopped shrinking: the closest approach has been passed.
    if (gap >= prev - 1e-7) return -1;
    prev = gap;
    t += gap;
    if (t > maxDist) return -1;
  }
  // Ran out of refinement budget while still closing; stopping short is safe.
  return t <= maxDist ? t : -1;
}

/**
 * Contact between a capsule and one triangle at its current position.
 * Returns the penetration depth (>0) or -1 when there is no overlap.
 * `outNormal` points out of the triangle, towards the capsule.
 */
export function capsuleTriangleContact(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  radius: number,
  v: Float32Array,
  o: number,
  normals: Float32Array,
  no: number,
  outNormal: THREE.Vector3,
  outPoint: THREE.Vector3,
): number {
  const d2 = closestPointsSegmentTriangle(p0, p1, v, o, _toiOnSeg, _toiOnTri);
  const d = Math.sqrt(d2);
  if (d >= radius) return -1;
  outPoint.copy(_toiOnTri);
  if (d > 1e-5) {
    outNormal.set(
      (_toiOnSeg.x - _toiOnTri.x) / d,
      (_toiOnSeg.y - _toiOnTri.y) / d,
      (_toiOnSeg.z - _toiOnTri.z) / d,
    );
  } else {
    // Degenerate: the capsule axis touches the face, fall back to the normal
    // and orient it towards the capsule centre.
    outNormal.set(normals[no], normals[no + 1], normals[no + 2]);
    const mx = (p0.x + p1.x) * 0.5 - _toiOnTri.x;
    const my = (p0.y + p1.y) * 0.5 - _toiOnTri.y;
    const mz = (p0.z + p1.z) * 0.5 - _toiOnTri.z;
    if (outNormal.x * mx + outNormal.y * my + outNormal.z * mz < 0) outNormal.negate();
  }
  return radius - d;
}

/* ------------------------------- boxes --------------------------------- */

/**
 * Ray/AABB slab test against explicit bounds. Returns the entry distance, or
 * -1 when the ray misses within `maxDist`. Handles axis-parallel rays through
 * IEEE infinities.
 */
/**
 * Reciprocal of one ray direction component, for the slab test.
 *
 * A hard zero has to be replaced with something merely enormous. Otherwise
 * `(bound - origin) * Infinity` is `0 * Infinity` — NaN — for a ray that starts
 * exactly on a face plane and runs parallel to it, and the slab test rejects
 * the box. That is not an exotic ray: a level authored on a grid puts stair
 * seams, tile edges and wall planes on round numbers, so ground queries and
 * axis-aligned traces sit exactly on them constantly.
 */
export function invDir(d: number): number {
  if (d > 1e-30 || d < -1e-30) return 1 / d;
  return d < 0 ? -1e30 : 1e30;
}

export function rayAabb(
  ox: number,
  oy: number,
  oz: number,
  invx: number,
  invy: number,
  invz: number,
  minx: number,
  miny: number,
  minz: number,
  maxx: number,
  maxy: number,
  maxz: number,
  maxDist: number,
): number {
  let t0 = (minx - ox) * invx;
  let t1 = (maxx - ox) * invx;
  let tmin = t0 < t1 ? t0 : t1;
  let tmax = t0 < t1 ? t1 : t0;

  t0 = (miny - oy) * invy;
  t1 = (maxy - oy) * invy;
  const ymin = t0 < t1 ? t0 : t1;
  const ymax = t0 < t1 ? t1 : t0;
  if (ymin > tmin) tmin = ymin;
  if (ymax < tmax) tmax = ymax;

  t0 = (minz - oz) * invz;
  t1 = (maxz - oz) * invz;
  const zmin = t0 < t1 ? t0 : t1;
  const zmax = t0 < t1 ? t1 : t0;
  if (zmin > tmin) tmin = zmin;
  if (zmax < tmax) tmax = zmax;

  if (tmax < 0 || tmin > tmax || tmin > maxDist) return -1;
  return tmin < 0 ? 0 : tmin;
}

/** True when two axis-aligned boxes overlap. */
export function aabbOverlap(
  aMinX: number,
  aMinY: number,
  aMinZ: number,
  aMaxX: number,
  aMaxY: number,
  aMaxZ: number,
  bMinX: number,
  bMinY: number,
  bMinZ: number,
  bMaxX: number,
  bMaxY: number,
  bMaxZ: number,
): boolean {
  return (
    aMinX <= bMaxX &&
    aMaxX >= bMinX &&
    aMinY <= bMaxY &&
    aMaxY >= bMinY &&
    aMinZ <= bMaxZ &&
    aMaxZ >= bMinZ
  );
}
