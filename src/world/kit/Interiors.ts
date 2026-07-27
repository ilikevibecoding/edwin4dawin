import * as THREE from 'three';
import type { SurfaceType } from '../../core/GameTypes';
import {
  type Rect,
  type Sink,
  bagGeometry,
  boxGeometry,
  cachedGeometry,
  cloneGeometry,
  cylinderGeometry,
  mergeParts,
  placed,
  planeGeometry,
  roundedGeometry,
  transform,
} from './Kit';

/**
 * Interior dressing.
 *
 * An enterable building whose rooms are empty boxes is worse than one you cannot
 * enter at all: the player walks in, sees a grey cube, and stops believing the
 * town. So every room gets furniture against its walls, something on the floor
 * and something hanging from the ceiling.
 *
 * The rules are gameplay rules first. Furniture hugs the walls so the middle of
 * every room stays walkable and shootable, nothing stands in a doorway or a
 * stairwell, and the item count is capped — a room a player cannot cross is a
 * room they will never fight in. Everything is an instanced `detail` prop, so a
 * couple of hundred pieces across sixty rooms cost a couple of dozen draw calls.
 */

export type InteriorUse = 'shop' | 'store' | 'home' | 'workshop' | 'hall' | 'derelict';

export interface RoomSpec {
  /** Inside faces of the enclosing walls. */
  rect: Rect;
  /** Walking surface. */
  y: number;
  /** Headroom to the underside of the slab above. */
  headroom: number;
  use: InteriorUse;
  /** Storey index; the ground floor is the one that gets the shopfront goods. */
  floor: number;
  /** Areas to leave clear: door approaches, stair wells, partition gaps. */
  blockers: readonly Rect[];
  /**
   * Areas that take nothing taller than a metre.
   *
   * Windows go here: a wall of shelving in front of one closes a sightline the
   * map's whole layout is built around, but a chest of cartons under it is
   * exactly what should be there.
   */
  lowOnly?: readonly Rect[];
}

/**
 * One placeable piece.
 *
 * `width` runs along the wall and `depth` away from it, which is also the local
 * geometry convention: local +X along the wall, local +Z into the room.
 */
interface Item {
  width: number;
  depth: number;
  height: number;
  /** Belongs in the middle of a room rather than against a wall. */
  freestanding?: boolean;
  build: (sink: Sink, item: Item, x: number, y: number, z: number, yaw: number) => void;
}

interface Slot {
  /** On the wall face; items are pushed in by half their depth. */
  x: number;
  z: number;
  /** Yaw that turns local +Z into the room. */
  yaw: number;
  /** Metres of wall available around the slot. */
  span: number;
}

/** Tallest piece allowed in front of a window. */
const LOW_LIMIT = 1;

/**
 * Per-room cap, on top of one piece per sixteen square metres.
 *
 * The hall is deliberately the emptiest: it is the middle lane's covered street
 * and the map needs to be able to shoot through it.
 */
const MAX_ITEMS: Record<InteriorUse, number> = {
  shop: 8,
  store: 9,
  home: 7,
  workshop: 7,
  hall: 4,
  derelict: 6,
};

export function dressRoom(sink: Sink, spec: RoomSpec): void {
  const width = spec.rect.maxX - spec.rect.minX;
  const depth = spec.rect.maxZ - spec.rect.minZ;
  if (width < 2.6 || depth < 2.6) return;

  const taken: Rect[] = spec.blockers.slice();
  const lowOnly = spec.lowOnly ?? [];
  const palette = paletteFor(spec.use, spec.floor);
  const budget = Math.max(
    2,
    Math.min(MAX_ITEMS[spec.use], Math.round((width * depth) / 16)),
  );
  let count = 0;

  for (const slot of wallSlots(sink, spec.rect)) {
    if (count >= budget) break;
    // Several candidates per slot: most slots are in front of a window, where a
    // tall piece is refused, and one try per slot leaves rooms half empty.
    for (let attempt = 0; attempt < 3; attempt++) {
      const item = pick(sink, palette, slot.span, false);
      if (!item) break;
      const rect = footprintAt(slot.x, slot.z, slot.yaw, item);
      if (item.height > LOW_LIMIT && overlaps(lowOnly, rect)) continue;
      if (!claim(taken, rect)) continue;
      item.build(sink, item, slot.x, spec.y, slot.z, slot.yaw);
      count++;
      break;
    }
  }

  // One low freestanding piece, so the middle of the room is not a bare slab.
  const centre = pick(sink, palette, Math.min(width, depth) - 1.4, true);
  if (centre) {
    const cx = (spec.rect.minX + spec.rect.maxX) / 2 + sink.rng.range(-0.5, 0.5);
    const cz = (spec.rect.minZ + spec.rect.maxZ) / 2 + sink.rng.range(-0.5, 0.5);
    const yaw = sink.rng.range(0, Math.PI * 2);
    if (claim(taken, centredFootprint(cx, cz, centre, yaw))) {
      centre.build(sink, centre, cx, spec.y, cz, yaw);
    }
  }

  addCeilingFitting(sink, spec);
  addWallShelf(sink, spec, taken);
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

/**
 * Wall yaws in the edge order the rest of the kit uses: -Z, +X, +Z, -X.
 *
 * Each yaw turns a piece's local +Z into the room, which is why furniture is
 * authored with its front at +Z and its run along X.
 */
const WALLS: ReadonlyArray<{ yaw: number; along: 'x' | 'z' }> = [
  { yaw: 0, along: 'x' },
  { yaw: -Math.PI / 2, along: 'z' },
  { yaw: Math.PI, along: 'x' },
  { yaw: Math.PI / 2, along: 'z' },
];

/** Candidate positions along the four walls, in a shuffled order. */
function wallSlots(sink: Sink, r: Rect): Slot[] {
  const slots: Slot[] = [];
  const inset = 0.55;

  for (let edge = 0; edge < 4; edge++) {
    const wall = WALLS[edge];
    const fixed =
      edge === 0 ? r.minZ : edge === 1 ? r.maxX : edge === 2 ? r.maxZ : r.minX;
    const lo = (wall.along === 'x' ? r.minX : r.minZ) + inset;
    const hi = (wall.along === 'x' ? r.maxX : r.maxZ) - inset;
    const run = hi - lo;
    if (run < 1) continue;
    const steps = Math.max(1, Math.floor(run / 1.5));
    for (let i = 0; i < steps; i++) {
      const t = steps === 1 ? 0.5 : (i + 0.5) / steps;
      const along = lo + t * run;
      slots.push({
        x: wall.along === 'x' ? along : fixed,
        z: wall.along === 'x' ? fixed : along,
        yaw: wall.yaw,
        // Wide pieces only fit where there is wall left either side of them.
        span: 2 * Math.min(along - lo + inset, hi - along + inset),
      });
    }
  }
  return shuffle(sink, slots);
}

function shuffle<T>(sink: Sink, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = sink.rng.int(0, i);
    const swap = items[i];
    items[i] = items[j];
    items[j] = swap;
  }
  return items;
}

/** World footprint of an item whose back sits on the wall at (x, z). */
function footprintAt(x: number, z: number, yaw: number, item: Item): Rect {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return centredFootprint(x + sin * (item.depth / 2), z + cos * (item.depth / 2), item, yaw);
}

function centredFootprint(cx: number, cz: number, item: Item, yaw = 0): Rect {
  const cos = Math.abs(Math.cos(yaw));
  const sin = Math.abs(Math.sin(yaw));
  const halfX = (cos * item.width + sin * item.depth) / 2;
  const halfZ = (sin * item.width + cos * item.depth) / 2;
  return { minX: cx - halfX, minZ: cz - halfZ, maxX: cx + halfX, maxZ: cz + halfZ };
}

/** Reserves a footprint if it is clear, with a hand's width of slack. */
function claim(taken: Rect[], rect: Rect): boolean {
  if (overlaps(taken, rect, 0.12)) return false;
  taken.push(rect);
  return true;
}

function overlaps(rects: readonly Rect[], rect: Rect, pad = 0): boolean {
  for (const other of rects) {
    if (
      rect.minX - pad < other.maxX &&
      rect.maxX + pad > other.minX &&
      rect.minZ - pad < other.maxZ &&
      rect.maxZ + pad > other.minZ
    ) {
      return true;
    }
  }
  return false;
}

function pick(
  sink: Sink,
  palette: readonly Item[],
  span: number,
  freestanding: boolean,
): Item | null {
  const options = palette.filter(
    (item) => (item.freestanding === true) === freestanding && item.width <= span,
  );
  if (options.length === 0) return null;
  return sink.rng.pick(options);
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const SHELF: Item = { width: 1.12, depth: 0.44, height: 1.86, build: buildShelf };
const RACK: Item = { width: 1.64, depth: 0.48, height: 1.98, build: buildShelf };
const COUNTER: Item = { width: 1.85, depth: 0.64, height: 0.94, build: buildCounter };
const CUPBOARD: Item = { width: 0.94, depth: 0.48, height: 1.62, build: buildCupboard };
const SACKS: Item = { width: 1.1, depth: 0.7, height: 0.9, build: buildSacks };
const CARTONS: Item = { width: 0.92, depth: 0.62, height: 0.95, build: buildCartons };
const CARPET_ROLLS: Item = { width: 0.76, depth: 0.46, height: 1.74, build: buildCarpetRolls };
const LOW_BENCH: Item = { width: 1.5, depth: 0.46, height: 0.46, build: buildLowBench };
const BEDROLL: Item = { width: 1.95, depth: 0.94, height: 0.24, build: buildBedroll };
const WORKBENCH: Item = { width: 2.0, depth: 0.72, height: 0.92, build: buildWorkbench };
const STOOLS: Item = { width: 0.62, depth: 0.62, height: 0.9, build: buildStoolStack };
const RUBBLE: Item = { width: 1.5, depth: 1.0, height: 0.5, build: buildInteriorRubble };

const TABLE: Item = { width: 1.06, depth: 0.78, height: 0.5, freestanding: true, build: buildTable };
const RUG: Item = { width: 2.1, depth: 1.5, height: 0.02, freestanding: true, build: buildRug };
const CRATE_PILE: Item = {
  width: 1.12,
  depth: 1.12,
  height: 1.06,
  freestanding: true,
  build: buildCratePile,
};

const SHOP_ITEMS: readonly Item[] = [COUNTER, SHELF, RACK, SACKS, CARTONS, CARPET_ROLLS, RUG, TABLE];
const STORE_ITEMS: readonly Item[] = [RACK, SHELF, SACKS, CARTONS, CARTONS, CRATE_PILE];
const HOME_ITEMS: readonly Item[] = [CUPBOARD, SHELF, BEDROLL, LOW_BENCH, CARTONS, RUG, TABLE];
const WORKSHOP_ITEMS: readonly Item[] = [WORKBENCH, SHELF, CARTONS, SACKS, CRATE_PILE];
const HALL_ITEMS: readonly Item[] = [STOOLS, SACKS, LOW_BENCH, RUG, CARPET_ROLLS];
const DERELICT_ITEMS: readonly Item[] = [RUBBLE, RUBBLE, CARTONS, BEDROLL];

function paletteFor(use: InteriorUse, floor: number): readonly Item[] {
  switch (use) {
    // Shops trade on the street; the floors above them are where people live.
    case 'shop':
      return floor === 0 ? SHOP_ITEMS : HOME_ITEMS;
    case 'store':
      return STORE_ITEMS;
    case 'home':
      return HOME_ITEMS;
    case 'workshop':
      return WORKSHOP_ITEMS;
    case 'hall':
      return HALL_ITEMS;
    default:
      return DERELICT_ITEMS;
  }
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

/**
 * Open shelving with stock on it.
 *
 * The stock is what makes it read: an empty rack is four sticks and a plank, a
 * loaded one has a silhouette worth shooting at.
 */
function buildShelf(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const steel = sink.rng.bool(0.45);
  const { width, depth, height } = item;
  const key = `shelf|${width}|${height}|${steel ? 's' : 'w'}`;
  const geometry = cachedGeometry(key, () => {
    const post = steel ? 0.046 : 0.062;
    const parts: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(
          placed(
            boxGeometry(post, height, post, 0.008, 1.2),
            transform(sx * (width / 2 - post / 2), height / 2, sz * (depth / 2 - post / 2)),
          ),
        );
      }
    }
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const shelfY = 0.17 + (i / (tiers - 1)) * (height - 0.36);
      parts.push(
        placed(boxGeometry(width - 0.04, 0.032, depth - 0.03, 0.008, 1.4), transform(0, shelfY, 0)),
      );
    }
    // Back brace, so the rack is not see-through from the far side of the room.
    parts.push(
      placed(
        boxGeometry(width - 0.1, height * 0.6, 0.02, 0.006, 1.6),
        transform(0, height * 0.52, -depth / 2 + 0.02),
      ),
    );
    return mergeParts(parts);
  });

  sink.addProp(geometry, standing(x, y, z, yaw, depth), {
    material: steel ? 'steel_brushed' : 'wood_plank',
    tier: 'detail',
    tint: steel ? 0xa8a49a : 0xbfae8c,
  });
  addStock(sink, item, x, y, z, yaw);
  boxCollider(sink, item, x, y, z, yaw, steel ? 'metal' : 'wood');
}

/** A few crates and sacks distributed over a rack's shelves. */
function addStock(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const crate = boxGeometry(0.34, 0.28, 0.3, 0.014, 1.1);
  const sack = bagGeometry(0.4, 0.24, 0.28, 0.09);
  const tiers = 4;

  for (let i = 0; i < 3; i++) {
    if (sink.rng.bool(0.3)) continue;
    const tier = sink.rng.int(0, tiers - 2);
    const shelfY = 0.17 + (tier / (tiers - 1)) * (item.height - 0.36) + 0.016;
    const bag = sink.rng.bool(0.45);
    const at = onWall(
      x,
      z,
      yaw,
      sink.rng.range(-item.width / 2 + 0.3, item.width / 2 - 0.3),
      item.depth / 2,
    );
    sink.addProp(
      bag ? sack : crate,
      transform(at.x, y + shelfY + (bag ? 0.13 : 0.155), at.z, yaw + sink.rng.range(-0.22, 0.22)),
      {
        material: bag ? 'sandbag' : 'wood_crate',
        tier: 'detail',
        tint: bag
          ? sink.rng.pick([0xd8cdb2, 0xcabfa4, 0xc2b596])
          : sink.rng.pick([0xd6c6a4, 0xc9b795]),
      },
    );
  }
}

/** Shop counter: a plinth with an overhanging top, a kick rail and panelling. */
function buildCounter(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const { width, depth, height } = item;
  const geometry = cachedGeometry('counter', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(
        boxGeometry(width - 0.08, height - 0.1, depth - 0.1, 0.018, 1.3),
        transform(0, (height - 0.1) / 2 + 0.04, 0),
      ),
      placed(boxGeometry(width, 0.06, depth, 0.014, 1.6), transform(0, height - 0.03, 0)),
      placed(boxGeometry(width - 0.2, 0.05, depth - 0.16, 0.01, 1.3), transform(0, 0.025, 0)),
    ];
    for (const s of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(width / 2 - 0.18, height - 0.36, 0.02, 0.008, 1.2),
          transform(s * (width / 4), height / 2, depth / 2 - 0.05),
        ),
      );
    }
    return mergeParts(parts);
  });

  sink.addProp(geometry, standing(x, y, z, yaw, depth), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0xb9a684, 0xa8a08c, 0xc0b294]),
  });
  boxCollider(sink, item, x, y, z, yaw, 'wood');
}

function buildCupboard(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const { width, depth, height } = item;
  const geometry = cachedGeometry('cupboard', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(width, height, depth, 0.02, 1.3), transform(0, height / 2, 0)),
      placed(boxGeometry(width + 0.06, 0.04, depth + 0.05, 0.012, 1.4), transform(0, height, 0)),
    ];
    for (const s of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(width / 2 - 0.06, height - 0.16, 0.022, 0.008, 1.1),
          transform(s * (width / 4), height / 2, depth / 2 + 0.011),
        ),
      );
      parts.push(
        placed(
          cylinderGeometry(0.013, 0.013, 0.09, 6, 0.6),
          transform(s * 0.055, height * 0.56, depth / 2 + 0.035, 0, Math.PI / 2),
        ),
      );
    }
    return mergeParts(parts);
  });

  sink.addProp(geometry, standing(x, y, z, yaw, depth), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0x9fa8a2, 0xb8ac92, 0xa89c86]),
  });
  boxCollider(sink, item, x, y, z, yaw, 'wood');
}

/** Grain sacks: fat rounded bags, slumped and stacked. */
function buildSacks(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const geometry = bagGeometry(0.56, 0.34, 0.4, 0.15);
  const tints = [0xd8ceb4, 0xc9bda0, 0xd1c4a6, 0xbfb193];
  const rows = sink.rng.int(2, 3);

  for (let row = 0; row < rows; row++) {
    const perRow = row === rows - 1 ? 1 : 2;
    for (let i = 0; i < perRow; i++) {
      const along = perRow === 1 ? sink.rng.range(-0.12, 0.12) : (i - 0.5) * 0.52;
      const at = onWall(x, z, yaw, along, 0.34 + sink.rng.range(-0.04, 0.04));
      sink.addProp(
        geometry,
        transform(
          at.x,
          y + 0.17 + row * 0.28,
          at.z,
          yaw + sink.rng.range(-0.35, 0.35),
          sink.rng.range(-0.08, 0.08),
          sink.rng.range(-0.12, 0.12),
        ),
        { material: 'sandbag', tier: 'detail', tint: sink.rng.pick(tints) },
      );
    }
  }
  boxCollider(sink, item, x, y, z, yaw, 'sand', rows * 0.28 + 0.06);
}

/** Stack of cartons, deliberately not squared up. */
function buildCartons(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const sizes: ReadonlyArray<readonly [number, number, number]> = [
    [0.46, 0.34, 0.38],
    [0.38, 0.3, 0.34],
    [0.52, 0.26, 0.4],
  ];
  let stack = 0;
  const count = sink.rng.int(2, 3);
  for (let i = 0; i < count; i++) {
    const [w, h, d] = sink.rng.pick(sizes);
    const at = onWall(x, z, yaw, sink.rng.range(-0.14, 0.14), 0.32 + sink.rng.range(-0.05, 0.05));
    sink.addProp(
      boxGeometry(w, h, d, 0.012, 1.1),
      transform(at.x, y + stack + h / 2, at.z, yaw + sink.rng.range(-0.3, 0.3)),
      {
        material: 'wood_crate',
        tier: 'detail',
        tint: sink.rng.pick([0xcdb894, 0xc2ac88, 0xd4c3a2]),
      },
    );
    stack += h;
  }
  boxCollider(sink, item, x, y, z, yaw, 'wood', stack);
}

/** Rolled carpets stood on end: a strong vertical among all the boxes. */
function buildCarpetRolls(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const tints = [0x8d4a3a, 0x6b4a52, 0x7d6a44, 0x9a6a4a, 0x5d5a48];
  const count = sink.rng.int(3, 5);
  for (let i = 0; i < count; i++) {
    const length = 1.35 + Math.round(sink.rng.range(0, 3)) * 0.12;
    const radius = 0.08 + Math.round(sink.rng.range(0, 2)) * 0.018;
    const geometry = cylinderGeometry(radius, radius * 1.06, length, 8, 0.35);
    const at = onWall(x, z, yaw, sink.rng.range(-0.24, 0.24), 0.2 + sink.rng.range(0, 0.1));
    // Leaned into the wall; the tilt is what stops it reading as a pipe rack.
    sink.addProp(
      geometry,
      transform(
        at.x,
        y + length / 2 - 0.02,
        at.z,
        yaw,
        sink.rng.range(0.06, 0.13),
        sink.rng.range(-0.05, 0.05),
      ),
      { material: 'fabric_canvas', tier: 'detail', tint: sink.rng.pick(tints) },
    );
  }
  boxCollider(sink, item, x, y, z, yaw, 'wood');
}

/** Low masonry bench, the kind built into the wall of a tea house. */
function buildLowBench(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const { width, depth, height } = item;
  const geometry = cachedGeometry('lowbench', () =>
    mergeParts([
      placed(
        boxGeometry(width, height - 0.07, depth - 0.06, 0.02, 1.4),
        transform(0, (height - 0.07) / 2, 0),
      ),
      placed(boxGeometry(width + 0.06, 0.07, depth, 0.02, 1.6), transform(0, height - 0.035, 0)),
    ]),
  );
  sink.addProp(geometry, standing(x, y, z, yaw, depth), {
    material: 'plaster_white',
    tier: 'detail',
    tint: sink.rng.pick([0xe0d6c2, 0xd2c8b4]),
  });

  // A cushion, because a bare bench in a tea house is a bench nobody uses.
  if (sink.rng.bool(0.7)) {
    const at = onWall(x, z, yaw, sink.rng.range(-0.35, 0.35), depth / 2);
    sink.addProp(
      roundedGeometry(0.54, 0.1, 0.4, 0.05, 2, 0.4),
      transform(at.x, y + height + 0.05, at.z, yaw + sink.rng.range(-0.25, 0.25)),
      {
        material: 'fabric_canvas',
        tier: 'detail',
        tint: sink.rng.pick([0x8d4a3a, 0x6b5a52, 0x7d6a44]),
      },
    );
  }
  boxCollider(sink, item, x, y, z, yaw, 'concrete');
}

/** Bedroll on the floor with a folded blanket at one end. */
function buildBedroll(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const { width, depth } = item;
  sink.addProp(
    roundedGeometry(width, 0.15, depth, 0.07, 2, 0.45),
    standing(x, y + 0.075, z, yaw, depth),
    {
      material: 'fabric_canvas',
      tier: 'detail',
      tint: sink.rng.pick([0xbdb49c, 0xa8a08a, 0xc6bca2]),
    },
  );

  const at = onWall(x, z, yaw, width / 2 - 0.34, depth / 2);
  sink.addProp(
    roundedGeometry(0.56, 0.14, 0.44, 0.06, 2, 0.4),
    transform(at.x, y + 0.19, at.z, yaw + sink.rng.range(-0.2, 0.2)),
    {
      material: 'fabric_canvas',
      tier: 'detail',
      tint: sink.rng.pick([0x8d4a3a, 0x6b4a52, 0x7d6a44]),
    },
  );
  boxCollider(sink, item, x, y, z, yaw, 'fabric');
}

/** Bench with a vice and a length of stock clamped in it. */
function buildWorkbench(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const { width, depth, height } = item;
  const geometry = cachedGeometry('workbench', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(width, 0.07, depth, 0.014, 1.5), transform(0, height - 0.035, 0)),
      placed(boxGeometry(width - 0.3, 0.05, depth - 0.2, 0.01, 1.4), transform(0, 0.34, 0)),
    ];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(
          placed(
            boxGeometry(0.08, height - 0.07, 0.08, 0.01, 1.2),
            transform(sx * (width / 2 - 0.1), (height - 0.07) / 2, sz * (depth / 2 - 0.1)),
          ),
        );
      }
    }
    parts.push(
      placed(boxGeometry(0.18, 0.16, 0.22, 0.02, 0.9), transform(width / 2 - 0.3, height + 0.07, 0.03)),
    );
    parts.push(
      placed(
        cylinderGeometry(0.02, 0.02, 0.3, 6, 0.7),
        transform(width / 2 - 0.3, height + 0.08, 0.2, 0, Math.PI / 2),
      ),
    );
    return mergeParts(parts);
  });

  sink.addProp(geometry, standing(x, y, z, yaw, depth), {
    material: 'wood_plank',
    tier: 'detail',
    tint: 0xb0a084,
  });
  boxCollider(sink, item, x, y, z, yaw, 'wood');
}

/** Stacked stools, as found against the wall of every tea house. */
function buildStoolStack(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('stool', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(cylinderGeometry(0.2, 0.17, 0.05, 10, 0.8), transform(0, 0.3, 0)),
    ];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      parts.push(
        placed(
          boxGeometry(0.032, 0.3, 0.032, 0.006, 0.8),
          transform(Math.cos(a) * 0.14, 0.15, Math.sin(a) * 0.14, 0, 0.05),
        ),
      );
    }
    return mergeParts(parts);
  });

  const count = sink.rng.int(3, 5);
  for (let i = 0; i < count; i++) {
    const at = onWall(x, z, yaw, sink.rng.range(-0.03, 0.03), 0.31);
    sink.addProp(
      geometry,
      transform(at.x, y + i * 0.11, at.z, yaw + sink.rng.range(0, Math.PI)),
      {
        material: 'wood_painted',
        tier: 'detail',
        tint: sink.rng.pick([0xa8b0a4, 0xb8a894, 0x9aa8b0]),
      },
    );
  }
  boxCollider(sink, item, x, y, z, yaw, 'wood', count * 0.11 + 0.35);
}

/** Low table, the one freestanding piece rooms are allowed. */
function buildTable(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const { width, depth, height } = item;
  const geometry = cachedGeometry('table', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(width, 0.05, depth, 0.012, 1.4), transform(0, height - 0.025, 0)),
    ];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(
          placed(
            boxGeometry(0.055, height - 0.05, 0.055, 0.008, 1.1),
            transform(sx * (width / 2 - 0.08), (height - 0.05) / 2, sz * (depth / 2 - 0.08)),
          ),
        );
      }
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'wood_plank',
    tier: 'detail',
    tint: sink.rng.pick([0xbfae8c, 0xa89880]),
  });
  sink.addCollider(
    new THREE.Vector3(x, y + height / 2, z),
    new THREE.Vector3(width / 2, height / 2, depth / 2),
    yaw,
    { surface: 'wood', noCover: true },
  );
}

/** Floor rug. Flat, so it takes no collider and never blocks navigation. */
function buildRug(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('rug', () => {
    const plane = cloneGeometry(planeGeometry(item.width, item.depth, 0.42));
    plane.rotateX(-Math.PI / 2);
    return plane;
  });
  sink.addProp(geometry, transform(x, y + 0.012, z, yaw), {
    material: 'fabric_canvas',
    tier: 'detail',
    tint: sink.rng.pick([0x8d4a3a, 0x6b4a52, 0x7d6a44, 0x8a5a3a]),
  });
}

/** Crates on a pallet. */
function buildCratePile(sink: Sink, item: Item, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('cratepile', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(1.1, 0.11, 1.1, 0.01, 1.2), transform(0, 0.055, 0)),
    ];
    let stack = 0.11;
    const sizes = [0.62, 0.54, 0.48];
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      parts.push(
        placed(
          boxGeometry(s, s, s, 0.016, 1.2),
          transform((i - 1) * 0.08, stack + s / 2, ((i % 2) - 0.5) * 0.1, i * 0.22),
        ),
      );
      stack += s * 0.86;
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'wood_crate',
    tier: 'detail',
    tint: 0xd0bf9c,
  });
  sink.addCollider(
    new THREE.Vector3(x, y + item.height / 2, z),
    new THREE.Vector3(item.width / 2, item.height / 2, item.depth / 2),
    yaw,
    { surface: 'wood' },
  );
}

/** Fallen slab and broken block, for the rooms the shelling reached. */
function buildInteriorRubble(
  sink: Sink,
  item: Item,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const centre = onWall(x, z, yaw, 0, item.depth / 2);
  for (let i = 0; i < 7; i++) {
    const size = 0.14 + Math.round(sink.rng.range(0, 4)) * 0.07;
    sink.addProp(
      boxGeometry(size, size * 0.6, size * 0.82, size * 0.1, 1.1),
      transform(
        centre.x + sink.rng.range(-0.6, 0.6),
        y + size * 0.3,
        centre.z + sink.rng.range(-0.4, 0.4),
        sink.rng.range(0, Math.PI * 2),
        sink.rng.range(-0.4, 0.4),
        sink.rng.range(-0.4, 0.4),
      ),
      {
        material: 'concrete_damaged',
        tier: 'detail',
        tint: sink.rng.pick([0xcfc6b6, 0xbdb4a4, 0xd8cfbe]),
      },
    );
  }
  // One tipped slab gives the pile a silhouette the loose chunks cannot.
  sink.addProp(
    boxGeometry(1.1, 0.14, 0.8, 0.02, 1.8),
    transform(centre.x, y + 0.28, centre.z, yaw + sink.rng.range(-0.5, 0.5), sink.rng.range(0.25, 0.5)),
    { material: 'concrete_damaged', tier: 'detail', tint: 0xc6bdac },
  );
  boxCollider(sink, item, x, y, z, yaw, 'concrete', 0.44);
}

// ---------------------------------------------------------------------------
// Fittings
// ---------------------------------------------------------------------------

/** A bare bulb, a tin shade, or in the wrecked rooms just the flex. */
function addCeilingFitting(sink: Sink, spec: RoomSpec): void {
  const cx = (spec.rect.minX + spec.rect.maxX) / 2;
  const cz = (spec.rect.minZ + spec.rect.maxZ) / 2;
  const ceiling = spec.y + spec.headroom;

  if (spec.use === 'derelict') {
    sink.addProp(
      cylinderGeometry(0.006, 0.006, 0.55, 4, 0.5),
      transform(cx, ceiling - 0.28, cz),
      { material: 'metal_rusted', tier: 'detail', tint: 0x4a4438 },
    );
    return;
  }

  const geometry = cachedGeometry('bulb', () => {
    const bulb = new THREE.SphereGeometry(0.038, 8, 6);
    bulb.translate(0, -0.03, 0);
    return mergeParts([
      placed(cylinderGeometry(0.006, 0.006, 0.42, 4, 0.5), transform(0, 0.21, 0)),
      placed(cylinderGeometry(0.026, 0.03, 0.05, 8, 0.4), transform(0, 0.025, 0)),
      bulb,
    ]);
  });
  sink.addProp(geometry, transform(cx, ceiling - 0.44, cz), {
    material: 'plaster_white',
    tier: 'detail',
    tint: 0xd8d2c4,
  });

  if (spec.use === 'shop' && sink.rng.bool(0.6)) {
    sink.addProp(
      cylinderGeometry(0.05, 0.19, 0.11, 10, 0.7, false),
      transform(cx, ceiling - 0.46, cz),
      { material: 'metal_panel', tier: 'detail', tint: 0xa8a094 },
    );
  }
}

/** A plank on two brackets: the flat thing that breaks up bare plaster. */
function addWallShelf(sink: Sink, spec: RoomSpec, taken: readonly Rect[]): void {
  const edge = sink.rng.int(0, 3);
  const wall = WALLS[edge];
  const wx =
    edge === 1 ? spec.rect.maxX : edge === 3 ? spec.rect.minX : (spec.rect.minX + spec.rect.maxX) / 2;
  const wz =
    edge === 0 ? spec.rect.minZ : edge === 2 ? spec.rect.maxZ : (spec.rect.minZ + spec.rect.maxZ) / 2;
  const rect: Rect = { minX: wx - 0.5, minZ: wz - 0.5, maxX: wx + 0.5, maxZ: wz + 0.5 };
  for (const other of taken) {
    if (
      rect.minX < other.maxX &&
      rect.maxX > other.minX &&
      rect.minZ < other.maxZ &&
      rect.maxZ > other.minZ
    ) {
      return;
    }
  }

  const geometry = cachedGeometry('wallshelf', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(0.92, 0.035, 0.24, 0.008, 1.2), transform(0, 0, 0)),
    ];
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.03, 0.16, 0.2, 0.005, 1), transform(s * 0.36, -0.09, -0.02)));
    }
    return mergeParts(parts);
  });
  const at = onWall(wx, wz, wall.yaw, 0, 0.12);
  sink.addProp(geometry, transform(at.x, spec.y + sink.rng.range(1.25, 1.6), at.z, wall.yaw), {
    material: 'wood_plank',
    tier: 'detail',
    tint: 0xb6a888,
  });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Point `along` the wall and `away` from it, in the wall's local frame. */
function onWall(
  x: number,
  z: number,
  yaw: number,
  along: number,
  away: number,
): { x: number; z: number } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { x: x + cos * along + sin * away, z: z - sin * along + cos * away };
}

/** Placement matrix for a piece whose back sits on the wall at (x, z). */
function standing(x: number, y: number, z: number, yaw: number, depth: number): THREE.Matrix4 {
  return transform(x + Math.sin(yaw) * (depth / 2), y, z + Math.cos(yaw) * (depth / 2), yaw);
}

function boxCollider(
  sink: Sink,
  item: Item,
  x: number,
  y: number,
  z: number,
  yaw: number,
  surface: SurfaceType,
  height = item.height,
): void {
  sink.addCollider(
    new THREE.Vector3(
      x + Math.sin(yaw) * (item.depth / 2),
      y + height / 2,
      z + Math.cos(yaw) * (item.depth / 2),
    ),
    new THREE.Vector3(item.width / 2, height / 2, item.depth / 2),
    yaw,
    { surface, noCover: height < 0.45 },
  );
}
