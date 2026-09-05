// Procedural geometry helpers for the Lucrehulk: sweeps of a (r, y) profile around the ship's +Y axis
// (the ring, its bands, plates and grooves) with flat normals across the profile and smooth normals
// along the arc, general profile sweeps along station paths with parallel-transported frames (the
// hooked docking pills), oriented quads batched into one buffer (window rows), spherical patches,
// frame placement with reflection handling, per-face planar UVs, per-face / per-vertex tints and the
// part wrapper that keeps the shipKit contract ({ geo, mat, lod, name }).
import * as THREE from "three";
import { tintGeometry } from "../fleet.js";

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------
// small vector helpers on plain arrays
// ---------------------------------------------------------------------------
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  mad: (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
};

// polar frame around +Y: th = 0 at the bow (-Z), growing toward +X (starboard)
export function polar(r, th, y = 0) {
  return [r * Math.sin(th), y, -r * Math.cos(th)];
}
export function radialDir(th) {
  return [Math.sin(th), 0, -Math.cos(th)];
}
export function tangentDir(th) {
  return [Math.cos(th), 0, Math.sin(th)];
}

// ---------------------------------------------------------------------------
// triangle accumulator with analytic normals; winding is fixed per triangle to agree with the normal
// ---------------------------------------------------------------------------
export class TriBuf {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.uv = [];
  }
  tri(a, b, c, na, nb, nc, ua, ub, uc) {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const abz = b[2] - a[2];
    const acx = c[0] - a[0];
    const acy = c[1] - a[1];
    const acz = c[2] - a[2];
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    if (fx * na[0] + fy * na[1] + fz * na[2] < 0) {
      this.pos.push(...a, ...c, ...b);
      this.nor.push(...na, ...nc, ...nb);
      this.uv.push(...ua, ...uc, ...ub);
    } else {
      this.pos.push(...a, ...b, ...c);
      this.nor.push(...na, ...nb, ...nc);
      this.uv.push(...ua, ...ub, ...uc);
    }
  }
  quad(a, b, c, d, na, nb, nc, nd, ua, ub, uc, ud) {
    this.tri(a, b, c, na, nb, nc, ua, ub, uc);
    this.tri(a, c, d, na, nc, nd, ua, uc, ud);
  }
  flatQuad(a, b, c, d, n, uvs = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    this.quad(a, b, c, d, n, n, n, n, uvs[0], uvs[1], uvs[2], uvs[3]);
  }
  get count() {
    return this.pos.length / 3;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

// flat quad centred at c facing n, `len` along `along`, `wid` across, lifted off c along n
export function addQuad(buf, c, n, along, len, wid, lift = 0, texel = 1 / 8) {
  const N = v3.norm(n);
  const A = v3.norm(v3.mad(along, N, -v3.dot(along, N)));
  const B = v3.cross(N, A);
  const C = v3.mad(c, N, lift);
  const P = (sa, sb) => v3.mad(v3.mad(C, A, (sa * len) / 2), B, (sb * wid) / 2);
  buf.flatQuad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), N, [
    [0, 0],
    [len * texel, 0],
    [len * texel, wid * texel],
    [0, wid * texel],
  ]);
}

// ---------------------------------------------------------------------------
// sweeps
// ---------------------------------------------------------------------------

/**
 * Sweep a profile of [r, y] points (counter-clockwise with r to the right and y up, so the outward
 * normals fall outside) around +Y from angle a0 to a1 in n segments. Open profiles become strips.
 * UVs: u = arc length along the ring at the vertex radius, v = arc length along the profile (× texel).
 * Caps (closed profiles) are triangulated with earcut; `noSides` builds caps only.
 */
export function sweepArc(profile, a0, a1, n, opts = {}) {
  const {
    closed = true,
    capStart = false,
    capEnd = false,
    texel = 1 / 40,
    noSides = false,
    buf = new TriBuf(),
  } = opts;
  const m = profile.length;
  const edges = closed ? m : m - 1;
  const s = [0];
  for (let j = 1; j <= m; j++) {
    const p = profile[j % m];
    const q = profile[j - 1];
    s.push(s[j - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  if (!noSides)
    for (let j = 0; j < edges; j++) {
      const [r0, y0] = profile[j];
      const [r1, y1] = profile[(j + 1) % m];
      const dr = r1 - r0;
      const dy = y1 - y0;
      const L = Math.hypot(dr, dy) || 1;
      const nr = dy / L;
      const ny = -dr / L;
      for (let i = 0; i < n; i++) {
        const t0 = a0 + ((a1 - a0) * i) / n;
        const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
        const n0 = [nr * Math.sin(t0), ny, -nr * Math.cos(t0)];
        const n1 = [nr * Math.sin(t1), ny, -nr * Math.cos(t1)];
        buf.quad(
          polar(r0, t0, y0),
          polar(r1, t0, y1),
          polar(r1, t1, y1),
          polar(r0, t1, y0),
          n0,
          n0,
          n1,
          n1,
          [t0 * r0 * texel, s[j] * texel],
          [t0 * r1 * texel, s[j + 1] * texel],
          [t1 * r1 * texel, s[j + 1] * texel],
          [t1 * r0 * texel, s[j] * texel],
        );
      }
    }
  if (closed && (capStart || capEnd)) {
    const contour = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const cap = (th, sign) => {
      const nrm = v3.scale(tangentDir(th), sign);
      for (const [i0, i1, i2] of tris) {
        const P = (k) => polar(profile[k][0], th, profile[k][1]);
        const U = (k) => [profile[k][0] * texel, profile[k][1] * texel];
        buf.tri(P(i0), P(i1), P(i2), nrm, nrm, nrm, U(i0), U(i1), U(i2));
      }
    };
    if (capStart) cap(a0, -1);
    if (capEnd) cap(a1, 1);
  }
  return opts.buf ? buf : buf.build();
}

// closed box following the arc: r0..r1 by y0..y1 over a0..a1 (caps at both ends)
export function arcBox(r0, r1, y0, y1, a0, a1, n, texel = 1 / 40, buf) {
  return sweepArc(
    [
      [r0, y0],
      [r1, y0],
      [r1, y1],
      [r0, y1],
    ],
    a0,
    a1,
    n,
    { capStart: true, capEnd: true, texel, buf },
  );
}

// flat annular strip at height y (facing up unless `down`)
export function arcStrip(r0, r1, y, a0, a1, n, opts = {}) {
  const prof = opts.down
    ? [
        [r0, y],
        [r1, y],
      ]
    : [
        [r1, y],
        [r0, y],
      ];
  return sweepArc(prof, a0, a1, n, { ...opts, closed: false });
}

/**
 * Flat deck panel between r0 and r1 at height y whose angular span differs at the inner and outer
 * edges ([ai0, ai1] at r0, [ao0, ao1] at r1): angled ends, chevrons, tapered bands. Faces up unless
 * `down`.
 */
export function arcPanel(r0, r1, y, inner, outer, n, opts = {}) {
  const { down = false, texel = 1 / 40, buf = new TriBuf() } = opts;
  const N = [0, down ? -1 : 1, 0];
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const ai = (t) => inner[0] + (inner[1] - inner[0]) * t;
    const ao = (t) => outer[0] + (outer[1] - outer[0]) * t;
    buf.flatQuad(
      polar(r0, ai(t0), y),
      polar(r1, ao(t0), y),
      polar(r1, ao(t1), y),
      polar(r0, ai(t1), y),
      N,
      [
        [ai(t0) * r0 * texel, r0 * texel],
        [ao(t0) * r1 * texel, r1 * texel],
        [ao(t1) * r1 * texel, r1 * texel],
        [ai(t1) * r0 * texel, r0 * texel],
      ],
    );
  }
  return opts.buf ? buf : buf.build();
}

// vertical cylindrical strip at radius r between y0 and y1 (facing outward unless `inward`)
export function wallStrip(r, y0, y1, a0, a1, n, opts = {}) {
  const prof = opts.inward
    ? [
        [r, y1],
        [r, y0],
      ]
    : [
        [r, y0],
        [r, y1],
      ];
  return sweepArc(prof, a0, a1, n, { ...opts, closed: false });
}

/**
 * Sweep a 2D profile ([u, v] pairs, counter-clockwise, in metres) along stations { p, t?, sx?, sy? }
 * with parallel-transported frames (U × V = T). Smooth along the path, flat across profile edges.
 */
export function sweepPath(profile, stations, opts = {}) {
  const {
    closed = true,
    capStart = false,
    capEnd = false,
    texel = 1 / 40,
    up = [0, 1, 0],
    buf = new TriBuf(),
  } = opts;
  const n = stations.length;
  const m = profile.length;
  const T = [];
  const U = [];
  const V = [];
  const dist = [0];
  for (let i = 0; i < n; i++) {
    const st = stations[i];
    let t;
    if (st.t) t = v3.norm(st.t);
    else {
      const p0 = stations[Math.max(0, i - 1)].p;
      const p1 = stations[Math.min(n - 1, i + 1)].p;
      t = v3.norm(v3.sub(p1, p0));
    }
    T.push(t);
    const ref = i === 0 ? st.up || up : V[i - 1];
    let v = v3.mad(ref, t, -v3.dot(ref, t));
    if (v3.len(v) < 1e-6) v = v3.mad([1, 0, 0], t, -t[0]);
    v = v3.norm(v);
    V.push(v);
    U.push(v3.cross(v, t));
    if (i > 0) dist.push(dist[i - 1] + v3.len(v3.sub(st.p, stations[i - 1].p)));
  }
  const s = [0];
  for (let j = 1; j <= m; j++) {
    const p = profile[j % m];
    const q = profile[j - 1];
    s.push(s[j - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const at = (i, u, v) => {
    const st = stations[i];
    const sx = st.sx ?? 1;
    const sy = st.sy ?? 1;
    return v3.mad(v3.mad(st.p, U[i], u * sx), V[i], v * sy);
  };
  const nrm = (i, nu, nv) => v3.norm(v3.mad(v3.scale(U[i], nu), V[i], nv));
  const edges = closed ? m : m - 1;
  for (let j = 0; j < edges; j++) {
    const [u0, v0] = profile[j];
    const [u1, v1] = profile[(j + 1) % m];
    const du = u1 - u0;
    const dv = v1 - v0;
    const L = Math.hypot(du, dv) || 1;
    const nu = dv / L;
    const nv = -du / L;
    for (let i = 0; i + 1 < n; i++) {
      buf.quad(
        at(i, u0, v0),
        at(i, u1, v1),
        at(i + 1, u1, v1),
        at(i + 1, u0, v0),
        nrm(i, nu, nv),
        nrm(i, nu, nv),
        nrm(i + 1, nu, nv),
        nrm(i + 1, nu, nv),
        [s[j] * texel, dist[i] * texel],
        [s[j + 1] * texel, dist[i] * texel],
        [s[j + 1] * texel, dist[i + 1] * texel],
        [s[j] * texel, dist[i + 1] * texel],
      );
    }
  }
  if (closed && (capStart || capEnd)) {
    const contour = profile.map(([u, v]) => new THREE.Vector2(u, v));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const cap = (i, sign) => {
      const nn = v3.scale(T[i], sign);
      for (const [i0, i1, i2] of tris) {
        const P = (k) => at(i, profile[k][0], profile[k][1]);
        const Uv = (k) => [profile[k][0] * texel, profile[k][1] * texel];
        buf.tri(P(i0), P(i1), P(i2), nn, nn, nn, Uv(i0), Uv(i1), Uv(i2));
      }
    };
    if (capStart) cap(0, -1);
    if (capEnd) cap(n - 1, 1);
  }
  return opts.buf ? buf : buf.build();
}

// |u|^p + |v|^p = 1 scaled by (a, b), counter-clockwise
export function superellipse(n, p, a = 1, b = a) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const c = Math.cos(t);
    const sn = Math.sin(t);
    pts.push([
      a * Math.sign(c) * Math.abs(c) ** (2 / p),
      b * Math.sign(sn) * Math.abs(sn) ** (2 / p),
    ]);
  }
  return pts;
}

// counter-clockwise rounded rectangle (half sizes hw, hh; corner radius rc; k segments per corner)
export function roundedRect(hw, hh, rc, k = 3) {
  const pts = [];
  const cx = hw - rc;
  const cy = hh - rc;
  for (let c = 0; c < 4; c++) {
    const sx = c === 0 || c === 3 ? 1 : -1;
    const sy = c < 2 ? 1 : -1;
    const a0 = (c * Math.PI) / 2;
    for (let i = 0; i <= k; i++) {
      const a = a0 + ((i / k) * Math.PI) / 2;
      pts.push([sx * cx + rc * Math.cos(a), sy * cy + rc * Math.sin(a)]);
    }
  }
  return pts;
}

/**
 * Patch of a sphere of radius R (centre c) between latitudes and longitudes (radians; longitude in
 * the ring's th convention), lifted off the surface; smooth normals. lon0 / lon1 may be functions of
 * the latitude fraction t in [0, 1] (tapered and skewed panels).
 */
export function spherePatch(
  R,
  lat0,
  lat1,
  lon0,
  lon1,
  nLat,
  nLon,
  lift = 0.8,
  c = [0, 0, 0],
  texel = 1 / 40,
  buf = new TriBuf(),
) {
  const P = (la, lo) => {
    const n = [
      Math.cos(la) * Math.sin(lo),
      Math.sin(la),
      -Math.cos(la) * Math.cos(lo),
    ];
    return { p: v3.mad(c, n, R + lift), n };
  };
  const L0 = typeof lon0 === "function" ? lon0 : () => lon0;
  const L1 = typeof lon1 === "function" ? lon1 : () => lon1;
  for (let i = 0; i < nLat; i++) {
    const t0 = i / nLat;
    const t1 = (i + 1) / nLat;
    const la0 = lat0 + (lat1 - lat0) * t0;
    const la1 = lat0 + (lat1 - lat0) * t1;
    for (let j = 0; j < nLon; j++) {
      const lo0 = L0(t0) + ((L1(t0) - L0(t0)) * j) / nLon;
      const lo1 = L0(t0) + ((L1(t0) - L0(t0)) * (j + 1)) / nLon;
      const lo0b = L0(t1) + ((L1(t1) - L0(t1)) * j) / nLon;
      const lo1b = L0(t1) + ((L1(t1) - L0(t1)) * (j + 1)) / nLon;
      const a = P(la0, lo0);
      const b = P(la0, lo1);
      const d = P(la1, lo0b);
      const e = P(la1, lo1b);
      const uv = (la, lo) => [lo * R * texel, la * R * texel];
      buf.quad(
        a.p,
        b.p,
        e.p,
        d.p,
        a.n,
        b.n,
        e.n,
        d.n,
        uv(la0, lo0),
        uv(la0, lo1),
        uv(la1, lo1b),
        uv(la1, lo0b),
      );
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// placement and attributes
// ---------------------------------------------------------------------------

// reverse the winding of every triangle, keeping the per-vertex normals / uvs / colours attached
export function flipFaces(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of ["position", "normal", "uv", "color"]) {
    const attr = g.attributes[name];
    if (!attr) continue;
    const arr = attr.array;
    const k = attr.itemSize;
    for (let t = 0; t + 2 < attr.count; t += 3) {
      const i1 = (t + 1) * k;
      const i2 = (t + 2) * k;
      for (let q = 0; q < k; q++) {
        const tmp = arr[i1 + q];
        arr[i1 + q] = arr[i2 + q];
        arr[i2 + q] = tmp;
      }
    }
  }
  return g;
}

// place a geometry with its local x/y/z axes along u/v/w at origin; reflections keep faces outward
export function placeGeo(geo, origin, u, v, w) {
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...u),
    new THREE.Vector3(...v),
    new THREE.Vector3(...w),
  );
  m.setPosition(origin[0], origin[1], origin[2]);
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(m);
  if (m.determinant() < 0) g = flipFaces(g);
  return g;
}

// box centred at c with half sizes h along the frame (u, v, w)
export function boxIn(frame, c, size) {
  const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
  return placeGeo(g, frameToWorld(frame, c), frame.u, frame.v, frame.w);
}
export function frameToWorld(frame, c) {
  return v3.add(
    frame.o,
    v3.add(
      v3.scale(frame.u, c[0]),
      v3.add(v3.scale(frame.v, c[1]), v3.scale(frame.w, c[2])),
    ),
  );
}
// cylinder along the frame's local axis (`axis` = "u" | "v" | "w"), r0 at the +axis end
export function cylIn(frame, c, axis, r0, r1, len, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  if (axis === "w") g.rotateX(Math.PI / 2);
  else if (axis === "u") g.rotateZ(-Math.PI / 2);
  return placeGeo(g, frameToWorld(frame, c), frame.u, frame.v, frame.w);
}

// cylinder from a to b (world), radius r
export function tube(a, b, r0, r1 = r0, seg = 12, open = false) {
  const d = v3.sub(b, a);
  const len = v3.len(d);
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(...d).normalize(),
  );
  g.applyQuaternion(q);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

// box from a to b with cross-section w × h (h along the up hint)
export function bar(a, b, w, h = w, up = [0, 1, 0]) {
  const d = v3.sub(b, a);
  const len = v3.len(d);
  const t = v3.norm(d);
  let v = v3.mad(up, t, -v3.dot(up, t));
  if (v3.len(v) < 1e-6) v = v3.mad([1, 0, 0], t, -t[0]);
  v = v3.norm(v);
  const u = v3.cross(v, t);
  const g = new THREE.BoxGeometry(w, h, len);
  return placeGeo(g, v3.mad(a, d, 0.5), u, v, t);
}

// object-space planar UVs chosen per face from the geometric face normal
export function faceUV(g, texel) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let t = 0; t + 2 < pos.count; t += 3) {
    const ax = pos.getX(t);
    const ay = pos.getY(t);
    const az = pos.getZ(t);
    const bx = pos.getX(t + 1) - ax;
    const by = pos.getY(t + 1) - ay;
    const bz = pos.getZ(t + 1) - az;
    const cx = pos.getX(t + 2) - ax;
    const cy = pos.getY(t + 2) - ay;
    const cz = pos.getZ(t + 2) - az;
    const nx = Math.abs(by * cz - bz * cy);
    const ny = Math.abs(bz * cx - bx * cz);
    const nz = Math.abs(bx * cy - by * cx);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(t + k);
      const y = pos.getY(t + k);
      const z = pos.getZ(t + k);
      let u;
      let v;
      if (ny >= nx && ny >= nz) ((u = x), (v = z));
      else if (nx >= nz) ((u = z), (v = y));
      else ((u = x), (v = y));
      uv[(t + k) * 2] = u * texel;
      uv[(t + k) * 2 + 1] = v * texel;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

// per-vertex colour from fn(x, y, z, out, nx, ny, nz); perFace evaluates once per triangle (centroid)
export function tintBy(g, fn, perFace = false) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  if (perFace) {
    for (let t = 0; t + 2 < pos.count; t += 3) {
      const x = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
      const y = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
      const z = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
      const nx = nor ? nor.getX(t) : 0;
      const ny = nor ? nor.getY(t) : 1;
      const nz = nor ? nor.getZ(t) : 0;
      fn(x, y, z, c, nx, ny, nz);
      for (let k = 0; k < 3; k++) {
        arr[(t + k) * 3] = c.r;
        arr[(t + k) * 3 + 1] = c.g;
        arr[(t + k) * 3 + 2] = c.b;
      }
    }
  } else
    for (let i = 0; i < pos.count; i++) {
      fn(
        pos.getX(i),
        pos.getY(i),
        pos.getZ(i),
        c,
        nor ? nor.getX(i) : 0,
        nor ? nor.getY(i) : 1,
        nor ? nor.getZ(i) : 0,
      );
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

export function col(hex, k = 1) {
  return new THREE.Color(hex).multiplyScalar(k);
}
export function mix(a, b, t, out = new THREE.Color()) {
  return out.copy(a).lerp(b, t);
}
export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Part wrapper (shipKit.part contract): per-face planar UVs at `texel` unless uv === "keep" (sweeps
 * carry arc-length UVs), a uniform `color` or a `tint(x, y, z, out, nx, ny, nz)` function, evaluated
 * per face when `flatTint` is set.
 */
export function lpart(
  geo,
  mat,
  {
    color = 0xffffff,
    texel = 1 / 16,
    lod = 0,
    name = "",
    uv = "planar",
    tint = null,
    flatTint = false,
  } = {},
) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (uv === "planar" || !g.attributes.uv) faceUV(g, texel);
  if (tint) tintBy(g, tint, flatTint);
  else tintGeometry(g, color);
  return { geo: g, mat, lod, name };
}
