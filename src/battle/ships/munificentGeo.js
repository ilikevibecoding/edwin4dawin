// Procedural geometry helpers shared by the Separatist Munificent and Recusant models: closed/open
// profile sweeps along curves (smooth or flat normals, optional caps), lofts along z, per-face planar UVs,
// gradient tints, oriented bars, flipped shells for nozzle interiors and a part wrapper that keeps the
// shipKit part contract ({ geo, mat, lod, name }) while using those UVs and tints.
import * as THREE from "three";
import { tintGeometry } from "../fleet.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();

// ---------------------------------------------------------------------------
// profiles: polygons in [-1, 1]^2 as [u, v] pairs, counter-clockwise (u right, v up)
// ---------------------------------------------------------------------------

// rounded rectangle with k segments per corner; rx / ry are the corner radii as fractions of the half size
export function roundedRect(k = 3, rx = 0.3, ry = rx) {
  const pts = [];
  const cx = 1 - rx;
  const cy = 1 - ry;
  for (let c = 0; c < 4; c++) {
    const sx = c === 0 || c === 3 ? 1 : -1;
    const sy = c < 2 ? 1 : -1;
    const a0 = (c * Math.PI) / 2;
    for (let i = 0; i <= k; i++) {
      const a = a0 + ((i / k) * Math.PI) / 2;
      pts.push([sx * cx + rx * Math.cos(a), sy * cy + ry * Math.sin(a)]);
    }
  }
  return pts;
}

// |u|^p + |v|^p = 1 (p = 2 circle, larger = squarer)
export function superellipse(n = 24, p = 2.5) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push([
      Math.sign(c) * Math.abs(c) ** (2 / p),
      Math.sign(s) * Math.abs(s) ** (2 / p),
    ]);
  }
  return pts;
}

// u extent of a superellipse at height v
export function superellipseU(v, p = 2.5) {
  const t = Math.min(1, Math.abs(v));
  return (1 - t ** p) ** (1 / p);
}

// rounded rectangle whose top carries a trapezoidal channel (rim half-width w1, floor half-width w0,
// depth d); returns { hull, channel } open strips that together close the section, plus the full loop
export function channelRect(k, rx, ry, w1, w0, d) {
  const rr = roundedRect(k, rx, ry);
  const per = k + 1;
  const arc0 = rr.slice(0, per); // right-top corner (0..90°)
  const arc1 = rr.slice(per, 2 * per); // left-top
  const arc2 = rr.slice(2 * per, 3 * per);
  const arc3 = rr.slice(3 * per, 4 * per);
  const notch = [
    [w1, 1],
    [w0, 1 - d],
    [-w0, 1 - d],
    [-w1, 1],
  ];
  const hull = [[-w1, 1], ...arc1, ...arc2, ...arc3, ...arc0, [w1, 1]];
  return {
    hull,
    channel: notch,
    loop: [...arc0, ...notch, ...arc1, ...arc2, ...arc3],
  };
}

// fin blade section: wide root at v = -1 tapering to a rounded edge at v = 1 (root is meant to be buried)
export function blade() {
  return [
    [1, -1],
    [1, -0.55],
    [0.78, 0.1],
    [0.5, 0.62],
    [0.22, 0.92],
    [0, 1],
    [-0.22, 0.92],
    [-0.5, 0.62],
    [-0.78, 0.1],
    [-1, -0.55],
    [-1, -1],
  ];
}
// half thickness fraction of blade() at height v
export function bladeU(v) {
  const b = blade();
  for (let i = 0; i + 1 < 6; i++) {
    const [u0, v0] = b[i];
    const [u1, v1] = b[i + 1];
    if (v >= v0 && v <= v1) return u0 + ((v - v0) / (v1 - v0)) * (u1 - u0);
  }
  return v < -1 ? 1 : 0;
}

// flattened octagon: a slab with bevelled edges
export function slabProfile(bevel = 0.3, sideV = 0.35) {
  return [
    [1, -sideV],
    [1, sideV],
    [1 - bevel, 1],
    [-(1 - bevel), 1],
    [-1, sideV],
    [-1, -sideV],
    [-(1 - bevel), -1],
    [1 - bevel, -1],
  ];
}

export function mirrorV(profile) {
  return profile.map(([u, v]) => [u, -v]).reverse();
}
export function scaleProfile(profile, su, sv = su) {
  return profile.map(([u, v]) => [u * su, v * sv]);
}
export function offsetProfile(profile, du, dv) {
  return profile.map(([u, v]) => [u + du, v + dv]);
}
// sub-range of a closed profile (indices i0..i1 inclusive, wrapping) as an open strip
export function strip(profile, i0, i1) {
  const out = [];
  const m = profile.length;
  let i = i0;
  for (;;) {
    out.push(profile[i]);
    if (i === i1) break;
    i = (i + 1) % m;
  }
  return out;
}

// ---------------------------------------------------------------------------
// sweeps
// ---------------------------------------------------------------------------

/**
 * Sweep a profile along stations. Each station: { p: [x,y,z], sx, sy, t?: tangent, up?: up hint, roll? }.
 * Frame: N = up × T (profile u), B = T × N (profile v). Closed profiles get side quads all round and
 * optional flat caps; open profiles are strips. Smooth normals unless `flat`.
 */
export function sweep(profile, stations, opts = {}) {
  const {
    closed = true,
    capStart = false,
    capEnd = false,
    flat = false,
    up = [0, 1, 0],
  } = opts;
  const n = stations.length;
  const m = profile.length;
  const pos = [];
  const centres = [];
  const U0 = new THREE.Vector3(...up);
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const P = new THREE.Vector3();
  const U = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const s = stations[i];
    P.set(s.p[0], s.p[1], s.p[2]);
    if (s.t) T.set(s.t[0], s.t[1], s.t[2]).normalize();
    else {
      const prev = stations[Math.max(0, i - 1)].p;
      const next = stations[Math.min(n - 1, i + 1)].p;
      T.set(
        next[0] - prev[0],
        next[1] - prev[1],
        next[2] - prev[2],
      ).normalize();
    }
    if (s.up) U.set(s.up[0], s.up[1], s.up[2]);
    else U.copy(U0);
    N.crossVectors(U, T).normalize();
    B.crossVectors(T, N).normalize();
    if (s.roll) {
      const q = new THREE.Quaternion().setFromAxisAngle(T, s.roll);
      N.applyQuaternion(q);
      B.applyQuaternion(q);
    }
    centres.push(P.clone());
    for (const [u, v] of profile) {
      pos.push(
        P.x + N.x * u * s.sx + B.x * v * s.sy,
        P.y + N.y * u * s.sx + B.y * v * s.sy,
        P.z + N.z * u * s.sx + B.z * v * s.sy,
      );
    }
  }
  const idx = [];
  const segs = closed ? m : m - 1;
  for (let i = 0; i + 1 < n; i++) {
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % m;
      const a = i * m + j;
      const b = i * m + j1;
      const c = (i + 1) * m + j1;
      const d = (i + 1) * m + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  const cap = (i, forward) => {
    const base = pos.length / 3;
    const c = centres[i];
    pos.push(c.x, c.y, c.z);
    for (let j = 0; j < m; j++) {
      const k = (i * m + j) * 3;
      pos.push(pos[k], pos[k + 1], pos[k + 2]);
    }
    for (let j = 0; j < m; j++) {
      const j1 = (j + 1) % m;
      if (forward) idx.push(base, base + 1 + j, base + 1 + j1);
      else idx.push(base, base + 1 + j1, base + 1 + j);
    }
  };
  if (closed && capStart) cap(0, false);
  if (closed && capEnd) cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (flat) {
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    return ng;
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}

// loft along +z: stations { z, sx, sy, x = 0, y = 0 }; rings stay perpendicular to z
export function loftZ(profile, stations, opts = {}) {
  return sweep(
    profile,
    stations.map((s) => ({
      p: [s.x || 0, s.y || 0, s.z],
      sx: s.sx,
      sy: s.sy,
      t: [0, 0, 1],
      roll: s.roll,
    })),
    opts,
  );
}

// flat ring frame between z0 and z1: outer and inner closed loops (same point count, CCW, in metres)
export function ringZ(outer, inner, z0, z1) {
  const m = outer.length;
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const o0 = [outer[i][0], outer[i][1], z0];
    const o1 = [outer[j][0], outer[j][1], z0];
    const n0 = [inner[i][0], inner[i][1], z0];
    const n1 = [inner[j][0], inner[j][1], z0];
    const O0 = [outer[i][0], outer[i][1], z1];
    const O1 = [outer[j][0], outer[j][1], z1];
    const N0 = [inner[i][0], inner[i][1], z1];
    const N1 = [inner[j][0], inner[j][1], z1];
    quad(o0, n0, n1, o1); // front face (-z)
    quad(O0, O1, N1, N0); // back face (+z)
    quad(o0, o1, O1, O0); // outer side
    quad(n0, N0, N1, n1); // inner side
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// chamfered rectangle in metres: half sizes w, h; c = fraction of the side kept straight
export function octagon(w, h, c = 0.6) {
  return [
    [w, -c * h],
    [w, c * h],
    [c * w, h],
    [-c * w, h],
    [-w, c * h],
    [-w, -c * h],
    [-c * w, -h],
    [c * w, -h],
  ];
}

// flat plate: a closed profile extruded between z0 and z1 with both caps
export function plateZ(profile, sx, sy, z0, z1, x = 0, y = 0) {
  return loftZ(
    profile,
    [
      { z: z0, sx, sy, x, y },
      { z: z1, sx, sy, x, y },
    ],
    { capStart: true, capEnd: true, flat: true },
  );
}

// linear interpolation on a [[t, value], ...] table
export function table(rows, t) {
  if (t <= rows[0][0]) return rows[0][1];
  for (let i = 0; i + 1 < rows.length; i++) {
    const [t0, v0] = rows[i];
    const [t1, v1] = rows[i + 1];
    if (t <= t1) return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
  }
  return rows[rows.length - 1][1];
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

// box from p0 to p1 with cross-section w (local x) by h (local y)
export function bar(p0, p1, w, h = w) {
  const a = new THREE.Vector3(...p0);
  const b = new THREE.Vector3(...p1);
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new THREE.BoxGeometry(w, h, len);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    d.normalize(),
  );
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

// disc facing +z (aft) — engine glow
export function discZ(r, n, x, y, z) {
  const g = new THREE.CircleGeometry(r, n);
  g.translate(x, y, z);
  return g;
}

// cone/cylinder along z: r0 at the +z end, r1 at the -z end, centred on (x, y, zc)
export function tubeZ(r0, r1, len, seg, x, y, zc, open = true) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, zc);
  return g;
}

// reverse winding (and normals) so a shell is seen from the inside
export function flipFaces(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  for (let t = 0; t < pos.count; t += 3) {
    const bx = pos.getX(t + 1);
    const by = pos.getY(t + 1);
    const bz = pos.getZ(t + 1);
    pos.setXYZ(t + 1, pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2));
    pos.setXYZ(t + 2, bx, by, bz);
  }
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// attributes
// ---------------------------------------------------------------------------

// object-space planar UVs chosen per face from the geometric face normal (no smearing where smooth
// vertex normals straddle an axis change)
export function faceUV(g, texel) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let t = 0; t + 2 < pos.count; t += 3) {
    _a.fromBufferAttribute(pos, t);
    _b.fromBufferAttribute(pos, t + 1);
    _c.fromBufferAttribute(pos, t + 2);
    _n.crossVectors(_b.sub(_a), _c.sub(_a));
    const ax = Math.abs(_n.x);
    const ay = Math.abs(_n.y);
    const az = Math.abs(_n.z);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(t + k);
      const y = pos.getY(t + k);
      const z = pos.getZ(t + k);
      let u;
      let v;
      if (ay >= ax && ay >= az) ((u = x), (v = z));
      else if (ax >= az) ((u = z), (v = y));
      else ((u = x), (v = y));
      uv[(t + k) * 2] = u * texel;
      uv[(t + k) * 2 + 1] = v * texel;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

// per-vertex colour from position: fn(x, y, z, outColor)
export function tintBy(g, fn) {
  const pos = g.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), c);
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

/**
 * Part wrapper (same contract as shipKit.part): face-planar UVs unless uv === "keep", uniform `color`
 * tint or a `tint(x, y, z, out)` gradient.
 */
export function mpart(
  geo,
  mat,
  {
    color = 0xffffff,
    texel = 1 / 16,
    lod = 0,
    name = "",
    uv = "planar",
    tint = null,
  } = {},
) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (uv === "planar") faceUV(g, texel);
  if (tint) tintBy(g, tint);
  else tintGeometry(g, color);
  return { geo: g, mat, lod, name };
}

// deterministic small PRNG for greeble placement
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
