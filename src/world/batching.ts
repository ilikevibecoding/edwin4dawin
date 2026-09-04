import * as THREE from 'three';
import { balanceGroundIbl } from './terrain';

/**
 * Helpers for drawing many small static objects of different materials in one draw call while keeping
 * their shading identical: a MeshStandardMaterial that reads roughness and metalness from an
 * `aMatParams` attribute (per vertex or per instance) and its colour from vertex / instance colours,
 * plus a geometry accumulator that bakes meshes into one vertex-coloured triangle soup.
 */
export function createBatchedPbrMaterial(cacheKey: string, vertexColors: boolean, emissive?: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1, vertexColors, emissive: emissive ?? 0x000000 });
  // with an emissive colour, the per-vertex `aEmissive` mask selects the glowing vertices
  const em = emissive !== undefined;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec2 aMatParams;\nvarying vec2 vMatParams;${em ? '\nattribute float aEmissive;\nvarying float vEmissive;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvMatParams = aMatParams;${em ? '\nvEmissive = aEmissive;' : ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vMatParams;${em ? '\nvarying float vEmissive;' : ''}`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMatParams.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMatParams.y;');
    if (em) shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= vEmissive;');
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => cacheKey;
  return mat;
}

/** One shape of a composite unit geometry with the material it takes colour and parameters from. */
export interface UnitPart { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; emissive?: boolean }

/** Merges shapes of different materials into one non-indexed unit geometry that carries `color`,
 *  `aMatParams` and `aEmissive` per vertex, so instances of it draw with createBatchedPbrMaterial. */
export function mergeUnitParts(parts: UnitPart[]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], col: number[] = [], par: number[] = [], em: number[] = [];
  for (const part of parts) {
    const g = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const { color: c, roughness, metalness } = part.material;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
      par.push(roughness, metalness);
      em.push(part.emissive ? 1 : 0);
    }
    if (g !== part.geometry) g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute('aMatParams', new THREE.Float32BufferAttribute(par, 2));
  out.setAttribute('aEmissive', new THREE.Float32BufferAttribute(em, 1));
  out.computeBoundingSphere();
  return out;
}

/** Per-vertex attributes for a unit geometry whose colour and parameters come per instance: white
 *  vertex colour (the instance colour is multiplied in) and no emissive. */
export function addNeutralVertexAttributes(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  g.setAttribute('aEmissive', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  return g;
}

/** Accumulates world-space triangles with per-vertex colour and PBR parameters. Double-sided source
 *  materials are baked as two opposed single-sided copies, which shades exactly like DoubleSide. */
export class PbrSoup {
  private readonly pos: number[] = [];
  private readonly nrm: number[] = [];
  private readonly col: number[] = [];
  private readonly par: number[] = [];
  readonly box = new THREE.Box3();
  private readonly v = new THREE.Vector3();

  get vertexCount(): number { return this.pos.length / 3; }

  add(geometry: THREE.BufferGeometry, matrixWorld: THREE.Matrix4, mat: THREE.MeshStandardMaterial, color?: THREE.Color): void {
    const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(matrixWorld);
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const c = color ?? mat.color, rough = mat.roughness, metal = mat.metalness;
    const put = (i: number, flip: boolean) => {
      this.v.set(p.getX(i), p.getY(i), p.getZ(i));
      this.pos.push(this.v.x, this.v.y, this.v.z);
      this.box.expandByPoint(this.v);
      const s = flip ? -1 : 1;
      this.nrm.push(s * n.getX(i), s * n.getY(i), s * n.getZ(i));
      this.col.push(c.r, c.g, c.b);
      this.par.push(rough, metal);
    };
    for (let i = 0; i < p.count; i++) put(i, false);
    if (mat.side === THREE.DoubleSide) {
      for (let t = 0; t < p.count; t += 3) { put(t, true); put(t + 2, true); put(t + 1, true); }
    }
    g.dispose();
  }

  build(): THREE.BufferGeometry {
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    out.setAttribute('aMatParams', new THREE.Float32BufferAttribute(this.par, 2));
    out.boundingBox = this.box.clone();
    out.boundingSphere = this.box.getBoundingSphere(new THREE.Sphere());
    return out;
  }
}

/** Integer key of the spatial cell containing (x, z) for a `cell`-metre grid over the 20 km map. */
export function cellKey(x: number, z: number, cell: number): number {
  const ix = Math.floor((x + 10000) / cell), iz = Math.floor((z + 10000) / cell);
  return iz * 4096 + ix;
}

export function cellBox(key: number, cell: number, margin: number, yMin: number, yMax: number, out: THREE.Box3): THREE.Box3 {
  const ix = key % 4096, iz = Math.floor(key / 4096);
  out.min.set(ix * cell - 10000 - margin, yMin, iz * cell - 10000 - margin);
  out.max.set((ix + 1) * cell - 10000 + margin, yMax, (iz + 1) * cell - 10000 + margin);
  return out;
}
