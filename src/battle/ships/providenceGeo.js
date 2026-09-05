// Geometry kit for the Providence-class model: a ring loft with crease control (smooth curved hull,
// hard ridge/lip edges), the analytic hull profile (rounded-triangular cross section with the flank hangar
// slot built into the profile), blade rings for the fins, ellipsoid rings for the pods, and a surface
// frame so turrets, plates and hatches sit flush on the curved hull. Everything is object space,
// forward -Z, up +Y.
import * as THREE from "three";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
// small deterministic hash -> [0,1)
export function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Loft a list of rings (arrays of [x,y,z], equal length) into a non-indexed BufferGeometry with
 * smooth vertex normals except across creases: `sharp` (Set of point indices: crease along the ring
 * direction) and `sharpRings` (Set of ring indices: crease along the loft direction). Faces are wound
 * outward (decided once from the most unambiguous face so concave regions stay consistent).
 * opts.faceFilter(i, j) keeps or drops quads; opts.faceColor(i, j, centre, normal) -> [r,g,b];
 * opts.uv(i, j, p, arc) -> [u,v] (default: u = z * texel, v = arc length around the ring * texel).
 */
export function loftRings(rings, opts = {}) {
  const {
    closed = true,
    sharp = null,
    sharpRings = null,
    invert = false,
    faceFilter = null,
    faceColor = null,
    uv = null,
    texel = 1 / 16,
  } = opts;
  const nR = rings.length;
  const nP = rings[0].length;
  const nS = closed ? nP : nP - 1;
  const wrap = (j) => ((j % nP) + nP) % nP;
  const P = (i, j) => rings[i][wrap(j)];
  const centroid = rings.map((r) => {
    const c = [0, 0, 0];
    for (const p of r) {
      c[0] += p[0];
      c[1] += p[1];
      c[2] += p[2];
    }
    return c.map((v) => v / r.length);
  });
  // area-weighted face normals from the diagonals (robust for non-planar / partly degenerate quads)
  const faceN = new Array((nR - 1) * nS);
  const faceC = new Array((nR - 1) * nS);
  let bestDot = 0;
  let flip = false;
  for (let i = 0; i < nR - 1; i++) {
    for (let j = 0; j < nS; j++) {
      const p0 = P(i, j);
      const p1 = P(i, j + 1);
      const p2 = P(i + 1, j + 1);
      const p3 = P(i + 1, j);
      _a.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
      _b.set(p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]);
      _n.crossVectors(_a, _b);
      const c = [
        (p0[0] + p1[0] + p2[0] + p3[0]) / 4,
        (p0[1] + p1[1] + p2[1] + p3[1]) / 4,
        (p0[2] + p1[2] + p2[2] + p3[2]) / 4,
      ];
      const cm = [
        (centroid[i][0] + centroid[i + 1][0]) / 2,
        (centroid[i][1] + centroid[i + 1][1]) / 2,
        (centroid[i][2] + centroid[i + 1][2]) / 2,
      ];
      const len = _n.length();
      if (len > 1e-9) {
        const d =
          (_n.x * (c[0] - cm[0]) +
            _n.y * (c[1] - cm[1]) +
            _n.z * (c[2] - cm[2])) /
          len;
        if (Math.abs(d) > Math.abs(bestDot)) {
          bestDot = d;
          flip = d < 0;
        }
      }
      faceN[i * nS + j] = [_n.x, _n.y, _n.z];
      faceC[i * nS + j] = c;
    }
  }
  if (invert) flip = !flip;
  if (flip)
    for (const f of faceN) ((f[0] = -f[0]), (f[1] = -f[1]), (f[2] = -f[2]));
  // arc length along each ring (for the default cylindrical UVs)
  const arc = rings.map((r) => {
    const out = [0];
    for (let j = 1; j <= nP; j++) {
      const p = r[j % nP];
      const q = r[j - 1];
      out.push(out[j - 1] + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    }
    return out;
  });
  const isSharp = (j) => sharp && sharp.has(wrap(j));
  const isSharpRing = (i) => sharpRings && sharpRings.has(i);
  const vn = (i, j, iF, jF) => {
    const iis = isSharpRing(i) ? [iF] : [i - 1, i];
    const jjs = isSharp(j) ? [jF] : [j - 1, j];
    let x = 0;
    let y = 0;
    let z = 0;
    for (const a of iis) {
      if (a < 0 || a >= nR - 1) continue;
      for (let b of jjs) {
        if (closed) b = ((b % nS) + nS) % nS;
        else if (b < 0 || b >= nS) continue;
        const f = faceN[a * nS + b];
        x += f[0];
        y += f[1];
        z += f[2];
      }
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
  const pos = [];
  const nor = [];
  const uvs = [];
  const col = [];
  const emit = (p, n, t, c) => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    uvs.push(t[0], t[1]);
    col.push(c[0], c[1], c[2]);
  };
  // uv(i, j, p, arc, fi, fj): vertex ring/point indices, position, arc length, and the face it belongs to
  const uvAt = (i, j, p, fi, fj) =>
    uv ? uv(i, j, p, arc[i][j], fi, fj) : [p[2] * texel, arc[i][j] * texel];
  for (let i = 0; i < nR - 1; i++) {
    for (let j = 0; j < nS; j++) {
      if (faceFilter && !faceFilter(i, j)) continue;
      const f = faceN[i * nS + j];
      const fl = Math.hypot(f[0], f[1], f[2]);
      if (fl < 1e-9) continue;
      const fn = [f[0] / fl, f[1] / fl, f[2] / fl];
      const c = faceColor ? faceColor(i, j, faceC[i * nS + j], fn) : [1, 1, 1];
      const p0 = P(i, j);
      const p1 = P(i, j + 1);
      const p2 = P(i + 1, j + 1);
      const p3 = P(i + 1, j);
      const n0 = vn(i, j, i, j);
      const n1 = vn(i, j + 1, i, j);
      const n2 = vn(i + 1, j + 1, i, j);
      const n3 = vn(i + 1, j, i, j);
      const t0 = uvAt(i, j, p0, i, j);
      const t1 = uvAt(i, j + 1, p1, i, j);
      const t2 = uvAt(i + 1, j + 1, p2, i, j);
      const t3 = uvAt(i + 1, j, p3, i, j);
      if (!flip) {
        emit(p0, n0, t0, c);
        emit(p1, n1, t1, c);
        emit(p2, n2, t2, c);
        emit(p0, n0, t0, c);
        emit(p2, n2, t2, c);
        emit(p3, n3, t3, c);
      } else {
        emit(p0, n0, t0, c);
        emit(p2, n2, t2, c);
        emit(p1, n1, t1, c);
        emit(p0, n0, t0, c);
        emit(p3, n3, t3, c);
        emit(p2, n2, t2, c);
      }
    }
  }
  return toGeometry(pos, nor, uvs, col);
}

export function toGeometry(pos, nor, uvs, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// Fan cap over a ring (planar or nearly so) facing `normal`; UVs planar in the two axes across the normal.
export function ringCap(
  ring,
  normal,
  { texel = 1 / 12, color = [1, 1, 1], inset = 0 } = {},
) {
  const n = ring.length;
  const c = [0, 0, 0];
  for (const p of ring) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  c[0] /= n;
  c[1] /= n;
  c[2] /= n;
  const pts = ring.map((p) => [
    lerp(p[0], c[0], inset),
    lerp(p[1], c[1], inset),
    lerp(p[2], c[2], inset),
  ]);
  const ax = Math.abs(normal[0]);
  const ay = Math.abs(normal[1]);
  const az = Math.abs(normal[2]);
  const uvOf = (p) =>
    az >= ax && az >= ay
      ? [p[0] * texel, p[1] * texel]
      : ay >= ax
        ? [p[0] * texel, p[2] * texel]
        : [p[2] * texel, p[1] * texel];
  const pos = [];
  const nor = [];
  const uvs = [];
  const col = [];
  // winding: make the triangle normal agree with `normal`
  const p0 = pts[0];
  const p1 = pts[1];
  _a.set(p0[0] - c[0], p0[1] - c[1], p0[2] - c[2]);
  _b.set(p1[0] - c[0], p1[1] - c[1], p1[2] - c[2]);
  _n.crossVectors(_a, _b);
  const flip = _n.x * normal[0] + _n.y * normal[1] + _n.z * normal[2] < 0;
  for (let j = 0; j < n; j++) {
    const q0 = pts[j];
    const q1 = pts[(j + 1) % n];
    const tri = flip ? [c, q1, q0] : [c, q0, q1];
    for (const p of tri) {
      pos.push(p[0], p[1], p[2]);
      nor.push(normal[0], normal[1], normal[2]);
      const t = uvOf(p);
      uvs.push(t[0], t[1]);
      col.push(color[0], color[1], color[2]);
    }
  }
  return toGeometry(pos, nor, uvs, col);
}

// ---------------------------------------------------------------------------
// Hull profile
// ---------------------------------------------------------------------------
// Analytic station parameters along the hull (t = 0 bow tip .. 1 stern). The hull is a long dagger:
// beam grows nearly linearly to the aft third, then eases in to a blunt stern face.
export const HULL = {
  length: 1088,
  zBow: -544,
  zStern: 544,
  beam: 118, // half beam at the widest station
  top: 62, // ridge height at the widest station
  bottom: -92, // keel depth at the widest station
  tPeak: 0.72,
  hangar: { z0: -150, z1: 240, depth: 15 },
};

export function stationAt(z, { hangar = true } = {}) {
  const t = clamp01((z - HULL.zBow) / HULL.length);
  const k = HULL.tPeak;
  const shape = (pow, fall) =>
    t <= k ? Math.pow(t / k, pow) : 1 - fall * Math.pow((t - k) / (1 - k), 1.5);
  const w = Math.max(0.6, HULL.beam * shape(0.9, 0.26));
  const yTop = HULL.top * shape(0.82, 0.16) + 0.2;
  const yBot = HULL.bottom * shape(0.86, 0.22) - 0.2;
  const yWide = yBot + 0.45 * (yTop - yBot);
  const st = {
    z,
    w,
    yTop,
    yBot,
    yWide,
    wTop: Math.max(0.3, w * 0.24),
    wKeel: Math.max(0.2, w * 0.14),
    hangar: null,
  };
  if (hangar && z >= HULL.hangar.z0 && z <= HULL.hangar.z1)
    st.hangar = { depth: HULL.hangar.depth };
  return st;
}

// Half profile (starboard, x >= 0) from the ridge centre (index 0) to the keel centre (index 12).
// Points 4..7 are the hangar lips/recess: on the surface when the station has no slot.
export const PROFILE_N = 13;
export const SHARP_POINTS = new Set([1, 4, 5, 6, 7]);
export function halfProfile(st) {
  const { w, yTop, yBot, yWide, wTop } = st;
  const hu = yTop - yWide;
  const hl = yWide - yBot;
  const pts = [];
  pts.push([0, yTop]); // 0 ridge centre
  pts.push([wTop, yTop - hu * 0.02]); // 1 ridge edge (crease)
  pts.push([wTop + (w - wTop) * 0.4, yTop - hu * 0.36]); // 2 upper flank
  pts.push([wTop + (w - wTop) * 0.78, yTop - hu * 0.7]); // 3 upper flank, lower
  pts.push([w * 0.985, yWide + hu * 0.14]); // 4 shoulder / upper hangar lip
  if (st.hangar) {
    const d = st.hangar.depth;
    pts.push([w - d, yWide + hu * 0.12]); // 5 recess top inner
    pts.push([w - d, yWide - hl * 0.12]); // 6 recess bottom inner
  } else {
    pts.push([w, yWide + hu * 0.05]); // 5 max beam upper
    pts.push([w, yWide - hl * 0.05]); // 6 max beam lower
  }
  pts.push([w * 0.985, yWide - hl * 0.16]); // 7 lower lip
  pts.push([w * 0.93, yWide - hl * 0.34]); // 8 belly a
  pts.push([w * 0.79, yWide - hl * 0.57]); // 9 belly b
  pts.push([w * 0.57, yWide - hl * 0.78]); // 10 belly c
  pts.push([w * 0.3, yWide - hl * 0.93]); // 11 belly d
  pts.push([0, yBot]); // 12 keel centre
  return pts;
}

// Full ring (24 points): starboard 0..12 then port mirrors of 11..1.
export const RING_N = PROFILE_N * 2 - 2;
export function ringFromStation(st) {
  const half = halfProfile(st);
  const ring = half.map(([x, y]) => [x, y, st.z]);
  for (let m = PROFILE_N - 2; m >= 1; m--)
    ring.push([-half[m][0], half[m][1], st.z]);
  return ring;
}
export const RING_SHARP = (() => {
  const s = new Set();
  for (const m of SHARP_POINTS) {
    s.add(m);
    s.add(RING_N - m);
  }
  return s;
})();
// starboard segment index (0..11) for any ring segment j (0..23)
export const segMirror = (j) => (j < PROFILE_N - 1 ? j : RING_N - 1 - j);
export const HANGAR_SEGS = new Set([4, 5, 6]);

// Surface frame on the hull at longitudinal z, starboard segment m, fraction t along it, side ±1:
// returns { p: Vector3, n: Vector3 (outward), tz: Vector3 (along +z on the surface) }.
export function hullFrame(z, m, t, side = 1, opts = {}) {
  const ring = (zz) => halfProfile(stationAt(zz, opts));
  const r0 = ring(z);
  const a = r0[m];
  const b = r0[Math.min(PROFILE_N - 1, m + 1)];
  const p = new THREE.Vector3(
    side * lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    z,
  );
  const tang = new THREE.Vector3(side * (b[0] - a[0]), b[1] - a[1], 0);
  const r1 = ring(z + 2);
  const r2 = ring(z - 2);
  const a1 = r1[m];
  const b1 = r1[Math.min(PROFILE_N - 1, m + 1)];
  const a2 = r2[m];
  const b2 = r2[Math.min(PROFILE_N - 1, m + 1)];
  const tz = new THREE.Vector3(
    side * (lerp(a1[0], b1[0], t) - lerp(a2[0], b2[0], t)),
    lerp(a1[1], b1[1], t) - lerp(a2[1], b2[1], t),
    4,
  ).normalize();
  // ring tangent runs ridge -> keel on starboard, so tz x tang points outward there (mirrored on port)
  const n = new THREE.Vector3().crossVectors(tz, tang).normalize();
  if (side < 0) n.negate();
  // ridge top / keel: tangent may be tiny; fall back to ±y
  if (!isFinite(n.x) || n.lengthSq() < 0.5) n.set(0, m < 6 ? 1 : -1, 0);
  return { p, n, tz };
}

// ---------------------------------------------------------------------------
// Blades (fins): horizontal lens ribs from y0 to y1 following outline functions of height
// ---------------------------------------------------------------------------
export function bladeRings({
  y0,
  y1,
  n = 8,
  zLead,
  zTrail,
  halfT,
  chord = [0.12, 0.35, 0.65, 0.88],
  thick = (f) =>
    f < 0.12 ? f / 0.12 : f > 0.7 ? 1 - ((f - 0.7) / 0.3) * 0.6 : 1,
  xOffset = 0,
  ease = (k) => k,
}) {
  const rings = [];
  for (let k = 0; k < n; k++) {
    const u = ease(k / (n - 1));
    const y = lerp(y0, y1, u);
    const zl = zLead(y);
    const zt = zTrail(y);
    const c = zt - zl;
    const t = halfT(y);
    const ring = [[xOffset, y, zl]];
    for (const f of chord) ring.push([xOffset + t * thick(f), y, zl + c * f]);
    ring.push([xOffset, y, zt]);
    for (let q = chord.length - 1; q >= 0; q--)
      ring.push([xOffset - t * thick(chord[q]), y, zl + c * chord[q]]);
    rings.push(ring);
  }
  return rings;
}
export const BLADE_SHARP = (chordN = 4) => new Set([0, chordN + 1]);

// Ellipsoid-like pod: rings along z between z0..z1, elliptical section (rx, ry) scaled by a bulb
// profile with separate front/back exponents; centre (cx, cy).
export function podRings({
  cx = 0,
  cy = 0,
  z0,
  z1,
  rx,
  ry,
  nZ = 10,
  nP = 16,
  frontPow = 2.4,
  backPow = 1.8,
  flatTop = 0,
  yShift = 0,
}) {
  const rings = [];
  for (let k = 0; k <= nZ; k++) {
    const u = k / nZ;
    const s = u * 2 - 1;
    const pow = s < 0 ? frontPow : backPow;
    const r = Math.max(
      0.03,
      Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), pow)), 1 / pow),
    );
    const z = lerp(z0, z1, u);
    const ring = [];
    for (let j = 0; j < nP; j++) {
      const a = (j / nP) * Math.PI * 2;
      let y = Math.sin(a) * ry * r;
      if (flatTop > 0 && y > 0) y *= 1 - flatTop;
      ring.push([cx + Math.cos(a) * rx * r, cy + y + yShift * (1 - r), z]);
    }
    rings.push(ring);
  }
  return rings;
}

// Rings for a stack of circles along +z (nozzle shrouds, cones): radii per z
export function tubeRings(cx, cy, list, nP = 16) {
  return list.map(([z, r]) => {
    const ring = [];
    for (let j = 0; j < nP; j++) {
      const a = (j / nP) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
    }
    return ring;
  });
}

// Override a geometry's colour attribute per vertex: fn(x, y, z, nx, ny, nz, i) -> [r,g,b]
export function colorize(geo, fn) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(
      pos.getX(i),
      pos.getY(i),
      pos.getZ(i),
      nor ? nor.getX(i) : 0,
      nor ? nor.getY(i) : 1,
      nor ? nor.getZ(i) : 0,
      i,
    );
    arr[i * 3] = c[0];
    arr[i * 3 + 1] = c[1];
    arr[i * 3 + 2] = c[2];
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Linear-space RGB from an sRGB hex, scaled
export function rgb(hex, k = 1) {
  const c = new THREE.Color(hex);
  return [c.r * k, c.g * k, c.b * k];
}
export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Frame matrix at p with local +Y along n and local forward (-Z) as close to `fwd` as possible.
export function frameMatrix(p, n, fwd = new THREE.Vector3(0, 0, -1)) {
  const up = n.clone().normalize();
  const f = fwd.clone().sub(up.clone().multiplyScalar(fwd.dot(up)));
  if (f.lengthSq() < 1e-6) f.set(1, 0, 0).sub(up.clone().multiplyScalar(up.x));
  f.normalize();
  const r = new THREE.Vector3().crossVectors(f, up).normalize();
  const m = new THREE.Matrix4().makeBasis(r, up, f.clone().negate());
  m.setPosition(p);
  return m;
}
// Place a local geometry (built around the origin, up +Y, forward -Z) with frameMatrix.
export function placeOn(geo, p, n, fwd = new THREE.Vector3(0, 0, -1)) {
  geo.applyMatrix4(frameMatrix(p, n, fwd));
  return geo;
}

// Radius factor (0..1) of a podRings pod at longitudinal z
export function podRadius(spec, z) {
  const u = clamp01((z - spec.z0) / (spec.z1 - spec.z0));
  const s = u * 2 - 1;
  const pow = s < 0 ? (spec.frontPow ?? 2.4) : (spec.backPow ?? 1.8);
  return Math.max(
    0.03,
    Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), pow)), 1 / pow),
  );
}
