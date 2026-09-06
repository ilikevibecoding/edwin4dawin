// Geometry kit for the Providence-class model: a ring loft with crease control (smooth curved hull,
// hard ridge/lip edges), the reference-measured hull profile (tall narrow egg section with a flat ridge,
// a vertical flank belt carrying the recessed hangar trough, and the deep forward chin), blade rings
// for the fins, ellipsoid rings for the pods, and a surface frame so turrets, plates and hatches sit
// flush on the curved hull. Everything is object space, forward -Z, up +Y.
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
// Hull profile — measured from the reference side / top / front views. `r` is metres aft of the bow
// tip (0 .. 1088); ship z = r - 544. The hull is a long slender dagger with a tall, narrow section: a
// flat dorsal ridge, egg-shaped shoulders, a near-vertical flank belt at the widest point (the hangar
// trough is recessed into it aft), and a full lower body that hangs down into the forward "chin"
// (deepest at r = 250) and rises to the small blunt stern face at r = 1046 (the engine bells reach
// r = 1088). Stations are monotone cubic splines through the measured key points.
// ---------------------------------------------------------------------------
export const HULL = {
  length: 1088,
  zBow: -544,
  zFace: 502, // stern face (r = 1046): the bells stand aft of it to z = 544
  zStern: 544,
};
export const toRef = (z) => z - HULL.zBow;
export const fromRef = (r) => HULL.zBow + r;

// monotone cubic (Fritsch–Carlson) through [x, y] key points, clamped outside the range
export function spline(pts) {
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++)
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]);
      const w2 = xs[i + 1] - xs[i] + 2 * (xs[i] - xs[i - 1]);
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

// half beam: fine point, 33 m half-width at r = 150, widest (59) at r = 700, 35 at the stern face
const W = spline([
  [0, 2.4],
  [20, 6.5],
  [50, 13.5],
  [100, 23.5],
  [150, 32.5],
  [200, 40.5],
  [250, 47],
  [300, 51],
  [350, 53.5],
  [400, 55.5],
  [500, 57.5],
  [600, 58.5],
  [700, 59],
  [800, 58],
  [850, 56.5],
  [900, 53.5],
  [950, 49],
  [1000, 43],
  [1046, 35],
]);
// dorsal ridge height (the spine and citadel stand on it): the beak climbs steeply between r 75 and
// 150 to the +48 ridge, which rises gently aft and drops to the stern face
const Y_TOP = spline([
  [0, 4],
  [25, 9],
  [50, 11],
  [75, 20],
  [100, 30],
  [125, 40],
  [150, 46],
  [200, 48],
  [300, 48],
  [500, 48],
  [600, 49],
  [700, 50],
  [850, 52],
  [950, 54],
  [1000, 54],
  [1024, 51],
  [1046, 46],
]);
// keel (side-view reference, aft keel -52): the beak underside runs at -40, the chin drops to -72 at
// r 225-300, the mid-body waist rises to -42 around r 450-525, the aft body sits at -52..-56 and the
// stern sweeps up to the -29 face bottom
const Y_BOT = spline([
  [0, -5],
  [25, -17],
  [50, -27],
  [75, -33],
  [100, -39],
  [125, -40],
  [150, -42],
  [175, -55],
  [200, -65],
  [225, -71],
  [250, -72],
  [300, -71],
  [350, -65],
  [375, -58],
  [400, -56],
  [425, -52],
  [450, -44],
  [475, -43],
  [500, -45],
  [525, -44],
  [550, -47],
  [575, -49],
  [600, -52],
  [700, -53],
  [800, -54],
  [860, -56],
  [900, -54],
  [1000, -50],
  [1012, -40],
  [1024, -31],
  [1046, -29],
]);
// height of the widest point (centre of the flank belt)
const Y_WIDE = spline([
  [0, -1],
  [100, -3],
  [200, -7],
  [300, -7],
  [400, -3],
  [550, 4],
  [600, 5],
  [880, 5],
  [1046, 1],
]);
// flat ridge half-width: the ROTS still shows a broad flat dorsal deck along the spine (about 40 % of
// the beam) that widens further under the citadel
const W_TOP = spline([
  [0, 0.6],
  [50, 3],
  [100, 7],
  [200, 13],
  [350, 17],
  [500, 19],
  [560, 21],
  [620, 26],
  [950, 26],
  [1000, 18],
  [1046, 10],
]);
// hangar trough recessed into the flank belt (ref metres) and the belt height
export const TROUGH = { r0: 605, r1: 870, depth: 6, lip: 1.5 };
export const BELT_H = 18;

export function stationAt(z) {
  const r = Math.min(1046, Math.max(0, toRef(z)));
  const w = W(r);
  const yTop = Y_TOP(r);
  const yBot = Y_BOT(r);
  const yWide = Y_WIDE(r);
  const wTop = Math.min(W_TOP(r), w * 0.6);
  const beltH = Math.min(BELT_H, (yTop - yBot) * 0.32);
  const d = r >= TROUGH.r0 && r <= TROUGH.r1 ? TROUGH.depth : 0;
  return {
    z,
    r,
    w,
    yTop,
    yBot,
    yWide,
    wTop,
    yB0: yWide + beltH / 2,
    yB1: yWide - beltH / 2,
    d,
  };
}

// Half profile (starboard, x >= 0) from the ridge centre (0) to the keel centre (15): ridge edge (1),
// four shoulder points (2-5), belt top (6), trough lips and back wall (7-10), belt bottom (11), three
// lower-body points (12-14). Segment 8 (points 8 -> 9) is the trough back wall the bays are cut into.
export const PROFILE_N = 16;
export const SHARP_POINTS = new Set([1, 6, 8, 9, 11]);
export const WALL_SEG = 8;
export const BELT_TOP_SEG = 5; // shoulder segment just above the belt
export const BELLY_SEG = 12;
export function halfProfile(st) {
  const { w, yTop, yBot, wTop, yB0, yB1, d } = st;
  const r = st.r ?? toRef(st.z);
  const pts = [];
  const y1 = yTop - Math.min(0.6, (yTop - yB0) * 0.05);
  pts.push([0, yTop]); // 0 ridge centre
  pts.push([wTop, y1]); // 1 ridge edge (crease)
  for (let k = 1; k <= 4; k++) {
    const th = ((k / 5) * Math.PI) / 2;
    pts.push([
      wTop + (w - wTop) * Math.sin(th),
      yB0 + (y1 - yB0) * Math.cos(th),
    ]); // 2-5 shoulder
  }
  const lip = Math.min(TROUGH.lip, (yB0 - yB1) * 0.1);
  pts.push([w, yB0]); // 6 belt top
  pts.push([w, yB0 - lip]); // 7
  pts.push([w - d, yB0 - lip]); // 8 trough top inner
  pts.push([w - d, yB1 + lip]); // 9 trough bottom inner
  pts.push([w, yB1 + lip]); // 10
  pts.push([w, yB1]); // 11 belt bottom
  // the forward chin is a full rounded mass (the 3/4 reference), the aft lower body a slimmer egg
  const bellyPow = lerp(0.5, 0.75, smoothstep(300, 520, r));
  for (let k = 1; k <= 3; k++) {
    const ph = ((k / 4) * Math.PI) / 2;
    pts.push([
      w * Math.pow(Math.cos(ph), bellyPow),
      yB1 + (yBot - yB1) * Math.sin(ph),
    ]); // 12-14 lower body
  }
  pts.push([0, yBot]); // 15 keel centre
  return pts;
}
// profile point m (starboard) at longitudinal z as [x, y, z], mirrored for side -1
export function profilePoint(z, m, side = 1) {
  const p = halfProfile(stationAt(z))[m];
  return [side * p[0], p[1], z];
}

// Full ring (30 points): starboard 0..15 then port mirrors of 14..1.
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
// starboard segment index (0..14) for any ring segment j (0..29), and the side (+1 starboard) of segment j
export const segMirror = (j) => (j < PROFILE_N - 1 ? j : RING_N - 1 - j);
export const segSide = (j) => (j < PROFILE_N - 1 ? 1 : -1);

// Surface frame on the hull at longitudinal z, starboard segment m, fraction t along it, side ±1:
// returns { p: Vector3, n: Vector3 (outward), tz: Vector3 (along +z on the surface) }.
export function hullFrame(z, m, t, side = 1) {
  const ring = (zz) => halfProfile(stationAt(zz));
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
  if (!isFinite(n.x) || n.lengthSq() < 0.5) n.set(0, m < 8 ? 1 : -1, 0);
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

// ---------------------------------------------------------------------------
// Slabs (tower tiers): horizontal sections from y0 to y1 whose plan outline is a slab with a parabolic
// nose, flat sides and a tapered but blunt tail (`tail` = tail thickness as a fraction of halfT).
// Returns { rings, sharp } (sharp = the two tail corners).
// ---------------------------------------------------------------------------
const SLAB_CHORD = [0.02, 0.06, 0.13, 0.24, 0.5, 0.68, 0.82, 0.92];
export function slabRings({
  y0,
  y1,
  n = 3,
  zLead,
  zTrail,
  halfT,
  tail = 0.32,
  ease = (k) => k,
}) {
  const thick = (f) =>
    f < 0.13
      ? Math.sqrt(f / 0.13)
      : f < 0.5
        ? 1
        : 1 - (1 - tail) * smoothstep(0, 1, (f - 0.5) / 0.5);
  const rings = [];
  for (let k = 0; k < n; k++) {
    const u = ease(k / (n - 1));
    const y = lerp(y0, y1, u);
    const zl = zLead(y);
    const zt = zTrail(y);
    const c = zt - zl;
    const t = halfT(y);
    const ring = [[0, y, zl]];
    for (const f of SLAB_CHORD) ring.push([t * thick(f), y, zl + c * f]);
    ring.push([t * tail, y, zt]);
    ring.push([-t * tail, y, zt]);
    for (let q = SLAB_CHORD.length - 1; q >= 0; q--)
      ring.push([-t * thick(SLAB_CHORD[q]), y, zl + c * SLAB_CHORD[q]]);
    rings.push(ring);
  }
  const nc = SLAB_CHORD.length;
  return { rings, sharp: new Set([nc + 1, nc + 2]) };
}
// half thickness of a slab ring at chord fraction f (for placing things on its faces)
export function slabThick(f, tail = 0.32) {
  return f < 0.13
    ? Math.sqrt(f / 0.13)
    : f < 0.5
      ? 1
      : 1 - (1 - tail) * smoothstep(0, 1, (f - 0.5) / 0.5);
}

// ---------------------------------------------------------------------------
// Bridge head: rounded-rectangle sections (halfW x halfH, corner radius r) along z from z0 to z1,
// scaled down toward the nose and tail, with an optional recessed band (y range [b0, b1] relative to cy,
// inset by `inset`) that a window row sits in. Returns { rings, sharp }.
// ---------------------------------------------------------------------------
export function headRings({
  cy = 0,
  z0,
  z1,
  halfW,
  halfH,
  r = 6,
  band = null,
  inset = 2.2,
  nZ = 8,
  nose = 0.3,
  tail = 0.4,
  noseK = 0.6,
  tailK = 0.65,
}) {
  // right half of the section from the top centre to the bottom centre
  const right = [];
  right.push([0, halfH]);
  right.push([halfW - r, halfH]);
  for (const a of [30, 60])
    right.push([
      halfW - r + r * Math.sin((a * Math.PI) / 180),
      halfH - r + r * Math.cos((a * Math.PI) / 180),
    ]);
  right.push([halfW, halfH - r]);
  const sharpLocal = [];
  if (band) {
    const [b0, b1] = band; // b1 > b0
    sharpLocal.push(right.length);
    right.push([halfW, b1]);
    sharpLocal.push(right.length);
    right.push([halfW - inset, b1]);
    sharpLocal.push(right.length);
    right.push([halfW - inset, b0]);
    sharpLocal.push(right.length);
    right.push([halfW, b0]);
  }
  right.push([halfW, -(halfH - r)]);
  for (const a of [30, 60])
    right.push([
      halfW - r + r * Math.cos((a * Math.PI) / 180),
      -(halfH - r) - r * Math.sin((a * Math.PI) / 180),
    ]);
  right.push([halfW - r, -halfH]);
  right.push([0, -halfH]);
  const outline = right.slice();
  for (let i = right.length - 2; i >= 1; i--)
    outline.push([-right[i][0], right[i][1]]);
  const sharp = new Set();
  for (const s of sharpLocal) {
    sharp.add(s);
    sharp.add(outline.length - s);
  }
  // ring segments that form the recessed vertical face of the band (both sides)
  const bandSegs = new Set();
  if (band) {
    const b = sharpLocal[0];
    bandSegs.add(b + 1);
    bandSegs.add(outline.length - b - 2);
  }
  const rings = [];
  for (let k = 0; k <= nZ; k++) {
    const u = k / nZ;
    let s = 1;
    if (u < nose) s = noseK + (1 - noseK) * smoothstep(0, 1, u / nose);
    else if (u > 1 - tail)
      s = 1 - (1 - tailK) * smoothstep(0, 1, (u - (1 - tail)) / tail);
    const z = lerp(z0, z1, u);
    rings.push(outline.map(([x, y]) => [x * s, cy + y * s, z]));
  }
  return { rings, sharp, bandSegs, outline };
}
// section scale of a headRings head at longitudinal z (same taper as the rings)
export function headScale(spec, z) {
  const u = clamp01((z - spec.z0) / (spec.z1 - spec.z0));
  const nose = spec.nose ?? 0.3;
  const tail = spec.tail ?? 0.4;
  const noseK = spec.noseK ?? 0.6;
  const tailK = spec.tailK ?? 0.65;
  if (u < nose) return noseK + (1 - noseK) * smoothstep(0, 1, u / nose);
  if (u > 1 - tail)
    return 1 - (1 - tailK) * smoothstep(0, 1, (u - (1 - tail)) / tail);
  return 1;
}

// Polygonal annulus with thickness (local space: axis +Y, base at y = 0): outer skirt, top face, inner
// skirt. rOut/rIn radii, n sides, h height; `phase` rotates the polygon.
export function ringSlab(
  rOut,
  rIn,
  n,
  h,
  phase = 0,
  { color = [1, 1, 1] } = {},
) {
  const poly = (r, y) => {
    const ring = [];
    for (let k = 0; k < n; k++) {
      const a = phase + (k / n) * Math.PI * 2;
      ring.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    return ring;
  };
  return loftRings([poly(rOut, 0), poly(rOut, h), poly(rIn, h), poly(rIn, 0)], {
    sharpRings: new Set([1, 2]),
    sharp: n <= 8 ? new Set(Array.from({ length: n }, (_, k) => k)) : null,
    faceColor: () => color,
    texel: 1 / 4,
  });
}

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
