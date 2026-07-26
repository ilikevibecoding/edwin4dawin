import * as THREE from 'three';
import { Groups, hitMeta, type HitMeta } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import { aabbOverlap, invDir, rayAabb, rayTriangle } from './Geometry';

/**
 * Static level collision.
 *
 * Every registered collider is flattened once into a single world-space
 * triangle soup and indexed by a binned-SAH BVH. Baking to world space removes
 * the per-mesh matrix inverse from every query, and a single tree means a
 * bullet trace is one traversal rather than one per mesh. Queries are written
 * against flat typed arrays and never allocate, which matters because raycast
 * is called thousands of times per frame.
 *
 * Triangles carry a chunk id; the chunk holds the metadata resolved from
 * `hitMeta` at bake time, walking up the parent chain so a leaf mesh inherits
 * its group, surface and damage scaling from whichever ancestor declared it.
 */

/** Hard ceiling on baked triangles, so a runaway level cannot exhaust memory. */
const MAX_TRIANGLES = 600_000;
const LEAF_SIZE = 4;
const SAH_BINS = 12;
const MAX_DEPTH = 48;

/**
 * Groups that must never be baked into the static soup even when they sit under
 * a registered root: characters and debris move, so they belong to the dynamic
 * set or the rigid body solver instead.
 */
const NEVER_STATIC = Groups.PLAYER | Groups.ENEMY | Groups.DEBRIS;

export interface StaticChunk {
  object: THREE.Object3D;
  root: THREE.Object3D;
  surface: SurfaceKind;
  group: number;
  damageScale: number;
  entityId: number;
  penetration: number;
  breakable: boolean;
  /** False for glass, water and triggers, which never break line of sight. */
  blocksSight: boolean;
}

/** A packed set of triangles pulled out of the BVH for local narrow-phase work. */
export class TriBuffer {
  verts: Float32Array;
  normals: Float32Array;
  bounds: Float32Array;
  chunk: Uint32Array;
  count = 0;
  /** Set when the query exceeded capacity and results were dropped. */
  overflow = false;

  constructor(private capacity = 512) {
    this.verts = new Float32Array(capacity * 9);
    this.normals = new Float32Array(capacity * 3);
    this.bounds = new Float32Array(capacity * 6);
    this.chunk = new Uint32Array(capacity);
  }

  clear(): void {
    this.count = 0;
    this.overflow = false;
  }

  /** Grows to hold at least `n` triangles. Returns false at the hard cap. */
  reserve(n: number): boolean {
    if (n <= this.capacity) return true;
    if (n > 32_768) return false;
    let cap = this.capacity;
    while (cap < n) cap *= 2;
    const verts = new Float32Array(cap * 9);
    verts.set(this.verts);
    const normals = new Float32Array(cap * 3);
    normals.set(this.normals);
    const bounds = new Float32Array(cap * 6);
    bounds.set(this.bounds);
    const chunk = new Uint32Array(cap);
    chunk.set(this.chunk);
    this.verts = verts;
    this.normals = normals;
    this.bounds = bounds;
    this.chunk = chunk;
    this.capacity = cap;
    return true;
  }
}

/**
 * Query stamp meaning "nothing is ignored". `chunkStamp` is zero-initialised,
 * so 0 would match every chunk and silently hide the whole level; `beginQuery`
 * only ever hands out values above 1.
 */
export const NO_IGNORE = -1;

/** Maps a caller's stamp onto one that cannot collide with a cleared chunk. */
function ignoreStamp(stamp: number): number {
  return stamp > 1 ? stamp : NO_IGNORE;
}

/** Reusable triangle hit record. */
export class TriHit {
  distance = 0;
  px = 0;
  py = 0;
  pz = 0;
  nx = 0;
  ny = 0;
  nz = 0;
  tri = -1;
  chunk = 0;
}

const _stack = new Int32Array(256);
const _stackT = new Float64Array(256);
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _box = new THREE.Box3();

export class StaticWorld {
  private roots: THREE.Object3D[] = [];
  private chunks: StaticChunk[] = [];
  private chunkGroup = new Uint32Array(0);
  private chunkStamp = new Int32Array(0);
  private chunkSight = new Uint8Array(0);
  /** Six floats of world AABB per chunk, accumulated during the bake. */
  private chunkBounds = new Float32Array(0);
  private chunkByObject = new Map<THREE.Object3D, number>();

  private verts = new Float32Array(0);
  private normals = new Float32Array(0);
  private triBounds = new Float32Array(0);
  private triChunk = new Uint32Array(0);
  private triOrder = new Uint32Array(0);
  private triCount = 0;

  private nodeBounds = new Float32Array(0);
  private nodeMeta = new Int32Array(0);
  private nodeCount = 0;

  private dirty = false;
  private queryStamp = 1;

  /** Bumped on every rebuild so dependent caches can invalidate themselves. */
  version = 0;
  /** Wall-clock cost of the last bake, surfaced in the debug overlay. */
  lastBuildMs = 0;

  readonly bounds = new THREE.Box3();

  get triangleCount(): number {
    return this.triCount;
  }

  get colliderCount(): number {
    return this.chunks.length;
  }

  get needsRebuild(): boolean {
    return this.dirty;
  }

  add(object: THREE.Object3D): void {
    if (this.roots.indexOf(object) !== -1) return;
    this.roots.push(object);
    this.dirty = true;
  }

  remove(object: THREE.Object3D): void {
    const i = this.roots.indexOf(object);
    if (i === -1) return;
    this.roots.splice(i, 1);
    this.dirty = true;
  }

  clear(): void {
    this.roots.length = 0;
    this.dirty = true;
  }

  /** Marks the soup stale, e.g. after a destructible chunk changes shape. */
  invalidate(): void {
    this.dirty = true;
  }

  chunkAt(index: number): StaticChunk | undefined {
    return this.chunks[index];
  }

  /** Rebuilds the soup and tree when stale. Cheap to call every frame. */
  ensureBuilt(): void {
    if (this.dirty) this.build();
  }

  /* --------------------------- baking --------------------------------- */

  private build(): void {
    const t0 =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.dirty = false;
    this.chunks.length = 0;
    this.chunkByObject.clear();
    this.triCount = 0;

    // Pass one: enumerate colliders and count triangles so the typed arrays
    // can be sized exactly once.
    let total = 0;
    const meshes: THREE.Mesh[] = [];
    const meshChunks: StaticChunk[] = [];
    for (const root of this.roots) {
      root.updateWorldMatrix(true, true);
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        if (obj.userData.physicsIgnore === true) return;
        if (obj.layers.mask === 1 << 1) return; // viewmodel-only geometry
        const chunk = makeChunk(mesh, root);
        if (chunk.group & NEVER_STATIC) return;
        const pos = mesh.geometry.getAttribute('position');
        if (!pos) return;
        const index = mesh.geometry.getIndex();
        let tris = index ? index.count / 3 : pos.count / 3;
        const instanced = mesh as unknown as THREE.InstancedMesh;
        if (instanced.isInstancedMesh) tris *= instanced.count;
        tris = Math.floor(tris);
        if (tris <= 0) return;
        if (total + tris > MAX_TRIANGLES) return;
        total += tris;
        meshes.push(mesh);
        meshChunks.push(chunk);
      });
    }

    if (this.verts.length < total * 9) {
      this.verts = new Float32Array(total * 9);
      this.normals = new Float32Array(total * 3);
      this.triBounds = new Float32Array(total * 6);
      this.triChunk = new Uint32Array(total);
      this.triOrder = new Uint32Array(total);
    }

    if (this.chunkBounds.length < meshes.length * 6) {
      this.chunkBounds = new Float32Array(meshes.length * 6);
    }

    for (let i = 0; i < meshes.length; i++) {
      const chunkId = this.chunks.length;
      const mesh = meshes[i];
      this.chunks.push(meshChunks[i]);
      this.chunkByObject.set(mesh, chunkId);
      const bo = chunkId * 6;
      this.chunkBounds[bo] = Infinity;
      this.chunkBounds[bo + 1] = Infinity;
      this.chunkBounds[bo + 2] = Infinity;
      this.chunkBounds[bo + 3] = -Infinity;
      this.chunkBounds[bo + 4] = -Infinity;
      this.chunkBounds[bo + 5] = -Infinity;
      this.bakeMesh(mesh, chunkId);
    }

    this.chunkGroup = new Uint32Array(this.chunks.length);
    this.chunkStamp = new Int32Array(this.chunks.length);
    this.chunkSight = new Uint8Array(this.chunks.length);
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunkGroup[i] = this.chunks[i].group;
      this.chunkSight[i] = this.chunks[i].blocksSight ? 1 : 0;
    }

    this.buildTree();
    this.version++;
    this.lastBuildMs =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  }

  private bakeMesh(mesh: THREE.Mesh, chunkId: number): void {
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const index = geo.getIndex();
    const instanced = mesh as unknown as THREE.InstancedMesh;
    const instanceCount = instanced.isInstancedMesh ? instanced.count : 1;
    const triangles = index ? index.count / 3 : pos.count / 3;

    for (let inst = 0; inst < instanceCount; inst++) {
      if (instanced.isInstancedMesh) {
        instanced.getMatrixAt(inst, _m);
        _m.premultiply(mesh.matrixWorld);
      } else {
        _m.copy(mesh.matrixWorld);
      }
      for (let t = 0; t < triangles; t++) {
        if (this.triCount >= this.triChunk.length) return;
        const o = this.triCount * 9;
        for (let k = 0; k < 3; k++) {
          const vi = index ? index.getX(t * 3 + k) : t * 3 + k;
          _v.fromBufferAttribute(pos, vi).applyMatrix4(_m);
          this.verts[o + k * 3] = _v.x;
          this.verts[o + k * 3 + 1] = _v.y;
          this.verts[o + k * 3 + 2] = _v.z;
        }
        this.finishTriangle(chunkId);
      }
    }
  }

  private finishTriangle(chunkId: number): void {
    const i = this.triCount;
    const o = i * 9;
    const v = this.verts;
    const ax = v[o];
    const ay = v[o + 1];
    const az = v[o + 2];
    const bx = v[o + 3];
    const by = v[o + 4];
    const bz = v[o + 5];
    const cx = v[o + 6];
    const cy = v[o + 7];
    const cz = v[o + 8];

    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-12) {
      nx /= len;
      ny /= len;
      nz /= len;
    } else {
      // Degenerate sliver; keep it out of the way of contact resolution.
      nx = 0;
      ny = 1;
      nz = 0;
    }
    const no = i * 3;
    this.normals[no] = nx;
    this.normals[no + 1] = ny;
    this.normals[no + 2] = nz;

    const bo = i * 6;
    const lox = Math.min(ax, bx, cx);
    const loy = Math.min(ay, by, cy);
    const loz = Math.min(az, bz, cz);
    const hix = Math.max(ax, bx, cx);
    const hiy = Math.max(ay, by, cy);
    const hiz = Math.max(az, bz, cz);
    this.triBounds[bo] = lox;
    this.triBounds[bo + 1] = loy;
    this.triBounds[bo + 2] = loz;
    this.triBounds[bo + 3] = hix;
    this.triBounds[bo + 4] = hiy;
    this.triBounds[bo + 5] = hiz;

    const co = chunkId * 6;
    const cb = this.chunkBounds;
    if (lox < cb[co]) cb[co] = lox;
    if (loy < cb[co + 1]) cb[co + 1] = loy;
    if (loz < cb[co + 2]) cb[co + 2] = loz;
    if (hix > cb[co + 3]) cb[co + 3] = hix;
    if (hiy > cb[co + 4]) cb[co + 4] = hiy;
    if (hiz > cb[co + 5]) cb[co + 5] = hiz;

    this.triChunk[i] = chunkId;
    this.triCount++;
  }

  /* ---------------------------- tree ---------------------------------- */

  private buildTree(): void {
    const n = this.triCount;
    this.nodeCount = 0;
    this.bounds.makeEmpty();
    if (n === 0) return;

    const maxNodes = Math.max(64, 2 * Math.ceil(n / LEAF_SIZE) + 8) * 2;
    if (this.nodeMeta.length < maxNodes * 2) {
      this.nodeBounds = new Float32Array(maxNodes * 6);
      this.nodeMeta = new Int32Array(maxNodes * 2);
    }

    const order = this.triOrder;
    for (let i = 0; i < n; i++) order[i] = i;

    // Explicit work stack: [nodeIndex, start, end, depth]
    const work = new Int32Array(MAX_DEPTH * 4 * 2 + 8);
    let wp = 0;
    const root = this.allocNode();
    this.computeBounds(root, 0, n);
    work[wp++] = root;
    work[wp++] = 0;
    work[wp++] = n;
    work[wp++] = 0;

    const binCount = new Int32Array(SAH_BINS);
    const binBounds = new Float32Array(SAH_BINS * 6);
    const leftArea = new Float64Array(SAH_BINS);
    const leftCount = new Int32Array(SAH_BINS);

    while (wp > 0) {
      const depth = work[--wp];
      const end = work[--wp];
      const start = work[--wp];
      const node = work[--wp];
      const count = end - start;

      // The work array is sized for the worst-case depth of a balanced split;
      // bail to a leaf rather than risk running past it.
      if (count <= LEAF_SIZE || depth >= MAX_DEPTH || wp + 8 > work.length) {
        this.nodeMeta[node * 2] = start;
        this.nodeMeta[node * 2 + 1] = count;
        continue;
      }

      const split = this.findSplit(node, start, end, binCount, binBounds, leftArea, leftCount);
      if (split < 0) {
        this.nodeMeta[node * 2] = start;
        this.nodeMeta[node * 2 + 1] = count;
        continue;
      }

      const mid = split;
      const left = this.allocNode();
      const right = this.allocNode();
      this.nodeMeta[node * 2] = left;
      this.nodeMeta[node * 2 + 1] = 0;
      this.computeBounds(left, start, mid);
      this.computeBounds(right, mid, end);

      work[wp++] = left;
      work[wp++] = start;
      work[wp++] = mid;
      work[wp++] = depth + 1;
      work[wp++] = right;
      work[wp++] = mid;
      work[wp++] = end;
      work[wp++] = depth + 1;
    }

    this.bounds.min.set(this.nodeBounds[0], this.nodeBounds[1], this.nodeBounds[2]);
    this.bounds.max.set(this.nodeBounds[3], this.nodeBounds[4], this.nodeBounds[5]);
  }

  private allocNode(): number {
    const node = this.nodeCount++;
    if ((node + 1) * 6 > this.nodeBounds.length) {
      const bounds = new Float32Array(this.nodeBounds.length * 2 + 64);
      bounds.set(this.nodeBounds);
      this.nodeBounds = bounds;
      const meta = new Int32Array(this.nodeMeta.length * 2 + 64);
      meta.set(this.nodeMeta);
      this.nodeMeta = meta;
    }
    return node;
  }

  private computeBounds(node: number, start: number, end: number): void {
    let minx = Infinity;
    let miny = Infinity;
    let minz = Infinity;
    let maxx = -Infinity;
    let maxy = -Infinity;
    let maxz = -Infinity;
    const tb = this.triBounds;
    const order = this.triOrder;
    for (let i = start; i < end; i++) {
      const o = order[i] * 6;
      if (tb[o] < minx) minx = tb[o];
      if (tb[o + 1] < miny) miny = tb[o + 1];
      if (tb[o + 2] < minz) minz = tb[o + 2];
      if (tb[o + 3] > maxx) maxx = tb[o + 3];
      if (tb[o + 4] > maxy) maxy = tb[o + 4];
      if (tb[o + 5] > maxz) maxz = tb[o + 5];
    }
    const b = node * 6;
    this.nodeBounds[b] = minx;
    this.nodeBounds[b + 1] = miny;
    this.nodeBounds[b + 2] = minz;
    this.nodeBounds[b + 3] = maxx;
    this.nodeBounds[b + 4] = maxy;
    this.nodeBounds[b + 5] = maxz;
  }

  /**
   * Binned surface-area-heuristic split. Partitions `triOrder` in place and
   * returns the pivot index, or -1 when a leaf is cheaper.
   */
  private findSplit(
    node: number,
    start: number,
    end: number,
    binCount: Int32Array,
    binBounds: Float32Array,
    leftArea: Float64Array,
    leftCount: Int32Array,
  ): number {
    const tb = this.triBounds;
    const order = this.triOrder;
    const b = node * 6;
    const count = end - start;

    let bestAxis = -1;
    let bestBin = -1;
    let bestCost = count * 1.0; // cost of making this a leaf

    for (let axis = 0; axis < 3; axis++) {
      const lo = this.nodeBounds[b + axis];
      const hi = this.nodeBounds[b + axis + 3];
      const extent = hi - lo;
      if (extent < 1e-7) continue;
      const scale = SAH_BINS / extent;

      binCount.fill(0);
      for (let i = 0; i < SAH_BINS; i++) {
        binBounds[i * 6] = Infinity;
        binBounds[i * 6 + 1] = Infinity;
        binBounds[i * 6 + 2] = Infinity;
        binBounds[i * 6 + 3] = -Infinity;
        binBounds[i * 6 + 4] = -Infinity;
        binBounds[i * 6 + 5] = -Infinity;
      }

      for (let i = start; i < end; i++) {
        const o = order[i] * 6;
        const c = (tb[o + axis] + tb[o + axis + 3]) * 0.5;
        let bin = ((c - lo) * scale) | 0;
        if (bin < 0) bin = 0;
        else if (bin >= SAH_BINS) bin = SAH_BINS - 1;
        binCount[bin]++;
        const bb = bin * 6;
        for (let k = 0; k < 3; k++) {
          if (tb[o + k] < binBounds[bb + k]) binBounds[bb + k] = tb[o + k];
          if (tb[o + k + 3] > binBounds[bb + k + 3]) binBounds[bb + k + 3] = tb[o + k + 3];
        }
      }

      // Sweep left to right accumulating area * count.
      let minx = Infinity;
      let miny = Infinity;
      let minz = Infinity;
      let maxx = -Infinity;
      let maxy = -Infinity;
      let maxz = -Infinity;
      let acc = 0;
      for (let i = 0; i < SAH_BINS - 1; i++) {
        const bb = i * 6;
        if (binCount[i] > 0) {
          if (binBounds[bb] < minx) minx = binBounds[bb];
          if (binBounds[bb + 1] < miny) miny = binBounds[bb + 1];
          if (binBounds[bb + 2] < minz) minz = binBounds[bb + 2];
          if (binBounds[bb + 3] > maxx) maxx = binBounds[bb + 3];
          if (binBounds[bb + 4] > maxy) maxy = binBounds[bb + 4];
          if (binBounds[bb + 5] > maxz) maxz = binBounds[bb + 5];
          acc += binCount[i];
        }
        leftCount[i] = acc;
        leftArea[i] = acc > 0 ? halfArea(maxx - minx, maxy - miny, maxz - minz) : 0;
      }

      minx = Infinity;
      miny = Infinity;
      minz = Infinity;
      maxx = -Infinity;
      maxy = -Infinity;
      maxz = -Infinity;
      acc = 0;
      const parentArea = halfArea(
        this.nodeBounds[b + 3] - this.nodeBounds[b],
        this.nodeBounds[b + 4] - this.nodeBounds[b + 1],
        this.nodeBounds[b + 5] - this.nodeBounds[b + 2],
      );
      const invParent = parentArea > 1e-12 ? 1 / parentArea : 0;
      for (let i = SAH_BINS - 1; i > 0; i--) {
        const bb = i * 6;
        if (binCount[i] > 0) {
          if (binBounds[bb] < minx) minx = binBounds[bb];
          if (binBounds[bb + 1] < miny) miny = binBounds[bb + 1];
          if (binBounds[bb + 2] < minz) minz = binBounds[bb + 2];
          if (binBounds[bb + 3] > maxx) maxx = binBounds[bb + 3];
          if (binBounds[bb + 4] > maxy) maxy = binBounds[bb + 4];
          if (binBounds[bb + 5] > maxz) maxz = binBounds[bb + 5];
          acc += binCount[i];
        }
        const li = i - 1;
        if (leftCount[li] === 0 || acc === 0) continue;
        const rightArea = halfArea(maxx - minx, maxy - miny, maxz - minz);
        const cost =
          0.5 + (leftArea[li] * leftCount[li] + rightArea * acc) * invParent;
        if (cost < bestCost) {
          bestCost = cost;
          bestAxis = axis;
          bestBin = li;
        }
      }
    }

    if (bestAxis < 0) {
      // No split beat a leaf. Fall back to a median split when the node is
      // still large, so traversal depth stays bounded.
      if (count <= LEAF_SIZE * 4) return -1;
      const mid = (start + end) >> 1;
      return mid;
    }

    const lo = this.nodeBounds[b + bestAxis];
    const hi = this.nodeBounds[b + bestAxis + 3];
    const scale = SAH_BINS / (hi - lo);
    let i = start;
    let j = end - 1;
    while (i <= j) {
      const o = order[i] * 6;
      const c = (tb[o + bestAxis] + tb[o + bestAxis + 3]) * 0.5;
      let bin = ((c - lo) * scale) | 0;
      if (bin < 0) bin = 0;
      else if (bin >= SAH_BINS) bin = SAH_BINS - 1;
      if (bin <= bestBin) {
        i++;
      } else {
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
        j--;
      }
    }
    if (i === start || i === end) return (start + end) >> 1;
    return i;
  }

  /* --------------------------- queries -------------------------------- */

  /**
   * Stamps colliders belonging to `ignore` so the traversal can skip them.
   * Returns the stamp id to pass to the query.
   */
  beginQuery(ignore?: readonly THREE.Object3D[] | null): number {
    if (this.queryStamp > 0x3fffffff) {
      this.chunkStamp.fill(0);
      this.queryStamp = 1;
    }
    const stamp = ++this.queryStamp;
    if (ignore && ignore.length > 0 && this.chunkByObject.size > 0) {
      for (const obj of ignore) {
        if (!obj) continue;
        const direct = this.chunkByObject.get(obj);
        if (direct !== undefined) this.chunkStamp[direct] = stamp;
        if (obj.children.length > 0) {
          obj.traverse((child) => {
            const id = this.chunkByObject.get(child);
            if (id !== undefined) this.chunkStamp[id] = stamp;
          });
        }
      }
    }
    return stamp;
  }

  /** Nearest triangle hit along a unit-length ray. */
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    stamp: number,
    out: TriHit,
  ): boolean {
    if (this.triCount === 0 || this.nodeCount === 0) return false;
    const st = ignoreStamp(stamp);
    const invx = invDir(dx);
    const invy = invDir(dy);
    const invz = invDir(dz);
    const nb = this.nodeBounds;
    const nm = this.nodeMeta;
    const order = this.triOrder;
    const verts = this.verts;

    let best = maxDist;
    let bestTri = -1;
    let sp = 0;

    let t = rayAabb(ox, oy, oz, invx, invy, invz, nb[0], nb[1], nb[2], nb[3], nb[4], nb[5], best);
    if (t < 0) return false;
    _stack[sp] = 0;
    _stackT[sp] = t;
    sp++;

    while (sp > 0) {
      sp--;
      if (_stackT[sp] >= best) continue;
      const node = _stack[sp];
      const count = nm[node * 2 + 1];
      if (count > 0) {
        const start = nm[node * 2];
        for (let i = start, e = start + count; i < e; i++) {
          const tri = order[i];
          const chunk = this.triChunk[tri];
          if ((this.chunkGroup[chunk] & mask) === 0) continue;
          if (this.chunkStamp[chunk] === st) continue;
          const hit = rayTriangle(ox, oy, oz, dx, dy, dz, verts, tri * 9);
          if (hit >= 0 && hit < best) {
            best = hit;
            bestTri = tri;
          }
        }
      } else {
        const c0 = nm[node * 2];
        const c1 = c0 + 1;
        const b0 = c0 * 6;
        const b1 = c1 * 6;
        const t0 = rayAabb(
          ox, oy, oz, invx, invy, invz,
          nb[b0], nb[b0 + 1], nb[b0 + 2], nb[b0 + 3], nb[b0 + 4], nb[b0 + 5],
          best,
        );
        const t1 = rayAabb(
          ox, oy, oz, invx, invy, invz,
          nb[b1], nb[b1 + 1], nb[b1 + 2], nb[b1 + 3], nb[b1 + 4], nb[b1 + 5],
          best,
        );
        if (t0 >= 0 && t1 >= 0) {
          // Visit the nearer child first so `best` tightens sooner.
          if (t0 <= t1) {
            _stack[sp] = c1;
            _stackT[sp] = t1;
            sp++;
            _stack[sp] = c0;
            _stackT[sp] = t0;
            sp++;
          } else {
            _stack[sp] = c0;
            _stackT[sp] = t0;
            sp++;
            _stack[sp] = c1;
            _stackT[sp] = t1;
            sp++;
          }
        } else if (t0 >= 0) {
          _stack[sp] = c0;
          _stackT[sp] = t0;
          sp++;
        } else if (t1 >= 0) {
          _stack[sp] = c1;
          _stackT[sp] = t1;
          sp++;
        }
        if (sp > _stack.length - 2) sp = _stack.length - 2;
      }
    }

    if (bestTri < 0) return false;
    this.fillHit(bestTri, best, ox, oy, oz, dx, dy, dz, out);
    return true;
  }

  /** True as soon as any triangle blocks the segment. */
  occluded(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    stamp: number,
  ): boolean {
    if (this.triCount === 0 || this.nodeCount === 0) return false;
    const st = ignoreStamp(stamp);
    const invx = invDir(dx);
    const invy = invDir(dy);
    const invz = invDir(dz);
    const nb = this.nodeBounds;
    const nm = this.nodeMeta;
    const order = this.triOrder;
    let sp = 0;

    let t = rayAabb(
      ox, oy, oz, invx, invy, invz,
      nb[0], nb[1], nb[2], nb[3], nb[4], nb[5],
      maxDist,
    );
    if (t < 0) return false;
    _stack[sp++] = 0;

    while (sp > 0) {
      const node = _stack[--sp];
      const count = nm[node * 2 + 1];
      if (count > 0) {
        const start = nm[node * 2];
        for (let i = start, e = start + count; i < e; i++) {
          const tri = order[i];
          const chunk = this.triChunk[tri];
          if (this.chunkSight[chunk] === 0) continue;
          if ((this.chunkGroup[chunk] & mask) === 0) continue;
          if (this.chunkStamp[chunk] === st) continue;
          const hit = rayTriangle(ox, oy, oz, dx, dy, dz, this.verts, tri * 9);
          if (hit >= 0 && hit < maxDist) return true;
        }
      } else {
        const c0 = nm[node * 2];
        const c1 = c0 + 1;
        const b0 = c0 * 6;
        const b1 = c1 * 6;
        if (
          rayAabb(
            ox, oy, oz, invx, invy, invz,
            nb[b0], nb[b0 + 1], nb[b0 + 2], nb[b0 + 3], nb[b0 + 4], nb[b0 + 5],
            maxDist,
          ) >= 0
        ) {
          _stack[sp++] = c0;
        }
        if (
          rayAabb(
            ox, oy, oz, invx, invy, invz,
            nb[b1], nb[b1 + 1], nb[b1 + 2], nb[b1 + 3], nb[b1 + 4], nb[b1 + 5],
            maxDist,
          ) >= 0
        ) {
          _stack[sp++] = c1;
        }
        if (sp > _stack.length - 2) sp = _stack.length - 2;
      }
    }
    return false;
  }

  /**
   * All triangle hits along a ray, unsorted, written into `hits`.
   * Returns the number of records used.
   */
  raycastAll(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    stamp: number,
    hits: TriHit[],
  ): number {
    if (this.triCount === 0 || this.nodeCount === 0) return 0;
    const st = ignoreStamp(stamp);
    const invx = invDir(dx);
    const invy = invDir(dy);
    const invz = invDir(dz);
    const nb = this.nodeBounds;
    const nm = this.nodeMeta;
    const order = this.triOrder;
    let found = 0;
    let sp = 0;

    if (
      rayAabb(
        ox, oy, oz, invx, invy, invz,
        nb[0], nb[1], nb[2], nb[3], nb[4], nb[5],
        maxDist,
      ) < 0
    ) {
      return 0;
    }
    _stack[sp++] = 0;

    while (sp > 0) {
      const node = _stack[--sp];
      const count = nm[node * 2 + 1];
      if (count > 0) {
        const start = nm[node * 2];
        for (let i = start, e = start + count; i < e; i++) {
          const tri = order[i];
          const chunk = this.triChunk[tri];
          if ((this.chunkGroup[chunk] & mask) === 0) continue;
          if (this.chunkStamp[chunk] === st) continue;
          const hit = rayTriangle(ox, oy, oz, dx, dy, dz, this.verts, tri * 9);
          if (hit >= 0 && hit < maxDist) {
            if (found >= hits.length) continue;
            this.fillHit(tri, hit, ox, oy, oz, dx, dy, dz, hits[found]);
            found++;
          }
        }
      } else {
        const c0 = nm[node * 2];
        const c1 = c0 + 1;
        const b0 = c0 * 6;
        const b1 = c1 * 6;
        if (
          rayAabb(
            ox, oy, oz, invx, invy, invz,
            nb[b0], nb[b0 + 1], nb[b0 + 2], nb[b0 + 3], nb[b0 + 4], nb[b0 + 5],
            maxDist,
          ) >= 0
        ) {
          _stack[sp++] = c0;
        }
        if (
          rayAabb(
            ox, oy, oz, invx, invy, invz,
            nb[b1], nb[b1 + 1], nb[b1 + 2], nb[b1 + 3], nb[b1 + 4], nb[b1 + 5],
            maxDist,
          ) >= 0
        ) {
          _stack[sp++] = c1;
        }
        if (sp > _stack.length - 2) sp = _stack.length - 2;
      }
    }
    return found;
  }

  private fillHit(
    tri: number,
    distance: number,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    out: TriHit,
  ): void {
    out.distance = distance;
    out.px = ox + dx * distance;
    out.py = oy + dy * distance;
    out.pz = oz + dz * distance;
    const no = tri * 3;
    let nx = this.normals[no];
    let ny = this.normals[no + 1];
    let nz = this.normals[no + 2];
    // Always report the face the ray arrived at, so impact FX and decals sit
    // on the visible side regardless of triangle winding.
    if (nx * dx + ny * dy + nz * dz > 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    out.nx = nx;
    out.ny = ny;
    out.nz = nz;
    out.tri = tri;
    out.chunk = this.triChunk[tri];
  }

  /**
   * Copies every triangle overlapping `box` into `buffer`.
   * Returns the triangle count.
   */
  gather(
    minx: number,
    miny: number,
    minz: number,
    maxx: number,
    maxy: number,
    maxz: number,
    mask: number,
    stamp: number,
    buffer: TriBuffer,
  ): number {
    buffer.clear();
    if (this.triCount === 0 || this.nodeCount === 0) return 0;
    const st = ignoreStamp(stamp);
    const nb = this.nodeBounds;
    const nm = this.nodeMeta;
    const order = this.triOrder;
    const tb = this.triBounds;
    let sp = 0;

    if (
      !aabbOverlap(minx, miny, minz, maxx, maxy, maxz, nb[0], nb[1], nb[2], nb[3], nb[4], nb[5])
    ) {
      return 0;
    }
    _stack[sp++] = 0;

    while (sp > 0) {
      const node = _stack[--sp];
      const count = nm[node * 2 + 1];
      if (count > 0) {
        const start = nm[node * 2];
        for (let i = start, e = start + count; i < e; i++) {
          const tri = order[i];
          const chunk = this.triChunk[tri];
          if ((this.chunkGroup[chunk] & mask) === 0) continue;
          if (this.chunkStamp[chunk] === st) continue;
          const bo = tri * 6;
          if (
            !aabbOverlap(
              minx, miny, minz, maxx, maxy, maxz,
              tb[bo], tb[bo + 1], tb[bo + 2], tb[bo + 3], tb[bo + 4], tb[bo + 5],
            )
          ) {
            continue;
          }
          if (buffer.count >= buffer.verts.length / 9 && !buffer.reserve(buffer.count + 1)) {
            buffer.overflow = true;
            return buffer.count;
          }
          const dst = buffer.count;
          buffer.verts.set(this.verts.subarray(tri * 9, tri * 9 + 9), dst * 9);
          buffer.normals.set(this.normals.subarray(tri * 3, tri * 3 + 3), dst * 3);
          buffer.bounds.set(tb.subarray(bo, bo + 6), dst * 6);
          buffer.chunk[dst] = chunk;
          buffer.count++;
        }
      } else {
        const c0 = nm[node * 2];
        const c1 = c0 + 1;
        const b0 = c0 * 6;
        const b1 = c1 * 6;
        if (
          aabbOverlap(
            minx, miny, minz, maxx, maxy, maxz,
            nb[b0], nb[b0 + 1], nb[b0 + 2], nb[b0 + 3], nb[b0 + 4], nb[b0 + 5],
          )
        ) {
          _stack[sp++] = c0;
        }
        if (
          aabbOverlap(
            minx, miny, minz, maxx, maxy, maxz,
            nb[b1], nb[b1 + 1], nb[b1 + 2], nb[b1 + 3], nb[b1 + 4], nb[b1 + 5],
          )
        ) {
          _stack[sp++] = c1;
        }
        if (sp > _stack.length - 2) sp = _stack.length - 2;
      }
    }
    return buffer.count;
  }

  /**
   * Linear scan over every triangle, ignoring the tree. Only used by the test
   * harness to prove the BVH returns the same answer as brute force.
   */
  bruteRaycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    out: TriHit,
  ): boolean {
    let best = maxDist;
    let bestTri = -1;
    for (let tri = 0; tri < this.triCount; tri++) {
      if ((this.chunkGroup[this.triChunk[tri]] & mask) === 0) continue;
      const hit = rayTriangle(ox, oy, oz, dx, dy, dz, this.verts, tri * 9);
      if (hit >= 0 && hit < best) {
        best = hit;
        bestTri = tri;
      }
    }
    if (bestTri < 0) return false;
    this.fillHit(bestTri, best, ox, oy, oz, dx, dy, dz, out);
    return true;
  }

  /** Debug helper: world bounds of every collider, for wireframe drawing. */
  /**
   * Walks the baked chunk AABBs, which the debug view draws every frame. The
   * boxes come straight out of the bake, so this reuses one `Box3` and touches
   * one chunk per callback rather than rescanning the triangle soup.
   */
  forEachChunkBounds(fn: (box: THREE.Box3, chunk: StaticChunk) => void, limit = 512): void {
    const n = Math.min(this.chunks.length, limit);
    for (let i = 0; i < n; i++) {
      const bo = i * 6;
      if (this.chunkBounds[bo] > this.chunkBounds[bo + 3]) continue; // no triangles baked
      _box.min.set(this.chunkBounds[bo], this.chunkBounds[bo + 1], this.chunkBounds[bo + 2]);
      _box.max.set(this.chunkBounds[bo + 3], this.chunkBounds[bo + 4], this.chunkBounds[bo + 5]);
      fn(_box, this.chunks[i]);
    }
  }
}

function halfArea(dx: number, dy: number, dz: number): number {
  const x = dx > 0 ? dx : 0;
  const y = dy > 0 ? dy : 0;
  const z = dz > 0 ? dz : 0;
  return x * y + y * z + z * x;
}

function makeChunk(mesh: THREE.Object3D, root: THREE.Object3D): StaticChunk {
  const meta = resolveMeta(mesh);
  const group = meta.group ?? Groups.WORLD;
  return {
    object: mesh,
    root,
    surface: (meta.surface as SurfaceKind | undefined) ?? 'concrete',
    group,
    damageScale: meta.damageScale ?? 1,
    entityId: meta.entityId ?? -1,
    penetration: meta.penetration ?? defaultPenetration(group),
    breakable: meta.breakable ?? false,
    blocksSight: (group & (Groups.GLASS | Groups.WATER | Groups.TRIGGER)) === 0,
  };
}

/** Merges `hitMeta` from the object up through its ancestors. */
export function resolveMeta(obj: THREE.Object3D): HitMeta {
  const out: HitMeta = {};
  let node: THREE.Object3D | null = obj;
  let guard = 0;
  while (node && guard++ < 32) {
    const meta = hitMeta(node);
    if (out.surface === undefined && meta.surface !== undefined) out.surface = meta.surface;
    if (out.group === undefined && meta.group !== undefined) out.group = meta.group;
    if (out.damageScale === undefined && meta.damageScale !== undefined) {
      out.damageScale = meta.damageScale;
    }
    if (out.entityId === undefined && meta.entityId !== undefined) out.entityId = meta.entityId;
    if (out.penetration === undefined && meta.penetration !== undefined) {
      out.penetration = meta.penetration;
    }
    if (out.breakable === undefined && meta.breakable !== undefined) {
      out.breakable = meta.breakable;
    }
    node = node.parent;
  }
  return out;
}

function defaultPenetration(group: number): number {
  if (group & Groups.GLASS) return 0.01;
  if (group & Groups.DEBRIS) return 0.05;
  if (group & Groups.PROP) return 0.08;
  return 0.25;
}
