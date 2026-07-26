/**
 * Geometry construction kit. Owner: Fable 3.
 *
 * Two rules this kit exists to enforce:
 *  1. Every exposed edge that the player can get close to is chamfered. Real objects catch a
 *     highlight on their edges; razor-sharp CG boxes do not, and that single detail is what
 *     separates "modelled" from "primitive".
 *  2. Tiling materials are projected in world space, so a 6 m wall and a 0.4 m panel share the
 *     same texel density and nothing is ever stretched.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface BoxOptions {
  /** Chamfer radius in metres. Defaults to a 2 mm architectural break. */
  bevel?: number;
  /** Subdivision of the chamfer. 1 = single chamfer facet (cheap), 2-3 = rounded. */
  segments?: number;
}

const SHARP = new THREE.BoxGeometry(1, 1, 1);

/**
 * Beveled box. Falls back to a plain box when the bevel would be larger than the smallest
 * dimension allows, which keeps very thin panels valid.
 */
export function box(w: number, h: number, d: number, opts: BoxOptions = {}): THREE.BufferGeometry {
  const minDim = Math.min(w, h, d);
  const bevel = Math.min(opts.bevel ?? 0.004, minDim * 0.24);
  if (bevel <= 0.0005) {
    const g = SHARP.clone();
    g.scale(w, h, d);
    return g;
  }
  const seg = Math.max(1, Math.min(4, opts.segments ?? 1));
  return new RoundedBoxGeometry(w, h, d, seg, bevel);
}

/** Sharp box for hidden/structural geometry where bevels would be wasted triangles. */
export function plainBox(w: number, h: number, d: number): THREE.BufferGeometry {
  const g = SHARP.clone();
  g.scale(w, h, d);
  return g;
}

export function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radial = 16,
  openEnded = false,
): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial, 1, openEnded);
}

export function tube(radius: number, height: number, radial = 12): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, height, radial, 1, true);
}

export function sphere(radius: number, seg = 16): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, seg, Math.max(6, seg >> 1));
}

export function capsule(radius: number, length: number, seg = 12): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radius, length, Math.max(3, seg >> 2), seg);
}

export function plane(w: number, h: number, wsSeg = 1, hsSeg = 1): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(w, h, wsSeg, hsSeg);
}

/** Rounded rectangle shape, used as the base for extruded profiles and panels. */
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const rr = Math.min(r, Math.min(w, h) * 0.5);
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

/**
 * Extrude a 2D profile (in the XY plane, metres) along +Z.
 * Used for skirting boards, crown trim, door stops, handrails and window mullions.
 */
export function extrudeProfile(
  points: [number, number][],
  depth: number,
  opts: { bevel?: number; closed?: boolean } = {},
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  if (opts.closed !== false) shape.closePath();
  const bevel = opts.bevel ?? 0.0025;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** Revolve a profile (radius, height) pairs around +Y. Bottles, cups, lamp shades, bollards. */
export function lathe(profile: [number, number][], segments = 20): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/** Sweep a circular section along a polyline. Cables, pipes, conduit. */
export function sweep(points: THREE.Vector3[], radius: number, radial = 8, closed = false): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.35);
  const segs = Math.max(6, Math.min(160, Math.round(curve.getLength() / 0.12)));
  return new THREE.TubeGeometry(curve, segs, radius, radial, closed);
}

/** A hanging catenary between two points; used for slack cables. */
export function catenary(a: THREE.Vector3, b: THREE.Vector3, sag: number, radius: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return sweep(pts, radius, 6);
}

// ---------------------------------------------------------------------------
// UV projection
// ---------------------------------------------------------------------------

const _n = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * Planar box projection in *object* space. Every triangle is mapped by its dominant axis, so
 * one metre of surface always covers `1 / scale` texture repeats regardless of mesh size.
 */
export function boxUV(geo: THREE.BufferGeometry, scale = 1, offsetU = 0, offsetV = 0): THREE.BufferGeometry {
  geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i);
    _n.fromBufferAttribute(nor, i);
    const ax = Math.abs(_n.x);
    const ay = Math.abs(_n.y);
    const az = Math.abs(_n.z);
    let u: number;
    let v: number;
    if (ax >= ay && ax >= az) {
      u = _p.z * (_n.x > 0 ? -1 : 1);
      v = _p.y;
    } else if (ay >= ax && ay >= az) {
      u = _p.x;
      v = _p.z * (_n.y > 0 ? -1 : 1);
    } else {
      u = _p.x * (_n.z > 0 ? 1 : -1);
      v = _p.y;
    }
    uv[i * 2] = u * scale + offsetU;
    uv[i * 2 + 1] = v * scale + offsetV;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // aoMap needs a second UV channel; reuse channel 0.
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv.slice(), 2));
  return geo;
}

/** Cylindrical projection around +Y. Columns, pipes, bottles. */
export function cylUV(geo: THREE.BufferGeometry, scaleU = 1, scaleV = 1): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i);
    uv[i * 2] = (Math.atan2(_p.z, _p.x) / (Math.PI * 2) + 0.5) * scaleU;
    uv[i * 2 + 1] = _p.y * scaleV;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv.slice(), 2));
  return geo;
}

/** Copy uv -> uv1 so aoMap works on geometry that already has good UVs. */
export function ensureUv1(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const uv = geo.attributes.uv;
  if (uv && !geo.attributes.uv1) {
    geo.setAttribute('uv1', new THREE.BufferAttribute((uv.array as Float32Array).slice(), 2));
  }
  return geo;
}

// ---------------------------------------------------------------------------
// transform + merge helpers
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export function xform(
  geo: THREE.BufferGeometry,
  pos: [number, number, number] = [0, 0, 0],
  rotEuler: [number, number, number] = [0, 0, 0],
  scl: [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  _e.set(rotEuler[0], rotEuler[1], rotEuler[2]);
  _q.setFromEuler(_e);
  _m.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), _q, new THREE.Vector3(scl[0], scl[1], scl[2]));
  geo.applyMatrix4(_m);
  return geo;
}

export function translated(geo: THREE.BufferGeometry, x: number, y: number, z: number): THREE.BufferGeometry {
  geo.translate(x, y, z);
  return geo;
}

export function rotatedX(geo: THREE.BufferGeometry, r: number): THREE.BufferGeometry {
  geo.rotateX(r);
  return geo;
}
export function rotatedY(geo: THREE.BufferGeometry, r: number): THREE.BufferGeometry {
  geo.rotateY(r);
  return geo;
}
export function rotatedZ(geo: THREE.BufferGeometry, r: number): THREE.BufferGeometry {
  geo.rotateZ(r);
  return geo;
}

/**
 * Normalise a geometry to the exact attribute set the merger requires:
 * non-indexed, position + normal + uv + uv1 and nothing else. Everything that gets merged goes
 * through here, including single-element lists, because a mixed indexed/non-indexed set is the
 * classic cause of a silent merge failure.
 */
export function normalizeForMerge(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const c = g.index ? g.toNonIndexed() : g;
  if (!c.attributes.uv) boxUV(c, 1);
  if (!c.attributes.normal) c.computeVertexNormals();
  ensureUv1(c);
  const keep = new THREE.BufferGeometry();
  keep.setAttribute('position', c.attributes.position);
  keep.setAttribute('normal', c.attributes.normal);
  keep.setAttribute('uv', c.attributes.uv);
  keep.setAttribute('uv1', c.attributes.uv1);
  return keep;
}

/** Merge a list of geometries that share one material. Returns null for an empty list. */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  const cleaned = geos.map(normalizeForMerge);
  if (cleaned.length === 1) return cleaned[0];
  const m = mergeGeometries(cleaned, false);
  return m ?? cleaned[0];
}

/**
 * Build a multi-material mesh from (geometry, material) pairs by merging per material and
 * emitting groups. This is the main tool for props: model each part with its own material and
 * still ship a single draw-call-friendly mesh.
 */
export interface Part {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  /** Optional world-space UV scale applied with boxUV before merging. */
  uvScale?: number;
  /** Skip UV reprojection (keep authored UVs, e.g. for printed signage). */
  keepUv?: boolean;
}

export function buildMesh(parts: Part[], name = 'prop'): THREE.Mesh {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const p of parts) {
    if (!p.keepUv) boxUV(p.geo, p.uvScale ?? 1);
    else ensureUv1(p.geo);
    let list = byMat.get(p.mat);
    if (!list) {
      list = [];
      byMat.set(p.mat, list);
    }
    list.push(p.geo);
  }
  const mats: THREE.Material[] = [];
  const merged: THREE.BufferGeometry[] = [];
  for (const [mat, geos] of byMat) {
    const g = merge(geos);
    if (!g) continue;
    merged.push(g);
    mats.push(mat);
  }
  if (merged.length === 0) {
    const empty = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    empty.name = name;
    return empty;
  }
  if (merged.length === 1) {
    const mesh = new THREE.Mesh(merged[0], mats[0]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  const combined = mergeGeometries(merged, true);
  const mesh = new THREE.Mesh(combined ?? merged[0], combined ? mats : mats[0]);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Group-based builder for props that need separate transforms (doors, animated parts). */
export function meshOf(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  opts: { uvScale?: number; keepUv?: boolean; name?: string; cast?: boolean; receive?: boolean } = {},
): THREE.Mesh {
  if (!opts.keepUv) boxUV(geo, opts.uvScale ?? 1);
  else ensureUv1(geo);
  const m = new THREE.Mesh(geo, mat);
  m.name = opts.name ?? 'mesh';
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  return m;
}

/** Bounding box of an object graph in its own space. */
export function localBounds(obj: THREE.Object3D): THREE.Box3 {
  const b = new THREE.Box3();
  b.setFromObject(obj, true);
  return b;
}

/** Number of triangles under an object; used by the performance audit. */
export function triCount(obj: THREE.Object3D): number {
  let n = 0;
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry as THREE.BufferGeometry;
    const count = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
    let inst = 1;
    const im = o as unknown as THREE.InstancedMesh;
    if (im.isInstancedMesh) inst = im.count;
    n += (count / 3) * inst;
  });
  return Math.round(n);
}
