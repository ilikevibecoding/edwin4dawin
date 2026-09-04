import * as THREE from 'three';
import { BELLY, EYE, KINDS, bellyFactor } from './spec.js';
import { chainWeights } from './rig.js';
import { addHead } from './head.js';
import { ATLAS, SKULL_MAP, uvIn } from './textures.js';
import { rowsAt } from './headspec.js';
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
  /**
   * `alpha` makes the colour attribute four wide: three.js then multiplies
   * the material's alpha by the vertex alpha before the alpha test, which is
   * how the shell fur thins toward the ends of a loft without a shader edit.
   */
  constructor({ alpha = false } = {}) {
    this.alpha = alpha;
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
    if (this.alpha) this.col.push(color[3] ?? 1);
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
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, this.alpha ? 4 : 3));
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

/**
 * Smooth lookup in a table of [key, ...values]: a Catmull-Rom through the rows
 * (headspec.js rowsAt), each value clamped between its two bracketing rows so
 * the curve never overshoots a stated radius — the belly rows are contracts
 * with the poser. Round 3 interpolated these tables piecewise-linearly, and
 * every row was a crease in the trunk's silhouette: the "step where the neck
 * joins the chest" the critics saw was the kink at the neck1 row.
 */
function table(rows, k) {
  if (k <= rows[0][0]) return rows[0].slice(1);
  if (k >= rows[rows.length - 1][0]) return rows[rows.length - 1].slice(1);
  const out = rowsAt(rows, k);
  let i = 0;
  while (i < rows.length - 2 && k > rows[i + 1][0]) i++;
  const a = rows[i];
  const b = rows[i + 1];
  for (let j = 0; j < out.length; j++) {
    const lo = Math.min(a[j + 1], b[j + 1]);
    const hi = Math.max(a[j + 1], b[j + 1]);
    out[j] = clamp(out[j], lo, hi);
  }
  return out;
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
    // AO where the legs meet the body, a little dust low down (the paws are
    // the leg's colour, not boots: the dust here is a tint, not a sock)
    let ao = 1;
    for (const n of ['shoulderL', 'shoulderR', 'hipL', 'hipR']) {
      const d = p.distanceTo(P(n)) / s;
      ao *= 1 - 0.32 * smoothstep(0.26, 0.05, d);
    }
    ao *= 1 - 0.22 * smoothstep(0.64, 0.42, p.y / s);
    const dust = smoothstep(0.3, 0.04, p.y / s) * 0.22;
    return [ao * lerp(1, 0.86, dust), ao * lerp(1, 0.83, dust), ao * lerp(1, 0.78, dust)];
  };

  // --- torso and neck -------------------------------------------------------
  const spineNames = ['pelvis', 'spine1', 'spine2', 'chest', 'neck1', 'neck2', 'head'];
  // the rump ends just behind the hip joints, the croup sloping down to the
  // tail root (round 4: pulled in 4 cm — the trunk read long)
  const rumpTip = P('pelvis').clone().add(new THREE.Vector3(0, -0.05 * s, -0.13 * s));
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
  // right up to the skull.
  //
  // Round 4: the section is a deep oval, not a slab. Round 3 put the spine
  // curve at the top of a 0.1-high, 0.27-wide upper half — a flat lit back
  // meeting near-vertical flanks with a hard shading break along the whole
  // trunk (the "painted highlight stripe" was that flat top catching the
  // sun). The centre now sits `drop` well under the spine with an upper half
  // about 0.7 of the width, so the light rolls off the back into the flank;
  // the back line and the belly line are where they were (drop + ryTop and
  // drop + ryBot are unchanged per row, the belly rows expressed against
  // BELLY so the poser's floor still holds), and the trunk is a tenth
  // narrower — a lion is deep, not broad.
  const D0 = BELLY.drop;
  const torsoRows = [
    [arcAt(0), 0.06, 0.05, 0.1, 0.075],
    [arcAt(0, 0.4), 0.17, 0.11, 0.2, 0.1],
    [arcAt(1), 0.215, 0.15, BELLY.pelvis - (0.1 - D0), 0.1], // pelvis: broad across the hips, the groin tucked up so the thigh shows below it
    [arcAt(1, 0.5), 0.21, 0.15, 0.465, 0.105],
    [arcAt(2), 0.2, 0.15, BELLY.spine1 - (0.11 - D0), 0.11], // spine1: the loin, barely narrower than the ribs; a lion's belly is full
    // the ribcage is long and deep: the underline stays down from the elbow
    // back past the middle of the trunk, sagging a little, before it rises to the groin
    [arcAt(3), 0.215, 0.16, BELLY.spine2 - (0.115 - D0), 0.115], // spine2: the barrel
    [arcAt(3, 0.6), 0.23, 0.175, BELLY.chest + 0.01 - (0.115 - D0), 0.115], // behind the shoulder blades: the withers rise
    [arcAt(4), 0.235, 0.18, BELLY.chest - (0.11 - D0), 0.11], // chest / shoulders: the widest point, the brisket down at the elbow
    [arcAt(4, 0.5), 0.215, 0.16, 0.44, 0.09], // point of the shoulder: broad, the upper arm buried in it
    [arcAt(5), 0.175, 0.13, 0.33, 0.06], // neck1: the neck proper starts, as wide as the skull and deeper than it
    [arcAt(6), 0.135, 0.1, 0.21, 0.03], // neck2: throat rising to the jaw, as wide as the skull
    [arcAt(7), 0.1, 0.075, 0.145, 0.01], // head: inside the skull; the throat runs on under the jaw
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
    // the shoulder: triceps and the point of the shoulder low down, and the
    // scapula with its muscle riding up over the forelegs to the withers, the
    // heavy-shouldered read a lion has and a dog does not
    let o = bulge(p, 0.22 * s, 0.88 * s, 0.4 * s, 0.24 * s, 0.06 * s) * lateral;
    // the shoulder blade: a broad plate riding high on the side of the
    // ribcage behind the withers, +8 % on the section there (round 4)
    o += bulge(p, 0.19 * s, 1.04 * s, 0.32 * s, 0.22 * s, 0.05 * s) * lateral;
    // the haunch: gluteals over the hip and the thigh mass below and behind it,
    // swelling the trunk around the hip so the leg grows out of it, and the
    // hip bone itself, a knuckle high on the pelvis over the joint (round 4)
    o += bulge(p, 0.22 * s, 0.88 * s, -0.56 * s, 0.27 * s, 0.05 * s) * lateral;
    o += bulge(p, 0.2 * s, 0.76 * s, -0.6 * s, 0.2 * s, 0.04 * s) * lateral;
    o += bulge(p, 0.16 * s, 1.03 * s, -0.58 * s, 0.16 * s, 0.035 * s) * lateral;
    // and the waist tucks in ahead of the hips
    o -= bulge(p, 0.2 * s, 0.85 * s, -0.22 * s, 0.22 * s, 0.012 * s) * lateral;
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
      // Round 4: the limbs are a fifth to a quarter thicker from the elbow
      // and stifle down to the wrist and hock (critics read the round-3 legs
      // as sticks at 60 % of a lion's); the pastern and paw rows are held, so
      // the paw bones' soles and the pad geometry are where the gait expects.
      const rows = front
        ? [
            [0.0, 0.11, 0.14, 0.19],
            [0.15, 0.108, 0.135, 0.17],
            [0.28, 0.106, 0.128, 0.16], // elbow: the point of the elbow behind it, the triceps above
            [0.38, 0.115, 0.14, 0.132], // top of the forearm: the thickest part of the lower leg
            [0.52, 0.1, 0.116, 0.104],
            [0.66, 0.084, 0.09, 0.083],
            [0.78, 0.072, 0.072, 0.07],
            [0.86, 0.072, 0.066, 0.076], // wrist: the carpus is a knob, the accessory pad behind it
            // the pastern narrows under the wrist and flattens toward the paw:
            // lying, it rests along the ground, so its depth here must be less
            // than the paw joint's height. The paw itself (addPaw) flares out
            // wider than the pastern, so the foot reads as a foot on a leg.
            [0.93, 0.062, 0.048, 0.044],
            [1.0, 0.066, 0.044, 0.03],
          ]
        : [
            // the thigh's mass hangs behind the femur; ahead of it the flank
            // fold runs down and forward to the stifle, which is the leg's
            // front-most point, so the leg zigzags in silhouette
            [0.0, 0.16, 0.16, 0.27],
            [0.15, 0.16, 0.152, 0.23],
            [0.3, 0.125, 0.155, 0.145], // stifle: the patella out front
            [0.42, 0.12, 0.146, 0.137], // gaskin: the calf muscle, nearly as thick as the forearm
            [0.56, 0.092, 0.104, 0.106],
            [0.66, 0.074, 0.074, 0.108], // hock: the point of the hock stands out behind
            [0.78, 0.066, 0.065, 0.068],
            [0.9, 0.06, 0.05, 0.046],
            [1.0, 0.064, 0.044, 0.03],
          ];
      const [rx, ryF, ryB] = table(rows, Math.max(0, f));
      // the paw end tracks the pad's width (see addPaw), the limb the leg factor
      const thick = lerp(lerp(bulk, legR, smoothstep(0.2, 0.5, f)), Math.sqrt(legR), smoothstep(0.75, 1.0, f));
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
    // The mane runs from the withers, over the shoulders and up the neck, and
    // ends at the back of the skull: the face and cheeks are the head's (its
    // card ruff frames the face). The last station sits inside the skull and
    // the first inside the trunk, so no open end of the base or of a shell is
    // ever in view.
    const neckNames = ['chest', 'neck1', 'neck2'];
    const mPts = [P('spine2').clone(), ...neckNames.map((n) => P(n).clone()), P('head').clone().add(new THREE.Vector3(0, 0, -0.02 * s))];
    const mane = chainCurve(mPts);
    const mArcs = [0, ...mane.arcs.slice(1, -1), mane.total];
    const mBones = [idx('spine2'), idx('chest'), idx('neck1'), idx('neck2'), idx('head')];
    const mBoneOf = (d) => chainWeights(mArcs, d, 0.1 * s).map((x, i) => [mBones[i], x]);
    const mArcAt = (i, f = 0) => THREE.MathUtils.lerp(mane.arcs[i], mane.arcs[Math.min(i + 1, mane.arcs.length - 1)], f);
    // The base is the skin of the mane: it hugs the trunk and the neck a few
    // centimetres out (inside the trunk over the withers and under the
    // brisket, inside the skull at the end). The shells carry the volume.
    const mProfile = (d) => {
      const [rx, ryTop, ryBot, drop] = table(
        [
          [mArcAt(0), 0.14, 0.04, 0.2, 0.08],
          [mArcAt(0, 0.5), 0.27, 0.115, 0.44, 0.06], // withers: the base breaks the surface of the back here
          [mArcAt(1), 0.3, 0.13, 0.47, 0.05], // chest: the widest, the throat ruff deepest
          [mArcAt(1, 0.5), 0.26, 0.12, 0.44, 0.04],
          [mArcAt(2), 0.21, 0.11, 0.41, 0.03], // neck1
          [mArcAt(2, 0.5), 0.175, 0.098, 0.33, 0.02],
          [mArcAt(3), 0.14, 0.085, 0.24, 0.012], // neck2: on the neck, just outside the coat
          [mArcAt(4), 0.09, 0.06, 0.12, 0.0], // inside the back of the skull
        ],
        d,
      );
      return { rx: rx * s, ryTop: ryTop * s, ryBot: ryBot * s, drop: drop * s };
    };
    const count = Math.max(6, Math.round(18 * D.along));
    const around = Math.max(10, Math.round(D.around * 0.7));
    const base = new SkinBuilder();
    const stations = chainStations(mane, count, mProfile, mBoneOf, { vFn: (f) => f * 1.6 });
    base.loft(stations, around, { uvRect: [0, 0, 1, 1], capStart: true, colorFn: () => [0.55, 0.5, 0.45] });
    out.mane = base.build();
    // the crown of the neck carries short hair: the hair stands out furthest
    // under the throat and on the sides, least along the top
    const top = (u) => Math.max(0, Math.sin(u * Math.PI * 2 - Math.PI / 2));
    // shell stand-off along the chain: nothing inside the trunk at the start,
    // full from the withers to the middle of the neck, and tapering to zero
    // over the front third so the shells lie on the back of the skull
    // (the last fifth is steep, so from the front the mane is a disc of hair
    // behind the head and not a cone of edge-on shells); heaviest over the
    // withers and the chest, where the hair stands out half again as far
    const standOff = (f, u) => smoothstep(0.0, 0.3, f) * smoothstep(1.0, 0.8, f) * (1 + (0.3 + 0.3 * top(u)) * smoothstep(0.15, 0.32, f) * smoothstep(0.68, 0.5, f));
    // hair length (the vertex alpha the shells are alpha-tested through):
    // fades in over the shoulders so the mane's rear edge feathers into the
    // coat, out toward the skull so a shell's rim never carries hair, and
    // shortens over the crown of the neck toward the skull
    const long = (f, u) => smoothstep(0.04, 0.34, f) * smoothstep(1.0, 0.78, f) * (1 - 0.55 * top(u) * smoothstep(0.4, 1.0, f));
    const shells = new SkinBuilder({ alpha: true });
    const n = maneShells;
    for (let i = 1; i <= n; i++) {
      // the alpha threshold sits half a step inside the stand-off, so a tier
      // with one or two shells still carries hair on them
      const h = (i - 0.5) / n;
      const o = i / n;
      const st = chainStations(mane, count, mProfile, mBoneOf, { vFn: (f) => f * 1.6 });
      // the hair darkens outward and under the throat: a mane is dark at its
      // tips and blackest on the chest, tawny only along the crown
      const shade = lerp(0.85, 0.5, o);
      shells.loft(st, around, {
        uvRect: [0, 0, 1, 1],
        tag: h,
        offsetFn: (p, u, s2) => o * maneLength * s * standOff(s2.f, u) * (1 - 0.4 * top(u)),
        colorFn: (p, u, s2) => {
          const k = shade * (1 - 0.3 * (1 - top(u)) * smoothstep(0.75, 0.2, s2.f));
          return [k, k * 0.96, k * 0.9, long(s2.f, u)];
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
  // paw width follows the leg's thickness factor but only by its square root:
  // a cub's paws are big for its legs, a male's are not out of scale with his
  const w = Math.sqrt(K.leg) * s;
  // a hind paw is a little narrower and longer than a fore paw
  const pw = leg.front ? 1.0 : 0.92;
  // pad: flattened ellipsoid whose underside is exactly the contact point.
  // Its width is about 1.6× the pastern's, so the paw reads as a paw and not
  // as the leg tapering to a point.
  const padGeo = new THREE.SphereGeometry(1, D.sphere[0] * 0.6 | 0 || 8, D.sphere[1] * 0.6 | 0 || 5);
  // The paw bone pitches 14 degrees toward the toes, so the pad's lowest point is
  // not its -z extreme: with the pad centred here its underside just kisses the
  // contact point, and the toes further along the bone are raised to match.
  // The pad tile is split: its left half wraps the pad (leather on the sole,
  // fur over the top of the foot), its right half wraps each toe (a dark
  // crease down either side where it meets its neighbour, leather under it,
  // the dark sheath of the claw at its tip). Sphere u runs round from -x: the
  // sole is at u = 0.25, the top at 0.75; v = 1 is the front pole.
  b.addGeometry(padGeo, {
    matrix: local(0, 0.056 * s, 0.0125 * s, null, new THREE.Vector3(0.08 * w * pw, 0.07 * s, 0.019 * s)),
    uvRect: ATLAS.pad,
    uvFn: (u, v) => [u * 0.5, v],
    bones,
  });
  if (!D.toes) return;
  const toeGeo = new THREE.SphereGeometry(1, D.sphere[0] * 0.5 | 0 || 6, D.sphere[1] * 0.5 | 0 || 4);
  const clawGeo = D.claws ? new THREE.CylinderGeometry(0.0, 0.0065 * s, 0.026 * s, 6) : null;
  // four toes, the middle pair leading, each its own lobe: the lobes just
  // touch, so the crease between them is a real groove and not a painted one
  const xs = [-0.063, -0.021, 0.021, 0.063];
  for (let i = 0; i < 4; i++) {
    const x = xs[i] * w * pw;
    const outer = Math.abs(xs[i]) > 0.03;
    const y = L4 * 0.9 - (outer ? 0.016 * s : 0);
    const spread = xs[i] * 3.0;
    b.addGeometry(toeGeo, {
      matrix: local(x, y, -0.003 * s, [0, 0, -spread * 0.4], new THREE.Vector3(0.022 * w, 0.044 * s, 0.029 * s)),
      uvRect: ATLAS.pad,
      uvFn: (u, v) => [0.5 + u * 0.5, v],
      bones,
    });
    if (clawGeo) {
      b.addGeometry(clawGeo, {
        matrix: local(x + spread * 0.006 * s, y + 0.04 * s, 0.0, [-0.55, 0, -spread * 0.5], new THREE.Vector3(1, 1, 1)),
        uvRect: ATLAS.claw,
        bones,
      });
    }
  }
  // dew claw: forelegs only, on the inside of the pastern a hand above the
  // paw, a small toe with its claw turned in and a little back
  if (leg.front) {
    const wr = skel.rest.get(leg.low);
    const wristIdx = skel.index.get(leg.low);
    const wf = new THREE.Matrix4().compose(wr.pos, wr.quat, new THREE.Vector3(1, 1, 1));
    const wlocal = (x, y, z, rot, scale) => {
      _m.compose(new THREE.Vector3(x, y, z), rot ? _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])) : _q.identity(), scale || new THREE.Vector3(1, 1, 1));
      return new THREE.Matrix4().multiplyMatrices(wf, _m);
    };
    const inner = -leg.side;
    const dx = inner * 0.052 * w;
    const dy = wr.len - 0.065 * s;
    b.addGeometry(toeGeo, {
      matrix: wlocal(dx, dy, -0.004 * s, [0, 0, inner * 0.5], new THREE.Vector3(0.018 * w, 0.03 * s, 0.022 * s)),
      uvRect: ATLAS.pad,
      uvFn: (u, v) => [0.5 + u * 0.5, v],
      bones: [[wristIdx, 1]],
    });
    if (clawGeo) {
      b.addGeometry(clawGeo, {
        matrix: wlocal(dx + inner * 0.012 * s, dy + 0.02 * s, -0.012 * s, [-0.9, 0, inner * 0.9], new THREE.Vector3(0.8, 0.8, 0.8)),
        uvRect: ATLAS.claw,
        bones: [[wristIdx, 1]],
      });
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
