// Shared geometry helpers for the exterior builders: merging, boxes with chamfers, hull surface frames,
// macro paint variation (vertex / instance colours) and a small InstancedMesh filler.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HULL } from "../config/shipSpec.js";
import { fbm } from "../textures.js";

export const TRENCH_HALF = HULL.trenchHeight / 2;
export const TRENCH_DEPTH = 10;
// yaw of the hull edge on each flank (the wedge outline is straight, so this is constant)
export const EDGE_YAW = Math.atan((HULL.beam / 2) / HULL.length);

export function dorsal(x, z) {
  return HULL.dorsalY(x, z) + TRENCH_HALF;
}
export function ventral(x, z) {
  return HULL.ventralY(x, z) - TRENCH_HALF;
}
export function surfaceY(x, z, top) {
  return top ? dorsal(x, z) : ventral(x, z);
}

const _e = 2;
const _n = new THREE.Vector3();
const _zAxis = new THREE.Vector3();
const _xAxis = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
export const UP = new THREE.Vector3(0, 1, 0);

export function surfaceNormal(x, z, top, out = _n) {
  const f = top ? dorsal : ventral;
  const dydx = (f(x + _e, z) - f(x - _e, z)) / (2 * _e);
  const dydz = (f(x, z + _e) - f(x, z - _e)) / (2 * _e);
  out.set(-dydx, 1, -dydz).normalize();
  if (!top) out.negate();
  return out;
}

// Quaternion whose local +Y is `normal` and whose local +Z follows world +Z projected onto the surface.
export function frameQuat(normal, outQ, zRef = null) {
  _zAxis.set(0, 0, 1);
  if (zRef) _zAxis.copy(zRef);
  _zAxis.addScaledVector(normal, -_zAxis.dot(normal));
  if (_zAxis.lengthSq() < 1e-6) _zAxis.set(1, 0, 0).addScaledVector(normal, -normal.x);
  _zAxis.normalize();
  _xAxis.crossVectors(normal, _zAxis).normalize();
  _m4.makeBasis(_xAxis, normal, _zAxis);
  return outQ.setFromRotationMatrix(_m4);
}

export function surfaceQuat(x, z, top, outQ) {
  return frameQuat(surfaceNormal(x, z, top), outQ);
}

// merge indexed and non-indexed geometries alike (everything becomes a triangle soup)
export function merge(geos) {
  const list = geos.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
  }
  const hasColor = list.some((g) => g.attributes.color);
  if (hasColor) for (const g of list) if (!g.attributes.color) g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return mergeGeometries(list, false);
}

export function box(cx, cy, cz, sx, sy, sz) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return g;
}
export function boxMM(min, max) {
  return box((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2, max[0] - min[0], max[1] - min[1], max[2] - min[2]);
}

// Chamfered box, base centred on the origin at y = 0, extending to y = sy.
export function bevelBox(sx, sy, sz, b) {
  b = Math.min(b, sx / 2 - 0.01, sz / 2 - 0.01, sy / 2 - 0.01);
  const hx = sx / 2 - b;
  const hz = sz / 2 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-hx, -hz);
  shape.lineTo(hx, -hz);
  shape.lineTo(hx, hz);
  shape.lineTo(-hx, hz);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: sy - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: 0, bevelSegments: 1, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);
  g.computeVertexNormals();
  return g;
}

// Materials with vertexColors read the `color` attribute; an unbound attribute samples as black, so give
// colourless geometry an explicit white one.
export function ensureColor(geo) {
  if (!geo.attributes.color) geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  return geo;
}

// Cylinder along +Z centred on the origin.
export function cylZ(r0, r1, len, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
}
// Cylinder along +X centred on the origin.
export function cylX(r0, r1, len, seg = 16, open = false) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateZ(Math.PI / 2);
  return g;
}

// Planar world UVs by dominant normal at a given texel density (kept for materials that use geometry UVs).
export function worldUV(geo, texel) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u;
    let v;
    if (ny >= nx && ny >= nz) (u = x), (v = z);
    else if (nx >= nz) (u = z), (v = y);
    else (u = x), (v = y);
    uv[i * 2] = u * texel;
    uv[i * 2 + 1] = v * texel;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// Remap a BoxGeometry's per-face UVs into atlas cells. rects: { px, nx, py, ny, pz, nz } (each [u0,v0,u1,v1]);
// missing faces fall back to `rects.side`, then `rects.all`.
export function atlasBox(sx, sy, sz, rects) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv;
  const order = ["px", "nx", "py", "ny", "pz", "nz"];
  for (let f = 0; f < 6; f++) {
    const rect = rects[order[f]] || rects.side || rects.all;
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, rect[0] + uv.getX(i) * (rect[2] - rect[0]), rect[1] + uv.getY(i) * (rect[3] - rect[1]));
    }
  }
  return g;
}

// PlaneGeometry (facing +Z) mapped into an atlas cell, optionally tiled n times along u.
export function atlasQuad(w, h, rect) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, rect[0] + uv.getX(i) * (rect[2] - rect[0]), rect[1] + uv.getY(i) * (rect[3] - rect[1]));
  return g;
}

// Macro paint variation shared by hull vertex colours and instance colours: slow blotchy tone shifts,
// soot toward the stern, dust lightening on up-facing surfaces. Writes into `out` (THREE.Color).
export function macroTint(x, y, z, ny, out, { base = 1.0, trench = false } = {}) {
  const n = fbm((x + 900) / 2400, (z + 900) / 2400, { octaves: 3, freq: 6, gain: 0.55, seed: 17 });
  const n2 = fbm((z + 900) / 1800, (y + 300) / 900, { octaves: 2, freq: 9, gain: 0.5, seed: 29 });
  let k = base * (0.96 + (n - 0.5) * 0.14 + (n2 - 0.5) * 0.06);
  const soot = THREE.MathUtils.smoothstep(z, 380, 800) * 0.2;
  k *= 1 - soot;
  k *= 1 + ny * 0.05;
  if (trench) k *= 0.5;
  out.setRGB(k * (1 + soot * 0.08), k, k * (1.02 - soot * 0.35));
  return out;
}

const _col = new THREE.Color();
export function macroColor(geo, opts = {}) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    macroTint(pos.getX(i), pos.getY(i), pos.getZ(i), nor.getY(i), _col, opts);
    if (opts.tint) opts.tint(pos.getX(i), pos.getY(i), pos.getZ(i), _col);
    col[i * 3] = _col.r;
    col[i * 3 + 1] = _col.g;
    col[i * 3 + 2] = _col.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

export function finish(geo, texel = 1 / 24, colorOpts = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  worldUV(g, texel);
  macroColor(g, colorOpts);
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
  g.computeBoundingSphere();
  return g;
}

// Triangle soup builder for the wedge surfaces.
export class Soup {
  constructor() {
    this.p = [];
  }
  tri(a, b, c) {
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    return g;
  }
}

// Fill an InstancedMesh from a callback: fill(i, matrix, color) -> false to skip the instance.
const _im4 = new THREE.Matrix4();
const _icol = new THREE.Color();
export function instanced(geo, mat, count, parent, fill, name) {
  if (mat.vertexColors) ensureColor(geo);
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
  im.name = name;
  let n = 0;
  for (let i = 0; i < count; i++) {
    _icol.setRGB(1, 1, 1);
    const ok = fill(i, _im4, _icol);
    if (ok === false) continue;
    im.setMatrixAt(n, _im4);
    im.setColorAt(n, _icol);
    n++;
  }
  im.count = n;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  if (parent) parent.add(im);
  return im;
}

// Fill an InstancedMesh from a prepared list of { m: Matrix4, c: Color }.
export function instancedFromList(geo, mat, list, parent, name) {
  return instanced(
    geo,
    mat,
    list.length,
    parent,
    (i, m, c) => {
      m.copy(list[i].m);
      c.copy(list[i].c);
      return true;
    },
    name,
  );
}

export function rectsOverlap(a, b, margin = 0) {
  return a.x0 - margin < b.x1 && a.x1 + margin > b.x0 && a.z0 - margin < b.z1 && a.z1 + margin > b.z0;
}
export function overlapsAny(rect, list, margin = 0) {
  for (const r of list) if (rectsOverlap(rect, r, margin)) return true;
  return false;
}
