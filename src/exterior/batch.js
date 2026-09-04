// Static geometry batcher for the exterior: accumulates world-space geometries per material and
// merges them into one mesh per material (the exterior equivalent of kit.js, without the UV modes).
// Also the shared instancing / geometry helpers used by the hull, detail, superstructure and engine
// builders (one instanced mesh per material per chunk keeps the draw-call count bounded).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { setVertexColor } from "../kit.js";

const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();

export class Batcher {
  constructor(materials) {
    this.materials = materials;
    this.groups = new Map();
    this.meshes = [];
  }

  /**
   * Add a geometry already placed in world space. uvScale re-projects planar UVs when given. `color`
   * may be a THREE.Color, a hex number or a linear [r, g, b] array (the `grey()` helper) — THREE.Color
   * ignores arrays, which used to leave every array-toned batch white.
   */
  add(mat, geo, color = 0xffffff, uvScale = null) {
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (uvScale) planarUVs(geo, uvScale);
    if (Array.isArray(color)) color = _c.clone().setRGB(color[0], color[1], color[2]);
    if (color !== null) setVertexColor(geo, color);
    else if (!geo.attributes.color) setVertexColor(geo, 0xffffff);
    for (const key of Object.keys(geo.attributes)) if (!["position", "normal", "uv", "color"].includes(key)) geo.deleteAttribute(key);
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(geo);
    return geo;
  }

  /** Axis-aligned box at a centre. */
  box(mat, x, y, z, sx, sy, sz, color, uvScale = 0.05) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(x, y, z);
    return this.add(mat, g, color, uvScale);
  }

  /** Box rotated by Euler angles (rx, ry, rz, XYZ order) about its centre, then placed at a centre. */
  rbox(mat, x, y, z, sx, sy, sz, rx, ry, rz, color, uvScale = 0.05) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.applyMatrix4(_m.makeRotationFromEuler(_e.set(rx, ry, rz)));
    g.translate(x, y, z);
    return this.add(mat, g, color, uvScale);
  }

  /** Cylinder along an axis ("x" | "y" | "z") centred at (x, y, z). */
  cyl(mat, x, y, z, rTop, rBot, len, axis, color, segments = 12, uvScale = 0.1, open = false) {
    const g = new THREE.CylinderGeometry(rTop, rBot, len, segments, 1, open);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    return this.add(mat, g, color, uvScale);
  }

  build(parent, { castShadow = true, receiveShadow = true, name = "", lod = null } = {}) {
    for (const [key, geos] of this.groups) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const material = this.materials[key];
      if (!material) throw new Error("Unknown material " + key);
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = name + "_" + key;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      if (lod !== null) mesh.userData.lod = lod;
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
    return this.meshes;
  }
}

/** Planar UVs from the dominant normal axis in world space. */
export function planarUVs(geo, scale) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else if (nx >= nz) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Per-vertex colour from a function of the vertex position: fn(x, y, z, outColor). */
export function gradientColor(geo, fn) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), _c);
    arr[i * 3] = _c.r;
    arr[i * 3 + 1] = _c.g;
    arr[i * 3 + 2] = _c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * InstancedMesh from a list of { m: Matrix4, c?: [r,g,b] } items. Geometry gets a white vertex colour
 * so the (vertexColors) hull materials pick up the per-instance tint.
 */
export function instancedMesh(geo, material, items, { castShadow = false, receiveShadow = true, name = "", lod = null } = {}) {
  if (!geo.attributes.color) setVertexColor(geo, 0xffffff);
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  for (let i = 0; i < items.length; i++) {
    mesh.setMatrixAt(i, items[i].m);
    const c = items[i].c;
    if (c) mesh.setColorAt(i, _c.setRGB(c[0], c[1], c[2]));
    else mesh.setColorAt(i, _c.setRGB(1, 1, 1));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.computeBoundingSphere();
  mesh.name = name;
  if (lod !== null) mesh.userData.lod = lod;
  return mesh;
}

/** Instance item helper: axis-aligned box (optionally yaw-rotated) → { m, c }. */
export function boxItem(x, y, z, sx, sy, sz, c, yaw = 0, pitch = 0, roll = 0) {
  _v.set(x, y, z);
  _q.setFromEuler(_e.set(pitch, yaw, roll));
  _s.set(sx, sy, sz);
  return { m: _m.compose(_v, _q, _s).clone(), c };
}

/**
 * Instance item from an explicit frame: axes X/Y/Z (unit), sizes, centre. Non-orthogonal axes shear.
 * A left-handed frame would render the box inside out (instances skip the renderer's determinant
 * check), so the Z axis is flipped when needed — harmless for symmetric geometry.
 */
export function frameItem(center, ax, ay, az, sx, sy, sz, c) {
  const det = ax.x * (ay.y * az.z - ay.z * az.y) - ay.x * (ax.y * az.z - ax.z * az.y) + az.x * (ax.y * ay.z - ax.z * ay.y);
  const f = det < 0 ? -1 : 1;
  const m = new THREE.Matrix4();
  m.set(ax.x * sx, ay.x * sy, f * az.x * sz, center.x, ax.y * sx, ay.y * sy, f * az.y * sz, center.y, ax.z * sx, ay.z * sy, f * az.z * sz, center.z, 0, 0, 0, 1);
  return { m, c };
}

/** Merge a list of (possibly indexed) geometries into one non-indexed geometry with white colours. */
export function mergeParts(parts, uvScale = 0.1) {
  const list = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) for (const key of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(key)) g.deleteAttribute(key);
  const merged = mergeGeometries(list, false);
  merged.computeVertexNormals();
  if (uvScale) planarUVs(merged, uvScale);
  setVertexColor(merged, 0xffffff);
  merged.computeBoundingSphere();
  return merged;
}

/** Unit cylinder along +Z (length 1, radius 1), for instanced pipes: scale (r, r, len). */
export function unitPipeGeometry(segments = 8) {
  const g = new THREE.CylinderGeometry(1, 1, 1, segments, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Grey tone helper: [k, k, k*blue]. */
export function grey(k, blue = 1.0) {
  return [k, k, k * blue];
}
