import * as THREE from 'three';
import { boxUV, Kit as BaseKit, rbox, transform } from '../lib/geo.js';

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
    if (uv) boxUV(geo, 1 / (TILE[key] || 1));
    if (swap) swapUV(geo);
    this.parts.push([key, geo]);
    return this;
  }

  /**
   * A box. Thin stock — slats, boards, sheet — is a plain 12-triangle box; a
   * chamfer on a 20 mm plank is a highlight nobody sees and a hundred
   * triangles each on the thousand of them in the camp. Anything chunkier gets
   * the rounded edge that reads as a real object.
   */
  box(key, w, h, d, xform, opts = {}) {
    const thin = Math.min(w, h, d) < 0.035 || opts.r === 0;
    const geo = thin ? new THREE.BoxGeometry(w, h, d) : rbox(w, h, d, opts.r ?? 0.012, opts.seg ?? 1);
    return this.add(key, geo, xform, opts);
  }

  /** Cylinder standing on y = 0 unless `centre` is set. */
  cyl(key, rTop, rBottom, h, radial, xform = {}, opts = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, radial, opts.heightSeg || 1, opts.open || false);
    if (!opts.centre) g.translate(0, h * 0.5, 0);
    if (opts.uv === undefined) {
      poleUV(g, TILE[key] || 1);
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

/** Cylindrical UVs with the tile's u along the axis, so grain runs along a pole. */
export function poleUV(geo, tile = 1) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5 || 0.05;
  const around = (2 * Math.PI * r) / tile;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv[i * 2] = (y - bb.min.y) / tile;
    uv[i * 2 + 1] = (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * around;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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
