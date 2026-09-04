import * as THREE from 'three';
import { BELLY, EYE, KINDS, bellyFactor } from './spec.js';
import { chainWeights } from './rig.js';
import { ATLAS, SKULL_MAP, uvIn } from './textures.js';
import { clamp, lerp, smoothstep } from '../../textures/core.js';

// ---------------------------------------------------------------------------
// Lion geometry, built in the rest pose around the skeleton and skinned to it.
//
// Torso, neck, legs and tail are lofts: elliptical cross-sections swept along
// a Catmull-Rom through the joints, with a height profile that puts the deep
// chest at the elbow and the waist ahead of the hips. Skin weights are a
// smooth partition of the loft's arc length between the bones under it, so a
// bend at the elbow folds the loft rather than tearing it. The head is an
// assembly of lathed ellipsoids and small lofts under the head bone, with the
// eyes, lids and ears on their own bones.
//
// `detail` scales every segment count, so the same generator builds the close
// tier and the distant ones.
// ---------------------------------------------------------------------------

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const EYE_R = EYE.r;
const LID_UP = EYE.lidUp;
const LID_DOWN = EYE.lidDown;

export const DETAIL = {
  0: { around: 44, along: 1.0, legAround: 16, legAlong: 1.0, head: 2, toes: true, claws: true, eyes: true, lids: true, whiskers: true, sphere: [28, 18] },
  1: { around: 22, along: 0.55, legAround: 10, legAlong: 0.6, head: 1, toes: true, claws: false, eyes: true, lids: false, whiskers: false, sphere: [12, 8] },
  2: { around: 12, along: 0.3, legAround: 6, legAlong: 0.35, head: 0, toes: false, claws: false, eyes: false, lids: false, whiskers: false, sphere: [8, 6] },
};

/**
 * Accumulates skinned geometry with one consistent attribute set: position,
 * normal, uv, color, skinIndex, skinWeight. Everything a lion is made of goes
 * through here so the parts can be merged into one draw.
 */
export class SkinBuilder {
  constructor() {
    this.pos = [];
    this.uv = [];
    this.col = [];
    this.si = [];
    this.sw = [];
    this.idx = [];
    this.tag = [];
  }

  get count() {
    return this.pos.length / 3;
  }

  /** Push one vertex. `bones` is [[index, weight], ...], normalised here. */
  vertex(p, uv, bones, color = [1, 1, 1], tag = 0) {
    this.pos.push(p.x, p.y, p.z);
    this.uv.push(uv[0], uv[1]);
    this.col.push(color[0], color[1], color[2]);
    const b = bones
      .filter((x) => x[1] > 1e-4)
      .sort((p, q) => q[1] - p[1])
      .slice(0, 4);
    let sum = 0;
    for (const x of b) sum += x[1];
    for (let i = 0; i < 4; i++) {
      this.si.push(b[i] ? b[i][0] : 0);
      this.sw.push(b[i] ? b[i][1] / sum : 0);
    }
    this.tag.push(tag);
    return this.count - 1;
  }

  tri(a, b, c) {
    this.idx.push(a, b, c);
  }

  /**
   * Sweep elliptical rings along `stations`. Each station carries a centre, a
   * right and an up axis, half-width `rx`, half-heights `ryTop` / `ryBot`, a
   * `v` for the texture and `bones` for the skin. u runs around from `uStart`
   * radians off the right axis. Closed at either end with a fan if asked.
   */
  loft(stations, around, { uStart = -Math.PI / 2, uvRect, capStart = false, capEnd = false, colorFn, tag = 0, offset = 0, offsetFn = null } = {}) {
    const rings = [];
    for (const s of stations) {
      const ring = [];
      for (let k = 0; k <= around; k++) {
        const u = k / around;
        const a = uStart + u * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const ry = sa >= 0 ? s.ryTop : s.ryBot;
        // outward normal of the ellipse, for shells
        _n.copy(s.ax).multiplyScalar(ca / Math.max(1e-4, s.rx)).addScaledVector(s.ay, sa / Math.max(1e-4, ry));
        if (_n.lengthSq() < 1e-8) _n.copy(s.ay);
        _n.normalize();
        _a.copy(s.c).addScaledVector(s.ax, s.rx * ca).addScaledVector(s.ay, ry * sa);
        // muscle: a radial swell the caller shapes from the vertex position
        _a.addScaledVector(_n, offset + (offsetFn ? offsetFn(_a, u, s) : 0));
        const col = colorFn ? colorFn(_a, u, s) : [1, 1, 1];
        ring.push(this.vertex(_a, uvIn(uvRect, u, s.v), s.bones, col, tag));
      }
      rings.push(ring);
    }
    // Winding depends on the handedness of (ax, ay, along): a station frame
    // whose up was flipped to keep it pointing skyward goes round the other way.
    const handed = (i) => {
      const s0 = stations[Math.min(i, stations.length - 2)];
      const s1 = stations[Math.min(i + 1, stations.length - 1)];
      _a.copy(s1.c).sub(s0.c);
      return _b.crossVectors(s0.ax, s0.ay).dot(_a) >= 0;
    };
    for (let i = 0; i < rings.length - 1; i++) {
      const h = handed(i);
      for (let k = 0; k < around; k++) {
        const a = rings[i][k];
        const b = rings[i][k + 1];
        const c = rings[i + 1][k];
        const d = rings[i + 1][k + 1];
        if (h) {
          this.tri(a, b, c);
          this.tri(b, d, c);
        } else {
          this.tri(a, c, b);
          this.tri(b, c, d);
        }
      }
    }
    const cap = (s, ring, flip) => {
      const col = colorFn ? colorFn(s.c, 0.5, s) : [1, 1, 1];
      const centre = this.vertex(s.c, uvIn(uvRect, 0.5, s.v), s.bones, col, tag);
      for (let k = 0; k < around; k++) {
        if (flip) this.tri(centre, ring[k + 1], ring[k]);
        else this.tri(centre, ring[k], ring[k + 1]);
      }
    };
    // start cap faces back along the chain, end cap faces on along it
    if (capStart) cap(stations[0], rings[0], handed(0));
    if (capEnd) cap(stations[stations.length - 1], rings[rings.length - 1], !handed(stations.length - 2));
    return rings;
  }

  /**
   * Append a three geometry, transformed by `matrix`, textured into `uvRect`
   * with an optional uv remap, and bound to `bones`.
   */
  addGeometry(geo, { matrix, uvRect, uvFn, bones, color = [1, 1, 1], colorFn, tag = 0, flip = false } = {}) {
    const g = geo.index ? geo : geo;
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const base = this.count;
    for (let i = 0; i < pos.count; i++) {
      _a.fromBufferAttribute(pos, i);
      if (matrix) _a.applyMatrix4(matrix);
      let u = uv ? uv.getX(i) : 0;
      let v = uv ? uv.getY(i) : 0;
      if (uvFn) [u, v] = uvFn(u, v, _a, i);
      const col = colorFn ? colorFn(_a) : color;
      this.vertex(_a, uvRect ? uvIn(uvRect, u, v) : [u, v], bones, col, tag);
    }
    if (g.index) {
      const ix = g.index;
      for (let i = 0; i < ix.count; i += 3) {
        if (flip) this.tri(base + ix.getX(i), base + ix.getX(i + 2), base + ix.getX(i + 1));
        else this.tri(base + ix.getX(i), base + ix.getX(i + 1), base + ix.getX(i + 2));
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        if (flip) this.tri(base + i, base + i + 2, base + i + 1);
        else this.tri(base + i, base + i + 1, base + i + 2);
      }
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    smoothSeams(g);
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Average normals across vertices that share a position. A loft duplicates its
 * seam vertex for the texture wrap, and without this the seam is a visible
 * shading line down the belly of every animal.
 */
function smoothSeams(g) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    const l = map.get(k);
    if (l) l.push(i);
    else map.set(k, [i]);
  }
  for (const l of map.values()) {
    if (l.length < 2) continue;
    _n.set(0, 0, 0);
    for (const i of l) _n.add(_a.fromBufferAttribute(nor, i));
    if (_n.lengthSq() < 1e-10) continue;
    _n.normalize();
    for (const i of l) nor.setXYZ(i, _n.x, _n.y, _n.z);
  }
}

/** Piecewise-linear lookup in a table of [key, ...values]. */
function table(rows, k) {
  if (k <= rows[0][0]) return rows[0].slice(1);
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (k <= b[0]) {
      const t = (k - a[0]) / (b[0] - a[0]);
      return a.slice(1).map((v, j) => lerp(v, b[j + 1], t));
    }
  }
  return rows[rows.length - 1].slice(1);
}

/** Catmull-Rom through joint positions, with arc lengths of each joint. */
function chainCurve(points) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const n = 200;
  const lengths = curve.getLengths(n);
  const total = lengths[n];
  // arc position of each control point, by nearest sampled point
  const arcs = points.map((p) => {
    let best = 0;
    let bd = 1e9;
    for (let i = 0; i <= n; i++) {
      const q = curve.getPoint(i / n);
      const d = q.distanceToSquared(p);
      if (d < bd) {
        bd = d;
        best = lengths[i];
      }
    }
    return best;
  });
  arcs[0] = 0;
  arcs[arcs.length - 1] = total;
  return { curve, arcs, total };
}

/** Stations along a chain curve; `profile(d, fraction)` returns { rx, ryTop, ryBot, drop }. */
function chainStations(cc, count, profile, boneOf, { blend = 0.1, vFn = (f) => f, right = X, up = Y } = {}) {
  const out = [];
  for (let i = 0; i <= count; i++) {
    const f = i / count;
    const d = f * cc.total;
    const t = cc.curve.getUtoTmapping(f);
    const c = cc.curve.getPoint(t);
    const tan = cc.curve.getTangent(t).normalize();
    const ax = _b.copy(right).addScaledVector(tan, -tan.dot(right));
    if (ax.lengthSq() < 1e-6) ax.set(1, 0, 0);
    ax.normalize();
    // the section's up axis: skyward for the trunk, forward for a leg, so the
    // asymmetric profile (ryTop / ryBot) means the same thing along the chain
    const ay = new THREE.Vector3().crossVectors(tan, ax).normalize();
    if (ay.dot(up) < 0) ay.negate();
    const p = profile(d, f);
    c.addScaledVector(ay, -(p.drop || 0));
    out.push({
      c,
      ax: ax.clone(),
      ay,
      tan: tan.clone(),
      rx: p.rx,
      ryTop: p.ryTop,
      ryBot: p.ryBot,
      v: vFn(f),
      d,
      f,
      bones: boneOf(d),
    });
  }
  return out;
}

/** Ellipsoid with cylindrical UVs about its own vertical axis; face at +Z is u = 0.5. */
function ellipsoid(rx, ry, rz, ws, hs) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rx, ry, rz);
  return g;
}

/** Cylindrical skull UVs (see SKULL_MAP) for a head-space point, unit head scaled by s. */
const skullUV = (s) => (p) => {
  const dx = p.x;
  const dz = p.z - SKULL_MAP.cz * s;
  return [0.5 + Math.atan2(dx, dz) / (Math.PI * 2), clamp((p.y - SKULL_MAP.cy * s) / (SKULL_MAP.vSpan * s) + 0.5, 0.02, 0.98)];
};

/**
 * Build one lion's geometry at a detail tier.
 *
 * Returns skinned geometries: `body` (the atlas material), `alpha` (whiskers
 * and the tail tuft, cutout), `mane` (male only, the base shell), `maneShells`
 * (the outer shells, merged, with an aShell attribute) and `fuzz` (short body
 * shells). All are in the same rest space as the skeleton.
 */
export function buildLionGeometry(skel, kind, tier, { fuzzShells = 0, maneShells = 8, maneLength = 0.17 } = {}) {
  const K = KINDS[kind];
  const s = K.scale;
  const D = DETAIL[tier];
  const rest = skel.rest;
  const idx = (n) => skel.index.get(n);
  const P = (n) => rest.get(n).pos;
  const bulk = K.bulk;

  const body = new SkinBuilder();
  const alpha = new SkinBuilder();

  const dustColor = (p) => {
    // AO where the legs meet the body, dust low down
    let ao = 1;
    for (const n of ['shoulderL', 'shoulderR', 'hipL', 'hipR']) {
      const d = p.distanceTo(P(n)) / s;
      ao *= 1 - 0.32 * smoothstep(0.26, 0.05, d);
    }
    ao *= 1 - 0.22 * smoothstep(0.64, 0.42, p.y / s);
    const dust = smoothstep(0.3, 0.04, p.y / s) * 0.38;
    return [ao * lerp(1, 0.8, dust), ao * lerp(1, 0.76, dust), ao * lerp(1, 0.7, dust)];
  };

  // --- torso and neck -------------------------------------------------------
  const spineNames = ['pelvis', 'spine1', 'spine2', 'chest', 'neck1', 'neck2', 'head'];
  // the rump ends just behind the hip joints, the croup sloping down to the tail root
  const rumpTip = P('pelvis').clone().add(new THREE.Vector3(0, -0.05 * s, -0.17 * s));
  const noseWard = P('head').clone().add(new THREE.Vector3(0, 0.015 * s, 0.1 * s));
  const spinePts = [rumpTip, ...spineNames.map((n) => P(n).clone()), noseWard];
  const torso = chainCurve(spinePts);
  // arc positions of the bones' joints: segment k runs from joint k to k+1
  const torsoArcs = [0, ...torso.arcs.slice(1, -1), torso.total];
  const torsoBones = [idx('pelvis'), idx('pelvis'), idx('spine1'), idx('spine2'), idx('chest'), idx('neck1'), idx('neck2'), idx('head')];
  const torsoBoneOf = (d) => {
    const w = chainWeights(torsoArcs, d, 0.13 * s);
    const out = w.map((x, i) => [torsoBones[i], x]);
    // the belly breathes with the ribs bone
    const belly = smoothstep(0.45 * s, 0.7 * s, d) * smoothstep(1.2 * s, 0.95 * s, d);
    if (belly > 0) out.push([idx('ribs'), belly * 0.45]);
    return out;
  };
  // sections are keyed to the joints (index into spinePts, plus a fraction
  // toward the next) so the profile follows the skeleton if it is re-proportioned
  const arcAt = (i, f = 0) => THREE.MathUtils.lerp(torso.arcs[i], torso.arcs[Math.min(i + 1, torso.arcs.length - 1)], f);
  // [arc, rx, ryTop, ryBot, drop]: the deepest section is the chest at the
  // shoulder, the widest the hips and the shoulders, and the neck stays heavy
  // right up to the skull
  const torsoRows = [
    [arcAt(0), 0.05, 0.03, 0.1, 0.06],
    [arcAt(0, 0.4), 0.17, 0.05, 0.22, 0.05],
    [arcAt(1), 0.23, 0.09, BELLY.pelvis, 0.04], // pelvis: mass on top, the groin tucked up so the thigh shows below it
    [arcAt(1, 0.5), 0.205, 0.08, 0.42, 0.04],
    [arcAt(2), 0.19, 0.07, BELLY.spine1, 0.04], // spine1: waist, narrower than either end; a lion's belly is full
    // the ribcage is long and deep: the underline stays down from the elbow
    // back past the middle of the trunk before it rises to the groin
    [arcAt(3), 0.23, 0.075, BELLY.spine2, 0.04], // spine2
    [arcAt(3, 0.6), 0.26, 0.08, BELLY.chest + 0.005, 0.04],
    [arcAt(4), 0.265, 0.08, BELLY.chest, 0.035], // chest / shoulders: the widest point, the brisket down at the elbow
    [arcAt(4, 0.5), 0.235, 0.08, 0.48, 0.03], // point of the shoulder: broad, the upper arm buried in it
    [arcAt(5), 0.15, 0.08, 0.34, 0.02], // neck1: the neck proper starts, no wider than the head is long
    [arcAt(6), 0.118, 0.075, 0.2, 0.01], // neck2: throat rising to the jaw, narrower than the skull
    [arcAt(7), 0.1, 0.07, 0.15, 0.0], // head: inside the skull; the throat runs on under the jaw
    [arcAt(8), 0.075, 0.05, 0.115, 0.0],
  ];
  const torsoProfile = (d) => {
    const [rx, ryTop, ryBot, drop] = table(torsoRows, d);
    return { rx: rx * s * bulk, ryTop: ryTop * s, ryBot: ryBot * s * bellyFactor(bulk), drop: drop * s };
  };
  const torsoStations = chainStations(torso, Math.max(8, Math.round(40 * D.along)), torsoProfile, torsoBoneOf, { vFn: (f) => f });
  const torsoBelly = (p, u) => {
    const c = dustColor(p);
    // the underside is in its own shadow
    const under = smoothstep(0.2, 0.0, Math.min(u, 1 - u));
    return [c[0] * (1 - 0.18 * under), c[1] * (1 - 0.18 * under), c[2] * (1 - 0.18 * under)];
  };
  // muscle masses over the loft: the shoulder (scapula and triceps) and the
  // haunch (gluteals and thigh) swell the flanks; the ribcage rounds out
  // behind the elbow, and the waist tucks in ahead of the hips
  const bulge = (p, cx, cy, cz, r, amt) => {
    const dx = (Math.abs(p.x) - cx) / r;
    const dy = (p.y - cy) / r;
    const dz = (p.z - cz) / r;
    return amt * Math.exp(-(dx * dx + dy * dy + dz * dz) * 2.2);
  };
  const muscle = (p, u) => {
    const lateral = smoothstep(0.1 * s, 0.22 * s, Math.abs(p.x));
    let o = bulge(p, 0.22 * s, 0.88 * s, 0.4 * s, 0.24 * s, 0.04 * s) * lateral;
    // the haunch: gluteals over the hip and the thigh mass below and behind it,
    // swelling the trunk around the hip so the leg grows out of it
    o += bulge(p, 0.22 * s, 0.86 * s, -0.56 * s, 0.27 * s, 0.045 * s) * lateral;
    o += bulge(p, 0.2 * s, 0.76 * s, -0.6 * s, 0.2 * s, 0.035 * s) * lateral;
    o -= bulge(p, 0.22 * s, 0.85 * s, -0.2 * s, 0.22 * s, 0.014 * s) * lateral;
    return o;
  };
  body.loft(torsoStations, D.around, { uvRect: ATLAS.body, capStart: true, colorFn: torsoBelly, offsetFn: muscle });

  // --- legs --------------------------------------------------------------------
  const legStations = (leg, offset = 0) => {
    // The loft starts inside the trunk, above and behind the joint — at the
    // top of the scapula for a foreleg, the buttock for a hind leg — and grows
    // out of it, so the shoulder-blade and the haunch are one surface with the
    // leg rather than a tube hung under the body.
    const above = leg.front ? new THREE.Vector3(-0.09 * s, 0.12 * s, -0.03 * s) : new THREE.Vector3(-0.06 * s, 0.1 * s, -0.09 * s);
    if (leg.side < 0) above.x = -above.x;
    const pts = [P(leg.root).clone().add(above), ...[leg.root, leg.mid, leg.low, leg.paw, leg.toe].map((n) => P(n).clone())];
    // the toes protrude past the loft
    pts[5].lerp(pts[4], 0.35);
    const cc = chainCurve(pts);
    const arcs = cc.arcs;
    const bodyBone = idx(leg.front ? 'chest' : 'pelvis');
    const bones = [bodyBone, idx(leg.root), idx(leg.mid), idx(leg.low), idx(leg.paw)];
    const rootArc = arcs[1];
    const boneOf = (d) => {
      const w = chainWeights(arcs, d, 0.075 * s);
      const out = w.map((x, i) => [bones[i], x]);
      const top = smoothstep(0.16 * s, 0, d - rootArc) * 0.7;
      if (top > 0) out.push([bodyBone, top]);
      return out;
    };
    const legR = K.leg;
    const front = leg.front;
    const profile = (d) => {
      // fraction of the leg proper, from the joint down; negative inside the trunk
      const f = (d - rootArc) / (cc.total - rootArc);
      // [f, rx, ryFwd, ryBack]: the station's up axis points forward on a leg,
      // so ryTop is the depth ahead of the bone and ryBot behind it. Triceps
      // and hamstrings hang behind the upper bones, the forearm is deeper than
      // it is wide, and the cannon is nearly round.
      const rows = front
        ? [
            [0.0, 0.088, 0.125, 0.165],
            [0.15, 0.086, 0.118, 0.145],
            [0.3, 0.09, 0.114, 0.12], // elbow: the point of the elbow and the triceps behind it
            [0.45, 0.076, 0.098, 0.088],
            [0.6, 0.064, 0.078, 0.068],
            [0.72, 0.058, 0.062, 0.057],
            [0.82, 0.055, 0.052, 0.05],
            // the pastern flattens toward the paw: lying, it rests along the
            // ground, so its depth here must be less than the paw joint's height
            [0.92, 0.068, 0.046, 0.044],
            [1.0, 0.064, 0.036, 0.034],
          ]
        : [
            // the thigh's mass hangs behind the femur; ahead of it the flank
            // fold runs down and forward to the stifle, which is the leg's
            // front-most point, so the leg zigzags in silhouette
            [0.0, 0.14, 0.14, 0.24],
            [0.15, 0.14, 0.13, 0.2],
            [0.3, 0.1, 0.12, 0.12], // stifle
            [0.42, 0.08, 0.102, 0.092], // gaskin
            [0.56, 0.062, 0.074, 0.072],
            [0.66, 0.05, 0.058, 0.062], // hock: the narrowest point, still a heavy joint
            [0.78, 0.05, 0.052, 0.052],
            [0.9, 0.062, 0.046, 0.044],
            [1.0, 0.062, 0.036, 0.034],
          ];
      const [rx, ryF, ryB] = table(rows, Math.max(0, f));
      const thick = lerp(bulk, legR, smoothstep(0.2, 0.5, f));
      // inside the trunk the section shrinks toward the start so the loft closes into it
      const inner = f < 0 ? lerp(0.35, 1, d / rootArc) : 1;
      return { rx: rx * s * thick * inner, ryTop: ryF * s * thick * inner, ryBot: ryB * s * thick * inner, drop: 0 };
    };
    return chainStations(cc, Math.max(7, Math.round(21 * D.legAlong)), profile, boneOf, { vFn: (f) => 1 - f, up: new THREE.Vector3(0, 0, 1) });
  };
  for (const leg of skel.legs) {
    const st = legStations(leg);
    body.loft(st, D.legAround, {
      uvRect: ATLAS.leg,
      uStart: leg.side > 0 ? 0 : Math.PI,
      capEnd: true,
      colorFn: dustColor,
    });
    addPaw(body, skel, leg, K, D);
  }

  // --- tail --------------------------------------------------------------------
  const tailPts = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tailTip'].map((n) => P(n).clone());
  tailPts.unshift(P('pelvis').clone().add(new THREE.Vector3(0, -0.02 * s, -0.08 * s)));
  const tail = chainCurve(tailPts);
  const tailBones = [idx('pelvis'), idx('tail1'), idx('tail2'), idx('tail3'), idx('tail4'), idx('tail5')];
  const tailBoneOf = (d) => chainWeights(tail.arcs, d, 0.05 * s).map((x, i) => [tailBones[i], x]);
  const tailProfile = (d, f) => {
    const r = lerp(0.04, 0.02, smoothstep(0, 0.75, f)) + 0.012 * smoothstep(0.82, 0.96, f) * smoothstep(1.0, 0.96, f);
    return { rx: r * s, ryTop: r * s, ryBot: r * s, drop: 0 };
  };
  body.loft(chainStations(tail, Math.max(5, Math.round(16 * D.along)), tailProfile, tailBoneOf, { vFn: (f) => 1 - f }), Math.max(5, Math.round(D.legAround * 0.7)), {
    uvRect: ATLAS.tail,
    capEnd: true,
  });

  // --- head ------------------------------------------------------------------
  addHead(body, alpha, skel, K, D);

  const out = { body: body.build(), alpha: alpha.count ? alpha.build() : null, mane: null, maneShells: null, fuzz: null };

  // --- mane ------------------------------------------------------------------
  if (K.mane && maneShells > 0) {
    // the mane runs from the withers to the back of the skull and the cheeks;
    // the face itself is bare, so the loft stops at the head joint with its
    // top tucked under the crown and its bottom still deep for the throat ruff
    const neckNames = ['chest', 'neck1', 'neck2', 'head'];
    // the last station reaches the cheeks, below and behind the eyes, so the
    // ruff frames the face at the jaw angle the way it does on a real male
    const mPts = [P('spine2').clone().add(new THREE.Vector3(0, 0, 0.1 * s)), ...neckNames.map((n) => P(n).clone()), P('head').clone().add(new THREE.Vector3(0, -0.01 * s, 0.13 * s))];
    const mane = chainCurve(mPts);
    const mArcs = [0, ...mane.arcs.slice(1, -1), mane.total];
    const mBones = [idx('spine2'), idx('chest'), idx('neck1'), idx('neck2'), idx('head')];
    const mBoneOf = (d) => chainWeights(mArcs, d, 0.1 * s).map((x, i) => [mBones[i], x]);
    const ml = mane.total / s;
    const mProfile = (d) => {
      const dd = d / s;
      const [rx, ryTop, ryBot, drop] = table(
        [
          [0.0, 0.15, 0.05, 0.22, 0.1],
          [0.12, 0.28, 0.13, 0.4, 0.1],
          [0.3, 0.31, 0.19, 0.42, 0.08],
          [0.5, 0.29, 0.2, 0.36, 0.06],
          [0.68, 0.25, 0.18, 0.3, 0.03],
          [ml * 0.86, 0.2, 0.14, 0.26, 0.0],
          [ml, 0.15, 0.085, 0.2, 0.0],
        ],
        dd,
      );
      return { rx: rx * s, ryTop: ryTop * s, ryBot: ryBot * s, drop: drop * s };
    };
    const count = Math.max(6, Math.round(18 * D.along));
    const around = Math.max(10, Math.round(D.around * 0.7));
    const base = new SkinBuilder();
    const stations = chainStations(mane, count, mProfile, mBoneOf, { vFn: (f) => f * 1.6 });
    base.loft(stations, around, { uvRect: [0, 0, 1, 1], capStart: true, colorFn: () => [0.55, 0.5, 0.45] });
    out.mane = base.build();
    const shells = new SkinBuilder();
    const n = maneShells;
    for (let i = 1; i <= n; i++) {
      const h = i / n;
      const st = chainStations(mane, count, mProfile, mBoneOf, { vFn: (f) => f * 1.6 });
      // strands get longer toward the throat and shoulders, shorter behind the ears
      shells.loft(st, around, {
        uvRect: [0, 0, 1, 1],
        offset: h * maneLength * s,
        tag: h,
        colorFn: (p, u, s2) => {
          // strands shorten toward the face, and the crown over the skull is
          // short hair, not a mane
          const top = Math.max(0, Math.sin(u * Math.PI * 2 - Math.PI / 2));
          const long = lerp(0.35, 1.0, smoothstep(0.0, 0.22, s2.f)) * lerp(1.0, 0.45, smoothstep(0.55, 1.0, s2.f)) * lerp(1.0, 0.5, top * smoothstep(0.7, 1.0, s2.f));
          return [long, long, long];
        },
      });
    }
    out.maneShells = shells.build();
    out.maneShells.setAttribute('aShell', new THREE.Float32BufferAttribute(shells.tag, 1));
  }

  // --- fuzz shells over torso and legs ---------------------------------------
  if (fuzzShells > 0) {
    const fz = new SkinBuilder();
    for (let i = 1; i <= fuzzShells; i++) {
      const h = i / fuzzShells;
      const off = h * 0.016 * s;
      const st = chainStations(torso, Math.max(8, Math.round(36 * D.along * 0.7)), torsoProfile, torsoBoneOf, { vFn: (f) => f });
      fz.loft(st, Math.round(D.around * 0.7), { uvRect: [0, 0.5, 1, 1], offset: off, tag: h, colorFn: torsoBelly, offsetFn: muscle });
      for (const leg of skel.legs) {
        const ls = legStations(leg);
        fz.loft(ls, Math.round(D.legAround * 0.75), { uvRect: [0, 0.25, 0.5, 0.5], uStart: leg.side > 0 ? 0 : Math.PI, offset: off, tag: h, colorFn: dustColor });
      }
    }
    out.fuzz = fz.build();
    out.fuzz.setAttribute('aShell', new THREE.Float32BufferAttribute(fz.tag, 1));
  }

  return out;
}

/** Pad, four toes and claws on the end of a paw bone. */
function addPaw(b, skel, leg, K, D) {
  const s = K.scale;
  const r = skel.rest.get(leg.paw);
  const boneIdx = skel.index.get(leg.paw);
  const bones = [[boneIdx, 1]];
  const L4 = r.len;
  const frame = new THREE.Matrix4().compose(r.pos, r.quat, new THREE.Vector3(1, 1, 1));
  const local = (x, y, z, rot, scale) => {
    _m.compose(new THREE.Vector3(x, y, z), rot ? _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])) : _q.identity(), scale || new THREE.Vector3(1, 1, 1));
    return new THREE.Matrix4().multiplyMatrices(frame, _m);
  };
  const w = K.leg * s;
  // pad: flattened ellipsoid whose underside is exactly the contact point
  const padGeo = new THREE.SphereGeometry(1, D.sphere[0] * 0.6 | 0 || 8, D.sphere[1] * 0.6 | 0 || 5);
  // The paw bone pitches 14 degrees toward the toes, so the pad's lowest point is
  // not its -z extreme: with the pad centred here its underside just kisses the
  // contact point, and the toes further along the bone are raised to match.
  b.addGeometry(padGeo, {
    matrix: local(0, 0.056 * s, 0.0125 * s, null, new THREE.Vector3(0.06 * w, 0.062 * s, 0.019 * s)),
    uvRect: ATLAS.pad,
    bones,
    color: [0.9, 0.86, 0.82],
  });
  if (!D.toes) return;
  const toeGeo = new THREE.SphereGeometry(1, D.sphere[0] * 0.5 | 0 || 6, D.sphere[1] * 0.5 | 0 || 4);
  const clawGeo = D.claws ? new THREE.CylinderGeometry(0.0, 0.006 * s, 0.024 * s, 6) : null;
  const xs = [-0.046, -0.016, 0.016, 0.046];
  for (let i = 0; i < 4; i++) {
    const x = xs[i] * w;
    const outer = Math.abs(xs[i]) > 0.03;
    const y = (L4 * 0.86 - (outer ? 0.012 * s : 0)) ;
    const spread = xs[i] * 3.0;
    b.addGeometry(toeGeo, {
      matrix: local(x, y, 0.003 * s, [0, 0, -spread * 0.4], new THREE.Vector3(0.02 * w, 0.034 * s, 0.021 * s)),
      uvRect: ATLAS.leg,
      uvFn: (u, v) => [0.2 + u * 0.1, 0.05 + v * 0.1],
      bones,
      color: [0.82, 0.78, 0.74],
    });
    if (clawGeo) {
      b.addGeometry(clawGeo, {
        matrix: local(x + spread * 0.006 * s, y + 0.034 * s, 0.0, [-0.55, 0, -spread * 0.5], new THREE.Vector3(1, 1, 1)),
        uvRect: ATLAS.claw,
        bones,
      });
    }
  }
}

/** Skull, brow, cheeks, muzzle, nose, jaw, ears, eyes, lids and whiskers. */
function addHead(b, alpha, skel, K, D) {
  const s = K.scale * K.head;
  const rest = skel.rest;
  const headIdx = skel.index.get('head');
  const headBones = [[headIdx, 1]];
  const hr = rest.get('head');
  const frame = new THREE.Matrix4().compose(hr.pos, hr.quat, new THREE.Vector3(1, 1, 1));
  // head bone +Y is forward, +Z is down; work in a forward = +Z, up = +Y frame instead
  const headFrame = new THREE.Matrix4().multiplyMatrices(frame, new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  const local = (x, y, z, rot, scale) => {
    _m.compose(new THREE.Vector3(x, y, z), rot ? _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])) : _q.identity(), scale || new THREE.Vector3(1, 1, 1));
    return new THREE.Matrix4().multiplyMatrices(headFrame, _m);
  };
  const ws = D.sphere[0];
  const hs = D.sphere[1];
  // the braincase: a lion's head is nearly as tall as it is long (about 1.4:1
  // nose to occiput over crown to chin), so the skull is a short, deep, wide
  // ellipsoid and the muzzle a stub in front of it, not a snout
  const skullC = new THREE.Vector3(0, 0.026 * s, 0.06 * s);
  const skullR = new THREE.Vector3(0.116 * s, 0.112 * s, 0.122 * s);
  // the crown is flat between the ears, not domed: press the top of the
  // ellipsoid down and let the sides carry the width. The features are then
  // sculpted into the one surface rather than stacked on it as separate
  // shapes, so there are no seams: a brow ridge over each socket, the
  // zygomatic arch and the masseter making the cheek the widest part of the
  // face, and a shallow socket around each eye.
  const skull = ellipsoid(skullR.x, skullR.y, skullR.z, ws, hs);
  {
    const ap = skull.attributes.position;
    for (let i = 0; i < ap.count; i++) {
      // a cat's skull is boxy, not egg-shaped: full in the cheeks and the jaw,
      // flat across the forehead. Push the ellipsoid out toward a rounded box
      // (a superellipsoid of exponent 2.5), more so below the eye line where
      // the masseter and the jaw fill it out.
      const nx = ap.getX(i) / skullR.x;
      const ny = ap.getY(i) / skullR.y;
      const nz = ap.getZ(i) / skullR.z;
      const n = ny < 0 ? 2.7 : 2.4;
      const k = 1 / Math.pow(Math.pow(Math.abs(nx), n) + Math.pow(Math.abs(ny), n) + Math.pow(Math.abs(nz), n), 1 / n);
      let x = ap.getX(i) * k;
      let y = ap.getY(i) * k;
      const z = ap.getZ(i) * k;
      if (y > 0) {
        const t = y / skullR.y;
        y *= lerp(1, 0.82, t * t);
        x *= lerp(1, 1.06, t);
      }
      ap.setXYZ(i, x, y, z);
    }
    skull.computeVertexNormals();
    // [cx, cy, cz, rx, ry, rz, amount], mirrored in x, in skull-local unit-head metres
    const bumps = [
      [0.05, 0.048, 0.088, 0.036, 0.022, 0.036, 0.011], // brow ridge
      [0.104, -0.028, 0.03, 0.03, 0.05, 0.065, 0.014], // zygomatic arch
      [0.088, -0.062, 0.07, 0.035, 0.045, 0.055, 0.012], // masseter / jowl
      [0.056, 0.02, 0.1, 0.03, 0.03, 0.03, -0.007], // eye socket
      [0.0, 0.045, 0.11, 0.03, 0.03, 0.04, 0.008], // frontal boss between the eyes
    ];
    const an = skull.attributes.normal;
    for (let i = 0; i < ap.count; i++) {
      const x = ap.getX(i);
      const y = ap.getY(i);
      const z = ap.getZ(i);
      let o = 0;
      for (const [cx, cy, cz, rx, ry, rz, amt] of bumps) {
        const dx = (Math.abs(x) - cx * s) / (rx * s);
        const dy = (y - cy * s) / (ry * s);
        const dz = (z - cz * s) / (rz * s);
        o += amt * s * Math.exp(-(dx * dx + dy * dy + dz * dz) * 1.6);
      }
      if (o !== 0) ap.setXYZ(i, x + an.getX(i) * o, y + an.getY(i) * o, z + an.getZ(i) * o);
    }
    skull.computeVertexNormals();
  }
  const toHead = new THREE.Matrix4().copy(headFrame).invert();
  // skull uv is cylindrical about the skull centre, evaluated in head space
  const suvHead = skullUV(s);
  const suv = (u, v, p) => {
    _c.copy(p).applyMatrix4(toHead);
    return suvHead(_c);
  };

  b.addGeometry(skull, { matrix: local(skullC.x, skullC.y, skullC.z), uvRect: ATLAS.skull, uvFn: suv, bones: headBones });
  // nasal bridge: from the forehead between the eyes down onto the root of the
  // muzzle; narrower than the gap between the sockets so it never covers an eye
  b.addGeometry(ellipsoid(0.034 * s, 0.026 * s, 0.085 * s, ws * 0.7 | 0, hs * 0.7 | 0), {
    matrix: local(0, 0.058 * s, 0.118 * s, [0.42, 0, 0]),
    uvRect: ATLAS.skull,
    uvFn: suv,
    bones: headBones,
  });

  // muzzle: broad and blunt, a short loft forward from the skull, bottom seam at u = 0
  // a cat's muzzle is a box, not a snout: it keeps its width and depth almost
  // to the nose and ends bluntly, the nose leather on the front face. Eye to
  // nose tip is about 40% of the head's length. It is narrower than the skull
  // (the cheeks stand out beside it) and its top runs below the eyes, so the
  // eye sits on the corner of the face, above and outside the muzzle.
  const mz = [
    { z: 0.13, w: 0.072, t: 0.048, bt: 0.068, y: -0.01 },
    { z: 0.19, w: 0.07, t: 0.045, bt: 0.066, y: -0.011 },
    { z: 0.245, w: 0.066, t: 0.042, bt: 0.06, y: -0.012 },
    { z: 0.278, w: 0.058, t: 0.037, bt: 0.05, y: -0.013 },
    { z: 0.295, w: 0.042, t: 0.027, bt: 0.036, y: -0.014 },
    { z: 0.302, w: 0.022, t: 0.013, bt: 0.018, y: -0.015 },
  ];
  const mzStations = mz.map((m, i) => ({
    c: new THREE.Vector3(0, m.y * s, m.z * s).applyMatrix4(headFrame),
    ax: new THREE.Vector3(1, 0, 0).transformDirection(headFrame),
    ay: new THREE.Vector3(0, 1, 0).transformDirection(headFrame),
    rx: m.w * s,
    ryTop: m.t * s,
    ryBot: m.bt * s,
    v: i / (mz.length - 1),
    bones: headBones,
  }));
  b.loft(mzStations, Math.max(8, Math.round(D.around * 0.5)), { uvRect: ATLAS.muzzle, capEnd: true });

  // nose leather, front projected
  if (D.head >= 1) {
    // an inverted triangle, wide across the top and nearly flat on the front
    const nose = new THREE.SphereGeometry(1, ws * 0.6 | 0, hs * 0.6 | 0);
    const np = nose.attributes.position;
    for (let i = 0; i < np.count; i++) {
      const y = np.getY(i);
      // narrower toward the bottom, flatter toward the front
      np.setX(i, np.getX(i) * lerp(0.55, 1.0, smoothstep(-1, 1, y)));
      if (np.getZ(i) > 0) np.setZ(i, np.getZ(i) * 0.55);
    }
    nose.computeVertexNormals();
    nose.scale(0.032 * s, 0.023 * s, 0.02 * s);
    b.addGeometry(nose, {
      matrix: local(0, 0.008 * s, 0.298 * s, [0.45, 0, 0]),
      uvRect: ATLAS.nose,
      uvFn: (u, v, p) => {
        _c.copy(p).applyMatrix4(toHead);
        return [clamp(_c.x / (0.064 * s) + 0.5), clamp((_c.y - 0.008 * s) / (0.046 * s) + 0.5)];
      },
      bones: headBones,
    });
  }

  // lower jaw on the jaw bone
  const jr = rest.get('jaw');
  const jawIdx = skel.index.get('jaw');
  // the lower jaw tucks under the upper lip: narrower and shallower than the
  // muzzle, deepest at the angle of the jaw and shrinking to a small chin
  const jawStations = [
    { z: 0.04, w: 0.068, t: 0.034, bt: 0.036, y: -0.066 },
    { z: 0.13, w: 0.065, t: 0.032, bt: 0.03, y: -0.068 },
    { z: 0.19, w: 0.062, t: 0.03, bt: 0.026, y: -0.068 },
    { z: 0.24, w: 0.052, t: 0.026, bt: 0.02, y: -0.066 },
    { z: 0.266, w: 0.032, t: 0.018, bt: 0.012, y: -0.062 },
  ].map((m, i, arr) => ({
    c: new THREE.Vector3(0, m.y * s, m.z * s).applyMatrix4(headFrame),
    ax: new THREE.Vector3(1, 0, 0).transformDirection(headFrame),
    ay: new THREE.Vector3(0, 1, 0).transformDirection(headFrame),
    rx: m.w * s,
    ryTop: m.t * s,
    ryBot: m.bt * s,
    v: i / (arr.length - 1),
    bones: [[jawIdx, 1]],
  }));
  b.loft(jawStations, Math.max(8, Math.round(D.around * 0.4)), { uvRect: ATLAS.jaw, capStart: true, capEnd: true });

  // ears: a cup on each ear bone, outer shell and inner lining
  for (const side of ['earL', 'earR']) {
    const er = rest.get(side);
    const ei = skel.index.get(side);
    const ef = new THREE.Matrix4().compose(er.pos, er.quat, new THREE.Vector3(1, 1, 1));
    const cup = (scale, inner) => {
      // a rounded cup about as wide as it is tall, rooted at the skull surface
      const g = new THREE.SphereGeometry(1, Math.max(8, ws * 0.6 | 0), Math.max(5, hs * 0.6 | 0), 0, Math.PI * 2, 0, Math.PI * 0.6);
      g.scale(0.046 * s * scale, 0.027 * s * scale, 0.053 * s * scale);
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0.038 * s, inner ? 0.004 * s : 0);
      const vRim = 1 - 0.6;
      b.addGeometry(g, {
        matrix: ef,
        uvRect: inner ? ATLAS.earIn : ATLAS.earOut,
        uvFn: (u, v) => [u, clamp((v - vRim) / (1 - vRim))],
        bones: [[ei, 1]],
        flip: inner,
        color: inner ? [0.9, 0.86, 0.84] : [1, 1, 1],
      });
    };
    cup(1, false);
    if (D.head >= 1) cup(0.9, true);
  }

  // eyes on the head bone, lids on their own bones
  if (D.eyes) {
    const eyeR = EYE_R * s;
    for (const side of ['lidL', 'lidR']) {
      const lr = rest.get(side);
      const li = skel.index.get(side);
      const lf = new THREE.Matrix4().compose(lr.pos, lr.quat, new THREE.Vector3(1, 1, 1));
      const eye = new THREE.SphereGeometry(eyeR, ws, hs);
      b.addGeometry(eye, { matrix: lf, uvRect: ATLAS.eye, bones: headBones, color: [1, 1, 1] });
      if (D.lids) {
        // Each lid is a hemisphere a little larger than the ball, its rim a great
        // circle through the eye's lateral axis. The upper one is pitched back
        // so its edge sits LID_UP above the gaze, the lower one LID_DOWN below;
        // what shows between two such rims is an almond that pinches to the
        // corners, which is the shape of a cat's eye. Up is -Z in lid space.
        const cap = (pitch, bones, rimSign) => {
          const g = new THREE.SphereGeometry(eyeR * 1.09, ws, Math.max(6, hs * 0.6 | 0), 0, Math.PI * 2, 0, Math.PI * 0.5);
          const vRim = 0.5;
          // pole to -Z (up) for the upper lid, +Z (down) for the lower, then tilt
          // back about X so the rim sits at the stated angle off the gaze
          g.rotateX(rimSign * -Math.PI / 2);
          g.rotateX(pitch);
          b.addGeometry(g, {
            matrix: lf,
            uvRect: ATLAS.lid,
            uvFn: (u, v) => [u, clamp((v - vRim) / (1 - vRim))],
            bones,
          });
        };
        cap(-LID_UP, [[li, 1]], 1);
        cap(LID_DOWN, headBones, -1);
      }
    }
  }

  // whiskers: strand quads fanning from the whisker pads
  if (D.whiskers && alpha) {
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const row = i % 3;
        const col = (i / 3) | 0;
        const baseP = new THREE.Vector3(sd * (0.062 + row * 0.004) * s, (-0.032 - row * 0.012) * s, (0.21 + col * 0.03) * s);
        const len = (0.15 + (i % 2) * 0.04 + row * 0.015) * s;
        // whiskers sweep out and back, nearly level, the lower rows drooping a little
        const dir = new THREE.Vector3(sd * (0.8 + row * 0.1), -0.08 - row * 0.1 + col * 0.1, 0.3 - col * 0.2).normalize();
        const sag = new THREE.Vector3(0, -0.12, 0);
        strandQuad(alpha, headFrame, baseP, dir, len, 0.002 * s, sag, headBones, 3);
      }
    }
  }
  // tail tuft: three crossed cards hanging from the last tail bone
  if (alpha) {
    const tr = rest.get('tail5');
    const ti = skel.index.get('tail5');
    const tf = new THREE.Matrix4().compose(tr.pos, tr.quat, new THREE.Vector3(1, 1, 1));
    const L = tr.len;
    const tuft = K.tuft * K.scale;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      const g = new THREE.PlaneGeometry(0.11 * tuft, 0.2 * tuft);
      // hang from the tip: plane centre below the bone end along +Y (the bone axis)
      g.translate(0, 0.1 * tuft, 0);
      g.rotateY(a);
      g.translate(0, L * 0.7, 0);
      // left half of the alpha atlas is the tuft, strands rooted at the top
      alpha.addGeometry(g, { matrix: tf, uvRect: [0, 0, 0.5, 1], uvFn: (u, v) => [u, 1 - v], bones: [[ti, 1]], tag: 1 });
    }
  }
}

/** A tapered strand as a chain of quads, for whiskers. */
function strandQuad(b, frame, base, dir, len, width, sag, bones, segs) {
  const side = new THREE.Vector3().crossVectors(dir, Y).normalize();
  if (side.lengthSq() < 0.5) side.set(1, 0, 0);
  const prev = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = base.clone().addScaledVector(dir, len * t).addScaledVector(sag, len * t * t);
    const w = width * (1 - t * 0.85);
    const l = p.clone().addScaledVector(side, w).applyMatrix4(frame);
    const r = p.clone().addScaledVector(side, -w).applyMatrix4(frame);
    // right half of the alpha atlas holds the single whisker strand
    const il = b.vertex(l, [0.68, 1 - t], bones, [1, 1, 1], 2);
    const ir = b.vertex(r, [0.82, 1 - t], bones, [1, 1, 1], 2);
    if (prev.length) {
      b.tri(prev[0], il, prev[1]);
      b.tri(prev[1], il, ir);
      b.tri(prev[0], prev[1], il);
      b.tri(prev[1], ir, il);
    }
    prev[0] = il;
    prev[1] = ir;
  }
}
