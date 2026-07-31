/**
 * Navigation data adapter.
 *
 * The world publishes two different things: `getNavGrid()` on the contract, which
 * is the ground layer only, and `getNavLayers()` on the implementation, which is
 * the real multi-layer raster with rooftops and upper floors in it. Roughly half
 * of Al-Rashid Crossing is reachable only through the second one, so the AI asks
 * for it and falls back to the flat grid when it is not there.
 *
 * Everything downstream talks to `NavView`, which is the small intersection of
 * the two: cell arithmetic, per-layer walkability and height, and a resolver from
 * a world position to a (cell, layer) triple.
 */
import type * as THREE from 'three';
import type { NavGrid, WorldSystem } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';

const STEP_UP = GAMEPLAY.player.stepHeight;

/** The subset of the multi-layer grid the AI needs. */
export interface NavView {
  readonly originX: number;
  readonly originZ: number;
  readonly cellSize: number;
  readonly width: number;
  readonly depth: number;
  readonly layerCount: number;
  inside(cx: number, cz: number): boolean;
  costAtCell(cx: number, cz: number, layer: number): number;
  heightAtCell(cx: number, cz: number, layer: number): number;
  walkableAtCell(cx: number, cz: number, layer: number): boolean;
  /** Layer whose surface is nearest `y`, or -1 when the column is off-mesh. */
  layerAt(x: number, z: number, y: number): number;
  /** Walking height nearest `y`, or null when off-mesh. */
  heightAt(x: number, z: number, y: number): number | null;
  /** Lowest walkable height in this column, or null. */
  groundAt(x: number, z: number): number | null;
}

/** Shape of the world implementation's extra navigation surface, duck-typed. */
interface LayeredNav extends NavGrid {
  readonly layerCount: number;
  inside(cx: number, cz: number): boolean;
  costAtCell(cx: number, cz: number, layer: number): number;
  heightAtCell(cx: number, cz: number, layer: number): number;
  walkableAtCell(cx: number, cz: number, layer: number): boolean;
  layerAt(x: number, z: number, y: number): number;
  heightAt(x: number, z: number, y: number): number | null;
  groundAt(x: number, z: number): number | null;
}

export interface WorldExtras extends WorldSystem {
  getNavLayers?(): LayeredNav | null;
  sampleSurface?(x: number, z: number, y: number): number | null;
  isIndoors?(point: THREE.Vector3): boolean;
}

function isLayered(value: unknown): value is LayeredNav {
  const candidate = value as Partial<LayeredNav> | null;
  return (
    !!candidate &&
    typeof candidate.layerCount === 'number' &&
    typeof candidate.walkableAtCell === 'function' &&
    typeof candidate.heightAtCell === 'function' &&
    typeof candidate.layerAt === 'function' &&
    typeof candidate.heightAt === 'function'
  );
}

/** Wraps a single-layer `NavGrid` so it satisfies `NavView`. */
class FlatNavView implements NavView {
  readonly layerCount = 1;

  constructor(private readonly grid: NavGrid) {}

  get originX(): number {
    return this.grid.originX;
  }
  get originZ(): number {
    return this.grid.originZ;
  }
  get cellSize(): number {
    return this.grid.cellSize;
  }
  get width(): number {
    return this.grid.width;
  }
  get depth(): number {
    return this.grid.depth;
  }

  inside(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.grid.width && cz < this.grid.depth;
  }

  costAtCell(cx: number, cz: number, layer: number): number {
    if (layer !== 0 || !this.inside(cx, cz)) return 0;
    return this.grid.cost[cz * this.grid.width + cx];
  }

  heightAtCell(cx: number, cz: number, layer: number): number {
    if (layer !== 0 || !this.inside(cx, cz)) return 0;
    return this.grid.height[cz * this.grid.width + cx];
  }

  walkableAtCell(cx: number, cz: number, layer: number): boolean {
    return this.costAtCell(cx, cz, layer) > 0;
  }

  layerAt(x: number, z: number, _y: number): number {
    const cx = Math.floor((x - this.grid.originX) / this.grid.cellSize);
    const cz = Math.floor((z - this.grid.originZ) / this.grid.cellSize);
    return this.walkableAtCell(cx, cz, 0) ? 0 : -1;
  }

  heightAt(x: number, z: number, y: number): number | null {
    if (this.layerAt(x, z, y) < 0) return null;
    const cx = Math.floor((x - this.grid.originX) / this.grid.cellSize);
    const cz = Math.floor((z - this.grid.originZ) / this.grid.cellSize);
    return this.heightAtCell(cx, cz, 0);
  }

  groundAt(x: number, z: number): number | null {
    return this.heightAt(x, z, 0);
  }
}

/** Resolves whichever navigation representation the world is willing to hand over. */
export function resolveNav(world: WorldExtras | null): NavView | null {
  if (!world) return null;
  try {
    const layered = world.getNavLayers?.();
    if (isLayered(layered)) return layered;
  } catch {
    /* implementation without the extension, or not built yet */
  }
  try {
    const flat = world.getNavGrid();
    if (flat) return new FlatNavView(flat);
  } catch {
    /* map not built yet */
  }
  return null;
}

export const navStepUp = STEP_UP;

/** World X of a cell centre. */
export const cellCentreX = (nav: NavView, cx: number): number =>
  nav.originX + (cx + 0.5) * nav.cellSize;

/** World Z of a cell centre. */
export const cellCentreZ = (nav: NavView, cz: number): number =>
  nav.originZ + (cz + 0.5) * nav.cellSize;

export const worldToCellX = (nav: NavView, x: number): number =>
  Math.floor((x - nav.originX) / nav.cellSize);

export const worldToCellZ = (nav: NavView, z: number): number =>
  Math.floor((z - nav.originZ) / nav.cellSize);

/**
 * Nearest walkable (cell, layer) to a world position, searched outwards in rings.
 *
 * Agents get pushed off the raster all the time — a doorway threshold, a ramp the
 * rasteriser marked as blocked, a body that slid down a rubble pile — and a
 * search that fails there strands them. Packs the result as
 * `(cz * width + cx) * layerCount + layer`, or -1.
 */
export function nearestWalkable(
  nav: NavView,
  x: number,
  y: number,
  z: number,
  maxRings = 6,
): number {
  const layers = nav.layerCount;
  const cx0 = worldToCellX(nav, x);
  const cz0 = worldToCellZ(nav, z);

  let bestIndex = -1;
  let bestScore = Infinity;

  for (let ring = 0; ring <= maxRings; ring++) {
    for (let dz = -ring; dz <= ring; dz++) {
      for (let dx = -ring; dx <= ring; dx++) {
        // Only the perimeter of each ring; the interior was covered already.
        if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
        const cx = cx0 + dx;
        const cz = cz0 + dz;
        if (!nav.inside(cx, cz)) continue;
        for (let layer = 0; layer < layers; layer++) {
          if (!nav.walkableAtCell(cx, cz, layer)) continue;
          const h = nav.heightAtCell(cx, cz, layer);
          const dy = Math.abs(h - y);
          // Vertical error dominates: the roof above must never win over the
          // street the agent is standing on.
          const score = dy * 4 + Math.hypot(dx, dz) * nav.cellSize;
          if (score < bestScore) {
            bestScore = score;
            bestIndex = (cz * nav.width + cx) * layers + layer;
          }
        }
      }
    }
    if (bestIndex !== -1 && ring >= 1) break;
  }
  return bestIndex;
}
