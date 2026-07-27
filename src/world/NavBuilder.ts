import * as THREE from 'three';
import type { NavGrid } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import { clamp } from '../core/MathUtils';
import type { ColliderRecord } from './Builder';
import type { NavSurfaceSpec } from './kit/Kit';

/**
 * Navigation rasteriser.
 *
 * The map is sampled on a half-metre grid. Each cell collects every walkable
 * surface registered above it — the terrain, floor slabs, roofs, stair ramps,
 * container tops, walkways — and groups them into *layers*: layer 0 is the
 * street or ground floor, layer 1 the first floor or a low roof, layer 2 what is
 * above that. A single-layer grid cannot describe a rooftop over a street, and
 * silently merging them is how AI ends up walking through the air.
 *
 * `NavGrid` in the contract exposes one pair of arrays, so layer 0 is what it
 * returns. The remaining layers live on this class and are described in
 * `layers`; `layerAt`/`heightAt`/`walkableAt` resolve a world position to the
 * right one, which is all an agent needs to path on a roof.
 */

export interface NavLayer {
  readonly index: number;
  /** 0 = blocked, otherwise the traversal cost multiplier. */
  readonly cost: Float32Array;
  /** Walking surface height per cell; meaningless where cost is 0. */
  readonly height: Float32Array;
}

export interface NavBuildOptions {
  originX: number;
  originZ: number;
  /** Cells along X and Z. */
  width: number;
  depth: number;
  cellSize: number;
  maxLayers?: number;
  /** Analytic terrain height, used by surfaces flagged `terrain`. */
  ground: (x: number, z: number) => number;
}

const PLAYER_RADIUS = GAMEPLAY.player.radius;
const HEADROOM = 1.9;
const STEP_UP = GAMEPLAY.player.stepHeight;
/** Vertical gap that makes two surfaces separate storeys rather than one floor. */
const LAYER_SEPARATION = 1.6;
/** Surfaces closer together than this are the same walking level. */
const LEVEL_MERGE = 0.42;
const BIN_SIZE = 4;

interface Bins {
  cols: number;
  rows: number;
  cells: number[][];
}

export class WorldNavGrid implements NavGrid {
  readonly cost: Float32Array;
  readonly height: Float32Array;
  readonly layers: NavLayer[];

  constructor(
    readonly originX: number,
    readonly originZ: number,
    readonly cellSize: number,
    readonly width: number,
    readonly depth: number,
    layers: NavLayer[],
  ) {
    this.layers = layers;
    this.cost = layers[0].cost;
    this.height = layers[0].height;
  }

  worldToCell(x: number, z: number, out: { x: number; z: number }): { x: number; z: number } {
    out.x = Math.floor((x - this.originX) / this.cellSize);
    out.z = Math.floor((z - this.originZ) / this.cellSize);
    return out;
  }

  cellToWorld(cx: number, cz: number, out: THREE.Vector3): THREE.Vector3 {
    return out.set(
      this.originX + (cx + 0.5) * this.cellSize,
      this.heightAtCell(cx, cz, 0),
      this.originZ + (cz + 0.5) * this.cellSize,
    );
  }

  isWalkable(cx: number, cz: number): boolean {
    return this.walkableAtCell(cx, cz, 0);
  }

  inside(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.width && cz < this.depth;
  }

  get layerCount(): number {
    return this.layers.length;
  }

  costAtCell(cx: number, cz: number, layer: number): number {
    if (!this.inside(cx, cz) || layer < 0 || layer >= this.layers.length) return 0;
    return this.layers[layer].cost[cz * this.width + cx];
  }

  heightAtCell(cx: number, cz: number, layer: number): number {
    if (!this.inside(cx, cz) || layer < 0 || layer >= this.layers.length) return 0;
    return this.layers[layer].height[cz * this.width + cx];
  }

  walkableAtCell(cx: number, cz: number, layer: number): boolean {
    return this.costAtCell(cx, cz, layer) > 0;
  }

  /** Layer whose surface is closest to `y` at this position, or -1 if none. */
  layerAt(x: number, z: number, y: number): number {
    const cx = Math.floor((x - this.originX) / this.cellSize);
    const cz = Math.floor((z - this.originZ) / this.cellSize);
    if (!this.inside(cx, cz)) return -1;
    const index = cz * this.width + cx;
    let best = -1;
    let bestGap = Infinity;
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      if (layer.cost[index] <= 0) continue;
      const gap = Math.abs(layer.height[index] - y);
      if (gap < bestGap) {
        bestGap = gap;
        best = l;
      }
    }
    return best;
  }

  /** Walking height nearest to `y`, or null when the position is off-mesh. */
  heightAt(x: number, z: number, y: number): number | null {
    const layer = this.layerAt(x, z, y);
    if (layer < 0) return null;
    const cx = Math.floor((x - this.originX) / this.cellSize);
    const cz = Math.floor((z - this.originZ) / this.cellSize);
    return this.layers[layer].height[cz * this.width + cx];
  }

  /** Ground-level walking height, or null off-mesh. */
  groundAt(x: number, z: number): number | null {
    const cx = Math.floor((x - this.originX) / this.cellSize);
    const cz = Math.floor((z - this.originZ) / this.cellSize);
    if (!this.inside(cx, cz)) return null;
    const index = cz * this.width + cx;
    for (const layer of this.layers) {
      if (layer.cost[index] > 0) return layer.height[index];
    }
    return null;
  }

  /** Cells an agent can step to from `(cx, cz, layer)`, respecting step height. */
  neighbours(
    cx: number,
    cz: number,
    layer: number,
    out: Array<{ x: number; z: number; layer: number; cost: number }>,
  ): number {
    out.length = 0;
    const from = this.heightAtCell(cx, cz, layer);
    if (!this.walkableAtCell(cx, cz, layer)) return 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (!this.inside(nx, nz)) continue;
        for (let l = 0; l < this.layers.length; l++) {
          if (!this.walkableAtCell(nx, nz, l)) continue;
          const to = this.heightAtCell(nx, nz, l);
          if (Math.abs(to - from) > STEP_UP) continue;
          const diagonal = dx !== 0 && dz !== 0;
          out.push({
            x: nx,
            z: nz,
            layer: l,
            cost: this.costAtCell(nx, nz, l) * (diagonal ? Math.SQRT2 : 1),
          });
          break;
        }
      }
    }
    return out.length;
  }
}

export function buildNavGrid(
  surfaces: readonly NavSurfaceSpec[],
  colliders: readonly ColliderRecord[],
  opts: NavBuildOptions,
): WorldNavGrid {
  const { originX, originZ, width, depth, cellSize } = opts;
  const maxLayers = opts.maxLayers ?? 4;
  const cells = width * depth;

  const layers: NavLayer[] = [];
  for (let l = 0; l < maxLayers; l++) {
    layers.push({ index: l, cost: new Float32Array(cells), height: new Float32Array(cells) });
  }

  const surfaceBins = makeBins(width, depth, cellSize);
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    addToBins(surfaceBins, s.minX, s.minZ, s.maxX, s.maxZ, i, originX, originZ);
  }

  const colliderBins = makeBins(width, depth, cellSize);
  const boxes: Array<{ record: ColliderRecord; cos: number; sin: number }> = [];
  for (const record of colliders) {
    if (record.noNav) continue;
    const cos = Math.cos(record.yaw);
    const sin = Math.sin(record.yaw);
    const halfX = Math.abs(record.half.x * cos) + Math.abs(record.half.z * sin);
    const halfZ = Math.abs(record.half.x * sin) + Math.abs(record.half.z * cos);
    const index = boxes.length;
    boxes.push({ record, cos, sin });
    addToBins(
      colliderBins,
      record.center.x - halfX - PLAYER_RADIUS,
      record.center.z - halfZ - PLAYER_RADIUS,
      record.center.x + halfX + PLAYER_RADIUS,
      record.center.z + halfZ + PLAYER_RADIUS,
      index,
      originX,
      originZ,
    );
  }

  const candidates: number[] = [];
  const costs: number[] = [];
  const levelHeights: number[] = [];
  const levelCosts: number[] = [];

  for (let cz = 0; cz < depth; cz++) {
    const worldZ = originZ + (cz + 0.5) * cellSize;
    for (let cx = 0; cx < width; cx++) {
      const worldX = originX + (cx + 0.5) * cellSize;
      const index = cz * width + cx;

      candidates.length = 0;
      costs.length = 0;
      const surfaceList = binAt(surfaceBins, worldX, worldZ, originX, originZ);
      if (surfaceList) {
        for (const si of surfaceList) {
          const s = surfaces[si];
          if (worldX < s.minX || worldX > s.maxX || worldZ < s.minZ || worldZ > s.maxZ) continue;
          let height: number;
          if (s.terrain) {
            height = opts.ground(worldX, worldZ);
          } else if (s.ramp) {
            const t =
              s.ramp.axis === 'x'
                ? (worldX - s.minX) / Math.max(1e-3, s.maxX - s.minX)
                : (worldZ - s.minZ) / Math.max(1e-3, s.maxZ - s.minZ);
            height = s.height + s.ramp.rise * clamp(t, 0, 1);
          } else {
            height = s.height;
          }
          candidates.push(height);
          costs.push(s.costMul ?? 1);
        }
      }
      if (candidates.length === 0) continue;

      // Sort surfaces by height, then fuse anything within a step of each other:
      // a slab, its landing and the ramp that meets it are one walking level.
      const order = candidates.map((_, i) => i).sort((a, b) => candidates[a] - candidates[b]);
      levelHeights.length = 0;
      levelCosts.length = 0;
      for (const i of order) {
        const h = candidates[i];
        const cost = costs[i];
        const last = levelHeights.length - 1;
        if (last >= 0 && h - levelHeights[last] <= LEVEL_MERGE) {
          levelHeights[last] = Math.max(levelHeights[last], h);
          levelCosts[last] = Math.max(levelCosts[last], cost);
        } else {
          levelHeights.push(h);
          levelCosts.push(cost);
        }
      }

      // Only surfaces a storey apart earn a layer of their own; a kerb or a low
      // platform would otherwise consume a slot a roof needs.
      let layer = 0;
      let previous = -Infinity;
      for (let i = 0; i < levelHeights.length && layer < maxLayers; i++) {
        const h = levelHeights[i];
        if (layer > 0 && h - previous < LAYER_SEPARATION) continue;
        if (!clearanceAt(colliderBins, boxes, worldX, worldZ, h, originX, originZ)) continue;
        layers[layer].height[index] = h;
        layers[layer].cost[index] = levelCosts[i];
        previous = h;
        layer++;
      }
    }
  }

  applyProximityCost(layers, width, depth);
  return new WorldNavGrid(originX, originZ, cellSize, width, depth, layers);
}

/**
 * True when an agent standing on `height` here has body room.
 *
 * The test is a vertical slab from just above the feet to the top of the head,
 * against boxes grown by the player radius. Growing the box instead of sweeping a
 * capsule slightly over-blocks diagonal corners, which is the safe direction to
 * be wrong in.
 */
function clearanceAt(
  bins: Bins,
  boxes: Array<{ record: ColliderRecord; cos: number; sin: number }>,
  x: number,
  z: number,
  height: number,
  originX: number,
  originZ: number,
): boolean {
  const list = binAt(bins, x, z, originX, originZ);
  if (!list) return true;
  const low = height + 0.14;
  const high = height + HEADROOM;

  for (const bi of list) {
    const { record, cos, sin } = boxes[bi];
    if (record.center.y - record.half.y >= high) continue;
    if (record.center.y + record.half.y <= low) continue;
    const dx = x - record.center.x;
    const dz = z - record.center.z;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    if (
      Math.abs(localX) <= record.half.x + PLAYER_RADIUS &&
      Math.abs(localZ) <= record.half.z + PLAYER_RADIUS
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Raises the cost of cells that touch geometry.
 *
 * Two effects: paths stop scraping along walls, which looks like the AI is stuck
 * on the geometry, and doorways — cells pinched from both sides — become
 * expensive, so a squad only funnels through one when it is genuinely shorter
 * rather than by a rounding error.
 */
function applyProximityCost(layers: NavLayer[], width: number, depth: number): void {
  for (const layer of layers) {
    const cost = layer.cost;
    const source = cost.slice();
    for (let cz = 1; cz < depth - 1; cz++) {
      for (let cx = 1; cx < width - 1; cx++) {
        const index = cz * width + cx;
        if (source[index] <= 0) continue;
        const west = source[index - 1] <= 0;
        const east = source[index + 1] <= 0;
        const north = source[index - width] <= 0;
        const south = source[index + width] <= 0;
        const blocked = (west ? 1 : 0) + (east ? 1 : 0) + (north ? 1 : 0) + (south ? 1 : 0);
        if (blocked === 0) continue;
        const pinched = (west && east) || (north && south);
        cost[index] = source[index] * (pinched ? 1.9 : 1 + blocked * 0.14);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Coarse bins: the rasteriser must not test every collider against every cell
// ---------------------------------------------------------------------------

function makeBins(width: number, depth: number, cellSize: number): Bins {
  const cols = Math.ceil((width * cellSize) / BIN_SIZE) + 1;
  const rows = Math.ceil((depth * cellSize) / BIN_SIZE) + 1;
  return { cols, rows, cells: new Array(cols * rows) };
}

function addToBins(
  bins: Bins,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  value: number,
  originX: number,
  originZ: number,
): void {
  const x0 = clamp(Math.floor((minX - originX) / BIN_SIZE), 0, bins.cols - 1);
  const x1 = clamp(Math.floor((maxX - originX) / BIN_SIZE), 0, bins.cols - 1);
  const z0 = clamp(Math.floor((minZ - originZ) / BIN_SIZE), 0, bins.rows - 1);
  const z1 = clamp(Math.floor((maxZ - originZ) / BIN_SIZE), 0, bins.rows - 1);
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const key = z * bins.cols + x;
      let list = bins.cells[key];
      if (!list) {
        list = [];
        bins.cells[key] = list;
      }
      list.push(value);
    }
  }
}

function binAt(
  bins: Bins,
  x: number,
  z: number,
  originX: number,
  originZ: number,
): number[] | undefined {
  const bx = Math.floor((x - originX) / BIN_SIZE);
  const bz = Math.floor((z - originZ) / BIN_SIZE);
  if (bx < 0 || bz < 0 || bx >= bins.cols || bz >= bins.rows) return undefined;
  return bins.cells[bz * bins.cols + bx];
}
