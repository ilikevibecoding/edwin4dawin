// Kit-bash helper: accumulates primitive geometry per material, assigns vertex colors and
// consistent texel density UVs, then merges into one mesh per material (few draw calls).
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
    this.markers = [];
    this.meshes = [];
  }

  /**
   * Add a geometry.
   * @param {string} mat material key
   * @param {THREE.BufferGeometry} geo geometry (consumed)
   * @param {object} opts { pos:[x,y,z], rot:[rx,ry,rz] | quat, scale, color: THREE.Color|number, uv:'world'|'keep'|'scale', uvScale:[su,sv], texel: number }
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
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12, 1, opts.open || false);
    const rot = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    const circ = 2 * Math.PI * r;
    const texel = opts.texel || 1;
    return this.add(mat, g, { pos: [cx, cy, cz], rot, uv: "scale", uvScale: [circ * texel, len * texel], ...opts, rot: opts.rot || rot });
  }

  collider(min, max, tag = "") {
    const c = { min: new THREE.Vector3(...min), max: new THREE.Vector3(...max), tag };
    this.colliders.push(c);
    return c;
  }

  // Semantic marker for future crew / NPC systems: kind = "seat" | "station" | "idle" | "spawn" | "waypoint".
  // pos = [x, y, z], yaw in radians (facing), extra = free-form (station id, seat owner ...).
  marker(kind, pos, yaw = 0, extra = {}) {
    const m = { kind, x: pos[0], y: pos[1], z: pos[2], yaw, ...extra };
    this.markers.push(m);
    return m;
  }

  // Walkable surface (see Player.groundAt). Ramps: pass y0/y1 + axis instead of y.
  floor(x0, z0, x1, z1, y, extra = {}) {
    const f = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y, ...extra };
    this.floors.push(f);
    return f;
  }

  // Straight stair run: `steps` risers climbing from y0 to y1 along `axis` (+/-), walkable and solid.
  stairs(mat, x0, z0, x1, z1, y0, y1, axis = "z", opts = {}) {
    const steps = opts.steps || Math.max(2, Math.round(Math.abs(y1 - y0) / 0.18));
    const rise = (y1 - y0) / steps;
    const along = axis === "x" ? x1 - x0 : z1 - z0;
    const run = along / steps;
    for (let i = 0; i < steps; i++) {
      const a0 = i * run;
      const a1 = (i + 1) * run;
      const top = y0 + rise * (i + 1);
      const bottom = Math.min(y0, y1) - 0.05;
      const min = axis === "x" ? [x0 + Math.min(a0, a1), bottom, z0] : [x0, bottom, z0 + Math.min(a0, a1)];
      const max = axis === "x" ? [x0 + Math.max(a0, a1), top, z1] : [x1, top, z0 + Math.max(a0, a1)];
      this.boxMM(mat, min, max, { uv: "world", texel: 1.5, ...opts });
      this.floor(min[0], min[2], max[0], max[2], top);
    }
  }

  build(parent, { castShadow = true, receiveShadow = true } = {}) {
    for (const [key, geos] of this.groups) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const material = this.materials[key];
      if (!material) throw new Error("Unknown material " + key);
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = "kit_" + key;
      mesh.castShadow = castShadow && !key.startsWith("emit") && key !== "glass" && key !== "decal" && key !== "grate";
      mesh.receiveShadow = receiveShadow && key !== "glass" && key !== "decal";
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
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
