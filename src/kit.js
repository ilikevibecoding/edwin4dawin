// Kit-bash helper: accumulates primitive geometry per material, assigns vertex colors and
// consistent texel density UVs, then merges into one mesh per material (few draw calls).
// Also carries everything a room builder produces besides static geometry: colliders, walkable
// floors / ramps, light declarations (data, assigned to a shared pool at runtime), instanced props,
// interactables and per-frame animated objects.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

export class Kit {
  constructor(materials) {
    this.materials = materials;
    this.groups = new Map();
    this.colliders = [];
    this.floors = [];
    this.lights = [];
    this.meshes = [];
    this.interactables = [];
    this.updaters = [];
    this.instances = new Map(); // key -> { geo, mat, items: [{ matrix, color }] }
    this.extras = []; // ready-made Object3Ds to parent under the cell (Reflector, animated groups…)
    this.noShadowKeys = new Set(["glass", "decal", "grate", "hangarGlass", "field"]);
  }

  /**
   * Add a geometry.
   * @param {string} mat material key
   * @param {THREE.BufferGeometry} geo geometry (consumed)
   * @param {object} opts { pos:[x,y,z], rot:[rx,ry,rz] | quat, color: THREE.Color|number, uv:'world'|'keep'|'scale', uvScale:[su,sv], texel: number, uvRect }
   */
  add(mat, geo, opts = {}) {
    const { pos = [0, 0, 0], rot = null, quat = null, color = 0xffffff, uv = "world", texel = 1.0, uvScale = null, uvRect = null } = opts;
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    else _q.identity();
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _n.set(1, 1, 1));
    geo.applyMatrix4(_m);
    if (geo.index) geo = geo.toNonIndexed();
    if (uv === "world") worldUVs(geo, texel);
    else if (uv === "scale" && uvScale) scaleUVs(geo, uvScale[0], uvScale[1]);
    if (uvRect) rectUVs(geo, uvRect);
    setVertexColor(geo, color);
    // drop attributes that would break merging
    for (const key of Object.keys(geo.attributes)) {
      if (!["position", "normal", "uv", "color"].includes(key)) geo.deleteAttribute(key);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(geo);
    return geo;
  }

  // Axis-aligned box convenience: center + size
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
    const { r2, open, segments, ...rest } = opts;
    return this.add(mat, g, { pos: [cx, cy, cz], rot, uv: "scale", uvScale: [circ * texel, len * texel], ...rest, rot: opts.rot || rot });
  }

  // Collider AABB (room-local; the cell transforms it to world on build)
  collider(min, max, tag = "") {
    this.colliders.push({ min: new THREE.Vector3(...min), max: new THREE.Vector3(...max), tag });
  }

  /**
   * Walkable floor: flat at height y over the XZ rect [x0,z0]-[x1,z1]. A ramp interpolates the height
   * from y0 at `from` to y1 at `to` along axis 'x' or 'z'.
   */
  floor(x0, z0, x1, z1, y, tag = "floor") {
    this.floors.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y, tag });
  }
  ramp(x0, z0, x1, z1, axis, from, to, y0, y1, tag = "ramp") {
    this.floors.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y: Math.max(y0, y1), ramp: { axis, from, to, y0, y1 }, tag });
  }
  // Stairs as a run of small flat steps (the player's step-up handles the 0.18 m rises)
  stairs(x0, z0, x1, z1, axis, from, to, y0, y1, steps = null) {
    const rise = y1 - y0;
    const n = steps || Math.max(1, Math.round(Math.abs(rise) / 0.18));
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * i) / n;
      const b = from + ((to - from) * (i + 1)) / n;
      const y = y0 + (rise * (i + 1)) / n;
      if (axis === "x") this.floor(Math.min(a, b), z0, Math.max(a, b), z1, y, "stair");
      else this.floor(x0, Math.min(a, b), x1, Math.max(a, b), y, "stair");
    }
  }

  /**
   * Declare a light (data only). type 'point' | 'spot'; pos/target room-local; priority 0..1 (1 = key).
   * The cell manager assigns visible cells' lights to a fixed pool, highest priority first.
   */
  light(spec) {
    this.lights.push({ type: "point", intensity: 3, distance: 8, decay: 2, priority: 0.5, color: 0xffffff, shadow: false, ...spec });
    return this.lights[this.lights.length - 1];
  }

  /**
   * Instanced prop: many copies of one geometry/material pair (one draw call per key).
   * geoFactory is called once per key. matrix is room-local; color tints via instanceColor.
   */
  instance(key, mat, geoFactory, matrix, color = 0xffffff) {
    let e = this.instances.get(key);
    if (!e) {
      e = { geo: geoFactory(), mat, items: [] };
      this.instances.set(key, e);
    }
    e.items.push({ matrix: matrix.clone(), color: color instanceof THREE.Color ? color.clone() : new THREE.Color(color) });
  }

  /** Move another kit's pending geometry into this one, transformed by `matrix` (world-space batching). */
  absorb(other, matrix) {
    for (const [mat, geos] of other.groups) {
      if (!this.groups.has(mat)) this.groups.set(mat, []);
      const dst = this.groups.get(mat);
      for (const g of geos) {
        g.applyMatrix4(matrix);
        dst.push(g);
      }
    }
    other.groups.clear();
  }

  // Register an interactable { object, material, id, label, key, onActivate }
  interactable(it) {
    this.interactables.push(it);
  }
  // Register a per-frame update fn(dt, t)
  onUpdate(fn) {
    this.updaters.push(fn);
  }
  // Add a ready-made Object3D under the cell group
  attach(obj) {
    this.extras.push(obj);
    return obj;
  }

  build(parent, { castShadow = true, receiveShadow = true } = {}) {
    for (const [key, geos] of this.groups) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const material = this.materials[key];
      if (!material) throw new Error("Unknown material " + key);
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = "kit_" + key;
      mesh.castShadow = castShadow && !key.startsWith("emit") && !this.noShadowKeys.has(key);
      mesh.receiveShadow = receiveShadow && key !== "glass" && key !== "decal";
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
    for (const [key, e] of this.instances) {
      const material = this.materials[e.mat];
      if (!material) throw new Error("Unknown material " + e.mat);
      const im = new THREE.InstancedMesh(e.geo, material, e.items.length);
      im.name = "inst_" + key;
      for (let i = 0; i < e.items.length; i++) {
        im.setMatrixAt(i, e.items[i].matrix);
        im.setColorAt(i, e.items[i].color);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = castShadow;
      im.receiveShadow = receiveShadow;
      im.computeBoundingSphere();
      parent.add(im);
      this.meshes.push(im);
    }
    this.instances.clear();
    for (const o of this.extras) parent.add(o);
    this.extras.length = 0;
    return this.meshes;
  }
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

// Remap shape-space UVs of a w×h plate centred on the origin (as ExtrudeGeometry emits them) to [0,1],
// so a per-panel texture (bevel, edge chips) lines up with the plate's edges.
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

export function setVertexColor(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}

// Rectangle with rectangular / circular holes, extruded along +Z (local), centred on origin in XY.
export function panelWithHoles(w, h, depth, holes) {
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
    } else if (hole.points) {
      p.moveTo(hole.points[0][0], hole.points[0][1]);
      for (let i = 1; i < hole.points.length; i++) p.lineTo(hole.points[i][0], hole.points[i][1]);
      p.closePath();
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
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Convex polygon (array of [x,y]) extruded along +Z, centred on the extrusion axis.
export function prism(points, depth) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
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
