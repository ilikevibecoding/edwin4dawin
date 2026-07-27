import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Geometry bucket system: every static piece of the map is pushed into a
 * named bucket (one material each); at the end each bucket merges into a
 * single mesh. Keeps the whole city at a few dozen draw calls.
 */

const _tmpEuler = new THREE.Euler();
const _tmpQuat = new THREE.Quaternion();
const _tmpPos = new THREE.Vector3();
const _tmpScl = new THREE.Vector3();

/** Compose a Matrix4 from position / euler rotation / scale. */
export function mat4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _tmpEuler.set(rx, ry, rz);
  _tmpQuat.setFromEuler(_tmpEuler);
  _tmpPos.set(x, y, z);
  _tmpScl.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_tmpPos, _tmpQuat, _tmpScl);
}

export function mul(a, b) { return a.clone().multiply(b); }

/**
 * Box-project UVs from (already transformed) vertex positions so tiling is
 * uniform in world units and continuous across separately-built wall pieces.
 */
export function boxProjectUV(geo, scale, ou = 0, ov = 0) {
  const pos = geo.attributes.position;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }
    else if (nx >= nz) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u / scale + ou;
    uv[i * 2 + 1] = v / scale + ov;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const _col = new THREE.Color();

export class Buckets {
  constructor() {
    this.defs = new Map();
    this.meshes = {};
  }

  /**
   * @param {string} name
   * @param {THREE.Material} material — should have vertexColors=true if tints are used
   * @param {object} opts { texScale, worldUV, castShadow, receiveShadow, renderOrder }
   */
  register(name, material, opts = {}) {
    this.defs.set(name, {
      material,
      texScale: opts.texScale ?? 3,
      worldUV: opts.worldUV ?? true,
      castShadow: opts.castShadow ?? true,
      receiveShadow: opts.receiveShadow ?? true,
      renderOrder: opts.renderOrder ?? 0,
      geos: [],
    });
  }

  /**
   * Push a geometry (consumed!) into a bucket.
   * @param {object} opts { color: tint, uvOffset: [u,v], uvRegion: [u0,v0,u1,v1] }
   */
  push(name, geo, matrix = null, opts = {}) {
    const b = this.defs.get(name);
    if (!b) throw new Error(`[world] unknown bucket '${name}'`);
    if (geo.index) geo = geo.toNonIndexed();
    if (matrix) geo.applyMatrix4(matrix);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (b.worldUV) {
      const off = opts.uvOffset || [0, 0];
      boxProjectUV(geo, b.texScale, off[0], off[1]);
    } else if (!geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    }
    if (opts.uvRegion) {
      const [u0, v0, u1, v1] = opts.uvRegion;
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
      }
    }
    // per-piece tint baked as vertex color (keepColor: geometry already tinted)
    if (!(opts.keepColor && geo.attributes.color)) {
      _col.set(opts.color ?? 0xffffff);
      const n = geo.attributes.position.count;
      const carr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        carr[i * 3] = _col.r; carr[i * 3 + 1] = _col.g; carr[i * 3 + 2] = _col.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(carr, 3));
    }
    // strip anything that would break merging
    for (const key of Object.keys(geo.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') geo.deleteAttribute(key);
    }
    geo.morphAttributes = {};
    b.geos.push(geo);
  }

  /** Convenience: push a box. */
  box(name, w, h, d, matrix = null, opts = {}) {
    this.push(name, new THREE.BoxGeometry(w, h, d), matrix, opts);
  }

  /** Merge every bucket into a single mesh added to parent. Returns { name: mesh }. */
  build(parent) {
    for (const [name, b] of this.defs) {
      if (!b.geos.length) continue;
      const merged = mergeGeometries(b.geos, false);
      if (!merged) {
        console.error(`[world] bucket '${name}' failed to merge`);
        continue;
      }
      b.geos.length = 0;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, b.material);
      mesh.name = `bucket:${name}`;
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = b.receiveShadow;
      mesh.renderOrder = b.renderOrder;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      this.meshes[name] = mesh;
    }
    return this.meshes;
  }
}

/** BoxGeometry with the top face sheared/shrunk — cabins, hoods, tapered blocks. */
export function trapBox(w, h, d, { frontShift = 0, backShift = 0, sideShrink = 1 } = {}) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      const x = p.getX(i);
      p.setX(i, x > 0 ? x - frontShift : x + backShift);
      p.setZ(i, p.getZ(i) * sideShrink);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Irregular rock/concrete chunk (deterministic given a rand fn). */
export function chunkGeo(randFn, detail = 0) {
  const g = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
  const p = g.attributes.position;
  // displace unique vertices consistently: hash by position
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [0.62 + randFn() * 0.66, 0.55 + randFn() * 0.25]);
    const [s, sy] = seen.get(key);
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * sy, p.getZ(i) * s);
  }
  g.computeVertexNormals();
  return g;
}
