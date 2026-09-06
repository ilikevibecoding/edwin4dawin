// Hull-shell helpers for the reference-matched Munificent: strip lofts between arbitrary per-station
// point rings (for the split cylindrical armour shells whose angular span, radius and centre change
// along the hull — the crescent bow horns and the tapered stern hoods), ribbons that hug a shell along
// its stations (panel seams), flat polygons and radial emblems wrapped onto a cylinder (the Banking
// Clan hexagon), and small building blocks used by the bow / stern / tower code.
import * as THREE from "three";
import { flipFaces } from "./munificentGeo.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/**
 * Loft an open surface through `rings`: an array of stations, each an array of m points [x, y, z]
 * (same m for every station). Consecutive stations are joined by quads, smooth normals along both
 * directions, UVs from the arc length along the ring (u) and the path length (v) × texel. If `orient`
 * is given, faces are wound so their normals point away from that point (a point inside the shell).
 */
export function loftStrips(
  rings,
  { texel = 0, orient = null, vOffset = 0 } = {},
) {
  const n = rings.length;
  const m = rings[0].length;
  const pos = [];
  const uvs = [];
  let path = vOffset;
  for (let i = 0; i < n; i++) {
    const ring = rings[i];
    if (i > 0) {
      const p0 = rings[i - 1][0];
      const p1 = ring[0];
      path += Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    }
    let arc = 0;
    for (let j = 0; j < m; j++) {
      const p = ring[j];
      if (j > 0) {
        const q = ring[j - 1];
        arc += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      }
      pos.push(p[0], p[1], p[2]);
      uvs.push(arc * texel, path * texel);
    }
  }
  const idx = [];
  for (let i = 0; i + 1 < n; i++)
    for (let j = 0; j + 1 < m; j++) {
      const a = i * m + j;
      const b = a + 1;
      const c = (i + 1) * m + j + 1;
      const d = (i + 1) * m + j;
      idx.push(a, b, c, a, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (texel) g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  if (orient) {
    // test the largest non-degenerate face against the orientation point
    const P = ng.attributes.position;
    let best = -1;
    let bestArea = 0;
    for (let t = 0; t < P.count; t += 3) {
      _a.fromBufferAttribute(P, t);
      _b.fromBufferAttribute(P, t + 1).sub(_a);
      _c.fromBufferAttribute(P, t + 2).sub(_a);
      const area = _b.cross(_c).length();
      if (area > bestArea) {
        bestArea = area;
        best = t;
      }
    }
    if (best >= 0) {
      _a.fromBufferAttribute(P, best);
      _b.fromBufferAttribute(P, best + 1).sub(_a);
      _c.fromBufferAttribute(P, best + 2).sub(_a);
      const nrm = _b.cross(_c);
      const centre = _a
        .clone()
        .add(new THREE.Vector3().fromBufferAttribute(P, best + 1))
        .add(new THREE.Vector3().fromBufferAttribute(P, best + 2))
        .multiplyScalar(1 / 3);
      const out = centre.sub(new THREE.Vector3(...orient));
      if (nrm.dot(out) < 0) return flipFaces(ng);
    }
  }
  return ng;
}

/**
 * Points of a cylinder-arc ring: angle from a0 to a1 (radians, CCW seen from +z, 0 = +x), radius r
 * around (cx, cy) at z, n points. `lift` moves the ring radially.
 */
export function arcRing(cx, cy, z, r, a0, a1, n, lift = 0) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const a = a0 + ((a1 - a0) * j) / (n - 1);
    out.push([cx + Math.cos(a) * (r + lift), cy + Math.sin(a) * (r + lift), z]);
  }
  return out;
}

/**
 * A thin ribbon that follows a list of surface points with outward normals and an "across" direction
 * per point: width w, lifted `lift` above the surface. Returns a strip geometry (two points per station).
 */
export function ribbon(points, normals, across, w, lift = 0.3) {
  const rings = points.map((p, i) => {
    const nrm = new THREE.Vector3(...normals[i]).normalize();
    const acr = new THREE.Vector3(...across[i]).normalize();
    const c = new THREE.Vector3(...p).addScaledVector(nrm, lift);
    return [
      c
        .clone()
        .addScaledVector(acr, -w / 2)
        .toArray(),
      c
        .clone()
        .addScaledVector(acr, w / 2)
        .toArray(),
    ];
  });
  const g = loftStrips(rings, { texel: 1 / 4 });
  // orient along the first normal
  _a.fromBufferAttribute(g.attributes.normal, 0);
  _b.set(...normals[0]);
  return _a.dot(_b) < 0 ? flipFaces(g) : g;
}

/**
 * Flat convex polygon (fan) wrapped onto a cylinder of radius R around the axis (0, yc) parallel to z:
 * local 2D points [u, v] with u along z from z0 and v along the arc from angle a0 (metres); lifted
 * `lift` off the surface. Mirrored to the port side when `side` < 0 (angles mirrored about the y axis).
 */
export function polyOnCylinder(points, R, yc, a0, z0, lift = 0.4, side = 1) {
  const map = ([u, v]) => {
    const a = a0 + v / R;
    const x = Math.cos(a) * (R + lift) * side;
    const y = yc + Math.sin(a) * (R + lift);
    return [x, y, z0 + u];
  };
  const P = points.map(map);
  const pos = [];
  for (let i = 1; i + 1 < P.length; i++)
    pos.push(...P[0], ...P[i], ...P[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // outward = away from the axis
  const am = a0 + points[0][1] / R;
  _a.fromBufferAttribute(g.attributes.normal, 0);
  _b.set(Math.cos(am) * side, Math.sin(am), 0);
  return _a.dot(_b) < 0 ? flipFaces(g) : g;
}

/** Regular hexagon (circumradius r) as [u, v] pairs, flat sides top/bottom when `flat` is set. */
export function hexagon(r, rot = 0) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** Thin quad strip between two 2D points (width w) as a 4-point polygon. */
export function bar2D(p0, p1, w) {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  return [
    [p0[0] + nx, p0[1] + ny],
    [p1[0] + nx, p1[1] + ny],
    [p1[0] - nx, p1[1] - ny],
    [p0[0] - nx, p0[1] - ny],
  ];
}

/** Box aligned to a local frame: centre c, axes (a, b, n) with half sizes (ha, hb, hn). */
export function framedBox(c, a, b, n, ha, hb, hn) {
  const g = new THREE.BoxGeometry(ha * 2, hn * 2, hb * 2);
  const A = new THREE.Vector3(...a).normalize();
  const N = new THREE.Vector3(...n).normalize();
  const B = new THREE.Vector3().crossVectors(N, A).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(A, N, B.negate()),
  );
  g.applyQuaternion(q);
  g.translate(c[0], c[1], c[2]);
  return g;
}

/** Smooth monotone interpolation on a [[t, value], ...] table (cubic Hermite, Fritsch–Carlson). */
export function smoothTable(rows) {
  const n = rows.length;
  const m = new Array(n).fill(0);
  const d = [];
  for (let i = 0; i + 1 < n; i++)
    d.push((rows[i + 1][1] - rows[i][1]) / (rows[i + 1][0] - rows[i][0]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i + 1 < n; i++)
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  return (t) => {
    if (t <= rows[0][0]) return rows[0][1];
    if (t >= rows[n - 1][0]) return rows[n - 1][1];
    let i = 0;
    while (t > rows[i + 1][0]) i++;
    const h = rows[i + 1][0] - rows[i][0];
    const s = (t - rows[i][0]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * rows[i][1] +
      (s3 - 2 * s2 + s) * h * m[i] +
      (-2 * s3 + 3 * s2) * rows[i + 1][1] +
      (s3 - s2) * h * m[i + 1]
    );
  };
}
