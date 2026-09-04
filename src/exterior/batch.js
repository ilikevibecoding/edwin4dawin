// Static geometry batcher for the exterior: accumulates world-space geometries per material and
// merges them into one mesh per material (the exterior equivalent of kit.js, without the UV modes).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { setVertexColor } from "../kit.js";

export class Batcher {
  constructor(materials) {
    this.materials = materials;
    this.groups = new Map();
    this.meshes = [];
  }

  /** Add a geometry already placed in world space. uvScale re-projects planar UVs when given. */
  add(mat, geo, color = 0xffffff, uvScale = null) {
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (uvScale) planarUVs(geo, uvScale);
    setVertexColor(geo, color);
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

  build(parent, { castShadow = true, receiveShadow = true, name = "" } = {}) {
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
