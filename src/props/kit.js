// Prop construction kit (Fable 3 domain): geometry emission into per-material merge buckets so
// a whole room of static clutter renders in a handful of draw calls, plus collider helpers.
// All positions in world meters; y arguments are the BOTTOM of a part (floor-contact correct).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterial } from '../materials/index.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

// --- shared unit geometries (scaled per part via matrix) ---
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cylCache = new Map();
function unitCyl(seg, rTopRatio = 1, open = false) {
  const key = seg + ':' + rTopRatio + ':' + (open ? 1 : 0);
  let g = cylCache.get(key);
  if (!g) { g = new THREE.CylinderGeometry(0.5 * rTopRatio, 0.5, 1, seg, 1, open); cylCache.set(key, g); }
  return g;
}
const sphCache = new Map();
function unitSphere(seg) {
  let g = sphCache.get(seg);
  if (!g) { g = new THREE.SphereGeometry(0.5, seg, Math.max(4, seg / 2)); sphCache.set(seg, g); }
  return g;
}
const unitPlane = new THREE.PlaneGeometry(1, 1);

// Chamfered box (believable soft edges, 44 tris): 8 corners × 3 vertices — each corner vertex
// sits on one face with the other two axes inset by that axis' chamfer. Convex, so winding is
// resolved with an outward test. Cached per chamfer-ratio bucket.
const chamCache = new Map();
function unitChamferBox(rw, rh, rd) {
  const key = `${rw.toFixed(3)}:${rh.toFixed(3)}:${rd.toFixed(3)}`;
  let cachedG = chamCache.get(key);
  if (cachedG) return cachedG;
  const h = 0.5;
  const c = [rw, rh, rd]; // chamfer per axis (fraction of unit half-extent)
  const pos = [];
  const idx = [];
  // vid[cornerIndex][axis] ; cornerIndex = (sx>0)*4 + (sy>0)*2 + (sz>0)
  const vid = [];
  const signs = [-1, 1];
  for (const sx of signs) for (const sy of signs) for (const sz of signs) {
    const ids = [];
    const s = [sx, sy, sz];
    for (let axis = 0; axis < 3; axis++) {
      const p = [0, 0, 0];
      for (let a2 = 0; a2 < 3; a2++) p[a2] = a2 === axis ? s[a2] * h : s[a2] * (h - c[a2]);
      pos.push(p[0], p[1], p[2]);
      ids.push(pos.length / 3 - 1);
    }
    vid.push(ids);
  }
  const ci = (sx, sy, sz) => ((sx > 0 ? 4 : 0) + (sy > 0 ? 2 : 0) + (sz > 0 ? 1 : 0));
  const quad = (a, b, cc, d) => emitQuadOutward(pos, idx, a, b, cc, d);
  // 6 faces
  for (const s of signs) {
    quad(vid[ci(s, -1, -1)][0], vid[ci(s, 1, -1)][0], vid[ci(s, 1, 1)][0], vid[ci(s, -1, 1)][0]);   // x faces
    quad(vid[ci(-1, s, -1)][1], vid[ci(1, s, -1)][1], vid[ci(1, s, 1)][1], vid[ci(-1, s, 1)][1]);   // y faces
    quad(vid[ci(-1, -1, s)][2], vid[ci(1, -1, s)][2], vid[ci(1, 1, s)][2], vid[ci(-1, 1, s)][2]);   // z faces
  }
  // 12 edge bevels: edges along z (x/y sign pairs), along y (x/z), along x (y/z)
  for (const sx of signs) for (const sy of signs) {
    quad(vid[ci(sx, sy, -1)][0], vid[ci(sx, sy, 1)][0], vid[ci(sx, sy, 1)][1], vid[ci(sx, sy, -1)][1]);
  }
  for (const sx of signs) for (const sz of signs) {
    quad(vid[ci(sx, -1, sz)][0], vid[ci(sx, 1, sz)][0], vid[ci(sx, 1, sz)][2], vid[ci(sx, -1, sz)][2]);
  }
  for (const sy of signs) for (const sz of signs) {
    quad(vid[ci(-1, sy, sz)][1], vid[ci(1, sy, sz)][1], vid[ci(1, sy, sz)][2], vid[ci(-1, sy, sz)][2]);
  }
  // 8 corner triangles
  for (const sx of signs) for (const sy of signs) for (const sz of signs) {
    emitTriOutward(pos, idx, vid[ci(sx, sy, sz)][0], vid[ci(sx, sy, sz)][1], vid[ci(sx, sy, sz)][2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3] + 0.5; uv[i * 2 + 1] = pos[i * 3 + 2] + 0.5; }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const nonIdx = geo.toNonIndexed();
  nonIdx.computeVertexNormals();
  geo.dispose();
  chamCache.set(key, nonIdx);
  return nonIdx;
}

const _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3();
const _n1 = new THREE.Vector3(), _n2 = new THREE.Vector3();
function outward(pos, a, b, c) {
  _va.fromArray(pos, a * 3); _vb.fromArray(pos, b * 3); _vc.fromArray(pos, c * 3);
  _n1.subVectors(_vb, _va); _n2.subVectors(_vc, _va); _n1.cross(_n2);
  _n2.addVectors(_va, _vb).add(_vc);
  return _n1.dot(_n2) >= 0;
}
function emitQuadOutward(pos, idx, a, b, c, d) {
  if (outward(pos, a, b, c)) idx.push(a, b, c, a, c, d);
  else idx.push(c, b, a, d, c, a);
}
function emitTriOutward(pos, idx, a, b, c) {
  if (outward(pos, a, b, c)) idx.push(a, b, c);
  else idx.push(c, b, a);
}

// ---------------------------------------------------------------------------
export class Bucket {
  constructor(name = 'props') {
    this.name = name;
    this.byMat = new Map(); // matName -> BufferGeometry[]
  }

  push(matName, geo, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    let arr = this.byMat.get(matName);
    if (!arr) { arr = []; this.byMat.set(matName, arr); }
    arr.push(g);
  }

  // Merge everything into one mesh per material and attach to parent.
  flush(parent, { shadows = true } = {}) {
    const meshes = [];
    for (const [matName, geos] of this.byMat) {
      if (!geos.length) continue;
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      const mat = typeof matName === 'string' ? getMaterial(matName) : matName;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadows && !(mat.transparent);
      mesh.receiveShadow = true;
      mesh.name = `${this.name}:${mat.name || 'mat'}`;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.byMat.clear();
    return meshes;
  }
}

// ---------------------------------------------------------------------------
// Kit: what prop builders draw with. Every part goes into the bucket; colliders into world.
// ---------------------------------------------------------------------------
export class Kit {
  constructor({ bucket, world = null, origin = null }) {
    this.bucket = bucket;
    this.world = world;
    this.ox = origin?.x ?? 0;
    this.oy = origin?.y ?? 0;
    this.oz = origin?.z ?? 0;
    this.stats = { parts: 0 };
  }

  _mat4(w, h, d, x, y, z, o) {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(w, h, d);
    _p.set(this.ox + x, this.oy + y, this.oz + z);
    return _m.compose(_p, _q, _s);
  }

  // Box: (x,z) center, y bottom.
  box(mat, w, h, d, x, y, z, o = {}) {
    this.stats.parts++;
    const geo = o.bevel ? unitChamferBox(
      Math.min(0.45, o.bevel / w), Math.min(0.45, o.bevel / h), Math.min(0.45, o.bevel / d),
    ) : unitBox;
    this.bucket.push(mat, geo, this._mat4(w, h, d, x, y + h / 2, z, o));
    return this;
  }

  // Cylinder: (x,z) center, y bottom, axis +Y unless rx/rz rotate it.
  cyl(mat, r, h, x, y, z, o = {}) {
    this.stats.parts++;
    const geo = unitCyl(o.seg || 10, o.rTop != null ? o.rTop / r : 1, !!o.open);
    this.bucket.push(mat, geo, this._mat4(r * 2, h, r * 2, x, y + h / 2, z, o));
    return this;
  }

  sphere(mat, r, x, y, z, o = {}) {
    this.stats.parts++;
    this.bucket.push(mat, unitSphere(o.seg || 10), this._mat4(r * 2, r * 2, r * 2, x, y + r, z, o));
    return this;
  }

  // Quad (single plane). Vertical: (x,z) center, y bottom, faces +Z before ry.
  // horizontal:true lays it flat (normal +Y), w along x, h along z (before ry), y = height.
  quad(mat, w, h, x, y, z, o = {}) {
    this.stats.parts++;
    let geo = unitPlane;
    if (o.uv) {
      geo = unitPlane.clone();
      const { u0, v0, u1, v1 } = o.uv;
      geo.attributes.uv.setXY(0, u0, v1);
      geo.attributes.uv.setXY(1, u1, v1);
      geo.attributes.uv.setXY(2, u0, v0);
      geo.attributes.uv.setXY(3, u1, v0);
    }
    if (o.horizontal) {
      _e.set(0, o.ry || 0, 0, 'YXZ');
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(this.ox + x, this.oy + y, this.oz + z),
        _q.setFromEuler(_e),
        new THREE.Vector3(1, 1, 1),
      ).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
        .multiply(new THREE.Matrix4().makeScale(w, h, 1));
      this.bucket.push(mat, geo, m);
    } else {
      this.bucket.push(mat, geo, this._mat4(w, h, 1, x, y + h / 2, z, o));
    }
    return this;
  }

  // Custom geometry passthrough.
  geo(mat, geometry, x, y, z, o = {}) {
    this.stats.parts++;
    this.bucket.push(mat, geometry, this._mat4(o.sx || 1, o.sy || 1, o.sz || 1, x, y, z, o));
    return this;
  }

  // AABB collider: (x,z) center, w/d full extents (pre-rotation), y0 bottom, h height.
  // ry rotates the footprint; the AABB expands to cover it.
  collide(x, z, w, d, h, o = {}) {
    if (!this.world) return this;
    let hw = w / 2, hd = d / 2;
    if (o.ry) {
      const c = Math.abs(Math.cos(o.ry)), s = Math.abs(Math.sin(o.ry));
      const nhw = c * hw + s * hd;
      const nhd = s * hw + c * hd;
      hw = nhw; hd = nhd;
    }
    const y0 = this.oy + (o.y0 || 0);
    this.world.add({
      min: { x: this.ox + x - hw, y: y0, z: this.oz + z - hd },
      max: { x: this.ox + x + hw, y: y0 + h, z: this.oz + z + hd },
      material: o.material || 'wood',
      tag: 'prop',
      blockSight: o.blockSight !== undefined ? o.blockSight : h > 1.2,
      blockMove: o.blockMove !== false,
      blockShot: o.blockShot !== false,
    });
    return this;
  }
}

// Local-frame wrapper: builders draw around (0,0,0) facing −Z=front? Convention: prop local
// +Z = its facing direction after ry=0; at() places local coords at (x, y, z) rotated by ry.
export class Frame {
  constructor(kit, x, y, z, ry = 0) {
    this.kit = kit;
    this.x = x; this.y = y; this.z = z; this.ry = ry;
    this.cos = Math.cos(ry); this.sin = Math.sin(ry);
  }
  _w(lx, lz) {
    // three.js yaw: +ry rotates +Z toward +X (CCW from above, right-handed y-up)
    return [this.x + lx * this.cos + lz * this.sin, this.z - lx * this.sin + lz * this.cos];
  }
  box(mat, w, h, d, lx, ly, lz, o = {}) {
    const [wx, wz] = this._w(lx, lz);
    this.kit.box(mat, w, h, d, wx, this.y + ly, wz, { ...o, ry: (o.ry || 0) + this.ry });
    return this;
  }
  cyl(mat, r, h, lx, ly, lz, o = {}) {
    const [wx, wz] = this._w(lx, lz);
    this.kit.cyl(mat, r, h, wx, this.y + ly, wz, { ...o, ry: (o.ry || 0) + this.ry });
    return this;
  }
  sphere(mat, r, lx, ly, lz, o = {}) {
    const [wx, wz] = this._w(lx, lz);
    this.kit.sphere(mat, r, wx, this.y + ly, wz, { ...o, ry: (o.ry || 0) + this.ry });
    return this;
  }
  quad(mat, w, h, lx, ly, lz, o = {}) {
    const [wx, wz] = this._w(lx, lz);
    this.kit.quad(mat, w, h, wx, this.y + ly, wz, { ...o, ry: (o.ry || 0) + this.ry });
    return this;
  }
  geo(mat, geometry, lx, ly, lz, o = {}) {
    const [wx, wz] = this._w(lx, lz);
    this.kit.geo(mat, geometry, wx, this.y + ly, wz, { ...o, ry: (o.ry || 0) + this.ry });
    return this;
  }
  collide(lx, lz, w, d, h, o = {}) {
    const [wx, wz] = this._w(lx, lz);
    this.kit.collide(wx, wz, w, d, h, { ...o, y0: this.y + (o.y0 || 0), ry: this.ry });
    return this;
  }
  // Child frame at a local offset with extra yaw (compose props from props).
  sub(lx, lz, dry = 0, dy = 0) {
    const [wx, wz] = this._w(lx, lz);
    return new Frame(this.kit, wx, this.y + dy, wz, this.ry + dry);
  }
}

// Standalone builder runner for the QA gallery: builds a prop at origin into its own group.
export function galleryBuild(builderFn, opts = {}) {
  return () => {
    const bucket = new Bucket('gallery');
    const kit = new Kit({ bucket, world: null });
    builderFn(new Frame(kit, 0, 0, 0, 0), { ...opts });
    const group = new THREE.Group();
    bucket.flush(group);
    return group;
  };
}
