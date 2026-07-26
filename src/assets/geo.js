// Shared geometry helpers. All boxes get world-scaled UVs (1 UV unit = 1 m)
// so tiling materials read correctly at any size, plus optional bevels for
// believable edges on close-view assets.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Box with world-scale UVs. Faces: +x -x +y -y +z -z (BoxGeometry order).
export function boxGeo(sx, sy, sz, uvScale = 1) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv;
  // face sizes in world units: (+x,-x): z,y  (+y,-y): x,z  (+z,-z): x,y
  const faceDims = [
    [sz, sy], [sz, sy],
    [sx, sz], [sx, sz],
    [sx, sy], [sx, sy],
  ];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = faceDims[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * du * uvScale, uv.getY(i) * dv * uvScale);
    }
  }
  uv.needsUpdate = true;
  return g;
}

// Chamfered box for props/hero assets: bevel via scaled inner box corners.
// Cheap approach: rounded-ish box built from a widened BoxGeometry with
// normals kept hard. segments=2 with small bevel reads as a machined edge.
export function bevelBoxGeo(sx, sy, sz, bevel = 0.02, uvScale = 1) {
  const b = Math.min(bevel, sx / 3, sy / 3, sz / 3);
  const shape = new THREE.Shape();
  const hx = sx / 2, hy = sy / 2;
  shape.moveTo(-hx + b, -hy);
  shape.lineTo(hx - b, -hy);
  shape.absarc(hx - b, -hy + b, b, -Math.PI / 2, 0, false);
  shape.lineTo(hx, hy - b);
  shape.absarc(hx - b, hy - b, b, 0, Math.PI / 2, false);
  shape.lineTo(-hx + b, hy);
  shape.absarc(-hx + b, hy - b, b, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hx, -hy + b);
  shape.absarc(-hx + b, -hy + b, b, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, sz - 2 * b), bevelEnabled: true,
    bevelThickness: b, bevelSize: b * 0.99, bevelSegments: 1, curveSegments: 2,
  });
  g.translate(0, 0, -(sz - 2 * b) / 2);
  g.computeVertexNormals();
  scaleUVsToWorld(g, uvScale);
  return g;
}

export function scaleUVsToWorld(geo, uvScale = 1) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u, v;
    if (nx >= ny && nx >= nz) { u = pos.getZ(i); v = pos.getY(i); }
    else if (ny >= nx && ny >= nz) { u = pos.getX(i); v = pos.getZ(i); }
    else { u = pos.getX(i); v = pos.getY(i); }
    uv.setXY(i, u * uvScale, v * uvScale);
  }
  uv.needsUpdate = true;
  return geo;
}

export function cylGeo(rTop, rBottom, h, seg = 12, uvScale = 1) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
  return g;
}

// Merge helper for static batches. Returns single geometry or null.
export function mergeGeos(list) {
  const geos = list.filter(Boolean);
  if (!geos.length) return null;
  return BufferGeometryUtils.mergeGeometries(geos, false);
}

// Batches boxes by material key, then produces merged meshes.
export class GeoBatcher {
  constructor() { this.byMat = new Map(); }
  addBox(matKey, cx, cy, cz, sx, sy, sz, opts = {}) {
    const g = boxGeo(sx, sy, sz, opts.uvScale ?? 1);
    if (opts.rotY) g.rotateY(opts.rotY);
    g.translate(cx, cy, cz);
    this.add(matKey, g);
  }
  add(matKey, geo) {
    if (!this.byMat.has(matKey)) this.byMat.set(matKey, []);
    this.byMat.get(matKey).push(geo);
  }
  buildMeshes(materialLookup, opts = {}) {
    const meshes = [];
    for (const [key, geos] of this.byMat) {
      const merged = mergeGeos(geos);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, materialLookup(key));
      mesh.castShadow = opts.castShadow ?? true;
      mesh.receiveShadow = opts.receiveShadow ?? true;
      mesh.matrixAutoUpdate = false;
      mesh.name = 'batch_' + key;
      meshes.push(mesh);
    }
    return meshes;
  }
}
