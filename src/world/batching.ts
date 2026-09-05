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

// ------------------------------------------------------------------ instance batches

/** Per-tile instance data an InstanceBatch copies from: matrices (16 floats each), optional colours (3)
 *  and the extra instanced attributes in the order the batch was given them. */
export interface BatchSource {
  matrices: Float32Array; colors: Float32Array | null; extras: Float32Array[];
  /** when set, the batch copies the instances at these indices instead of the first `count` ones */
  indices?: Uint32Array;
}
export interface BatchAttribute { name: string; itemSize: number }
interface BatchRange { start: number; count: number }

/** The instances of one grid cell of a tile: a view into the tile's data with the cell's culling box. */
export interface CellSource extends BatchSource { indices: Uint32Array; box: THREE.Box3; count: number }

/** Regroup the `n` instances of `src` by `cell`-metre grid cell of their translation. `bound` grows a
 *  box by instance `i` (position and extent). The cells share the tile's arrays, each with an index
 *  list, so a tile drawn cell by cell submits only the cells in view without copying its data. */
export function splitCells(src: BatchSource, n: number, cell: number, bound: (i: number, box: THREE.Box3) => void): CellSource[] {
  const cells = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const key = cellKey(src.matrices[i * 16 + 12], src.matrices[i * 16 + 14], cell);
    let list = cells.get(key);
    if (!list) { list = []; cells.set(key, list); }
    list.push(i);
  }
  const order = new Uint32Array(n);
  const out: CellSource[] = [];
  let w = 0;
  for (const list of cells.values()) {
    const start = w;
    const box = new THREE.Box3();
    for (const i of list) { order[w++] = i; bound(i, box); }
    out.push({ matrices: src.matrices, colors: src.colors, extras: src.extras, indices: order.subarray(start, w), box, count: list.length });
  }
  return out;
}

/** a batch is compacted when more than this fraction of it is holes */
const COMPACT_HOLES = 0.3;
/** collapsed instance (scale 0, far under the ground) written into freed slots: draws no fragments */
const HOLE_MATRIX = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5000, 0, 1]);

/**
 * The instances of many spatial tiles in one instanced draw. Every tile drawn this frame owns a
 * contiguous range of the batch holding copies of its first `count` instances, so the camera pass
 * draws all the tiles in view of one geometry in a single call instead of one per tile. This is only
 * for opaque (or alpha-tested), depth-written instances, whose draw order does not matter, so a tile's
 * range can sit anywhere: a tile that leaves the view frees its range (filled with collapsed
 * instances), a tile that enters takes the first free range that fits, and the batch is compacted once
 * the holes add up. Only the ranges touched this frame are uploaded, so a tile crossing the frustum
 * edge costs a few kilobytes, not a rebuild of everything in view.
 */
export class InstanceBatch<S extends BatchSource = BatchSource> {
  readonly mesh: THREE.InstancedMesh;
  private readonly matrices: Float32Array;
  private readonly colors: Float32Array | null;
  private readonly extras: { attr: THREE.InstancedBufferAttribute; array: Float32Array; size: number }[] = [];
  /** high-water mark: instances [0, used) are drawn */
  private used = 0;
  private holes = 0;
  private readonly free: BatchRange[] = [];
  private readonly ranges = new Map<S, BatchRange>();
  private dirtyMin = Infinity;
  private dirtyMax = 0;

  /** `unit`: the geometry every instance draws (its attributes and index are shared, not copied). */
  constructor(readonly capacity: number, unit: THREE.BufferGeometry, material: THREE.Material, extras: BatchAttribute[], withColor: boolean, depthMaterial: THREE.Material | null = null) {
    const geo = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(unit.attributes)) if (!(attr as THREE.InstancedBufferAttribute).isInstancedBufferAttribute) geo.setAttribute(name, attr as THREE.BufferAttribute);
    if (unit.index) geo.setIndex(unit.index);
    geo.boundingSphere = unit.boundingSphere;
    geo.boundingBox = unit.boundingBox;
    for (const e of extras) {
      const array = new Float32Array(capacity * e.itemSize);
      const attr = new THREE.InstancedBufferAttribute(array, e.itemSize);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(e.name, attr);
      this.extras.push({ attr, array, size: e.itemSize });
    }
    const mesh = new THREE.InstancedMesh(geo, material, capacity);
    this.matrices = mesh.instanceMatrix.array as Float32Array;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (withColor) {
      this.colors = new Float32Array(capacity * 3);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    } else this.colors = null;
    if (depthMaterial) mesh.customDepthMaterial = depthMaterial;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.count = 0;
    mesh.visible = false;
    this.mesh = mesh;
  }

  /** Give `tile` exactly `count` instances in the batch (0 removes it). False when it does not fit. */
  set(tile: S, count: number): boolean {
    const cur = this.ranges.get(tile);
    if (cur) {
      if (cur.count === count) return true;
      this.release(tile, cur);
    }
    if (count === 0) return true;
    const start = this.alloc(count);
    if (start < 0) return false;
    const idx = tile.indices;
    if (idx) {
      const withColor = this.colors !== null && tile.colors !== null;
      for (let k = 0; k < count; k++) {
        const i = idx[k], w = start + k;
        this.matrices.set(tile.matrices.subarray(i * 16, i * 16 + 16), w * 16);
        if (withColor) this.colors!.set(tile.colors!.subarray(i * 3, i * 3 + 3), w * 3);
        for (let j = 0; j < this.extras.length; j++) {
          const e = this.extras[j];
          e.array.set(tile.extras[j].subarray(i * e.size, (i + 1) * e.size), w * e.size);
        }
      }
    } else {
      this.matrices.set(tile.matrices.subarray(0, count * 16), start * 16);
      if (this.colors && tile.colors) this.colors.set(tile.colors.subarray(0, count * 3), start * 3);
      for (let i = 0; i < this.extras.length; i++) {
        const e = this.extras[i];
        e.array.set(tile.extras[i].subarray(0, count * e.size), start * e.size);
      }
    }
    this.ranges.set(tile, { start, count });
    this.touch(start, count);
    return true;
  }

  /** Upload the ranges written this frame and finish the draw setup. */
  commit(): void {
    if (this.holes > COMPACT_HOLES * this.used && this.used > 4096) this.compact();
    if (this.dirtyMin < this.dirtyMax) {
      const s = this.dirtyMin, n = Math.min(this.dirtyMax, this.used) - s;
      if (n > 0) {
        const m = this.mesh.instanceMatrix;
        m.clearUpdateRanges(); m.addUpdateRange(s * 16, n * 16); m.needsUpdate = true;
        const c = this.mesh.instanceColor;
        if (c) { c.clearUpdateRanges(); c.addUpdateRange(s * 3, n * 3); c.needsUpdate = true; }
        for (const e of this.extras) { e.attr.clearUpdateRanges(); e.attr.addUpdateRange(s * e.size, n * e.size); e.attr.needsUpdate = true; }
      }
      this.dirtyMin = Infinity; this.dirtyMax = 0;
    }
    this.mesh.count = this.used;
    this.mesh.visible = this.used > 0;
  }

  private touch(start: number, count: number): void {
    if (start < this.dirtyMin) this.dirtyMin = start;
    if (start + count > this.dirtyMax) this.dirtyMax = start + count;
  }

  private release(tile: S, r: BatchRange): void {
    this.ranges.delete(tile);
    for (let i = 0; i < r.count; i++) this.matrices.set(HOLE_MATRIX, (r.start + i) * 16);
    this.touch(r.start, r.count);
    // merge into the free list (sorted by start)
    const free = this.free;
    let k = 0;
    while (k < free.length && free[k].start < r.start) k++;
    const prev = k > 0 ? free[k - 1] : null, next = k < free.length ? free[k] : null;
    if (prev && prev.start + prev.count === r.start) {
      prev.count += r.count;
      if (next && prev.start + prev.count === next.start) { prev.count += next.count; free.splice(k, 1); }
    } else if (next && r.start + r.count === next.start) {
      next.start = r.start; next.count += r.count;
    } else free.splice(k, 0, { start: r.start, count: r.count });
    this.holes += r.count;
    // a hole at the end just lowers the high-water mark
    const last = free[free.length - 1];
    if (last && last.start + last.count === this.used) { this.used = last.start; this.holes -= last.count; free.pop(); }
  }

  private alloc(count: number): number {
    const free = this.free;
    for (let i = 0; i < free.length; i++) {
      const f = free[i];
      if (f.count < count) continue;
      const start = f.start;
      f.start += count; f.count -= count;
      if (f.count === 0) free.splice(i, 1);
      this.holes -= count;
      return start;
    }
    if (this.used + count > this.capacity) return -1;
    const start = this.used;
    this.used += count;
    return start;
  }

  /** Move every range down over the holes (in start order, so ranges never overtake each other). */
  private compact(): void {
    const list = [...this.ranges.values()].sort((a, b) => a.start - b.start);
    let w = 0;
    for (const r of list) {
      if (r.start !== w) {
        this.matrices.copyWithin(w * 16, r.start * 16, (r.start + r.count) * 16);
        this.colors?.copyWithin(w * 3, r.start * 3, (r.start + r.count) * 3);
        for (const e of this.extras) e.array.copyWithin(w * e.size, r.start * e.size, (r.start + r.count) * e.size);
        r.start = w;
      }
      w += r.count;
    }
    this.touch(0, w);
    this.used = w;
    this.holes = 0;
    this.free.length = 0;
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
