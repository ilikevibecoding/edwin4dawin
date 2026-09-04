// Exterior hull helpers (workstream EXT-A).
//  * Batch      — appends flat / smooth-shaded primitives with world-space UVs and per-vertex tints
//                 straight into growable typed arrays; one indexed BufferGeometry per material.
//  * ChunkSet   — z-chunked containers: each chunk holds an always-visible group plus two THREE.LOD
//                 layers ("mid" < LOD_MID m, "near" < LOD_NEAR m) so frustum culling and distance
//                 culling both work on a 1.6 km object.
//  * plateField — breaks a planar ruled face into rows of armour plates (skin quads + raised
//                 chamfered slabs), with strips that can be skipped for trenches / holes / footprints.
//  * channel    — recessed channel (floor + walls + ribs + pipe + lights) cut into a horizontal face.
//  * ensureExtMaterials — registers the exta_* materials (exterior light domain, fog off).
import * as THREE from "three";
import { PALETTE, setDomain } from "../materials.js";
import { makeHullPlating2, makeMachineryPanel, makeHeatRamp } from "../textures_hull.js";

export const TEXEL = 1 / 26; // one plating tile per 26 m (plates 3–8 m in the texture)
// Depth precision at distance d with near = 1.2 m is ~d²·5e-8 m: 0.4 m plate steps stop being
// depth-separable around 1.5 km, 1 m recesses around 3 km. Layers switch off before that. Beyond
// ~1 km the sub-metre step faces are sub-pixel and only read as speckle under grazing sunlight.
export const LOD_NEAR = 1000;
export const LOD_MID = 3000;

const NO_SHADOW = new Set(["engineGlow", "engineCore", "glowDisc", "cityLights", "viewGlass", "exta_glow", "exta_emit", "exta_pool"]);
const isEmitKey = (k) => k.startsWith("extEmit") || k.startsWith("emit");
/** Vertex colours for the exta_emit material (unlit, HDR: same output as the extEmit* emissives). */
export const EMIT = {
  white: new THREE.Color(0xffffff).multiplyScalar(3),
  red: new THREE.Color(0xff3020).multiplyScalar(3),
  blue: new THREE.Color(0x6fa8ff).multiplyScalar(3),
  amber: new THREE.Color(0xffb040).multiplyScalar(2.6),
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();

// ---------------------------------------------------------------------------
// growable typed arrays
// ---------------------------------------------------------------------------
class Grow {
  constructor(Type, cap = 1 << 12) {
    this.Type = Type;
    this.a = new Type(cap);
    this.n = 0;
  }
  ensure(k) {
    if (this.n + k <= this.a.length) return;
    let cap = this.a.length * 2;
    while (cap < this.n + k) cap *= 2;
    const b = new this.Type(cap);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push1(x) {
    this.ensure(1);
    this.a[this.n++] = x;
  }
  push2(x, y) {
    this.ensure(2);
    this.a[this.n++] = x;
    this.a[this.n++] = y;
  }
  push3(x, y, z) {
    this.ensure(3);
    this.a[this.n++] = x;
    this.a[this.n++] = y;
    this.a[this.n++] = z;
  }
  result() {
    return this.a.slice(0, this.n);
  }
}

// ---------------------------------------------------------------------------
// colours
// ---------------------------------------------------------------------------
export const C = (c) => (c && c.isColor ? c : new THREE.Color(c));
export const shade = (c, k) => C(c).clone().multiplyScalar(k);
export const mixC = (a, b, t) => C(a).clone().lerp(C(b), t);
export const jitter = (c, rand, amt = 0.05) => shade(c, 1 + (rand() - 0.5) * 2 * amt);
/** Weighted pick of the three hull tones for raised plates. */
export function plateTone(rand) {
  const r = rand();
  const base = r < 0.52 ? PALETTE.hullLight : r < 0.88 ? PALETTE.hullMid : PALETTE.hullDark;
  return jitter(base, rand, 0.05);
}
/** Smooth 2D value noise on world coordinates (large-scale paint / weathering variation). */
export function fieldNoise(x, z, scale = 120, seed = 0) {
  const fx = x / scale;
  const fz = z / scale;
  const xi = Math.floor(fx);
  const zi = Math.floor(fz);
  const h = (i, j) => {
    let n = (i * 374761393 + j * 668265263 + seed * 2246822519) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const sx = fx - xi;
  const sz = fz - zi;
  const u = sx * sx * (3 - 2 * sx);
  const v = sz * sz * (3 - 2 * sz);
  const a = h(xi, zi);
  const b = h(xi + 1, zi);
  const c = h(xi, zi + 1);
  const d = h(xi + 1, zi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

// ---------------------------------------------------------------------------
// Batch: one material's worth of indexed geometry
// ---------------------------------------------------------------------------
export class Batch {
  constructor(key) {
    this.key = key;
    this.pos = new Grow(Float32Array);
    this.nor = new Grow(Float32Array);
    this.uv = new Grow(Float32Array);
    this.col = new Grow(Float32Array);
    this.idx = new Grow(Uint32Array);
    this.nv = 0;
    this.tris = 0;
  }

  /** World-planar UV from the dominant normal axis (same convention as kit.worldUVs). */
  static uvFor(px, py, pz, nx, ny, nz, texel) {
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    if (ax >= ay && ax >= az) return [pz * texel, py * texel];
    if (ay >= ax && ay >= az) return [px * texel, pz * texel];
    return [px * texel, py * texel];
  }

  vertex(px, py, pz, nx, ny, nz, u, v, c) {
    this.pos.push3(px, py, pz);
    this.nor.push3(nx, ny, nz);
    this.uv.push2(u, v);
    this.col.push3(c.r, c.g, c.b);
    return this.nv++;
  }
  vertexW(p, n, c, texel) {
    const [u, v] = Batch.uvFor(p.x, p.y, p.z, n.x, n.y, n.z, texel);
    return this.vertex(p.x, p.y, p.z, n.x, n.y, n.z, u, v, c);
  }
  face(i0, i1, i2) {
    this.idx.push3(i0, i1, i2);
    this.tris++;
  }

  /**
   * Flat quad a-b-c-d. `hint` (Vector3-like) is the outward direction: the winding is flipped when
   * the computed normal points the other way, so callers never worry about vertex order.
   */
  quad(a, b, c, d, color, texel = TEXEL, hint = null) {
    _a.set(c.x - a.x, c.y - a.y, c.z - a.z);
    _b.set(d.x - b.x, d.y - b.y, d.z - b.z);
    _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-12) return;
    _n.normalize();
    if (hint && _n.x * hint.x + _n.y * hint.y + _n.z * hint.z < 0) {
      _n.negate();
      const t = b;
      b = d;
      d = t;
    }
    const col = C(color);
    const i0 = this.vertexW(a, _n, col, texel);
    const i1 = this.vertexW(b, _n, col, texel);
    const i2 = this.vertexW(c, _n, col, texel);
    const i3 = this.vertexW(d, _n, col, texel);
    this.face(i0, i1, i2);
    this.face(i0, i2, i3);
  }
  /** Quad with explicit per-vertex normals + colours: [{p, n, c}] × 4 (smooth shading). */
  quadV(v, texel = TEXEL) {
    const ids = v.map((q) => this.vertexW(q.p, q.n, q.c, texel));
    this.face(ids[0], ids[1], ids[2]);
    this.face(ids[0], ids[2], ids[3]);
  }
  /** Planar quad a-b-c-d subdivided nx × ny with per-vertex colours from colorAt(p) (soot gradients). */
  grid(a, b, c, d, nx, ny, colorAt, texel = TEXEL, hint = null) {
    _a.set(c.x - a.x, c.y - a.y, c.z - a.z);
    _b.set(d.x - b.x, d.y - b.y, d.z - b.z);
    _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-12) return;
    _n.normalize();
    let flip = false;
    if (hint && _n.x * hint.x + _n.y * hint.y + _n.z * hint.z < 0) {
      _n.negate();
      flip = true;
    }
    const n = _n.clone();
    const p = new THREE.Vector3();
    const base = this.nv;
    for (let j = 0; j <= ny; j++) {
      const v = j / ny;
      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const w00 = (1 - u) * (1 - v);
        const w10 = u * (1 - v);
        const w11 = u * v;
        const w01 = (1 - u) * v;
        p.set(w00 * a.x + w10 * b.x + w11 * c.x + w01 * d.x, w00 * a.y + w10 * b.y + w11 * c.y + w01 * d.y, w00 * a.z + w10 * b.z + w11 * c.z + w01 * d.z);
        this.vertexW(p, n, C(colorAt(p)), texel);
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const i0 = base + j * (nx + 1) + i;
        const i1 = i0 + 1;
        const i2 = i0 + nx + 2;
        const i3 = i0 + nx + 1;
        if (flip) {
          this.face(i0, i2, i1);
          this.face(i0, i3, i2);
        } else {
          this.face(i0, i1, i2);
          this.face(i0, i2, i3);
        }
      }
    }
  }
  tri(a, b, c, color, texel = TEXEL, hint = null) {
    _a.set(b.x - a.x, b.y - a.y, b.z - a.z);
    _b.set(c.x - a.x, c.y - a.y, c.z - a.z);
    _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-12) return;
    _n.normalize();
    if (hint && _n.x * hint.x + _n.y * hint.y + _n.z * hint.z < 0) {
      _n.negate();
      const t = b;
      b = c;
      c = t;
    }
    const col = C(color);
    this.face(this.vertexW(a, _n, col, texel), this.vertexW(b, _n, col, texel), this.vertexW(c, _n, col, texel));
  }
  /** Convex polygon fan. */
  fan(points, color, texel = TEXEL, hint = null) {
    for (let i = 1; i < points.length - 1; i++) this.tri(points[0], points[i], points[i + 1], color, texel, hint);
  }

  /**
   * Raised plate as a truncated pyramid standing on the 4 surface corners: top face lifted by h
   * along n and shrunk by `inset` metres; 4 sloped sides. 10 triangles, reads as a bevelled plate.
   */
  frustum(corners, n, h, inset, color, texel = TEXEL) {
    const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
    const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
    const cz = (corners[0].z + corners[1].z + corners[2].z + corners[3].z) / 4;
    let minEdge = Infinity;
    for (let i = 0; i < 4; i++) {
      const p = corners[i];
      const q = corners[(i + 1) % 4];
      minEdge = Math.min(minEdge, Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z));
    }
    const k = Math.max(0.15, 1 - (2 * inset) / minEdge);
    const top = corners.map((p) => new THREE.Vector3(cx + (p.x - cx) * k + n.x * h, cy + (p.y - cy) * k + n.y * h, cz + (p.z - cz) * k + n.z * h));
    this.quad(top[0], top[1], top[2], top[3], color, texel, n);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      _a.set((corners[i].x + corners[j].x) / 2 - cx, (corners[i].y + corners[j].y) / 2 - cy, (corners[i].z + corners[j].z) / 2 - cz);
      this.quad(corners[i], corners[j], top[j], top[i], color, texel, _a.clone());
    }
  }
  /** Raised plate with vertical sides and a chamfered top edge (18 triangles). */
  slab(corners, n, h, chamfer, color, texel = TEXEL) {
    const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
    const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
    const cz = (corners[0].z + corners[1].z + corners[2].z + corners[3].z) / 4;
    let minEdge = Infinity;
    for (let i = 0; i < 4; i++) {
      const p = corners[i];
      const q = corners[(i + 1) % 4];
      minEdge = Math.min(minEdge, Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z));
    }
    const ch = Math.min(chamfer, h * 0.7);
    const k = Math.max(0.15, 1 - (2 * ch) / minEdge);
    const hv = h - ch;
    const mid = corners.map((p) => new THREE.Vector3(p.x + n.x * hv, p.y + n.y * hv, p.z + n.z * hv));
    const top = corners.map((p) => new THREE.Vector3(cx + (p.x - cx) * k + n.x * h, cy + (p.y - cy) * k + n.y * h, cz + (p.z - cz) * k + n.z * h));
    this.quad(top[0], top[1], top[2], top[3], color, texel, n);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      _a.set((corners[i].x + corners[j].x) / 2 - cx, (corners[i].y + corners[j].y) / 2 - cy, (corners[i].z + corners[j].z) / 2 - cz);
      const hint = _a.clone();
      this.quad(corners[i], corners[j], mid[j], mid[i], color, texel, hint);
      this.quad(mid[i], mid[j], top[j], top[i], color, texel, hint);
    }
  }

  /**
   * Box centred at (cx, cy, cz), optional quaternion, `skip` = set of face names among
   * "+x" "-x" "+y" "-y" "+z" "-z" that are hidden (against another surface) and not emitted.
   */
  box(cx, cy, cz, sx, sy, sz, color, texel = TEXEL, { quat = null, skip = null, colors = null } = {}) {
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;
    const P = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z);
      if (quat) v.applyQuaternion(quat);
      v.x += cx;
      v.y += cy;
      v.z += cz;
      return v;
    };
    const p = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    const faces = [
      ["+x", [1, 5, 6, 2], [1, 0, 0]],
      ["-x", [0, 3, 7, 4], [-1, 0, 0]],
      ["+y", [3, 2, 6, 7], [0, 1, 0]],
      ["-y", [0, 4, 5, 1], [0, -1, 0]],
      ["+z", [4, 7, 6, 5], [0, 0, 1]],
      ["-z", [0, 1, 2, 3], [0, 0, -1]],
    ];
    for (const [name, ids, nrm] of faces) {
      if (skip && skip.has(name)) continue;
      _n.set(nrm[0], nrm[1], nrm[2]);
      if (quat) _n.applyQuaternion(quat);
      const hint = _n.clone();
      this.quad(p[ids[0]], p[ids[1]], p[ids[2]], p[ids[3]], (colors && colors[name]) || color, texel, hint);
    }
  }

  /**
   * Surface of revolution around a local +Z axis placed at `origin` with orientation `quat`.
   * profile: [{ r, t }] (radius, axial coordinate), ordered along the axis. colorAt(i, t01) may
   * return a colour per ring. uv: "world" | "axial" (u along the axis 0..1, v around). inside flips
   * the normals so the surface reads from within (engine bell interiors).
   */
  lathe(profile, origin, quat, segments, { color = 0xffffff, colorAt = null, texel = TEXEL, uv = "world", inside = false, arc = Math.PI * 2, phase = 0 } = {}) {
    const n = profile.length;
    const tMin = profile[0].t;
    const tMax = profile[n - 1].t;
    // per-ring normals in the (radial, axial) plane
    const rn = [];
    for (let i = 0; i < n; i++) {
      let dr = 0;
      let dt = 0;
      if (i > 0) {
        dr += profile[i].r - profile[i - 1].r;
        dt += profile[i].t - profile[i - 1].t;
      }
      if (i < n - 1) {
        dr += profile[i + 1].r - profile[i].r;
        dt += profile[i + 1].t - profile[i].t;
      }
      const len = Math.hypot(dr, dt) || 1;
      rn.push([dt / len, -dr / len]); // [radial, axial]
    }
    const rings = [];
    for (let i = 0; i < n; i++) {
      const ring = [];
      const col = C(colorAt ? colorAt(i, (profile[i].t - tMin) / (tMax - tMin || 1)) : color);
      for (let s = 0; s <= segments; s++) {
        const a = phase + (arc * s) / segments;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const p = new THREE.Vector3(profile[i].r * ca, profile[i].r * sa, profile[i].t);
        const nn = new THREE.Vector3(rn[i][0] * ca, rn[i][0] * sa, rn[i][1]);
        if (inside) nn.negate();
        if (quat) {
          p.applyQuaternion(quat);
          nn.applyQuaternion(quat);
        }
        p.add(origin);
        let u;
        let v;
        if (uv === "axial") {
          u = (profile[i].t - tMin) / (tMax - tMin || 1);
          v = s / segments;
        } else {
          [u, v] = Batch.uvFor(p.x, p.y, p.z, nn.x, nn.y, nn.z, texel);
          // around a cylinder the dominant-axis mapping tears at 45°; use arc length instead
          u = a * Math.max(profile[i].r, 0.5) * texel;
          v = profile[i].t * texel;
        }
        ring.push(this.vertex(p.x, p.y, p.z, nn.x, nn.y, nn.z, u, v, col));
      }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) {
      for (let s = 0; s < segments; s++) {
        const a = rings[i][s];
        const b = rings[i][s + 1];
        const c = rings[i + 1][s + 1];
        const d = rings[i + 1][s];
        if (inside) {
          this.face(a, c, b);
          this.face(a, d, c);
        } else {
          this.face(a, b, c);
          this.face(a, c, d);
        }
      }
    }
  }
  /** Cylinder / cone from p0 to p1 (smooth), optional end caps. */
  tube(p0, p1, r0, r1, segments, color, texel = TEXEL, { cap0 = false, cap1 = false } = {}) {
    const axis = new THREE.Vector3().subVectors(p1, p0);
    const len = axis.length();
    if (len < 1e-6) return;
    axis.divideScalar(len);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    this.lathe([{ r: r0, t: 0 }, { r: r1, t: len }], p0, quat, segments, { color, texel });
    if (cap0) this.disc(p0, axis.clone().negate(), r0, segments, color, texel);
    if (cap1) this.disc(p1, axis, r1, segments, color, texel);
  }
  /** Flat disc / annulus facing `normal`, colour gradient from the inner to the outer rim. */
  disc(center, normal, rOut, segments, color, texel = TEXEL, { rIn = 0, colorOut = null, phase = 0 } = {}) {
    const nrm = normal.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    const cIn = C(color);
    const cOut = C(colorOut || color);
    const ring = (r, col) => {
      const ids = [];
      for (let s = 0; s <= segments; s++) {
        const a = phase + (Math.PI * 2 * s) / segments;
        const p = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0).applyQuaternion(quat).add(center);
        const [u, v] = Batch.uvFor(p.x, p.y, p.z, nrm.x, nrm.y, nrm.z, texel);
        ids.push(this.vertex(p.x, p.y, p.z, nrm.x, nrm.y, nrm.z, u, v, col));
      }
      return ids;
    };
    const outer = ring(rOut, cOut);
    if (rIn > 0) {
      const inner = ring(rIn, cIn);
      for (let s = 0; s < segments; s++) {
        this.face(inner[s], outer[s], outer[s + 1]);
        this.face(inner[s], outer[s + 1], inner[s + 1]);
      }
    } else {
      const [u, v] = Batch.uvFor(center.x, center.y, center.z, nrm.x, nrm.y, nrm.z, texel);
      const c0 = this.vertex(center.x, center.y, center.z, nrm.x, nrm.y, nrm.z, u, v, cIn);
      for (let s = 0; s < segments; s++) this.face(c0, outer[s], outer[s + 1]);
    }
  }

  /**
   * Append an arbitrary BufferGeometry (consumed). opts: pos, rot (Euler xyz), quat, scale, color |
   * colorFn(p), texel, uv: "world" | "keep" | "scale" (+ uvScale [su, sv]).
   */
  addGeometry(geo, { pos = null, rot = null, quat = null, scale = null, color = 0xffffff, colorFn = null, texel = TEXEL, uv = "world", uvScale = null } = {}) {
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const m = new THREE.Matrix4();
    const q = quat ? quat : rot ? new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])) : new THREE.Quaternion();
    m.compose(new THREE.Vector3(...(pos || [0, 0, 0])), q, new THREE.Vector3(...(scale || [1, 1, 1])));
    geo.applyMatrix4(m);
    const p = geo.attributes.position;
    const nr = geo.attributes.normal;
    const uvA = geo.attributes.uv;
    const col = C(color);
    const base = this.nv;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i);
      const py = p.getY(i);
      const pz = p.getZ(i);
      const nx = nr.getX(i);
      const ny = nr.getY(i);
      const nz = nr.getZ(i);
      let u;
      let v;
      if (uv === "world" || !uvA) [u, v] = Batch.uvFor(px, py, pz, nx, ny, nz, texel);
      else {
        u = uvA.getX(i);
        v = uvA.getY(i);
        if (uv === "scale" && uvScale) {
          u *= uvScale[0];
          v *= uvScale[1];
        }
      }
      const c = colorFn ? C(colorFn(px, py, pz)) : col;
      this.vertex(px, py, pz, nx, ny, nz, u, v, c);
    }
    for (let i = 0; i < p.count; i += 3) this.face(base + i, base + i + 1, base + i + 2);
    geo.dispose();
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos.result(), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor.result(), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(this.uv.result(), 2));
    g.setAttribute("color", new THREE.BufferAttribute(this.col.result(), 3));
    g.setIndex(new THREE.BufferAttribute(this.idx.result(), 1));
    return g;
  }
}

// ---------------------------------------------------------------------------
// ChunkSet
// ---------------------------------------------------------------------------
export class ChunkSet {
  constructor(name, z0, z1, count, { near = LOD_NEAR, mid = LOD_MID } = {}) {
    this.name = name;
    this.z0 = z0;
    this.z1 = z1;
    this.count = count;
    this.near = near;
    this.mid = mid;
    this.size = (z1 - z0) / count;
    this.chunks = [];
    for (let i = 0; i < count; i++) this.chunks.push(new Map());
  }
  /** Interior chunk boundaries (for row splits). */
  get edges() {
    const e = [];
    for (let i = 1; i < this.count; i++) e.push(this.z0 + i * this.size);
    return e;
  }
  index(z) {
    const i = Math.floor((z - this.z0) / this.size);
    return i < 0 ? 0 : i >= this.count ? this.count - 1 : i;
  }
  /** Batch for material `key` in the chunk containing z, at level "far" (always) | "mid" | "near". */
  batch(z, level, key) {
    const m = this.chunks[this.index(z)];
    const id = level + "|" + key;
    let b = m.get(id);
    if (!b) {
      b = new Batch(key);
      b.level = level;
      m.set(id, b);
    }
    return b;
  }
  build(parent, materials) {
    const meshes = [];
    let triangles = 0;
    this.chunks.forEach((m, i) => {
      if (m.size === 0) return;
      // centre from the union of all batch bounds
      const bb = new THREE.Box3();
      for (const b of m.values()) {
        const a = b.pos.a;
        for (let k = 0; k < b.pos.n; k += 3) bb.expandByPoint(_a.set(a[k], a[k + 1], a[k + 2]));
      }
      const centre = bb.getCenter(new THREE.Vector3());
      const root = new THREE.Group();
      root.name = `${this.name}/chunk-${i}`;
      root.position.copy(centre);
      parent.add(root);
      const levels = { far: root, mid: null, near: null };
      const lodFor = (level) => {
        if (levels[level]) return levels[level];
        const lod = new THREE.LOD();
        lod.name = `${root.name}/${level}`;
        const g = new THREE.Group();
        lod.addLevel(g, 0);
        lod.addLevel(new THREE.Object3D(), level === "near" ? this.near : this.mid, 0.05);
        root.add(lod);
        levels[level] = g;
        return g;
      };
      for (const b of m.values()) {
        if (b.tris === 0) continue;
        const material = materials[resolveKey(b.key)];
        if (!material) throw new Error(`exterior: unknown material ${b.key}`);
        const geo = b.build();
        geo.translate(-centre.x, -centre.y, -centre.z);
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, material);
        mesh.name = `${root.name}/${b.level}/${b.key}`;
        // detail layers (sub-metre steps, rings, pipes) are below the sun shadow map's resolution:
        // only the always-visible layer goes through the shadow pass (halves the exterior draw calls)
        mesh.castShadow = b.level === "far" && !NO_SHADOW.has(b.key) && !isEmitKey(b.key);
        mesh.receiveShadow = !material.transparent;
        mesh.frustumCulled = true;
        (b.level === "far" ? root : lodFor(b.level)).add(mesh);
        meshes.push(mesh);
        triangles += b.tris;
      }
    });
    return { meshes, triangles };
  }
}

// ---------------------------------------------------------------------------
// plateField
// ---------------------------------------------------------------------------
/**
 * Armour plating over a ruled planar face parameterised by (z, s).
 *  point(z, s) -> Vector3 (starboard side); normal: outward unit normal (starboard); mirror: also
 *  emit the port side (x negated). strips(z) -> [{ s0, s1, kind }], kind "plate" | "bare" | "skip";
 *  the strip structure must be constant between consecutive zSplits (callers list every z where it
 *  changes). Rows are rowLen[0..1] m long (random), also split at chunk edges.
 *  Skin quads go to skinKey at level "far"; raised plates (probability slabP, height slabH[0..1] m)
 *  go to one of slabKeys at level "near". tint(x, y, z, side) -> Colour for the skin; slabTint(rand,
 *  base) for plates; slabOK(x, y, z) can veto plates (e.g. under a dome).
 */
export function plateField(chunks, rand, spec) {
  const { zStart, zEnd, rowLen, zSplits = [], strips, point, normal, mirror = true, cellW, slabP = 0.4, slabH = [0.4, 1.0], skinKey, slabKeys, tint, slabTint = null, slabOK = null, skinLevel = "far", slabLevel = "near", texel = TEXEL, chamferP = 0.3, maxInset = 1.0 } = spec;
  const forced = new Set([zStart, zEnd]);
  for (const z of [...zSplits, ...chunks.edges]) if (z > zStart + 1e-6 && z < zEnd - 1e-6) forced.add(z);
  const zs = [...forced].sort((a, b) => a - b);
  const rows = [];
  for (let i = 0; i < zs.length - 1; i++) {
    let z = zs[i];
    const zNext = zs[i + 1];
    for (;;) {
      const len = rowLen[0] + rand() * (rowLen[1] - rowLen[0]);
      if (zNext - z <= len * 1.6) {
        rows.push([z, zNext]);
        break;
      }
      rows.push([z, z + len]);
      z += len;
    }
  }
  const sides = mirror ? [1, -1] : [1];
  const lerp = (a, b, t) => a + (b - a) * t;
  const mirrorN = new THREE.Vector3(-normal.x, normal.y, normal.z);
  for (const [z0, z1] of rows) {
    const zm = (z0 + z1) / 2;
    const S0 = strips(z0 + 1e-4);
    const S1 = strips(z1 - 1e-4);
    const nS = Math.min(S0.length, S1.length);
    for (let k = 0; k < nS; k++) {
      const kind = S0[k].kind;
      if (kind === "skip") continue;
      const A = point(z0, S0[k].s0);
      const B = point(z0, S0[k].s1);
      const Cc = point(z1, S1[k].s1);
      const D = point(z1, S1[k].s0);
      const w0 = A.distanceTo(B);
      const w1 = D.distanceTo(Cc);
      const wm = (w0 + w1) / 2;
      if (Math.max(w0, w1) < 0.05) continue;
      const ncol = Math.max(1, Math.round(wm / cellW + (rand() - 0.5) * 0.8));
      for (let j = 0; j < ncol; j++) {
        const f0 = j / ncol;
        const f1 = (j + 1) / ncol;
        const a = point(z0, lerp(S0[k].s0, S0[k].s1, f0));
        const b = point(z0, lerp(S0[k].s0, S0[k].s1, f1));
        const c = point(z1, lerp(S1[k].s0, S1[k].s1, f1));
        const d = point(z1, lerp(S1[k].s0, S1[k].s1, f0));
        const minDim = Math.min(a.distanceTo(b), b.distanceTo(c), c.distanceTo(d), d.distanceTo(a));
        for (const side of sides) {
          const P = side > 0 ? [a, b, c, d] : [a, b, c, d].map((p) => new THREE.Vector3(-p.x, p.y, p.z));
          const nrm = side > 0 ? normal : mirrorN;
          const cx = (P[0].x + P[1].x + P[2].x + P[3].x) / 4;
          const cy = (P[0].y + P[1].y + P[2].y + P[3].y) / 4;
          const cz = (P[0].z + P[1].z + P[2].z + P[3].z) / 4;
          const base = tint(cx, cy, cz, side);
          chunks.batch(zm, skinLevel, skinKey).quad(P[0], P[1], P[2], P[3], jitter(base, rand, 0.045), texel, nrm);
          if (kind === "bare" || minDim < 2.6) continue;
          if (rand() >= slabP) continue;
          if (slabOK && !slabOK(cx, cy, cz)) continue;
          const h = slabH[0] + rand() * (slabH[1] - slabH[0]);
          const inset = Math.min(maxInset, 0.16 * minDim) * (0.7 + rand() * 0.5);
          const key = slabKeys[Math.floor(rand() * slabKeys.length)];
          const st = slabTint ? slabTint(rand, base) : jitter(base, rand, 0.06);
          const sb = chunks.batch(zm, slabLevel, key);
          if (h > 0.55 && rand() < chamferP) sb.slab(P, nrm, h, Math.min(inset, 0.5), st, texel);
          else sb.frustum(P, nrm, h, inset, st, texel);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// channel: recessed trench cut into a horizontal face (the skin strip over it must be skipped)
// ---------------------------------------------------------------------------
/**
 * xc(z) centreline (starboard, linear per chunk), halfW, depth; yAt(z) face height; up = true when
 * the face looks up (+y, recess goes down). Floor + walls always visible; ribs, pipe and lights
 * are "mid" / "near" layers. Set mirror false for a single channel (xc may then be negative).
 */
export function channel(chunks, rand, { zA, zB, xc, halfW, depth, yAt, up = true, mirror = true, floorKey = "hullGreeble", wallKey = "hullGreeble", floorTint = PALETTE.hullTrench, wallTint = PALETTE.hullDark, ribs = true, pipe = true, lights = true, ribStep = 14, lightStep = 42 }) {
  const sgn = up ? 1 : -1;
  const yF = (z) => yAt(z) - sgn * depth;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const nUp = V(0, sgn, 0);
  const sides = mirror ? [1, -1] : [1];
  const zEdges = [zA, ...chunks.edges.filter((z) => z > zA && z < zB), zB];
  for (let i = 0; i < zEdges.length - 1; i++) {
    const z0 = zEdges[i];
    const z1 = zEdges[i + 1];
    const zm = (z0 + z1) / 2;
    for (const side of sides) {
      const X = (z, off) => side * (xc(z) + off);
      const floor = chunks.batch(zm, "far", floorKey);
      floor.quad(V(X(z0, -halfW), yF(z0), z0), V(X(z0, halfW), yF(z0), z0), V(X(z1, halfW), yF(z1), z1), V(X(z1, -halfW), yF(z1), z1), floorTint, TEXEL * 1.5, nUp);
      const wall = chunks.batch(zm, "far", wallKey);
      for (const w of [-1, 1]) {
        const hint = V(-w * side, 0, 0); // faces into the channel
        wall.quad(V(X(z0, w * halfW), yF(z0), z0), V(X(z0, w * halfW), yAt(z0), z0), V(X(z1, w * halfW), yAt(z1), z1), V(X(z1, w * halfW), yF(z1), z1), wallTint, TEXEL * 2, hint);
      }
      if (i === 0) wall.quad(V(X(z0, -halfW), yF(z0), z0), V(X(z0, halfW), yF(z0), z0), V(X(z0, halfW), yAt(z0), z0), V(X(z0, -halfW), yAt(z0), z0), wallTint, TEXEL * 2, V(0, 0, 1));
      if (i === zEdges.length - 2) wall.quad(V(X(z1, -halfW), yF(z1), z1), V(X(z1, halfW), yF(z1), z1), V(X(z1, halfW), yAt(z1), z1), V(X(z1, -halfW), yAt(z1), z1), wallTint, TEXEL * 2, V(0, 0, -1));
      if (ribs) {
        const rb = chunks.batch(zm, "mid", "hullGreeble");
        for (let z = z0 + ribStep * (0.4 + rand() * 0.4); z < z1 - 1; z += ribStep) {
          const rh = depth * 0.32;
          rb.box(X(z, 0), yF(z) + sgn * rh * 0.5, z, halfW * 2 - 0.3, rh, 0.7, PALETTE.hullDark, TEXEL * 3, { skip: new Set([up ? "-y" : "+y"]) });
        }
      }
      if (pipe) {
        const pb = chunks.batch(zm, "mid", "hullGreeble");
        const r = Math.min(0.9, depth * 0.24);
        const yP = (z) => yF(z) + sgn * (r + depth * 0.12);
        pb.tube(V(X(z0, -halfW * 0.55), yP(z0), z0), V(X(z1, -halfW * 0.55), yP(z1), z1), r, r, 10, PALETTE.hullDark, TEXEL * 4);
      }
      if (lights) {
        const lb = chunks.batch(zm, "mid", "exta_emit");
        for (let z = z0 + lightStep * 0.5; z < z1; z += lightStep) lb.box(X(z, halfW * 0.6), yF(z) + sgn * 0.25, z, 1.2, 0.5, 1.2, EMIT.amber, 1, { skip: new Set([up ? "-y" : "+y"]) });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// exta_* materials
// ---------------------------------------------------------------------------
/**
 * Planet-shine. The sun's elevation over the hull is fixed (+22°) and the hemisphere fill's ground
 * colour is near black, so every down-facing surface — the whole ventral half of the ship — would
 * render as a silhouette. These materials carry a faint cool ambient term that fades in as the world
 * normal turns downward: emissive × albedo × vertex tint, so plating seams and paint variation stay
 * readable on the belly without touching the sunlit side.
 */
const SHINE = new THREE.Color(0x585d66);
const SHINE_CHUNK = /* glsl */ `
#include <emissivemap_fragment>
{
	vec3 shineN = inverseTransformDirection( normal, viewMatrix );
	float shineK = smoothstep( 0.3, -0.5, shineN.y );
	#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
		totalEmissiveRadiance *= vColor.rgb;
	#endif
	totalEmissiveRadiance *= shineK;
}
`;
function addPlanetShine(m) {
  const domainPatch = m.onBeforeCompile;
  m.emissive = SHINE.clone();
  m.emissiveMap = m.map;
  m.emissiveIntensity = 1;
  m.onBeforeCompile = (shader, renderer) => {
    domainPatch(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", SHINE_CHUNK);
  };
  m.customProgramCacheKey = () => "exterior|shine";
  m.needsUpdate = true;
  return m;
}
/** Shared hull materials → their planet-shine twins (same textures; resolved at ChunkSet.build). */
const SHINE_VARIANT = { hullPlate: "exta_hullPlate", hullPlate1: "exta_hullPlate1", hullGreeble: "exta_hullGreeble", hullTrim: "exta_hullTrim" };
export const resolveKey = (key) => SHINE_VARIANT[key] || key;

export function ensureExtMaterials(materials) {
  if (materials.exta_plate2) return;
  const std = (set, extra = {}) =>
    new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      normalMap: set.normalMap,
      roughness: 1,
      metalness: 1,
      vertexColors: true,
      color: 0xffffff,
      fog: false,
      ...extra,
    });
  const plate2 = makeHullPlating2(1024, 173);
  const machinery = makeMachineryPanel(512, 57);
  materials.exta_plate2 = addPlanetShine(setDomain(std(plate2, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.5 }), "exterior"));
  materials.exta_machinery = addPlanetShine(setDomain(std(machinery, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.6 }), "exterior"));
  // twins of the shared hull materials (textures reused, only the shader differs)
  for (const [src, dst] of Object.entries(SHINE_VARIANT)) {
    const s = materials[src];
    if (!s) throw new Error(`exterior: missing shared material ${src}`);
    materials[dst] = addPlanetShine(setDomain(std(s, { normalScale: s.normalScale.clone(), envMapIntensity: s.envMapIntensity, roughness: s.roughness, metalness: s.metalness }), "exterior"));
  }
  // engine bell outer skin: heat-tempering ramp along the axis (u), vertex colour modulates
  materials.exta_heat = setDomain(new THREE.MeshStandardMaterial({ map: makeHeatRamp(256, 16), roughness: 0.5, metalness: 0.55, vertexColors: true, color: 0xffffff, fog: false, envMapIntensity: 0.7 }), "exterior");
  // additive glow with per-vertex colour (gradient cones inside the nozzles)
  materials.exta_glow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  // unlit HDR vertex colours: every running / guide / window light of the hull in one material
  materials.exta_emit = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  // additive, steady (no engine flicker): floodlight pools washing the belly plating
  materials.exta_pool = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  for (const k of ["exta_plate2", "exta_machinery", "exta_heat", ...Object.values(SHINE_VARIANT)]) if (!materials.exteriorKeys.includes(k)) materials.exteriorKeys.push(k);
}
