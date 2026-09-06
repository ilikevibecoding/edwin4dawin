import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Flat strap (seat belt) between two points: `width` across, `thick` along the given face normal. */
export function strapGeometry(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number, faceNormal: THREE.Vector3): THREE.BufferGeometry {
  const dir = b.clone().sub(a).normalize();
  const n = faceNormal.clone().addScaledVector(dir, -faceNormal.dot(dir)).normalize();
  const s = new THREE.Vector3().crossVectors(dir, n).normalize();
  const g = new THREE.BoxGeometry(width, a.distanceTo(b), thick);
  const m = new THREE.Matrix4().makeBasis(s, dir, n).setPosition(a.clone().add(b).multiplyScalar(0.5));
  g.applyMatrix4(m);
  return g;
}

/** Textured quad (placard, screen) of size w x h centred at the origin in the XY plane facing +Z, UVs inside an atlas rectangle. */
export function quadGeometry(w: number, h: number, uv: { u0: number; v0: number; u1: number; v1: number }): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv.u0 + (uv.u1 - uv.u0) * a.getX(i), uv.v0 + (uv.v1 - uv.v0) * a.getY(i));
  return g;
}

/** The same texel for every vertex: a part merged into a textured skin mesh that should read as one plain paint spot. */
export function flatUv<T extends THREE.BufferGeometry>(geo: T, u: number, v: number): T {
  const a = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < a.count; i++) a.setXY(i, u, v);
  return geo;
}

/** Matrix placing a +Y cylinder of the right length between two points. */
function betweenMatrix(a: THREE.Vector3, b: THREE.Vector3): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
}

/** Tube between two points (geometry in the parent's space). */
export function strutGeometry(a: THREE.Vector3, b: THREE.Vector3, radius: number, segments = 8): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), segments);
  g.applyMatrix4(betweenMatrix(a, b));
  return g;
}

/** Streamlined (airfoil-section) strut between two points; wider than thick (geometry in the parent's space). */
export function fairedStrutGeometry(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.5, 0.5, a.distanceTo(b), 10);
  g.scale(width, 1, thick);
  g.applyMatrix4(betweenMatrix(a, b));
  return g;
}

/** Tube between two points. */
export function strut(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material, segments = 8): THREE.Mesh {
  const m = new THREE.Mesh(strutGeometry(a, b, radius, segments), mat);
  m.castShadow = true;
  return m;
}

/** Streamlined (airfoil-section) strut between two points; wider than thick. */
export function fairedStrut(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(fairedStrutGeometry(a, b, width, thick), mat);
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ batching

/** Local transform of a part: position, Euler rotation and scale (all optional). */
export function placement(position?: THREE.Vector3 | [number, number, number], rotation?: THREE.Euler | [number, number, number], scale?: THREE.Vector3 | [number, number, number] | number): THREE.Matrix4 {
  const p = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...(position ?? [0, 0, 0]));
  const e = rotation instanceof THREE.Euler ? rotation : new THREE.Euler(...(rotation ?? [0, 0, 0]));
  const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale instanceof THREE.Vector3 ? scale : new THREE.Vector3(...(scale ?? [1, 1, 1]));
  return new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(e), s);
}

/** Copy of a geometry with an explicit index (merging needs every part indexed or none). */
export function toIndexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.clone();
  if (g.index) return g;
  const n = g.getAttribute('position').count;
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * Copy of a geometry with a part's local matrix baked in. Mirroring (negative determinant) reverses the
 * orientation of every triangle, so the winding is flipped back to keep the faces front-facing.
 */
export function baked(geo: THREE.BufferGeometry, m?: THREE.Matrix4): THREE.BufferGeometry {
  const g = toIndexed(geo);
  if (!m) return g;
  g.applyMatrix4(m);
  if (m.determinant() < 0) {
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1), c = idx.getX(i + 2);
      idx.setX(i + 1, c); idx.setX(i + 2, b);
    }
  }
  return g;
}

/** Surface parameters of a part inside a batch (see `partsMaterial`): base colour, roughness, metalness. */
export interface Surf { color: number; roughness: number; metalness: number; }

/**
 * Give every vertex the part's colour (linear, `color` attribute) and roughness/metalness (`aSurf`). A function
 * picks the finish per vertex from its local position (e.g. headliner above the windows, trim below).
 */
export function tagSurface(g: THREE.BufferGeometry, surf: Surf | ((x: number, y: number, z: number) => Surf)): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  const n = pos.count;
  const col = new Float32Array(n * 3), sf = new Float32Array(n * 2);
  const c = new THREE.Color();
  let last: Surf | null = null;
  for (let i = 0; i < n; i++) {
    const s = typeof surf === 'function' ? surf(pos.getX(i), pos.getY(i), pos.getZ(i)) : surf;
    if (s !== last) { c.set(s.color); last = s; }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    sf[i * 2] = s.roughness; sf[i * 2 + 1] = s.metalness;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSurf', new THREE.BufferAttribute(sf, 2));
  return g;
}

/**
 * One lit material for many differently finished parts: the colour comes from the `color` attribute and
 * roughness/metalness from the `aSurf` attribute (see `tagSurface`), so struts, seats, rubber and metal
 * fittings merge into a single draw call while keeping their individual finishes.
 */
export function partsMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 1.0, vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aSurf;\nvarying vec2 vSurf;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurf = aSurf;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSurf;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * vSurf.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * vSurf.y;');
  };
  mat.customProgramCacheKey = () => 'plane-parts-v1';
  return mat;
}

/** Collects geometries (with baked placements) that share one material and merges them into a single geometry. */
export class Batch {
  private readonly parts: THREE.BufferGeometry[] = [];
  constructor(private readonly defaultSurf?: Surf) {}

  add(geo: THREE.BufferGeometry, m?: THREE.Matrix4, surf: Surf | ((x: number, y: number, z: number) => Surf) | undefined = this.defaultSurf): this {
    const g = baked(geo, m);
    if (surf) tagSurface(g, surf);
    this.parts.push(g);
    return this;
  }

  get size(): number { return this.parts.length; }

  build(): THREE.BufferGeometry {
    if (this.parts.length === 1) return this.parts[0];
    const merged = mergeGeometries(this.parts, false);
    if (!merged) throw new Error('Batch: parts have incompatible attributes');
    return merged;
  }
}
