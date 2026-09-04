// Kit-bash helper: accumulates primitive geometry per material, assigns vertex colours and consistent texel
// density UVs, then merges into one indexed mesh per material (few draw calls, compact memory).
// Also hosts instanced prototypes (repeated props → one InstancedMesh per prototype) and AABB colliders.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class Kit {
  constructor(materials) {
    this.materials = materials;
    this.groups = new Map(); // material key -> geometries
    this.protos = new Map(); // proto name -> { mat, geo, items: [{matrix, color}] }
    this.colliders = [];
    this.meshes = [];
    this.triangles = 0;
  }

  /**
   * Add a geometry (consumed; do not reuse the instance).
   * opts: { pos:[x,y,z], rot:[rx,ry,rz] | quat, scale:[sx,sy,sz]|number, color, uv:'world'|'keep'|'scale',
   *         uvScale:[su,sv], uvRect:[u0,v0,u1,v1], texel }
   */
  add(mat, geo, opts = {}) {
    const { pos = [0, 0, 0], rot = null, quat = null, scale = null, color = 0xffffff, uv = "world", texel = 1.0, uvScale = null, uvRect = null } = opts;
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    else _q.identity();
    if (scale === null) _s.set(1, 1, 1);
    else if (typeof scale === "number") _s.set(scale, scale, scale);
    else _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s);
    geo.applyMatrix4(_m);
    if (!geo.index) geo = mergeVertices(geo);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (uv === "world") worldUVs(geo, texel);
    else if (uv === "scale" && uvScale) scaleUVs(geo, uvScale[0], uvScale[1]);
    if (uvRect) rectUVs(geo, uvRect);
    setVertexColor(geo, color);
    for (const key of Object.keys(geo.attributes)) {
      if (!["position", "normal", "uv", "color"].includes(key)) geo.deleteAttribute(key);
    }
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(geo);
    this.triangles += geo.index.count / 3;
    return geo;
  }

  // Axis-aligned box convenience: centre + size
  box(mat, cx, cy, cz, sx, sy, sz, opts = {}) {
    return this.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, cy, cz], ...opts });
  }

  // Box from min/max corners
  boxMM(mat, min, max, opts = {}) {
    const sx = max[0] - min[0];
    const sy = max[1] - min[1];
    const sz = max[2] - min[2];
    return this.box(mat, min[0] + sx / 2, min[1] + sy / 2, min[2] + sz / 2, sx, sy, sz, opts);
  }

  // Cylinder along an axis. axis: 'x'|'y'|'z'
  cyl(mat, cx, cy, cz, r, len, axis = "y", opts = {}) {
    const g = new THREE.CylinderGeometry(opts.r2 !== undefined ? opts.r2 : r, r, len, opts.segments || 12, 1, opts.open || false);
    const rot = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    const circ = 2 * Math.PI * r;
    const texel = opts.texel || 1;
    const { r2, segments, open, ...rest } = opts;
    return this.add(mat, g, { pos: [cx, cy, cz], uv: "scale", uvScale: [circ * texel, len * texel], ...rest, rot: opts.rot || rot });
  }

  sphere(mat, cx, cy, cz, r, opts = {}) {
    const { segments = 16, ...rest } = opts;
    return this.add(mat, new THREE.SphereGeometry(r, segments, Math.max(6, Math.round(segments * 0.6))), { pos: [cx, cy, cz], uv: "scale", uvScale: [2 * Math.PI * r, Math.PI * r], ...rest });
  }

  // ---- instanced prototypes -------------------------------------------------------------------------
  /** Register a prototype: geometry in local space (consumed), one material key. */
  proto(name, mat, geo, { texel = 1, uv = "world" } = {}) {
    if (!geo.index) geo = mergeVertices(geo);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (uv === "world") worldUVs(geo, texel);
    for (const key of Object.keys(geo.attributes)) {
      if (!["position", "normal", "uv"].includes(key)) geo.deleteAttribute(key);
    }
    this.protos.set(name, { mat, geo, items: [] });
  }

  /** Place an instance. opts: { pos, rot|quat, scale, color } */
  place(name, opts = {}) {
    const p = this.protos.get(name);
    if (!p) throw new Error("unknown proto " + name);
    const { pos = [0, 0, 0], rot = null, quat = null, scale = null, color = 0xffffff } = opts;
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    else _q.identity();
    if (scale === null) _s.set(1, 1, 1);
    else if (typeof scale === "number") _s.set(scale, scale, scale);
    else _s.set(scale[0], scale[1], scale[2]);
    const m = new THREE.Matrix4().compose(_v.set(pos[0], pos[1], pos[2]), _q, _s);
    p.items.push({ m, color: color instanceof THREE.Color ? color.clone() : new THREE.Color(color) });
    this.triangles += p.geo.index.count / 3;
  }

  collider(min, max, tag = "") {
    this.colliders.push({ min: new THREE.Vector3(...min), max: new THREE.Vector3(...max), tag, enabled: true });
    return this.colliders[this.colliders.length - 1];
  }

  /** Merge everything into meshes under `parent`. Returns the array of meshes (merged + instanced). */
  build(parent, { castShadow = true, receiveShadow = true } = {}) {
    for (const [key, geos] of this.groups) {
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!merged) {
        console.warn("kit: merge failed for", key, geos.length);
        continue;
      }
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const material = this.materials[key];
      if (!material) throw new Error("Unknown material " + key);
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = "kit_" + key;
      mesh.castShadow = castShadow && !noShadow(key);
      mesh.receiveShadow = receiveShadow && key !== "glass" && key !== "decal";
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    for (const [name, p] of this.protos) {
      if (!p.items.length) continue;
      const material = this.materials[p.mat];
      if (!material) throw new Error("Unknown material " + p.mat);
      const im = new THREE.InstancedMesh(p.geo, material, p.items.length);
      im.name = "inst_" + name;
      for (let i = 0; i < p.items.length; i++) {
        im.setMatrixAt(i, p.items[i].m);
        im.setColorAt(i, p.items[i].color);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = castShadow && !noShadow(p.mat);
      im.receiveShadow = receiveShadow;
      im.computeBoundingSphere();
      parent.add(im);
      this.meshes.push(im);
    }
    this.groups.clear();
    this.protos.clear();
    return this.meshes;
  }

  dispose() {
    for (const m of this.meshes) {
      m.geometry.dispose();
      if (m.parent) m.parent.remove(m);
    }
    this.meshes.length = 0;
    this.colliders.length = 0;
  }
}

function noShadow(key) {
  return key.startsWith("emit") || key === "glass" || key === "decal" || key === "grate" || key === "holo" || key === "field" || key === "screen" || key === "leds";
}

// World-space planar UVs picked by dominant normal axis => uniform texel density.
export function worldUVs(geo, texel = 1.0) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)),
      ny = Math.abs(nor.getY(i)),
      nz = Math.abs(nor.getZ(i));
    let u, v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * texel;
    uv[i * 2 + 1] = v * texel;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export function scaleUVs(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

// Remap shape-space UVs of a w×h plate centred on the origin (as ExtrudeGeometry emits them) to [0,1].
export function fitUVs(geo, w, h) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
}

// Remap [0,1] UVs into a sub-rectangle [u0, v0, u1, v1] of an atlas.
export function rectUVs(geo, [u0, v0, u1, v1]) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
}

// Turn a geometry inside out (flip winding + normals) so a tube reads from within.
export function insideOut(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const attrs = ["position", "normal", "uv"].map((k) => g.attributes[k]).filter(Boolean);
  const count = g.attributes.position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    for (const a of attrs) {
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.getComponent(i + 1, k);
        a.setComponent(i + 1, k, a.getComponent(i + 2, k));
        a.setComponent(i + 2, k, t);
      }
    }
  }
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

// Compact per-vertex colour (normalised bytes; a third of the float footprint).
export function setVertexColor(geo, color) {
  _c.set(color instanceof THREE.Color ? color : new THREE.Color(color));
  const n = geo.attributes.position.count;
  const arr = new Uint8Array(n * 3);
  const r = Math.round(THREE.MathUtils.clamp(_c.r, 0, 1) * 255);
  const g = Math.round(THREE.MathUtils.clamp(_c.g, 0, 1) * 255);
  const b = Math.round(THREE.MathUtils.clamp(_c.b, 0, 1) * 255);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = r;
    arr[i * 3 + 1] = g;
    arr[i * 3 + 2] = b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3, true));
}

// Rectangle with rectangular / circular holes, extruded along +Z (local), centred on origin in XY.
export function panelWithHoles(w, h, depth, holes, curveSegments = 24) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();
  for (const hole of holes) {
    const p = new THREE.Path();
    if (hole.r !== undefined) {
      p.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    } else {
      const { x, y, w: hw, h: hh } = hole;
      p.moveTo(x - hw / 2, y - hh / 2);
      p.lineTo(x - hw / 2, y + hh / 2);
      p.lineTo(x + hw / 2, y + hh / 2);
      p.lineTo(x + hw / 2, y - hh / 2);
      p.closePath();
    }
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Extruded polygon (points in the local XY plane) along +Z, centred on the extrusion axis.
export function prism(points, depth, { bevel = 0 } = {}) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Simple seeded RNG for deterministic kit-bash variation
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
