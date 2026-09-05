// Geometry helpers for the Dreadnaught-class heavy cruiser: lofts over per-station rings with arbitrary
// points (creases through duplicated points, arc-length UVs so plating never stretches on the curved
// forehead, triangulated end caps, omitted edges for bay openings), the one hull section family every
// station of the ship belongs to (flat deck, rounded corners, slanted flanks, chine, chamfered shoulder,
// slanted belly, flat keel) with a surface query for detail placement, plates with polygonal holes (the
// stern face around the nozzles), half-ellipsoid pods, regular polygon profiles and oriented annuli.
import * as THREE from "three";

const EPS = 1e-6;
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/**
 * Loft closed rings along z. secs: [{ z, pts: [[x, y], ...] }], same point count, counter-clockwise
 * seen from +z (so the quads face outward). Consecutive duplicated points make creases (their
 * zero-length edges emit no triangles but split the smooth normals). `omit` is a Set of edge indices
 * left open (bay mouths). `seam` "smooth" averages the normals of the repeated seam vertex, "crease"
 * keeps them apart (use when the ring starts on a hard edge). Caps triangulate the end rings.
 */
export function loftSections(
  secs,
  {
    texel = 1 / 30,
    capStart = false,
    capEnd = false,
    omit = null,
    seam = "smooth",
  } = {},
) {
  const n = secs.length;
  const m = secs[0].pts.length;
  const R = m + 1; // the seam vertex repeats so UVs do not wrap
  const pos = [];
  const uvs = [];
  for (let i = 0; i < n; i++) {
    const s = secs[i];
    let arc = 0;
    for (let j = 0; j < R; j++) {
      const p = s.pts[j % m];
      if (j > 0) arc += d2(p, s.pts[(j - 1) % m]);
      pos.push(p[0], p[1], s.z);
      uvs.push(arc * texel, s.z * texel);
    }
  }
  const idx = [];
  for (let i = 0; i + 1 < n; i++) {
    const A = secs[i].pts;
    const B = secs[i + 1].pts;
    for (let j = 0; j < m; j++) {
      if (omit && omit.has(j)) continue;
      const k = (j + 1) % m;
      const degA = d2(A[j], A[k]) < EPS;
      const degB = d2(B[j], B[k]) < EPS;
      if (degA && degB) continue;
      const a = i * R + j;
      const b = i * R + j + 1;
      const c = (i + 1) * R + j + 1;
      const d = (i + 1) * R + j;
      if (degA) idx.push(a, c, d);
      else if (degB) idx.push(a, b, c);
      else idx.push(a, b, c, a, c, d);
    }
  }
  const cap = (sec, dir) => {
    const pts = [];
    for (const p of sec.pts) {
      const q = pts[pts.length - 1];
      if (!q || d2(q, p) > 0.02) pts.push(p);
    }
    while (pts.length > 2 && d2(pts[0], pts[pts.length - 1]) < 0.02) pts.pop();
    if (pts.length < 3) return;
    const contour = pts.map((p) => new THREE.Vector2(p[0], p[1]));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const base = pos.length / 3;
    for (const p of pts) {
      pos.push(p[0], p[1], sec.z);
      uvs.push(p[0] * texel, p[1] * texel);
    }
    for (const [a, b, c] of tris) {
      const pa = pts[a];
      const pb = pts[b];
      const pc = pts[c];
      const ar =
        (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1]);
      const ccw = ar > 0;
      if (ccw === dir > 0) idx.push(base + a, base + b, base + c);
      else idx.push(base + a, base + c, base + b);
    }
  };
  if (capStart) cap(secs[0], -1);
  if (capEnd) cap(secs[n - 1], 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (seam === "smooth") {
    const nor = g.attributes.normal;
    for (let i = 0; i < n; i++) {
      const a = i * R;
      const b = i * R + m;
      _a.fromBufferAttribute(nor, a).add(_b.fromBufferAttribute(nor, b));
      if (_a.lengthSq() > EPS) _a.normalize();
      nor.setXYZ(a, _a.x, _a.y, _a.z);
      nor.setXYZ(b, _a.x, _a.y, _a.z);
    }
  }
  return g.toNonIndexed();
}

// quadratic Bezier p0 -> p1 -> p2 sampled at k+1 points
function bez(p0, p1, p2, k) {
  const out = [];
  for (let i = 0; i <= k; i++) {
    const t = i / k;
    const w0 = (1 - t) * (1 - t);
    const w1 = 2 * (1 - t) * t;
    const w2 = t * t;
    out.push([
      w0 * p0[0] + w1 * p1[0] + w2 * p2[0],
      w0 * p0[1] + w1 * p1[1] + w2 * p2[1],
    ]);
  }
  return out;
}

/**
 * The Dreadnaught hull section family (front view of the cutaway): flat deck at yT with rounded corners
 * (cr, tangent to the deck and the flank), flanks slanting from the virtual deck corner (±hwV) down and
 * out to the chine (±hwC, yC), a chamfered shoulder under the chine (chX inward over chY down), belly
 * sides slanting inward (`slope` = dx per unit descent) to a flat keel at yB with rounded corners (rB).
 * Two extra points per belly side sit on the slant at heights cuts = [yLo, yHi] so a run of the loft can
 * leave the hangar band open; their edge indices come back as `cutIdx` { left, right }. The ring is
 * counter-clockwise seen from +z and starts on the starboard chine (a crease: loft with seam "crease").
 * Every parameter set gives 2 kC + 2 kB + 15 points, so any two stations loft together (bow into
 * mid-hull into stern block). Degenerate heights (the nose lip) collapse gracefully.
 */
export function hullSection({
  hwC,
  yC,
  hwV,
  yT,
  cr,
  chX,
  chY,
  slope,
  yB,
  rB,
  cuts = null,
  kC = 5,
  kB = 5,
}) {
  const pts = [];
  const P = (x, y) => pts.push([x, y]);
  // upper body: chine -> flank -> deck corner arc -> deck
  const h = Math.max(0.01, yT - yC);
  const crn = Math.max(0.01, Math.min(cr, h * 0.45, hwV * 0.6));
  const dx = hwC - hwV;
  const dy = yC - yT;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const arc = (side) => {
    const V = [side * hwV, yT];
    const S = [side * (hwV + ux * crn), yT + uy * crn];
    const D = [side * (hwV - crn), yT];
    return side > 0 ? bez(S, V, D, kC) : bez(D, V, S, kC);
  };
  P(hwC, yC);
  for (const p of arc(1)) P(p[0], p[1]);
  for (const p of arc(-1)) P(p[0], p[1]);
  P(-hwC, yC);
  P(-hwC, yC);
  // belly: chamfer, slant with the cut points, keel corner arcs, keel
  const depth = Math.max(0.05, yC - yB);
  const cy = Math.min(chY, depth * 0.5);
  const cx = chY > EPS ? chX * (cy / chY) : 0;
  const yS = yC - cy;
  const xS = Math.max(0.5, hwC - cx);
  const rest = Math.max(0.01, yS - yB);
  const xK = Math.max(0.4, xS - slope * rest);
  const r = Math.max(0.005, Math.min(rB, rest * 0.6, xK * 0.9));
  const sl = Math.hypot(slope, 1);
  const d = r * 1.3;
  const S = [xK + (slope * d) / sl, yB + d / sl]; // slant end
  const D = [xK - d, yB]; // keel start
  const xAt = (y) => xS - slope * (yS - y);
  let cLo = yS - rest * 0.65;
  let cHi = yS - rest * 0.35;
  if (cuts) {
    cLo = Math.min(Math.max(cuts[0], S[1] + 0.2), yS - 0.2);
    cHi = Math.min(Math.max(cuts[1], cLo), yS - 0.2);
  }
  const cutIdx = {};
  P(-xS, yS);
  P(-xS, yS);
  cutIdx.left = pts.length;
  P(-xAt(cHi), cHi);
  P(-xAt(cLo), cLo);
  for (const p of bez([-S[0], S[1]], [-xK, yB], [-D[0], D[1]], kB))
    P(p[0], p[1]);
  for (const p of bez(D, [xK, yB], S, kB)) P(p[0], p[1]);
  cutIdx.right = pts.length;
  P(xAt(cLo), cLo);
  P(xAt(cHi), cHi);
  P(xS, yS);
  P(xS, yS);
  return { pts, cutIdx, shoulder: [xS, yS], keel: [xK, yB], slantEnd: S };
}

/**
 * Point and outward normal where the ring crosses height y on `side` (+1 starboard). Picks the
 * outermost crossing (the flank or the belly slant, never the deck or keel); returns null above the
 * deck or below the keel.
 */
export function ringAtY(pts, y, side = 1) {
  const m = pts.length;
  let best = null;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % m];
    const dy = b[1] - a[1];
    if (Math.abs(dy) < 1e-4) continue;
    if (side > 0 ? a[0] < -EPS || b[0] < -EPS : a[0] > EPS || b[0] > EPS)
      continue;
    const t = (y - a[1]) / dy;
    if (t < -EPS || t > 1 + EPS) continue;
    const x = a[0] + (b[0] - a[0]) * t;
    if (!best || Math.abs(x) > Math.abs(best.p[0])) {
      const dx = b[0] - a[0];
      const L = Math.hypot(dx, dy);
      best = { p: [x, y], n: [dy / L, -dx / L] };
    }
  }
  return best;
}

// regular n-gon in [-1, 1]^2, rotated so a vertex sits at angle `rot` (PI/2 = vertex up: "house" shape)
export function polygonProfile(n, rot = Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    pts.push([Math.cos(a), Math.sin(a)]);
  }
  return pts;
}

/**
 * Flat plate at z with polygonal holes (contour and holes in metres, [x, y]); faces +z when
 * facing > 0. Planar x/y UVs.
 */
export function plateWithHoles(contour, holes, z, facing = 1, texel = 1 / 30) {
  const c = [];
  for (const p of contour) {
    const q = c[c.length - 1];
    if (!q || Math.hypot(q.x - p[0], q.y - p[1]) > 0.02)
      c.push(new THREE.Vector2(p[0], p[1]));
  }
  while (c.length > 2 && c[0].distanceTo(c[c.length - 1]) < 0.02) c.pop();
  const hs = holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
  const tris = THREE.ShapeUtils.triangulateShape(c, hs);
  const all = [...c.map((v) => [v.x, v.y]), ...holes.flat()];
  const pos = [];
  const uvs = [];
  for (const [a, b, cc] of tris) {
    const pa = all[a];
    const pb = all[b];
    const pc = all[cc];
    const ar =
      (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1]);
    const order = ar > 0 === facing > 0 ? [pa, pb, pc] : [pa, pc, pb];
    for (const p of order) {
      pos.push(p[0], p[1], z);
      uvs.push(p[0] * texel, p[1] * texel);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * Half-ellipsoid pod (deflector projector bay): base on y = 0, dome toward +y, `len` along z, `wid`
 * across, `hgt` proud; `taper` thins the forward (-z) end into an egg. Returns an indexed geometry.
 */
export function podGeo(len, wid, hgt, seg = 14, rings = 6, taper = 0.32) {
  const g = new THREE.SphereGeometry(
    1,
    seg,
    rings,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 - taper * Math.max(0, -z); // z in [-1, 1]: forward end thinner
    p.setXYZ(i, (x * k * wid) / 2, Math.max(0, y) * k * hgt, (z * len) / 2);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Orient a geometry built with +y up and +z along onto a surface point p with outward normal n, the
 * geometry's z following `along` projected into the surface; sinks it `sink` metres below the surface.
 */
export function placeOnSurface(geo, p, n, along = [0, 0, 1], sink = 0) {
  const up = new THREE.Vector3(...n).normalize();
  const fwd = new THREE.Vector3(...along);
  fwd.addScaledVector(up, -fwd.dot(up));
  if (fwd.lengthSq() < 1e-6) fwd.set(1, 0, 0).addScaledVector(up, -up.x);
  fwd.normalize();
  const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const m = new THREE.Matrix4().makeBasis(right, up, fwd);
  geo.applyMatrix4(m);
  geo.translate(p[0] - up.x * sink, p[1] - up.y * sink, p[2] - up.z * sink);
  return geo;
}

// flat annulus centred at c facing n (rIn = 0 gives a disc)
export function annulusAt(c, n, rIn, rOut, seg = 24, lift = 0.15) {
  const g = new THREE.RingGeometry(Math.max(0.001, rIn), rOut, seg, 1);
  // RingGeometry faces +z: map +z onto n
  const up = new THREE.Vector3(...n).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    up,
  );
  g.applyQuaternion(q);
  g.translate(c[0] + up.x * lift, c[1] + up.y * lift, c[2] + up.z * lift);
  return g;
}

// box with its local axes aligned to a surface frame: sa along `along`, sn along the normal, sb across
export function surfaceBox(c, n, along, sa, sb, sn, lift = 0) {
  const up = new THREE.Vector3(...n).normalize();
  const a = new THREE.Vector3(...along);
  a.addScaledVector(up, -a.dot(up)).normalize();
  const b = new THREE.Vector3().crossVectors(up, a).normalize();
  const g = new THREE.BoxGeometry(sb, sn, sa);
  const m = new THREE.Matrix4().makeBasis(b, up, a);
  g.applyMatrix4(m);
  g.translate(
    c[0] + up.x * (sn / 2 + lift),
    c[1] + up.y * (sn / 2 + lift),
    c[2] + up.z * (sn / 2 + lift),
  );
  return g;
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

export const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// 0 -> 1 over [z0, z1]: straight in the middle with rounded ends (fraction e of the span each)
export function rampLin(z, z0, z1, e = 0.22) {
  const t = Math.min(1, Math.max(0, (z - z0) / (z1 - z0)));
  const k = Math.min(0.49, e);
  const v = 1 / (1 - k); // plateau speed of the trapezoidal profile (unit total travel)
  if (t < k) return (v * t * t) / (2 * k);
  if (t > 1 - k) return 1 - (v * (1 - t) * (1 - t)) / (2 * k);
  return v * (t - k / 2);
}

// 1 -> 0 over [z0, z1] following a quarter ellipse (flat at z0, vertical tangent at z1): rounded corners
export function cornerFall(z, z0, z1) {
  const t = Math.min(1, Math.max(0, (z - z0) / (z1 - z0)));
  return Math.sqrt(Math.max(0, 1 - t * t));
}
