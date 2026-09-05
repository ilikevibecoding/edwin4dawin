import * as THREE from 'three';
import { boxUV, Kit as BaseKit, rbox, transform } from '../lib/geo.js';
import { POST_END, TIMBER_END } from './textures.js';

// ---------------------------------------------------------------------------
// Assembly helpers on top of the shared merging Kit.
//
// A builder makes an `Obj` in its own frame (x right, y up from the ground, z
// towards the front), then `place`s it in camp coordinates. Placement bakes the
// yaw, the ground height under the object and, where asked for, the ground's
// tilt into the vertices before they go into the material bucket — so the whole
// static camp is one merged mesh per material and nothing has to be posed at
// runtime.
//
// UVs are box-projected in metres at a per-material tile size, so a plank at
// the far end of the camp gets the same grain density as one by the fire.
// ---------------------------------------------------------------------------

/** Metres per texture tile for each material key; anything missing is 1 m. */
export const TILE = {
  timber: 0.6,
  timberWarm: 0.6,
  pole: 0.6,
  post: 2.4,
  canvas: 1.0,
  canvasOlive: 1.0,
  canvasSand: 1.0,
  canvasGreen: 1.0,
  canvasChair: 0.5,
  chairCloth: 0.5,
  tarp: 1.4,
  galv: 1.0,
  steelGreen: 0.5,
  steelWhite: 0.5,
  steelRed: 0.5,
  steelBlue: 0.5,
  steelYellow: 0.35,
  steelBlack: 0.5,
  steel: 0.7,
  alu: 0.4,
  rubber: 0.4,
  poly: 0.5,
  polyBlack: 0.5,
  polyBlue: 0.4,
  polyGreen: 0.4,
  polyRed: 0.4,
  polyYellow: 0.4,
  rock: 1.6,
  deadwood: 1.2,
  charLog: 0.5,
  crate: 1.0,
  ash: 2.4,
  solar: 1.0,
};

/**
 * Materials whose tile carries end grain (see textures.js TIMBER_END and
 * POST_END). Their long faces are kept out of the end-grain region and their
 * cut faces are mapped into it: `band` keys have rings in the top quarter of
 * the timber tile, `polar` keys the whole-log strip.
 */
const END_GRAIN = { timber: 'band', timberWarm: 'band', pole: 'band', post: 'polar' };
const BAND_V = TIMBER_END.v0 - 0.02;
const SHAFT_U = POST_END.u0 - 0.02;

const _q = new THREE.Quaternion();
const _qy = new THREE.Quaternion();
const _n = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The shared Kit merges every bucket non-indexed and recomputes normals, which
 * flat-shades everything: a 9-segment pole shows its facets from two metres and
 * a subdivided canvas shows every quad. Every geometry that reaches here already
 * carries the normals its builder meant (three's primitives, `boxUV`,
 * `lump`), and `transform()` rotates them along with the vertices, so keep
 * them: merge indexed where the whole bucket is indexed, and where a lump or an
 * extrusion forces the bucket non-indexed, expand without recomputing.
 */
export class Kit extends BaseKit {
  build(materials, { castShadow = true, receiveShadow = true, group = new THREE.Group() } = {}) {
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[Kit ${this.name}] missing material "${key}"`);
        continue;
      }
      let geos = list.map((g) => {
        const c = g.clone();
        if (!c.attributes.normal) c.computeVertexNormals();
        if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
        for (const name of Object.keys(c.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') c.deleteAttribute(name);
        return c;
      });
      if (!geos.every((g) => g.index)) geos = geos.map((g) => (g.index ? g.toNonIndexed() : g));
      this.emit(group, key, mat, geos, { castShadow, receiveShadow });
    }
    return group;
  }
}

export class Obj {
  constructor() {
    this.parts = [];
  }

  /** Add a geometry (consumed, not cloned) with an optional object-frame transform. */
  add(key, geo, xform, { uv = true, swap = false } = {}) {
    if (xform) transform(geo, xform);
    if (uv) {
      boxUV(geo, 1 / (TILE[key] || 1));
      if (END_GRAIN[key]) keepOffEndGrain(geo, END_GRAIN[key]);
    }
    if (swap) swapUV(geo);
    this.parts.push([key, geo]);
    return this;
  }

  /**
   * A box. Thin stock — slats, boards, sheet — is a plain 12-triangle box; a
   * chamfer on a 20 mm plank is a highlight nobody sees and a hundred
   * triangles each on the thousand of them in the camp. Anything chunkier gets
   * the rounded edge that reads as a real object.
   *
   * Timber boxes are mapped in their own frame before they are posed: grain
   * along the long axis whatever way the piece is turned, and the two cut
   * faces into the tile's end-grain band.
   */
  box(key, w, h, d, xform, opts = {}) {
    const thin = Math.min(w, h, d) < 0.035 || opts.r === 0;
    const geo = thin ? new THREE.BoxGeometry(w, h, d) : rbox(w, h, d, opts.r ?? 0.012, opts.seg ?? 1);
    if (END_GRAIN[key] === 'band' && opts.uv !== false) {
      plankUV(geo, w, h, d, TILE[key] || 1, this.parts.length);
      return this.add(key, geo, xform, { ...opts, uv: false });
    }
    return this.add(key, geo, xform, opts);
  }

  /** Cylinder standing on y = 0 unless `centre` is set. */
  cyl(key, rTop, rBottom, h, radial, xform = {}, opts = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, radial, opts.heightSeg || 1, opts.open || false);
    if (!opts.centre) g.translate(0, h * 0.5, 0);
    if (opts.uv === undefined) {
      poleUV(g, TILE[key] || 1, { ends: END_GRAIN[key] });
      return this.add(key, g, xform, { ...opts, uv: false });
    }
    return this.add(key, g, xform, opts);
  }

  /** A tube through points. `density` is segments per metre; wire wants 1, a rope 6. */
  tube(key, points, r, radial = 8, xform, opts = {}) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]))),
      false,
      'catmullrom',
      opts.tension ?? 0.4,
    );
    const seg = Math.max(points.length * 2, Math.round(curve.getLength() * (opts.density ?? 6)));
    const g = new THREE.TubeGeometry(curve, seg, r, radial, false);
    return this.add(key, g, xform, { uv: false, ...opts });
  }

  /** Append another Obj at an object-frame transform. */
  merge(other, xform) {
    for (const [key, geo] of other.parts) {
      const g = geo.clone();
      if (xform) transform(g, xform);
      this.parts.push([key, g]);
    }
    return this;
  }

  /**
   * Bake the object into the kit. `facing` is [du, dv]; `conform` blends the
   * object's up vector toward the ground normal (a cabin on plinths is 0, a
   * tent pegged straight to the dirt is 1); `dy` lifts it off the ground.
   */
  place(kit, frame, { u, v, facing = [0, -1], dy = 0, conform = 0, y, half = 1.0, roll = 0 } = {}) {
    const yaw = frame.yaw(facing[0], facing[1]);
    _qy.setFromAxisAngle(UP, yaw);
    if (conform > 0) {
      const gp = frame.groundPlane(u, v, half);
      _n.set(-gp.slopeU * conform, 1, gp.slopeV * conform).normalize();
      _q.setFromUnitVectors(UP, _n).multiply(_qy);
      y = y ?? gp.y;
    } else {
      _q.copy(_qy);
      y = y ?? frame.ground(u, v);
    }
    if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
    const pos = [u, y + dy, -v];
    for (const [key, geo] of this.parts) kit.add(key, geo, { pos, quat: _q.clone() });
    return { u, v, y: y + dy, yaw };
  }
}

/**
 * Cylindrical UVs with the tile's u along the axis, so grain runs along a pole.
 * `ends` maps the flat caps (normal along ±y) into the material's end-grain
 * region: 'band' as a disc of rings in the timber tile, 'polar' as radius and
 * angle in the whole-log strip. With 'band' the shaft's v is held under the
 * band; with 'polar' the shaft's u is held under the strip (`span` metres of
 * pole to one tile — a post's whole length).
 */
export function poleUV(geo, tile = 1, { ends = null, span = null } = {}) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5 || 0.05;
  let around = (2 * Math.PI * r) / tile;
  if (ends === 'band') around = Math.min(around, BAND_V);
  const L = bb.max.y - bb.min.y || 1;
  // along the shaft: one tile per `tile` metres, or the whole shaft into the
  // strip's share of the tile when a span is given
  const kU = span ? SHAFT_U / span : ends === 'polar' ? Math.min(1 / tile, SHAFT_U / L) : 1 / tile;
  const capR = Math.min(r / tile, TIMBER_END.r * 0.96);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const cap = ends && nor && Math.abs(nor.getY(i)) > 0.98;
    if (cap && ends === 'band') {
      // a disc of rings about the band's centre, at the pole's own scale
      uv[i * 2] = TIMBER_END.cx + (x / r) * capR;
      uv[i * 2 + 1] = TIMBER_END.cy + (z / r) * capR;
    } else if (cap && ends === 'polar') {
      const rr = Math.min(1, Math.hypot(x, z) / r);
      uv[i * 2] = POST_END.u0 + rr * (1 - POST_END.u0);
      uv[i * 2 + 1] = Math.atan2(z, x) / (Math.PI * 2) + 0.5;
    } else {
      uv[i * 2] = (y - bb.min.y) * kU;
      uv[i * 2 + 1] = (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * around;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * UVs for a timber box in its own frame: grain along the longest axis, the
 * across coordinate held inside the boards, and the two cut faces mapped into
 * the end-grain band — a little off the ring centre so a plank end shows the
 * arcs of a sawn section rather than a bullseye. `n` varies the board and the
 * offset between otherwise identical pieces.
 */
export function plankUV(geo, w, h, d, tile, n = 0) {
  const dims = [w, h, d];
  const axis = dims[0] >= dims[1] && dims[0] >= dims[2] ? 0 : dims[1] >= dims[2] ? 1 : 2;
  const a1 = axis === 0 ? 1 : 0;
  const a2 = axis === 2 ? 1 : 2;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const hash = (k) => {
    const s = Math.sin((n + 1) * 12.9898 + k * 78.233 + w * 31 + h * 17 + d * 7) * 43758.5453;
    return s - Math.floor(s);
  };
  const uOff = hash(1) * 3;
  // which board the long faces sit on, kept inside the band
  const across = (ax) => Math.min(1, (BAND_V * 0.6) / (dims[ax] / tile)) / tile;
  const vOff = (ax) => Math.min(BAND_V - (dims[ax] * across(ax)) - 0.01, Math.floor(hash(2) * 3) * 0.25 + 0.01);
  // the cut faces: their rectangle in tile units, shrunk to fit the band
  const eu = dims[a1] / tile;
  const ev = dims[a2] / tile;
  const fit = Math.min(1, (TIMBER_END.r * 1.9) / Math.max(ev, 1e-3), 0.9 / Math.max(eu, 1e-3));
  const cxOff = (hash(3) - 0.5) * 0.12;
  const cyOff = (hash(4) - 0.5) * Math.max(0, TIMBER_END.r * 2 - ev * fit) * 0.9;
  const p = [0, 0, 0];
  const nn = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i);
    p[1] = pos.getY(i);
    p[2] = pos.getZ(i);
    nn[0] = Math.abs(nor.getX(i));
    nn[1] = Math.abs(nor.getY(i));
    nn[2] = Math.abs(nor.getZ(i));
    if (nn[axis] > 0.7) {
      const side = nor.getX(i) + nor.getY(i) + nor.getZ(i) > 0 ? 1 : -1;
      uv[i * 2] = TIMBER_END.cx + cxOff + ((side * p[a1]) / tile) * fit;
      uv[i * 2 + 1] = TIMBER_END.cy + cyOff + (p[a2] / tile) * fit;
    } else {
      // the face's normal is (mostly) along a1 or a2; the other is the across coordinate
      const ac = nn[a1] >= nn[a2] ? a2 : a1;
      uv[i * 2] = p[axis] / tile + uOff;
      uv[i * 2 + 1] = (p[ac] + dims[ac] * 0.5) * across(ac) + vOff(ac);
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/**
 * For a box-projected timber geometry that was not built through `box`: pull
 * the v range under the end-grain band (compressing if it spans more than the
 * boards), or, for the whole-log tile, the u range under the end strip.
 */
function keepOffEndGrain(geo, mode) {
  const uv = geo.attributes.uv;
  const c = mode === 'band' ? 1 : 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    const t = c ? uv.getY(i) : uv.getX(i);
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  const limit = mode === 'band' ? BAND_V : SHAFT_U;
  const k = Math.min(1, (limit - 0.01) / Math.max(hi - lo, 1e-3));
  for (let i = 0; i < uv.count; i++) {
    const t = (c ? uv.getY(i) : uv.getX(i)) - lo;
    if (c) uv.setY(i, t * k);
    else uv.setX(i, t * k);
  }
  return geo;
}

export function swapUV(geo) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    uv.setXY(i, uv.getY(i), u);
  }
  return geo;
}

/**
 * A bent, slightly irregular tube through a few points: guy ropes with sag,
 * branches, hoses. Points are [x, y, z]; `sag` drops the middle.
 */
export function slackLine(a, b, sag = 0.05, steps = 5) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = Math.sin(t * Math.PI);
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * s, a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}

/**
 * A rough lump: an icosphere with its vertices pushed around by seeded noise.
 * Used for rocks, ash, termite mound, bundled kit under a tarp.
 */
export function lump(rx, ry, rz, rnd, { detail = 1, rough = 0.18, flat = 0 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const seedA = rnd() * 10;
  const seedB = rnd() * 10;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n1 = Math.sin(x * 3.1 + seedA) * Math.cos(z * 2.7 + seedB) * Math.sin(y * 2.3 + seedA * 0.5);
    const n2 = Math.sin(x * 7.3 + seedB) * Math.sin(y * 6.1 + seedA) * 0.5;
    const s = 1 + (n1 + n2) * rough;
    let yy = y * s * ry;
    // a rock that has sat on the ground is flat underneath
    if (flat > 0 && yy < 0) yy *= 1 - flat;
    p.setXYZ(i, x * s * rx, yy, z * s * rz);
  }
  g.computeVertexNormals();
  return g;
}

export { rbox, transform, boxUV };
