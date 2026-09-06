// Geometry helpers for the Republic Carrack-class light cruiser: a tagged loft (every side quad of a
// multi-station loft is routed to a material bucket by a callback, so window bands, paint stripes and
// dark seams can be cut straight into the hull surface), rounded boxes along z, an elliptical dome cap
// for a side wall, and linear-space colour helpers.
import * as THREE from "three";
import { roundedRect, loftZ } from "./munificentGeo.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Vector3();

/**
 * Loft between stations `{ z, pts: [[x, y], ...] }` (equal point counts). For segment s and edge i the
 * callback `tag(s, i, A, B)` returns a bucket key (or null to skip the face). Caps are fan-triangulated
 * from the centroid and go to `capStart` / `capEnd` buckets when given. Faces are flat shaded and
 * wound outward regardless of the profile's winding. Returns Map(key -> BufferGeometry).
 */
export function loftTagged(
  stations,
  tag,
  { capStart = null, capEnd = null } = {},
) {
  const buckets = new Map();
  const push = (key, p0, p1, p2) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(...p0, ...p1, ...p2);
  };
  // outward test: the face normal must point away from the segment centroid
  const outward = (p0, p1, p2, c) => {
    _a.set(...p0);
    _b.set(...p1).sub(_a);
    _c.set(...p2).sub(_a);
    _n.crossVectors(_b, _c);
    _m.set(
      (p0[0] + p1[0] + p2[0]) / 3 - c[0],
      (p0[1] + p1[1] + p2[1]) / 3 - c[1],
      (p0[2] + p1[2] + p2[2]) / 3 - c[2],
    );
    return _n.dot(_m) >= 0;
  };
  const centroid = (S) => {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of S.pts) {
      cx += x;
      cy += y;
    }
    return [cx / S.pts.length, cy / S.pts.length, S.z];
  };
  const m = stations[0].pts.length;
  for (let s = 0; s + 1 < stations.length; s++) {
    const A = stations[s];
    const B = stations[s + 1];
    const ca = centroid(A);
    const cb = centroid(B);
    const c = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2, (ca[2] + cb[2]) / 2];
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      const key = tag(s, i, A, B);
      if (key === null || key === undefined) continue;
      const a0 = [A.pts[i][0], A.pts[i][1], A.z];
      const a1 = [A.pts[j][0], A.pts[j][1], A.z];
      const b0 = [B.pts[i][0], B.pts[i][1], B.z];
      const b1 = [B.pts[j][0], B.pts[j][1], B.z];
      // pick the non-degenerate triangle of the quad to decide the winding
      const probe = outward(a0, a1, b1, c) || outward(a0, b1, b0, c);
      const degenerate =
        Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) < 1e-6 &&
        Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) < 1e-6;
      if (degenerate) continue;
      if (probe) {
        push(key, a0, a1, b1);
        push(key, a0, b1, b0);
      } else {
        push(key, a0, b1, a1);
        push(key, a0, b0, b1);
      }
    }
  }
  const cap = (S, key, facing) => {
    const c = centroid(S);
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      const p0 = [S.pts[i][0], S.pts[i][1], S.z];
      const p1 = [S.pts[j][0], S.pts[j][1], S.z];
      _a.set(...c);
      _b.set(...p0).sub(_a);
      _c.set(...p1).sub(_a);
      _n.crossVectors(_b, _c);
      if (_n.z * facing >= 0) push(key, c, p0, p1);
      else push(key, c, p1, p0);
    }
  };
  if (capStart) cap(stations[0], capStart, -1);
  if (capEnd) cap(stations[stations.length - 1], capEnd, 1);
  const out = new Map();
  for (const [key, pos] of buckets) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    out.set(key, g);
  }
  return out;
}

/**
 * Strip of quads between two 3D polylines A[i] -> B[i] (equal lengths): glass panes and paint stripes
 * laid over a lofted face. Faces are wound so their normals agree with `hint` (a [x, y, z] vector or a
 * function(midpoint) -> vector); zero-area triangles are dropped.
 */
export function ribbon(A, B, hint) {
  const pos = [];
  const hintAt = typeof hint === "function" ? hint : () => hint;
  const tri = (p, q, r, h) => {
    _a.set(...p);
    _b.set(...q).sub(_a);
    _c.set(...r).sub(_a);
    _n.crossVectors(_b, _c);
    if (_n.lengthSq() < 1e-9) return;
    if (_n.x * h[0] + _n.y * h[1] + _n.z * h[2] >= 0)
      pos.push(...p, ...q, ...r);
    else pos.push(...p, ...r, ...q);
  };
  for (let i = 0; i + 1 < A.length; i++) {
    const a0 = A[i];
    const a1 = A[i + 1];
    const b0 = B[i];
    const b1 = B[i + 1];
    const h = hintAt([
      (a0[0] + a1[0] + b0[0] + b1[0]) / 4,
      (a0[1] + a1[1] + b0[1] + b1[1]) / 4,
      (a0[2] + a1[2] + b0[2] + b1[2]) / 4,
    ]);
    tri(a0, b0, b1, h);
    tri(a0, b1, a1, h);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Rounded box along z: centre (cx, cy), half sizes hw x hh, from z0 to z1, k segments per corner. */
export function roundedBoxZ(cx, cy, z0, z1, hw, hh, k = 2, r = 0.25) {
  return loftZ(
    roundedRect(k, r, r),
    [
      { z: z0, x: cx, y: cy, sx: hw, sy: hh },
      { z: z1, x: cx, y: cy, sx: hw, sy: hh },
    ],
    { capStart: true, capEnd: true, flat: true },
  );
}

/**
 * Elliptical dome on a side wall: centre (cx, cy, cz), half length along z `sz`, half height `sy`,
 * protrusion `depth` along ±x (side = +1 starboard, -1 port).
 */
export function sideDome(cx, cy, cz, sz, sy, depth, side, seg = 20, rings = 8) {
  const g = new THREE.SphereGeometry(
    1,
    seg,
    rings,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  // hemisphere pole is +y: pre-x -> ship y, pre-y -> ship x (after the roll), pre-z -> ship z
  g.scale(sy, depth, sz);
  g.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2);
  g.translate(cx, cy, cz);
  return g;
}

/** Hemisphere (pole +y) of radius r sitting on y = cy. */
export function domeUp(cx, cy, cz, r, seg = 10, rings = 5) {
  const g = new THREE.SphereGeometry(
    r,
    seg,
    rings,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  g.translate(cx, cy, cz);
  return g;
}

/** Linear-space colour (vertex tints are albedo multipliers on the plating map). */
export function lin(r, g, b) {
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

/** Scale a polygon about the origin: [[x, y]] -> [[x * kx, y * ky]]. */
export function scalePts(pts, kx, ky = kx) {
  return pts.map(([x, y]) => [x * kx, y * ky]);
}

/** Offset a convex-ish polygon outward from its centroid by d metres (approximate, per vertex). */
export function inflatePts(pts, d) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= pts.length;
  cy /= pts.length;
  return pts.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const l = Math.hypot(dx, dy) || 1;
    return [x + (dx / l) * d, y + (dy / l) * d];
  });
}
