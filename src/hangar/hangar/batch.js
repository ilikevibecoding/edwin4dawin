// Fast axis-aligned box batching for the hangar: thousands of panels, posts, slats and markings are
// written straight into growing Float32Arrays (one BufferGeometry per material+colour) instead of one
// BoxGeometry + toNonIndexed + worldUVs pass each, which is what keeps build() inside its budget.
// Geometry is handed to the module Kit through kit.add(..., { uv: "keep" }) so it still merges into
// one draw call per material.
import * as THREE from "three";

// face bits
export const PX = 1, NX = 2, PY = 4, NY = 8, PZ = 16, NZ = 32, ALL = 63;

// [normal, tangent u, tangent v]; cross(tu, tv) == n so the 4-corner loop is CCW from outside.
const FACES = [
  [PX, [1, 0, 0], [0, 0, -1], [0, 1, 0]],
  [NX, [-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [PY, [0, 1, 0], [1, 0, 0], [0, 0, -1]],
  [NY, [0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [PZ, [0, 0, 1], [1, 0, 0], [0, 1, 0]],
  [NZ, [0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];
// two triangles per face as (su, sv) corner signs
const CU = [-1, 1, 1, -1, 1, -1];
const CV = [-1, -1, 1, -1, 1, 1];
// the two triangles of a decal quad as (su, sv) corner signs, laid out like PlaneGeometry.toNonIndexed():
// (top-left, bottom-left, top-right), (bottom-left, bottom-right, top-right); CCW seen from local +z
const QU = [-1, -1, 1, -1, 1, 1];
const QV = [1, -1, 1, -1, -1, 1];
const _ax = new THREE.Vector3(), _ay = new THREE.Vector3(), _az = new THREE.Vector3();
const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _qi = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();

// shared, non-indexed primitive geometries keyed by their parameters (never disposed: tiny)
const _shared = new Map();
/** shared non-indexed box (for repeated rotated parts such as the flood fixtures) */
export function sharedBox(sx, sy, sz) {
  const key = `b|${sx}|${sy}|${sz}`;
  let g = _shared.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    _shared.set(key, g);
  }
  return g;
}
export function sharedCylinder(r, len, segments = 12) {
  const key = `c|${r}|${len}|${segments}`;
  let g = _shared.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, r, len, segments, 1, false).toNonIndexed();
    _shared.set(key, g);
  }
  return g;
}
export function sharedTorus(r, tube, radial = 6, tubular = 16, arc = Math.PI * 2) {
  const key = `t|${r}|${tube}|${radial}|${tubular}|${arc}`;
  let g = _shared.get(key);
  if (!g) {
    g = new THREE.TorusGeometry(r, tube, radial, tubular, arc).toNonIndexed();
    _shared.set(key, g);
  }
  return g;
}
const _qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
const _qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
/** quaternion turning a +Y cylinder onto a world axis */
export function axisQuat(axis) {
  return axis === "x" ? _qx : axis === "z" ? _qz : _qi;
}

function grow(arr, n) {
  const b = new Float32Array(n);
  b.set(arr);
  return b;
}

export class Batch {
  constructor(cap = 512) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.nor = new Float32Array(cap * 3);
    this.uv = new Float32Array(cap * 2);
    this.col = null; // per-vertex colours, only allocated when boxes are given an explicit colour
    this.colCount = 0;
    this.count = 0;
  }

  _reserve(n) {
    const need = this.count + n;
    if (need <= this.cap) return;
    let cap = this.cap;
    while (cap < need) cap *= 2;
    this.pos = grow(this.pos, cap * 3);
    this.nor = grow(this.nor, cap * 3);
    this.uv = grow(this.uv, cap * 2);
    if (this.col) this.col = grow(this.col, cap * 3);
    this.cap = cap;
  }

  _pushColor(color, n) {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    if (!this.col) this.col = new Float32Array(this.cap * 3);
    const C = this.col;
    let o = this.colCount * 3;
    for (let i = 0; i < n; i++) {
      C[o++] = c.r;
      C[o++] = c.g;
      C[o++] = c.b;
    }
    this.colCount += n;
  }

  /**
   * Axis-aligned box. opts.faces: bit mask of faces to emit; opts.fit: UVs 0..1 per face (per-panel
   * textures such as the painted panel bevel); otherwise planar world UVs * texel (like Kit.worldUVs).
   * opts.color: per-box vertex colour for geometries that are not tinted through Kit.add.
   */
  box(cx, cy, cz, sx, sy, sz, opts) {
    let faces = ALL, fit = false, texel = 1, color = null;
    if (opts) {
      if (opts.faces !== undefined) faces = opts.faces;
      if (opts.fit !== undefined) fit = opts.fit;
      if (opts.texel !== undefined) texel = opts.texel;
      if (opts.color !== undefined) color = opts.color;
    }
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    let nf = 0;
    for (let f = 0; f < 6; f++) if (faces & FACES[f][0]) nf++;
    if (!nf) return;
    this._reserve(nf * 6);
    const P = this.pos, N = this.nor, U = this.uv;
    let i = this.count;
    for (let f = 0; f < 6; f++) {
      const face = FACES[f];
      if (!(faces & face[0])) continue;
      const n = face[1], tu = face[2], tv = face[3];
      // half extents along the tangents
      const hu = Math.abs(tu[0]) * hx + Math.abs(tu[1]) * hy + Math.abs(tu[2]) * hz;
      const hv = Math.abs(tv[0]) * hx + Math.abs(tv[1]) * hy + Math.abs(tv[2]) * hz;
      const fx = cx + n[0] * hx, fy = cy + n[1] * hy, fz = cz + n[2] * hz;
      for (let k = 0; k < 6; k++) {
        const su = CU[k], sv = CV[k];
        const px = fx + su * hu * tu[0] + sv * hv * tv[0];
        const py = fy + su * hu * tu[1] + sv * hv * tv[1];
        const pz = fz + su * hu * tu[2] + sv * hv * tv[2];
        const o = i * 3, ou = i * 2;
        P[o] = px;
        P[o + 1] = py;
        P[o + 2] = pz;
        N[o] = n[0];
        N[o + 1] = n[1];
        N[o + 2] = n[2];
        if (fit) {
          U[ou] = (su + 1) / 2;
          U[ou + 1] = (sv + 1) / 2;
        } else if (n[0] !== 0) {
          U[ou] = pz * texel;
          U[ou + 1] = py * texel;
        } else if (n[1] !== 0) {
          U[ou] = px * texel;
          U[ou + 1] = pz * texel;
        } else {
          U[ou] = px * texel;
          U[ou + 1] = py * texel;
        }
        i++;
      }
    }
    if (color) this._pushColor(color, i - this.count);
    this.count = i;
  }

  boxMM(min, max, opts) {
    this.box((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2, max[0] - min[0], max[1] - min[1], max[2] - min[2], opts);
  }

  /**
   * One w x h decal quad centred on (cx, cy, cz), facing the local +z of `q` (local +y is the quad's
   * up), with the atlas rectangle [u0, v0, u1, v1] mapped over it exactly as a PlaneGeometry run
   * through Kit.rectUVs would be - without the PlaneGeometry, toNonIndexed and per-quad kit.add.
   */
  quad(cx, cy, cz, q, w, h, rect) {
    this._reserve(6);
    _ax.set(1, 0, 0).applyQuaternion(q);
    _ay.set(0, 1, 0).applyQuaternion(q);
    _az.set(0, 0, 1).applyQuaternion(q);
    const P = this.pos, N = this.nor, U = this.uv;
    const hw = w / 2, hh = h / 2;
    let i = this.count;
    for (let k = 0; k < 6; k++) {
      const su = QU[k] * hw, sv = QV[k] * hh;
      const o = i * 3, ou = i * 2;
      P[o] = cx + su * _ax.x + sv * _ay.x;
      P[o + 1] = cy + su * _ax.y + sv * _ay.y;
      P[o + 2] = cz + su * _ax.z + sv * _ay.z;
      N[o] = _az.x;
      N[o + 1] = _az.y;
      N[o + 2] = _az.z;
      U[ou] = QU[k] < 0 ? rect[0] : rect[2];
      U[ou + 1] = QV[k] < 0 ? rect[1] : rect[3];
      i++;
    }
    this.count = i;
  }

  /**
   * Append any (shared, reusable) geometry transformed by pos / quat / scale. Much cheaper than one
   * Kit.add per instance for the hundreds of identical cylinders/hoops/wheels: the input is read in
   * place and only the transformed floats are written. Normals go through the normal matrix (so a
   * non-uniform scale stays correct) and are renormalised. color is only pushed when given.
   */
  addGeometry(geo, { pos = null, quat = null, scale = null, color = null } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    const cnt = p.count;
    this._reserve(cnt);
    if (pos) _v.set(pos[0], pos[1], pos[2]);
    else _v.set(0, 0, 0);
    if (scale) _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_v, quat || _qi, scale ? _s : _one);
    _nm.getNormalMatrix(_m);
    const e = _m.elements, ne = _nm.elements;
    const pa = p.array, na = n.array, ua = uv ? uv.array : null;
    const P = this.pos, N = this.nor, U = this.uv;
    let o = this.count * 3, ou = this.count * 2;
    for (let k = 0; k < cnt; k++) {
      const k3 = k * 3;
      const x = pa[k3], y = pa[k3 + 1], z = pa[k3 + 2];
      P[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
      P[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      P[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const nx = na[k3], ny = na[k3 + 1], nz = na[k3 + 2];
      const tx = ne[0] * nx + ne[3] * ny + ne[6] * nz;
      const ty = ne[1] * nx + ne[4] * ny + ne[7] * nz;
      const tz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
      const il = 1 / (Math.sqrt(tx * tx + ty * ty + tz * tz) || 1);
      N[o] = tx * il;
      N[o + 1] = ty * il;
      N[o + 2] = tz * il;
      if (ua) {
        U[ou] = ua[k * 2];
        U[ou + 1] = ua[k * 2 + 1];
      } else {
        U[ou] = 0;
        U[ou + 1] = 0;
      }
      o += 3;
      ou += 2;
    }
    if (color) this._pushColor(color, cnt);
    this.count += cnt;
  }

  get empty() {
    return this.count === 0;
  }

  /**
   * BufferGeometry (non-indexed) over the used part of the arrays. Per-box colours are used when every
   * vertex has one; otherwise a uniform `color` attribute is added when given.
   */
  geometry(color = null) {
    const g = new THREE.BufferGeometry();
    const n = this.count;
    g.setAttribute("position", new THREE.BufferAttribute(this.pos.subarray(0, n * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor.subarray(0, n * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(this.uv.subarray(0, n * 2), 2));
    if (this.col && this.colCount === n) g.setAttribute("color", new THREE.BufferAttribute(this.col.subarray(0, n * 3), 3));
    else if (color) {
      const c = color instanceof THREE.Color ? color : new THREE.Color(color);
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = c.r;
        arr[i * 3 + 1] = c.g;
        arr[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    }
    return g;
  }
}

/**
 * Batches keyed by material + colour and flushed into a Kit (one kit.add per key). Colours are keyed by
 * identity (the PALETTE / HG Color instances or a hex number), never hashed by value.
 */
export class Batcher {
  constructor(kit) {
    this.kit = kit;
    this.groups = new Map(); // mat -> Map(colour -> group)
  }
  _get(mat, color) {
    let byColor = this.groups.get(mat);
    if (!byColor) {
      byColor = new Map();
      this.groups.set(mat, byColor);
    }
    let g = byColor.get(color);
    if (!g) {
      g = { mat, color, batch: new Batch() };
      byColor.set(color, g);
    }
    return g.batch;
  }
  box(mat, color, cx, cy, cz, sx, sy, sz, opts) {
    this._get(mat, color).box(cx, cy, cz, sx, sy, sz, opts);
  }
  boxMM(mat, color, min, max, opts) {
    this._get(mat, color).boxMM(min, max, opts);
  }
  /** shared geometry instance (see sharedBox/sharedTorus) at pos with an optional quaternion / scale */
  geo(mat, color, geometry, pos, quat = null, scale = null) {
    this._get(mat, color).addGeometry(geometry, { pos, quat, scale });
  }
  /** atlas decal quad (see Batch.quad) */
  quad(mat, color, center, q, w, h, rect) {
    this._get(mat, color).quad(center[0], center[1], center[2], q, w, h, rect);
  }
  /** axis-aligned cylinder: one shared unit cylinder per segment count, scaled through the matrix */
  cyl(mat, color, cx, cy, cz, r, len, axis = "y", segments = 12) {
    this.geo(mat, color, sharedCylinder(1, 1, segments), [cx, cy, cz], axisQuat(axis), [r, len, r]);
  }
  /** cylinder between two points (pipes, struts, rods) without a geometry allocation per piece */
  tube(mat, color, a, b, r, segments = 8) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-4) return;
    _dir.set(dx / len, dy / len, dz / len);
    const q = new THREE.Quaternion().setFromUnitVectors(_up, _dir);
    this.geo(mat, color, sharedCylinder(1, 1, segments), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], q, [r, len, r]);
  }
  /**
   * Hand every batch to the kit. `order` (optional comparator over {mat, color}) sets the order the
   * batches are added in, which is their draw order inside a transparent material's merged mesh.
   */
  flush(order = null) {
    let groups = [];
    for (const byColor of this.groups.values()) for (const g of byColor.values()) if (!g.batch.empty) groups.push(g);
    if (order) groups = groups.sort(order);
    for (const { mat, color, batch } of groups) this.kit.add(mat, batch.geometry(), { color, uv: "keep" });
    this.groups.clear();
  }
}
