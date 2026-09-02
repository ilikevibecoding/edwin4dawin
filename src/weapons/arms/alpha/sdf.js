import * as THREE from 'three';

/**
 * Signed-distance primitives used to sculpt the glove hands as one seamless organic surface.
 * Every primitive exposes dist(x, y, z) (metres, negative inside), a loose bounding box and a
 * material id + optional "dorsal" frame so the mesher can decide knit vs. leather per vertex.
 *
 * The field of a hand is a smooth union (polynomial smin) of all primitives, followed by a smooth
 * subtraction of the weapon's collision volumes so the glove is pressed flat against the gun instead
 * of intersecting it.
 */

export const MAT = { KNIT: 0, LEATHER: 1, CUFF: 2 };

/** Polynomial smooth minimum (Inigo Quilez). k = blend radius in metres. */
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function smax(a, b, k) {
  if (k <= 0) return Math.max(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

class Primitive {
  constructor(mat, blend) {
    this.mat = mat;
    this.blend = blend; // smin radius when unioned into the field
    this.min = new THREE.Vector3();
    this.max = new THREE.Vector3();
    this.dorsal = null; // unit vector: local "back of hand" direction for the knit/leather split
    this.dorsalOrigin = null;
    this.dorsalCut = 0; // signed offset of the split plane along `dorsal`
    this.knitEnd = null; // optional {axis, origin, length}: knit only for the first `length` metres along axis
  }

  /** Lower bound of the distance from p to this primitive (bbox based) — used to skip far primitives. */
  bboxDist(x, y, z) {
    const dx = Math.max(this.min.x - x, 0, x - this.max.x);
    const dy = Math.max(this.min.y - y, 0, y - this.max.y);
    const dz = Math.max(this.min.z - z, 0, z - this.max.z);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

/** Tapered capsule from a (radius ra) to b (radius rb). */
export class Capsule extends Primitive {
  constructor(a, b, ra, rb, mat = MAT.LEATHER, blend = 0.006) {
    super(mat, blend);
    this.a = a.clone();
    this.b = b.clone();
    this.ra = ra;
    this.rb = rb;
    this.ab = b.clone().sub(a);
    this.len2 = Math.max(1e-9, this.ab.lengthSq());
    const r = Math.max(ra, rb);
    this.min.set(Math.min(a.x, b.x) - r, Math.min(a.y, b.y) - r, Math.min(a.z, b.z) - r);
    this.max.set(Math.max(a.x, b.x) + r, Math.max(a.y, b.y) + r, Math.max(a.z, b.z) + r);
  }

  dist(x, y, z) {
    const px = x - this.a.x;
    const py = y - this.a.y;
    const pz = z - this.a.z;
    let t = (px * this.ab.x + py * this.ab.y + pz * this.ab.z) / this.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - this.ab.x * t;
    const dy = py - this.ab.y * t;
    const dz = pz - this.ab.z * t;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (this.ra + (this.rb - this.ra) * t);
  }
}

/** Oriented ellipsoid (approximate SDF, good enough for blending). */
export class Ellipsoid extends Primitive {
  constructor(center, radii, quaternion = null, mat = MAT.LEATHER, blend = 0.008) {
    super(mat, blend);
    this.c = center.clone();
    this.r = radii.clone();
    this.q = quaternion ? quaternion.clone().invert() : null;
    const m = Math.max(radii.x, radii.y, radii.z);
    this.min.set(center.x - m, center.y - m, center.z - m);
    this.max.set(center.x + m, center.y + m, center.z + m);
    this._v = new THREE.Vector3();
  }

  dist(x, y, z) {
    const v = this._v.set(x - this.c.x, y - this.c.y, z - this.c.z);
    if (this.q) v.applyQuaternion(this.q);
    const r = this.r;
    const k0 = Math.sqrt((v.x * v.x) / (r.x * r.x) + (v.y * v.y) / (r.y * r.y) + (v.z * v.z) / (r.z * r.z));
    const k1 = Math.sqrt((v.x * v.x) / (r.x * r.x * r.x * r.x) + (v.y * v.y) / (r.y * r.y * r.y * r.y) + (v.z * v.z) / (r.z * r.z * r.z * r.z));
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r.x, r.y, r.z);
  }
}

/** Oriented rounded box. half = half extents (before rounding), round = corner radius. */
export class RoundBox extends Primitive {
  constructor(center, half, round = 0.002, quaternion = null, mat = MAT.LEATHER, blend = 0.006) {
    super(mat, blend);
    this.c = center.clone();
    this.h = half.clone();
    this.round = round;
    this.q = quaternion ? quaternion.clone().invert() : null;
    const m = Math.max(half.x, half.y, half.z) * 1.75 + round;
    this.min.set(center.x - m, center.y - m, center.z - m);
    this.max.set(center.x + m, center.y + m, center.z + m);
    this._v = new THREE.Vector3();
  }

  dist(x, y, z) {
    const v = this._v.set(x - this.c.x, y - this.c.y, z - this.c.z);
    if (this.q) v.applyQuaternion(this.q);
    const qx = Math.abs(v.x) - this.h.x;
    const qy = Math.abs(v.y) - this.h.y;
    const qz = Math.abs(v.z) - this.h.z;
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - this.round;
  }
}

/**
 * A scalar field = smooth union of `shapes` minus smooth subtraction of `carves` (weapon volumes).
 * `carveGap` keeps the glove a hair off the metal so nothing z-fights.
 */
export class Field {
  constructor(shapes, carves = [], { carveBlend = 0.004, carveGap = 0.0012 } = {}) {
    this.shapes = shapes;
    this.carves = carves;
    this.carveBlend = carveBlend;
    this.carveGap = carveGap;
    this.min = new THREE.Vector3(Infinity, Infinity, Infinity);
    this.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const s of shapes) {
      this.min.min(s.min);
      this.max.max(s.max);
    }
  }

  /** Signed distance (negative inside). */
  dist(x, y, z) {
    const shapes = this.shapes;
    let d = 1e9;
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      // Cheap reject: a primitive further than (current best + blend) cannot change the smooth minimum.
      if (s.bboxDist(x, y, z) > d + s.blend) continue;
      d = smin(d, s.dist(x, y, z), s.blend);
    }
    const carves = this.carves;
    for (let i = 0; i < carves.length; i++) {
      const c = carves[i];
      if (c.bboxDist(x, y, z) > this.carveBlend + this.carveGap + 0.002) continue;
      d = smax(d, -(c.dist(x, y, z) - this.carveGap), this.carveBlend);
    }
    return d;
  }

  /** Material id at a surface point: the material of the nearest primitive, with its dorsal split if any. */
  materialAt(x, y, z) {
    const shapes = this.shapes;
    let best = 1e9;
    let bs = null;
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      if (s.bboxDist(x, y, z) > best) continue;
      const d = s.dist(x, y, z);
      if (d < best) {
        best = d;
        bs = s;
      }
    }
    if (!bs) return MAT.LEATHER;
    if (bs.dorsal) {
      const o = bs.dorsalOrigin;
      const side = (x - o.x) * bs.dorsal.x + (y - o.y) * bs.dorsal.y + (z - o.z) * bs.dorsal.z - bs.dorsalCut;
      if (side <= 0) return MAT.LEATHER;
      if (bs.knitEnd) {
        const k = bs.knitEnd;
        const along = (x - k.origin.x) * k.axis.x + (y - k.origin.y) * k.axis.y + (z - k.origin.z) * k.axis.z;
        if (along > k.length) return k.mat ?? MAT.LEATHER;
      }
      return MAT.KNIT;
    }
    return bs.mat;
  }
}
