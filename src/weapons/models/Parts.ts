import * as THREE from 'three';
import {
  applyWorldUv,
  bevelBox,
  computeTangents,
  mergeGeometries,
  roundedBoxGeometry,
} from '../../procgen/GeometryUtils';

/**
 * Hard-surface geometry toolkit for the weapon models.
 *
 * Two rules drive everything here. First, nothing the player sees at 30 cm may
 * have a raw ninety-degree edge: every box is a `bevelBox` and every revolved
 * form has a real chamfer in its profile, because the chamfer highlight is what
 * separates a manufactured object from a primitive. Second, texel density must
 * be uniform across parts, so UVs are always world-projected at a fixed number
 * of metres per tile rather than left at the 0..1 range a primitive ships with.
 */

/** Metres of surface per texture tile. Matches the gun material specs. */
export const GUN_TILE = 0.3;

const UV_SCALE = 1 / GUN_TILE;

// ---------------------------------------------------------------------------
// Geometry utilities
// ---------------------------------------------------------------------------

export function scaleUvs(geometry: THREE.BufferGeometry, su: number, sv: number): THREE.BufferGeometry {
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Reverses winding and normals so an inward-facing shell reads as a cavity. */
export function flipGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = geometry.getIndex();
  if (index) {
    const a = index.array as unknown as number[];
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i];
      a[i] = a[i + 2];
      a[i + 2] = t;
    }
    index.needsUpdate = true;
  }
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (normal) {
    for (let i = 0; i < normal.count; i++) {
      normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
    }
    normal.needsUpdate = true;
  }
  return geometry;
}

/** Mirrors across X, keeping winding and normals consistent. */
export function mirrorGeometryX(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) position.setX(i, -position.getX(i));
  position.needsUpdate = true;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (normal) {
    for (let i = 0; i < normal.count; i++) normal.setX(i, -normal.getX(i));
    normal.needsUpdate = true;
  }
  const index = geometry.getIndex();
  if (index) {
    const a = index.array as unknown as number[];
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i];
      a[i] = a[i + 2];
      a[i + 2] = t;
    }
    index.needsUpdate = true;
  }
  return geometry;
}

export function mergeParts(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();
  if (!merged) throw new Error('[weapons] geometry merge failed');
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function triangleCount(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const index = geometry.getIndex();
    const count = index ? index.count : (geometry.getAttribute('position')?.count ?? 0);
    total += Math.floor(count / 3);
  });
  return total;
}

// ---------------------------------------------------------------------------
// Primitives. All "Z" variants point down -Z, matching the camera convention.
// ---------------------------------------------------------------------------

export function boxGeo(
  width: number,
  height: number,
  depth: number,
  bevel = 0.0012,
): THREE.BufferGeometry {
  return bevelBox(width, height, depth, bevel, UV_SCALE);
}

export function roundBoxGeo(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 2,
): THREE.BufferGeometry {
  return applyWorldUv(roundedBoxGeometry(width, height, depth, radius, segments), GUN_TILE);
}

/** Cylinder along -Z. `rFront` is the radius at the muzzle-facing end. */
export function cylGeo(
  rFront: number,
  rBack: number,
  length: number,
  radialSegments = 20,
  openEnded = false,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rFront, rBack, length, radialSegments, 1, openEnded);
  scaleUvs(g, (Math.PI * 2 * Math.max(rFront, rBack)) / GUN_TILE, length / GUN_TILE);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Cylinder along +Y, for grips, columns and knobs. */
export function cylGeoY(
  rTop: number,
  rBottom: number,
  length: number,
  radialSegments = 16,
  openEnded = false,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBottom, length, radialSegments, 1, openEnded);
  scaleUvs(g, (Math.PI * 2 * Math.max(rTop, rBottom)) / GUN_TILE, length / GUN_TILE);
  return g;
}

/** Cylinder along +X, for cross pins and takedown pins. */
export function cylGeoX(
  radius: number,
  length: number,
  radialSegments = 12,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, false);
  scaleUvs(g, (Math.PI * 2 * radius) / GUN_TILE, length / GUN_TILE);
  g.rotateZ(Math.PI / 2);
  return g;
}

/**
 * Revolved profile along -Z. Profile entries are `[radius, forwardDistance]`,
 * which lets a muzzle device, a scope tube or a suppressor be authored as the
 * silhouette a machinist would actually cut.
 */
export function latheZ(
  profile: ReadonlyArray<readonly [number, number]>,
  radialSegments = 20,
): THREE.BufferGeometry {
  const points = profile.map(([r, z]) => new THREE.Vector2(Math.max(1e-5, r), z));
  const g = new THREE.LatheGeometry(points, radialSegments);
  let rMax = 0;
  let length = 0;
  for (let i = 0; i < points.length; i++) {
    rMax = Math.max(rMax, points[i].x);
    if (i > 0) length += points[i].distanceTo(points[i - 1]);
  }
  scaleUvs(g, (Math.PI * 2 * rMax) / GUN_TILE, Math.max(length, 1e-4) / GUN_TILE);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Flat annulus facing -Z; used for lens rims, washers and muzzle crowns. */
export function ringGeo(rOuter: number, rInner: number, segments = 24): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(rInner, rOuter, segments, 1);
  scaleUvs(g, (Math.PI * 2 * rOuter) / GUN_TILE, (rOuter - rInner) / GUN_TILE);
  g.rotateY(Math.PI);
  return g;
}

export function discGeo(radius: number, segments = 24): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(radius, segments);
  g.rotateY(Math.PI);
  return g;
}

/**
 * The inside of a barrel: an inward-facing tube plus a blanked-off breech, so
 * looking down the muzzle shows a real dark bore instead of a painted dot.
 */
/**
 * Inward-facing tube with both ends open, for the inside of an optic. The
 * viewmodel is composited over the world, so anything opaque on the sight line
 * blackens the target: an optic's optical path has to be genuinely empty.
 */
export function tubeInnerGeo(radius: number, depth: number, segments = 20): THREE.BufferGeometry {
  const wall = new THREE.CylinderGeometry(radius, radius, depth, segments, 1, true);
  scaleUvs(wall, (Math.PI * 2 * radius) / GUN_TILE, depth / GUN_TILE);
  wall.rotateX(-Math.PI / 2);
  wall.translate(0, 0, depth * 0.5);
  flipGeometry(wall);
  return wall;
}

export function boreGeo(radius: number, depth: number, segments = 20): THREE.BufferGeometry {
  const wall = new THREE.CylinderGeometry(radius, radius, depth, segments, 1, true);
  scaleUvs(wall, (Math.PI * 2 * radius) / GUN_TILE, depth / GUN_TILE);
  wall.rotateX(-Math.PI / 2);
  wall.translate(0, 0, depth * 0.5);
  flipGeometry(wall);
  const back = discGeo(radius, segments);
  back.rotateY(Math.PI);
  back.translate(0, 0, depth);
  return mergeParts([wall, back]);
}

/**
 * MIL-STD-1913 rail as real repeated teeth. The slots are geometry, never a
 * texture: at viewmodel range a painted rail is instantly readable as fake.
 * The returned geometry has the top of the teeth at y = 0 so optics mount at 0.
 */
export function railGeo(length: number, width = 0.0212): THREE.BufferGeometry {
  const pitch = 0.0102;
  const toothDepth = 0.0048;
  const toothHeight = 0.0056;
  const baseHeight = 0.0038;
  const parts: THREE.BufferGeometry[] = [];

  const base = boxGeo(width * 0.94, baseHeight, length, 0.0009);
  base.translate(0, -toothHeight - baseHeight * 0.5, 0);
  parts.push(base);

  const count = Math.max(1, Math.floor(length / pitch));
  const span = count * pitch;
  const start = -span * 0.5 + pitch * 0.5;
  for (let i = 0; i < count; i++) {
    const tooth = boxGeo(width, toothHeight, toothDepth, 0.0011);
    tooth.translate(0, -toothHeight * 0.5, start + i * pitch);
    parts.push(tooth);
  }
  return mergeParts(parts);
}

/** Hex-socket screw head sitting slightly proud of a surface, facing +Y. */
export function screwGeo(radius = 0.0022, height = 0.0012): THREE.BufferGeometry {
  const head = cylGeoY(radius, radius * 1.05, height, 10);
  const socket = cylGeoY(radius * 0.5, radius * 0.5, height * 0.7, 6);
  socket.translate(0, height * 0.35, 0);
  return mergeParts([head, socket]);
}

/**
 * A side silhouette extruded across the weapon's width, with a bevel on the
 * extrusion edges.
 *
 * Stocks, receiver shells and knife blades are all things whose read comes from
 * their profile, and building them from stacked boxes leaves gaps and steps that
 * are obvious the moment the part is near the camera. Points are `[rearward, up]`
 * in metres and are closed automatically.
 */
export function extrudeProfileX(
  points: ReadonlyArray<readonly [number, number]>,
  width: number,
  bevel = 0.0018,
): THREE.BufferGeometry {
  const b = Math.max(1e-4, Math.min(bevel, width * 0.35));
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, width - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 3,
  });
  g.translate(0, 0, -(width - b * 2) * 0.5);
  // Authored +x becomes +z (rearward); the extrusion axis becomes the width axis.
  g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  applyWorldUv(g, GUN_TILE);
  return computeTangents(g);
}

/**
 * Thickens an open `[rearward, up]` centreline into a closed profile suitable for
 * `extrudeProfileX`. Trigger guards, sling loops and lever bows are all a
 * constant-section bar following a curve, and offsetting one centreline keeps the
 * inner and outer edges concentric — tracing both edges by hand always ends up
 * with the bar visibly thickening through the corners.
 */
export function strokeProfile(
  centre: ReadonlyArray<readonly [number, number]>,
  thickness: number,
): Array<readonly [number, number]> {
  const n = centre.length;
  const h = thickness * 0.5;
  const left: Array<readonly [number, number]> = [];
  const right: Array<readonly [number, number]> = [];
  for (let i = 0; i < n; i++) {
    const p = centre[Math.max(0, i - 1)];
    const q = centre[Math.min(n - 1, i + 1)];
    let tx = q[0] - p[0];
    let ty = q[1] - p[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const c = centre[i];
    left.push([c[0] - ty * h, c[1] + tx * h]);
    right.push([c[0] + ty * h, c[1] - tx * h]);
  }
  right.reverse();
  return left.concat(right);
}

/** Four-sided pyramid along +Y, the unit of a stippled grip panel. */
export function pyramidGeo(base: number, height: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(base, height, 4, 1);
  g.translate(0, height * 0.5, 0);
  g.rotateY(Math.PI / 4);
  scaleUvs(g, (base * 2) / GUN_TILE, height / GUN_TILE);
  return g;
}

// ---------------------------------------------------------------------------
// Lofted forms: magazines, arms, fingers, knife blades
// ---------------------------------------------------------------------------

export interface LoftFrame {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scaleX: number;
  scaleY: number;
}

export function circleProfile(segments = 10, radius = 1): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return pts;
}

/** Squashed circle — reads as an anatomically plausible limb cross-section. */
export function ovalProfile(segments = 10, rx = 1, ry = 0.78): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * ry));
  }
  return pts;
}

export function roundedRectProfile(
  width: number,
  height: number,
  radius: number,
  cornerSegments = 3,
): THREE.Vector2[] {
  const r = Math.min(radius, Math.min(width, height) * 0.49);
  const hw = width * 0.5 - r;
  const hh = height * 0.5 - r;
  const pts: THREE.Vector2[] = [];
  const corners: ReadonlyArray<readonly [number, number, number]> = [
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
    [hw, -hh, Math.PI * 1.5],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const a = a0 + (i / cornerSegments) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  return pts;
}

/**
 * Sweeps a closed profile through a list of frames. This is how the curved
 * magazines, the arms and every finger are built: a swept profile keeps the
 * cross-section consistent while the spine bends, which is exactly what a
 * stamped magazine body or a limb does and what stacked boxes cannot fake.
 */
export function loft(
  profile: readonly THREE.Vector2[],
  frames: readonly LoftFrame[],
  capStart = true,
  capEnd = true,
): THREE.BufferGeometry {
  const n = profile.length;
  const m = frames.length;
  if (n < 3 || m < 2) return new THREE.BufferGeometry();

  const cols = n + 1; // duplicated seam column for clean UVs
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Profile perimeter, for u.
  const perim: number[] = [0];
  for (let j = 1; j <= n; j++) {
    const a = profile[(j - 1) % n];
    const b = profile[j % n];
    perim.push(perim[j - 1] + a.distanceTo(b));
  }

  const arc: number[] = [0];
  for (let i = 1; i < m; i++) {
    arc.push(arc[i - 1] + frames[i].position.distanceTo(frames[i - 1].position));
  }

  const v = new THREE.Vector3();
  for (let i = 0; i < m; i++) {
    const f = frames[i];
    // The profile is a unit shape scaled per frame, so its raw perimeter is about
    // 2*pi whatever the part's real size. Using that directly wraps the texture
    // thirty times round a 30 mm forearm and every lofted surface — arms, mags,
    // grips, knife blades — averages out to flat untextured colour.
    const girth = (f.scaleX + f.scaleY) * 0.5;
    for (let j = 0; j < cols; j++) {
      const p = profile[j % n];
      v.set(p.x * f.scaleX, p.y * f.scaleY, 0).applyQuaternion(f.quaternion).add(f.position);
      positions.push(v.x, v.y, v.z);
      uvs.push((perim[j] * girth) / GUN_TILE, arc[i] / GUN_TILE);
    }
  }

  for (let i = 0; i < m - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const side = new THREE.BufferGeometry();
  side.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  side.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  side.setIndex(indices);
  side.computeVertexNormals();

  const pieces: THREE.BufferGeometry[] = [side];
  if (capStart) pieces.push(loftCap(profile, frames[0], true));
  if (capEnd) pieces.push(loftCap(profile, frames[m - 1], false));
  return pieces.length > 1 ? mergeParts(pieces) : side;
}

function loftCap(
  profile: readonly THREE.Vector2[],
  frame: LoftFrame,
  atStart: boolean,
): THREE.BufferGeometry {
  const n = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const v = new THREE.Vector3();
  let cx = 0;
  let cy = 0;
  for (const p of profile) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;

  v.set(cx * frame.scaleX, cy * frame.scaleY, 0).applyQuaternion(frame.quaternion).add(frame.position);
  positions.push(v.x, v.y, v.z);
  uvs.push(0.5, 0.5);
  for (let j = 0; j < n; j++) {
    const p = profile[j];
    v.set(p.x * frame.scaleX, p.y * frame.scaleY, 0).applyQuaternion(frame.quaternion).add(frame.position);
    positions.push(v.x, v.y, v.z);
    uvs.push((p.x * frame.scaleX) / GUN_TILE + 0.5, (p.y * frame.scaleY) / GUN_TILE + 0.5);
  }
  for (let j = 0; j < n; j++) {
    const a = 1 + j;
    const b = 1 + ((j + 1) % n);
    if (atStart) indices.push(0, a, b);
    else indices.push(0, b, a);
  }
  const cap = new THREE.BufferGeometry();
  cap.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  cap.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  cap.setIndex(indices);
  cap.computeVertexNormals();
  return cap;
}

const TRANSPORT_A = new THREE.Vector3();
const TRANSPORT_B = new THREE.Vector3();
const TRANSPORT_Q = new THREE.Quaternion();
const UNIT_Z = new THREE.Vector3(0, 0, 1);

/**
 * Builds sweep frames along a polyline using parallel transport, so the profile
 * never twists even where the spine curves sharply. `scales` is sampled per
 * point; pass one value to keep a constant cross-section.
 */
export function framesAlongPath(
  points: readonly THREE.Vector3[],
  scalesX: readonly number[],
  scalesY?: readonly number[],
): LoftFrame[] {
  const m = points.length;
  const frames: LoftFrame[] = [];
  let q = new THREE.Quaternion();
  for (let i = 0; i < m; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(m - 1, i + 1)];
    TRANSPORT_A.subVectors(next, prev);
    if (TRANSPORT_A.lengthSq() < 1e-12) TRANSPORT_A.set(0, 0, 1);
    TRANSPORT_A.normalize();
    if (i === 0) {
      q = new THREE.Quaternion().setFromUnitVectors(UNIT_Z, TRANSPORT_A);
    } else {
      TRANSPORT_B.copy(UNIT_Z).applyQuaternion(q);
      TRANSPORT_Q.setFromUnitVectors(TRANSPORT_B, TRANSPORT_A);
      q = new THREE.Quaternion().multiplyQuaternions(TRANSPORT_Q, q);
    }
    const sx = sampleSeries(scalesX, i, m);
    const sy = scalesY ? sampleSeries(scalesY, i, m) : sx;
    frames.push({ position: points[i].clone(), quaternion: q.clone(), scaleX: sx, scaleY: sy });
  }
  return frames;
}

function sampleSeries(series: readonly number[], i: number, m: number): number {
  if (series.length === 0) return 1;
  if (series.length === 1) return series[0];
  const t = (i / Math.max(1, m - 1)) * (series.length - 1);
  const a = Math.floor(t);
  const b = Math.min(series.length - 1, a + 1);
  return series[a] + (series[b] - series[a]) * (t - a);
}

/** Smooths a control polyline into `samples` points before lofting. */
export function smoothPath(
  control: readonly THREE.Vector3[],
  samples: number,
  tension = 0.5,
): THREE.Vector3[] {
  const curve = new THREE.CatmullRomCurve3(control.map((p) => p.clone()), false, 'catmullrom', tension);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < samples; i++) out.push(curve.getPoint(i / (samples - 1)));
  return out;
}

/**
 * Curved box-section magazine. 5.56 and 5.45 magazines are arcs because the
 * cartridge is tapered, and getting that arc in is one of the cheapest ways to
 * make a rifle read as correctly observed rather than approximated.
 */
export function curvedMagGeo(opts: {
  width: number;
  depth: number;
  length: number;
  /** Sweep angle over the length, radians. 0 makes a straight stick mag. */
  curve: number;
  /** Taper of the cross-section at the bottom. */
  taper?: number;
  segments?: number;
}): THREE.BufferGeometry {
  const segments = opts.segments ?? 9;
  const taper = opts.taper ?? 0.94;
  const profile = roundedRectProfile(opts.width, opts.depth, Math.min(opts.width, opts.depth) * 0.3, 2);
  const points: THREE.Vector3[] = [];
  const scales: number[] = [];
  // Arc of radius R subtending `curve` over `length`. The bottom of the
  // magazine swings forward, which is the direction a tapered cartridge stack
  // actually curves.
  const radius = opts.curve > 1e-4 ? opts.length / opts.curve : 1e6;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const a = t * opts.curve;
    points.push(new THREE.Vector3(0, -radius * Math.sin(a), -radius * (1 - Math.cos(a))));
    scales.push(1 - (1 - taper) * t);
  }
  const frames = framesAlongPath(points, scales);
  return loft(profile, frames, true, true);
}

// ---------------------------------------------------------------------------
// Assembly helper
// ---------------------------------------------------------------------------

export interface MeshOptions {
  pos?: readonly [number, number, number];
  rot?: readonly [number, number, number];
  scale?: readonly [number, number, number];
  name?: string;
  /** Skip tangent generation for meshes with no normal map. */
  noTangents?: boolean;
  renderOrder?: number;
}

/**
 * Builds a named part hierarchy. Every weapon is assembled through this so the
 * animation code can address `receiver`, `boltCarrier`, `magazine` and friends
 * by name without each builder inventing its own layout.
 */
export class Assembler {
  readonly root = new THREE.Group();
  private readonly groups = new Map<string, THREE.Group>();

  constructor(name: string) {
    this.root.name = name;
  }

  part(name: string): THREE.Group {
    let g = this.groups.get(name);
    if (!g) {
      g = new THREE.Group();
      g.name = name;
      this.root.add(g);
      this.groups.set(name, g);
    }
    return g;
  }

  /** Nests a part under another so it inherits that part's animation. */
  subPart(parent: string, name: string): THREE.Group {
    let g = this.groups.get(name);
    if (!g) {
      g = new THREE.Group();
      g.name = name;
      this.part(parent).add(g);
      this.groups.set(name, g);
    }
    return g;
  }

  has(name: string): boolean {
    return this.groups.has(name);
  }

  get parts(): ReadonlyMap<string, THREE.Group> {
    return this.groups;
  }

  mesh(
    part: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    opts: MeshOptions = {},
  ): THREE.Mesh {
    if (!opts.noTangents) computeTangents(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = opts.name ?? `${part}_mesh`;
    if (opts.pos) mesh.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    if (opts.scale) mesh.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
    if (opts.renderOrder !== undefined) mesh.renderOrder = opts.renderOrder;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    this.part(part).add(mesh);
    return mesh;
  }

  anchor(
    name: string,
    pos: readonly [number, number, number],
    rot: readonly [number, number, number] = [0, 0, 0],
    parent?: string,
  ): THREE.Object3D {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(pos[0], pos[1], pos[2]);
    o.rotation.set(rot[0], rot[1], rot[2]);
    if (parent) this.part(parent).add(o);
    else this.root.add(o);
    return o;
  }
}
