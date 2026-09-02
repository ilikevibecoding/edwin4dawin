import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Geometry helpers for the static world.
 *
 * Convention: every geometry produced here carries UVs in METERS (1 uv unit = 1 m) so a texture set
 * with a physical size of `tile` meters is applied with `repeat = 1 / tile` (see materials.js). Planar
 * UVs are derived from the vertex position along the dominant normal axis, which makes separately
 * generated wall pieces tile seamlessly across a facade and keeps stone/plaster scale consistent.
 */

const _v = new THREE.Vector3();

/** Assign planar UVs (meters) from positions, per dominant normal axis. */
export function planarUV(geo, { scale = 1, offset = [0, 0] } = {}) {
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
    let u;
    let v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * scale + offset[0];
    uv[i * 2 + 1] = v * scale + offset[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Fill (or replace) the vertex color attribute. `color` is [r,g,b] or fn(x,y,z) -> [r,g,b]. */
export function setVertexColor(geo, color) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const isFn = typeof color === 'function';
  for (let i = 0; i < pos.count; i++) {
    const c = isFn ? color(pos.getX(i), pos.getY(i), pos.getZ(i)) : color;
    arr[i * 3] = c[0];
    arr[i * 3 + 1] = c[1];
    arr[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

const isAxisAligned = (a) => Math.abs(a / (Math.PI / 2) - Math.round(a / (Math.PI / 2))) < 1e-6;

function applyRot(geo, rotX, rotY, rotZ) {
  if (rotX) geo.rotateX(rotX);
  if (rotZ) geo.rotateZ(rotZ);
  if (rotY) geo.rotateY(rotY);
}

/**
 * Box centered at (x,y,z). Axis-aligned boxes get UVs in the final (local object) space so adjacent
 * pieces tile continuously; rotated boxes get UVs in their own frame (exact meter scale, no stretch).
 */
export function box(w, h, d, { x = 0, y = 0, z = 0, rotX = 0, rotY = 0, rotZ = 0, uvScale = 1, uvOffset = [0, 0] } = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  const aligned = isAxisAligned(rotX) && isAxisAligned(rotY) && isAxisAligned(rotZ);
  if (aligned) {
    applyRot(g, rotX, rotY, rotZ);
    g.translate(x, y, z);
    planarUV(g, { scale: uvScale, offset: uvOffset });
  } else {
    planarUV(g, { scale: uvScale, offset: uvOffset });
    applyRot(g, rotX, rotY, rotZ);
    g.translate(x, y, z);
  }
  return g;
}

/** Plane facing +Z (before rotation), w × h, centered at (x,y,z). Meter UVs in its own frame. */
export function plane(w, h, { x = 0, y = 0, z = 0, rotX = 0, rotY = 0, rotZ = 0, uvScale = 1 } = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  planarUV(g, { scale: uvScale, offset: [w / 2, h / 2] });
  applyRot(g, rotX, rotY, rotZ);
  g.translate(x, y, z);
  return g;
}

/** Y-axis cylinder (radiusTop, radiusBottom, height) with meter UVs (u around, v along). */
export function cylinder(rTop, rBot, h, seg = 12, { x = 0, y = 0, z = 0, rotX = 0, rotY = 0, rotZ = 0, open = false, uvScale = 1 } = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
  const uv = g.attributes.uv;
  const circ = Math.PI * 2 * Math.max(rTop, rBot);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ * uvScale, uv.getY(i) * h * uvScale);
  applyRot(g, rotX, rotY, rotZ);
  g.translate(x, y, z);
  return g;
}

/** Cone (base radius r, height h). */
export function cone(r, h, seg = 12, { x = 0, y = 0, z = 0, rotX = 0, rotY = 0, rotZ = 0 } = {}) {
  const g = new THREE.ConeGeometry(r, h, seg);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r, uv.getY(i) * h);
  applyRot(g, rotX, rotY, rotZ);
  g.translate(x, y, z);
  return g;
}

/** Sphere / ellipsoid with meter-ish UVs. */
export function sphere(r, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 16, rotX = 0, rotY = 0, rotZ = 0 } = {}) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.75)));
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r, uv.getY(i) * Math.PI * r);
  g.scale(sx, sy, sz);
  applyRot(g, rotX, rotY, rotZ);
  g.translate(x, y, z);
  return g;
}

/** Capsule along the axis from `a` to `b` (Vector3-likes), radius r. */
export function capsule(a, b, r, seg = 10) {
  const from = new THREE.Vector3(a[0], a[1], a[2]);
  const to = new THREE.Vector3(b[0], b[1], b[2]);
  const len = from.distanceTo(to);
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, seg);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r, uv.getY(i) * (len + 2 * r));
  const dir = to.clone().sub(from).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/** Lathe from an [r, y] profile (revolved around Y). */
export function lathe(profile, seg = 12, { x = 0, y = 0, z = 0, rotX = 0, rotY = 0, rotZ = 0 } = {}) {
  const pts = profile.map(([r, py]) => new THREE.Vector2(r, py));
  const g = new THREE.LatheGeometry(pts, seg);
  let maxR = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [r, py] of profile) {
    maxR = Math.max(maxR, r);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * maxR, uv.getY(i) * (maxY - minY));
  g.computeVertexNormals();
  applyRot(g, rotX, rotY, rotZ);
  g.translate(x, y, z);
  return g;
}

/** Points on an arc in the ground plane: [x,z] from angle a0 to a1 (radians), inclusive. */
export function arcPoints(cx, cz, r, a0, a1, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return pts;
}

/** Angular resolution helper: number of segments for a full circle of radius r (~0.35 m chords). */
export const circleSegments = (r) => Math.max(24, Math.min(160, Math.round((Math.PI * 2 * r) / 0.35)));

/**
 * Horizontal polygon at height y (points as [x,z], any winding), optional holes. Faces up. UVs = (x,z).
 */
export function polygon(points, holes = [], y = 0) {
  // ShapeGeometry lives in XY; rotateX(-90°) maps shape-y to -z, so feed the shape with (x, -z).
  const shape = new THREE.Shape(points.map(([px, pz]) => new THREE.Vector2(px, -pz)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([px, pz]) => new THREE.Vector2(px, -pz))));
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  planarUV(g);
  return g;
}

/** Annular sector (ring piece) between radii r0..r1, angles a0..a1, as a horizontal polygon. */
export function ringSector(cx, cz, r0, r1, a0, a1, y = 0, segments = null) {
  const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
  const segs = segments || Math.max(4, Math.round((circleSegments(r1) * Math.abs(a1 - a0)) / (Math.PI * 2)));
  if (full) {
    const outer = arcPoints(cx, cz, r1, a0, a1, segs).slice(0, -1);
    if (r0 <= 1e-6) return polygon(outer, [], y);
    const inner = arcPoints(cx, cz, r0, a0, a1, segs).slice(0, -1);
    return polygon(outer, [inner], y);
  }
  const outer = arcPoints(cx, cz, r1, a0, a1, segs);
  const inner = r0 > 1e-6 ? arcPoints(cx, cz, r0, a1, a0, segs) : [[cx, cz]];
  return polygon([...outer, ...inner], [], y);
}

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
}

/**
 * Vertical side walls of a polygon footprint from y0 to y1 with UVs (perimeter distance, height).
 * `outward` false flips the normals (inner walls of a basin). Optional top/bottom caps.
 */
export function prism(points, y0, y1, { top = true, bottom = false, outward = true, holes = [] } = {}) {
  const n = points.length;
  const cx = points.reduce((s, p) => s + p[0], 0) / n;
  const cz = points.reduce((s, p) => s + p[1], 0) / n;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let perim = 0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[(i + 1) % n];
    const ex = x1 - x0;
    const ez = z1 - z0;
    const len = Math.hypot(ex, ez);
    let nx = ez / len;
    let nz = -ex / len;
    const mx = (x0 + x1) / 2 - cx;
    const mz = (z0 + z1) / 2 - cz;
    if (nx * mx + nz * mz < 0) {
      nx = -nx;
      nz = -nz;
    }
    if (!outward) {
      nx = -nx;
      nz = -nz;
    }
    const base = positions.length / 3;
    positions.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0);
    for (let k = 0; k < 4; k++) normals.push(nx, 0, nz);
    uvs.push(perim, y0, perim + len, y0, perim + len, y1, perim, y1);
    // Winding must follow the normal direction.
    const ccw = (ex * nz - ez * nx) > 0;
    if (ccw) indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    perim += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  const parts = [g];
  if (top) parts.push(polygon(points, holes, y1));
  if (bottom) {
    const b = polygon(points, holes, y0);
    b.rotateX(Math.PI); // face down
    b.translate(0, 2 * y0, 0);
    parts.push(b);
  }
  return parts.length === 1 ? g : mergeGeometries(parts.map(prepareForMerge));
}

/** Ring-shaped wall (outer polygon minus inner polygon) from y0 to y1, capped on top. */
export function ringPrism(outer, inner, y0, y1, { top = true } = {}) {
  const parts = [prism(outer, y0, y1, { top: false }), prism(inner, y0, y1, { top: false, outward: false })];
  if (top) parts.push(polygon(outer, [inner], y1));
  return mergeGeometries(parts.map(prepareForMerge));
}

/** Extruded 2D profile (points in [x,y]) along Z for length `len`, centered. Meter UVs. */
export function extrudeProfile(profile, len, { x = 0, y = 0, z = 0, rotY = 0 } = {}) {
  const shape = new THREE.Shape(profile.map(([px, py]) => new THREE.Vector2(px, py)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  planarUV(g);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

/** Normalize a geometry so it can be merged with the others: indexed, only position/normal/uv/color. */
export function prepareForMerge(geo) {
  let g = geo;
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  }
  if (!g.index) g = mergeVertices(g);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) planarUV(g);
  if (!g.attributes.color) setVertexColor(g, [1, 1, 1]);
  g.morphAttributes = {};
  return g;
}

/** Apply a Matrix4 (object -> world) to a geometry in place. */
export function transformGeo(geo, matrix) {
  geo.applyMatrix4(matrix);
  return geo;
}

/**
 * Collects geometry per material and emits one merged Mesh per material per spatial chunk.
 * Colors: `add(mat, geo, [r,g,b])` fills a vertex color (materials use vertexColors: true).
 *
 * Chunking (default 32 m cells in XZ) trades a few extra draw calls for frustum culling: a single
 * town-wide mesh would be re-rendered in full by every shadow cascade and the main pass, whereas
 * chunks outside a cascade's frustum are skipped. Geometry is assigned to the cell containing its
 * bounding-box center, so large pieces (ground slabs, backdrop) simply land in one cell.
 */
export class Batcher {
  constructor({ cell = 32 } = {}) {
    this._groups = new Map();
    this.cell = cell;
    this.count = 0;
  }

  add(material, geo, color = null) {
    if (!material || !geo) return this;
    const g = prepareForMerge(geo);
    if (color) setVertexColor(g, color);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const cx = Math.floor((bb.min.x + bb.max.x) / 2 / this.cell);
    const cz = Math.floor((bb.min.z + bb.max.z) / 2 / this.cell);
    const key = `${cx},${cz}`;
    if (!this._groups.has(material)) this._groups.set(material, new Map());
    const cells = this._groups.get(material);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(g);
    this.count++;
    return this;
  }

  /** Merge everything added since the last build into meshes under `parent`. Returns the meshes. */
  build(parent, { name = 'Batch', castShadow = true, receiveShadow = true, renderOrder = 0 } = {}) {
    const meshes = [];
    for (const [mat, cells] of this._groups) {
      for (const [key, geos] of cells) {
        const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
        if (!merged) {
          console.warn(`[world] merge failed for material ${mat.name} (cell ${key})`);
          continue;
        }
        if (geos.length > 1) for (const g of geos) g.dispose();
        merged.computeBoundingBox();
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.name = `${name}:${mat.name || 'mat'}@${key}`;
        // Ground, glass, decals and the far backdrop never cast visible shadows: skipping them keeps the
        // shadow cascades from re-rendering hundreds of thousands of triangles per frame.
        mesh.castShadow = castShadow && !mat.userData?.noShadow;
        mesh.receiveShadow = receiveShadow;
        mesh.renderOrder = renderOrder;
        parent.add(mesh);
        meshes.push(mesh);
      }
    }
    this._groups.clear();
    this.count = 0;
    return meshes;
  }
}

/** Helper to build a THREE.Matrix4 from position + yaw. */
export function placement(x, y, z, rotY = 0, scale = 1) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(_v.set(0, 1, 0), rotY), new THREE.Vector3(scale, scale, scale));
  return m;
}
