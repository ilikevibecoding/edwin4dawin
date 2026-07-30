import * as THREE from 'three';
import type { MaterialId } from '../core/Contracts';
import { TAU } from '../core/MathUtils';
import {
  type BuildingResult,
  type BuildingSpec,
  addRoofLadder,
  buildBuilding,
  buildConstructionShell,
  buildDome,
  buildExteriorStair,
  buildMinaret,
} from './kit/Buildings';
import {
  basin,
  bicycle,
  brassScatter,
  bucket,
  buttPatch,
  cableSpan,
  cornerSpoil,
  crateStack,
  drainCover,
  grtBank,
  handcart,
  hangingRag,
  kerbDamage,
  leaningLadder,
  litterArea,
  litterBand,
  type LitterMix,
  litterPiece,
  pipeBundle,
  plasticChair,
  plasticStool,
  produceCrate,
  roadPatch,
  rubbleCrumbs,
  sackPile,
  sandDrift,
  shadeCloth,
  spillStain,
  tiedTarp,
  tvAerial,
  tyreSprawl,
  tyreTracks,
  wallFoot,
  wearPath,
  wheelbarrow,
  woodPile,
} from './kit/Clutter';
import {
  awning,
  buntingLine,
  debrisField,
  groundStain,
  hangingTarp,
  laundryLine,
  litterField,
  roofAc,
  satelliteDish,
  wallPipe,
  waterTank,
} from './kit/Details';
import { type Rect, type Sink, boxGeometry, inflate, placed, transform } from './kit/Kit';
import {
  ammoCrate,
  bench,
  blockStack,
  cableSpool,
  chainLinkFence,
  dumpster,
  hescoBarrier,
  jerryCan,
  jerseyBarrier,
  marketStall,
  oilBarrel,
  pallet,
  planter,
  powerLine,
  powerPole,
  rebarCluster,
  roadSign,
  rubbleBerm,
  rubblePile,
  sandbagNest,
  sandbagWall,
  scaffolding,
  shippingContainer,
  streetLamp,
  tyreStack,
  woodCrate,
} from './kit/Props';
import { type PadSpec, type RoadSpec, TerrainField, buildApron, buildConcretePad } from './kit/Terrain';
import { scatterVegetation, seamWeeds } from './kit/Vegetation';
import { derelictVehicle } from './kit/Vehicles';
import { buildLowWall, buildWall } from './kit/Walls';

/**
 * "Al-Rashid Crossing" — the map.
 *
 * Three north-south lanes join the two spawns: the west road past the workshops
 * and the container yard, the covered market street through the middle, and the
 * east road along the mosque and the unfinished tower. Three cross streets and
 * two alleys tie them together, so no lane is a tunnel and every fight has a
 * flank.
 *
 *      x -54        -38        2         22        44        56
 *   z
 *  -54   +------------- NORTH SPAWN (enemy) ----------------+
 *        |  guard   | checkpoint |  municipal  |  bombed    |
 *  -28   +=== cross north ===============================+
 *        | workshop | warehouse  | shop row N | construction
 *   2    +=== cross centre (crossroads) =================+
 *        | container| apartment  | market hall| mosque    |
 *        |   yard   |            | ~~ bridge ~~ shop row S|
 *  30    +=== cross south ==============================+
 *        |          | row house  | tea house  | fuel stn  |
 *  48    +------------- SOUTH SPAWN (player) --------------+
 *
 * Verticality: apartment roof (10.2 m) and market hall roof (6.8 m) joined by a
 * plank walkway over the market street to the shop row roof; the mosque roof and
 * the workshop roof reached by exterior stairs; three floors of the construction
 * shell; container tops in the west yard reached by a crate mantle chain.
 */

/** Half-extent of the playable area. Boundary structures stand on this line. */
export const PLAY_HALF = 56;
/** Half-extent of the built terrain, including the out-of-bounds silhouette. */
export const TERRAIN_HALF = 72;

/**
 * The street grid. `axis` is the direction the carriageway runs, so the three
 * lanes are the 'z' entries and the cross streets that link them are the 'x'
 * entries; `center` is the road's position on the other axis, and every building
 * footprint below is set to clear it by at least 30 cm.
 */
const ROADS: RoadSpec[] = [
  { name: 'west_road', axis: 'z', center: -38, from: -56, to: 56, halfWidth: 5, surface: 'asphalt', camber: 0.075, kerb: true, markings: 'dash' },
  { name: 'market_street', axis: 'z', center: 2, from: -30, to: 38, halfWidth: 2.8, surface: 'gravel', camber: 0.03, kerb: false, markings: 'none' },
  { name: 'east_road', axis: 'z', center: 44, from: -56, to: 56, halfWidth: 5.5, surface: 'asphalt', camber: 0.08, kerb: true, markings: 'dash' },
  { name: 'alley_west', axis: 'z', center: -19, from: -26, to: 38, halfWidth: 2.2, surface: 'dirt', camber: 0.02, kerb: false, markings: 'none' },
  { name: 'alley_east', axis: 'z', center: 22, from: -26, to: 42, halfWidth: 2.4, surface: 'gravel', camber: 0.02, kerb: false, markings: 'none' },
  { name: 'cross_north', axis: 'x', center: -28, from: -56, to: 56, halfWidth: 4.5, surface: 'asphalt', camber: 0.06, kerb: true, markings: 'edge' },
  { name: 'cross_centre', axis: 'x', center: 2, from: -56, to: 56, halfWidth: 4, surface: 'asphalt', camber: 0.055, kerb: true, markings: 'dash' },
  { name: 'cross_south', axis: 'x', center: 30, from: -56, to: 56, halfWidth: 4.5, surface: 'asphalt', camber: 0.06, kerb: true, markings: 'edge' },
  { name: 'north_apron', axis: 'x', center: -46, from: -46, to: 46, halfWidth: 4, surface: 'dirt', camber: 0.02, kerb: false, markings: 'none' },
  { name: 'south_apron', axis: 'x', center: 48, from: -46, to: 46, halfWidth: 3.5, surface: 'dirt', camber: 0.02, kerb: false, markings: 'none' },
];

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

const PLASTER: MaterialId = 'plaster_white';
const PEELING: MaterialId = 'plaster_peeling';
const STUCCO: MaterialId = 'stucco_sand';
const BRICK: MaterialId = 'brick_red';

/**
 * Two of the wall materials are distressed accents, never facades.
 *
 * `plaster_peeling` and `brick_painted` both carry a large-scale coat-failure
 * field whose patches are a good fraction of a tile across and a shade far from
 * the intact surface. Projected over a fifteen-metre gable those patches read as
 * leopard spots — the wall looks like camouflage netting, at any tiling, because
 * tightening the tile only multiplies the spots. They belong on small or already
 * broken surfaces: the shelled house, window infills, patch repairs. Everything
 * that presents a whole facade to a lane uses plaster, stucco or fired brick.
 */
const PEELING_TILE = 1.6;

const BUILDINGS: BuildingSpec[] = [
  // --- West district -------------------------------------------------------
  {
    name: 'workshop',
    use: 'workshop',
    centerX: -48.5,
    centerZ: -12,
    width: 10,
    depth: 18,
    floors: 1,
    floorHeight: 4.8,
    wall: BRICK,
    liner: PLASTER,
    tint: 0xd9cfbc,
    roofWalkable: true,
    roofAccess: false,
    parapet: 1.05,
    facades: [
      { doors: [0], bars: true },
      { doors: [1, 3], bays: 5, glass: false },
      { blank: [0], bars: true },
      { blank: [0, 2], bays: 3 },
    ],
    partitions: true,
    roofDetails: true,
  },
  {
    name: 'guard_post',
    use: 'store',
    centerX: -48.5,
    centerZ: -37,
    width: 8,
    depth: 7,
    floors: 1,
    floorHeight: 3.4,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xe4dac4,
    roofWalkable: true,
    parapet: 1.0,
    facades: [{ doors: [1], bays: 3 }, { glass: true, bars: true }, { blank: [0] }, { glass: true }],
  },
  {
    name: 'warehouse',
    use: 'store',
    centerX: -27,
    centerZ: -12,
    width: 11,
    depth: 17,
    floors: 1,
    floorHeight: 6,
    wall: BRICK,
    liner: 'concrete_wall',
    tint: 0xcdc3b0,
    roof: 'pitched',
    facades: [
      { doors: [0, 1], bays: 2 },
      { doors: [1, 3], bays: 5 },
      { blank: [0, 1], bays: 2 },
      { bays: 5, blank: [1, 3] },
    ],
    roofDetails: false,
  },
  {
    name: 'apartment_w',
    use: 'home',
    centerX: -27,
    centerZ: 15,
    width: 11,
    depth: 15,
    floors: 3,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xd6c9ac,
    roofWalkable: true,
    stairs: 'nw',
    roofAccess: true,
    partitions: true,
    facades: [
      { doors: [1], bays: 3, glass: true, shutters: true },
      { bays: 4, glass: true, balcony: [1, 2], shutters: true },
      { doors: [1], bays: 3, glass: true, shutters: true },
      { bays: 4, glass: true, bars: true },
    ],
  },
  {
    name: 'row_house_w',
    use: 'home',
    centerX: -27,
    centerZ: 39,
    width: 11,
    depth: 8,
    floors: 2,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xe8dcc2,
    roofWalkable: true,
    stairs: 'se',
    roofAccess: true,
    facades: [
      { doors: [1], bays: 3, glass: true },
      { bays: 2, glass: true, shutters: true },
      { doors: [0], bays: 3, glass: true, balcony: [1] },
      { bays: 2, bars: true },
    ],
  },

  // --- Centre district ----------------------------------------------------
  {
    name: 'market_annex',
    use: 'store',
    centerX: -9,
    centerZ: -12,
    width: 14,
    depth: 18,
    floors: 2,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xe2d7c0,
    roofWalkable: true,
    stairs: 'se',
    roofAccess: true,
    partitions: true,
    facades: [
      { doors: [2], bays: 4, glass: true },
      { arcade: true, bays: 5, balcony: [1, 3] },
      { doors: [1], bays: 4, glass: true, shutters: true },
      { bays: 5, glass: true, bars: true, breach: [2] },
    ],
  },
  {
    name: 'market_hall',
    use: 'hall',
    centerX: -9,
    centerZ: 15,
    width: 14,
    depth: 17,
    floors: 2,
    floorHeight: 3.6,
    wall: PLASTER,
    liner: PLASTER,
    tint: 0xf0e6d0,
    roofWalkable: true,
    stairs: 'nw',
    roofAccess: true,
    facades: [
      { doors: [1], bays: 4 },
      { arcade: true, bays: 5 },
      { doors: [1, 2], bays: 4 },
      { bays: 5, glass: true, bars: true },
    ],
  },
  {
    name: 'shop_row_n',
    use: 'shop',
    centerX: 12,
    centerZ: -12,
    width: 13,
    depth: 17,
    floors: 2,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xe6dbc0,
    roofWalkable: true,
    stairs: 'ne',
    roofAccess: true,
    partitions: true,
    facades: [
      { doors: [1], bays: 4, glass: true },
      { bays: 5, glass: true, shutters: true },
      { doors: [2], bays: 4, glass: true },
      { arcade: true, bays: 5, balcony: [1, 3] },
    ],
  },
  {
    name: 'shop_row_s',
    use: 'shop',
    centerX: 12,
    centerZ: 14,
    width: 13,
    depth: 15,
    floors: 2,
    floorHeight: 3.6,
    // The one fired-brick building in a town of plaster: it dates the shop row as
    // older than everything around it and gives the centre lane a warm anchor.
    wall: 'brick_red',
    liner: PLASTER,
    tint: 0xdfd6c8,
    roofWalkable: true,
    stairs: 'se',
    roofAccess: true,
    partitions: true,
    facades: [
      { doors: [1], bays: 4, glass: true },
      { bays: 4, glass: true, bars: true },
      { doors: [2], bays: 4, glass: true, shutters: true },
      { arcade: true, bays: 4, balcony: [1] },
    ],
  },
  {
    name: 'tea_house',
    use: 'shop',
    centerX: -9,
    centerZ: 39,
    width: 12,
    depth: 8,
    floors: 1,
    floorHeight: 3.6,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xeadfc4,
    roofWalkable: true,
    parapet: 1.0,
    facades: [
      { doors: [1], bays: 4, glass: true },
      { bays: 2, glass: true },
      { doors: [2], bays: 4, arcade: false, glass: true },
      { bays: 2, bars: true },
    ],
  },
  {
    name: 'municipal',
    use: 'home',
    centerX: 10,
    centerZ: -37,
    width: 16,
    depth: 9,
    floors: 2,
    wall: PLASTER,
    liner: PLASTER,
    tint: 0xefe5cf,
    roofWalkable: true,
    stairs: 'nw',
    roofAccess: true,
    partitions: true,
    facades: [
      { bays: 5, glass: true, bars: true },
      { bays: 3, glass: true },
      { doors: [1, 3], bays: 5, glass: true, balcony: [1, 3] },
      { bays: 3, glass: true, breach: [1] },
    ],
  },

  // --- East district ------------------------------------------------------
  {
    name: 'mosque',
    use: 'hall',
    centerX: 31,
    centerZ: 15,
    width: 13,
    depth: 15,
    floors: 1,
    floorHeight: 6.4,
    wall: PLASTER,
    liner: PLASTER,
    tint: 0xf4ead4,
    roofWalkable: true,
    parapet: 1.05,
    facades: [
      { doors: [1], bays: 3, arcade: false },
      { bays: 4, blank: [1, 2] },
      { doors: [1], bays: 3 },
      { arcade: true, bays: 4 },
    ],
    // The dome takes the middle of this roof, and washing lines and satellite
    // dishes are not what goes on the rest of it.
    roofDetails: false,
  },
  {
    name: 'bombed_house',
    centerX: 31,
    centerZ: -37,
    width: 12,
    depth: 9,
    floors: 2,
    wall: PEELING,
    wallTile: PEELING_TILE,
    liner: 'concrete_damaged',
    tint: 0xd5cab4,
    shelled: true,
    roofWalkable: true,
    stairs: 'nw',
    roofAccess: true,
    facades: [
      { bays: 4, breach: [1, 2] },
      { doors: [1], bays: 3, breach: [0] },
      { doors: [2], bays: 4, breach: [3] },
      { bays: 3, breach: [1] },
    ],
  },

  // --- Spawn structures ---------------------------------------------------
  {
    name: 'north_hut',
    use: 'store',
    centerX: -12,
    centerZ: -54,
    width: 9,
    depth: 6,
    floors: 1,
    floorHeight: 3.2,
    wall: STUCCO,
    liner: PLASTER,
    tint: 0xe0d6c0,
    roofWalkable: true,
    parapet: 0.95,
    facades: [{ bays: 3, glass: true }, { doors: [0], bays: 2 }, { doors: [1], bays: 3 }, { bays: 2, bars: true }],
  },
  {
    name: 'south_depot',
    use: 'store',
    centerX: 6,
    centerZ: 55,
    width: 12,
    depth: 7,
    floors: 1,
    floorHeight: 4.2,
    wall: BRICK,
    liner: 'concrete_wall',
    tint: 0xd2c8b4,
    roofWalkable: true,
    parapet: 0.95,
    facades: [{ doors: [1], bays: 4 }, { bays: 2 }, { doors: [2], bays: 4 }, { bays: 2, blank: [0] }],
  },
];

/** Background silhouettes outside the playable area: town, not void. */
const BACKDROP: Array<[number, number, number, number, number]> = [
  [-64, -50, 14, 12, 3],
  [-66, -18, 12, 16, 2],
  [-64, 20, 14, 14, 3],
  [-62, 52, 12, 12, 2],
  [-30, -64, 16, 12, 2],
  [4, -66, 18, 12, 3],
  [34, -64, 14, 12, 2],
  [62, -46, 12, 14, 3],
  [66, -8, 12, 18, 2],
  [64, 26, 14, 14, 3],
  [62, 58, 12, 12, 2],
  [26, 66, 16, 12, 2],
  [-8, 64, 14, 12, 3],
  [-40, 66, 16, 12, 2],
];

export function createField(): TerrainField {
  const rough = new TerrainField(ROADS, []);
  const pads: PadSpec[] = [];

  const pad = (centerX: number, centerZ: number, width: number, depth: number, feather = 3): void => {
    // Quantise so a pad edge never lands a millimetre below the slab above it.
    const height = Math.round(rough.height(centerX, centerZ) * 100) / 100;
    pads.push({
      minX: centerX - width / 2,
      minZ: centerZ - depth / 2,
      maxX: centerX + width / 2,
      maxZ: centerZ + depth / 2,
      height,
      feather,
    });
  };

  for (const spec of BUILDINGS) {
    pad(spec.centerX, spec.centerZ, spec.width + 1.6, spec.depth + 1.6);
  }
  for (const [x, z, w, d] of BACKDROP) pad(x, z, w + 2, d + 2, 4);

  // Flat ground the set pieces need: plazas, yards and the shell footprint.
  pad(31, -12, 20, 22, 4); // construction shell
  pad(31, 39, 18, 13, 3.5); // fuel station forecourt
  pad(-48.5, 16, 13, 22, 4); // container yard
  pad(24.5, 15, 8, 17, 3); // mosque forecourt
  pad(-20, -14, 8, 20, 3); // courtyard between warehouse and annex

  return new TerrainField(ROADS, pads);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildLayout(sink: Sink, field: TerrainField): void {
  const built = new Map<string, BuildingResult>();
  for (const spec of BUILDINGS) built.set(spec.name, buildBuilding(sink, spec));

  const need = (name: string): BuildingResult => {
    const result = built.get(name);
    if (!result) throw new Error(`[world] missing building ${name}`);
    return result;
  };

  buildBackdrop(sink, field);
  buildWestDistrict(sink, field, need);
  buildCentreDistrict(sink, field, need);
  buildEastDistrict(sink, field, need);
  buildConnectors(sink, field);
  buildSpawns(sink, field, need);
  buildBoundary(sink, field);
  buildScatter(sink, field);
  // After the set pieces so it can see what ground they took, before the ground
  // clutter so the clutter fills around the yards rather than inside them.
  buildOffAxis(sink, field);
  // Last, because it asks the builder what ground is already claimed and that
  // answer is only complete once every set piece has registered its collision.
  buildGroundClutter(sink, field, need);
}

/**
 * The out-of-bounds ring, and the one place the grid can be broken outright.
 *
 * Every structure inside the playable half is axis-aligned because the navigation
 * raster, the cover normals and the box colliders all read rectangles. The ring
 * is different: it stands beyond the boundary walls, nobody walks it, nothing
 * paths through it, and it is a third of what the tactical top-down view shows.
 * So a bit under half of it is rebuilt as skewed shells — four walls on arbitrary
 * lines with a rotated roof — which is enough to take the parallel edges out of
 * the perimeter without touching a single thing the map is played on.
 */
function buildBackdrop(sink: Sink, field: TerrainField): void {
  for (const [x, z, width, depth, floors] of BACKDROP) {
    // Skewed if it is not one of the corner pieces that has to close the ring
    // squarely against its neighbours.
    const yaw = sink.rng.bool(0.8) ? sink.rng.pick([-1, 1]) * sink.rng.range(0.12, 0.3) : 0;
    if (yaw !== 0) {
      buildSkewShell(sink, field, x, z, width, depth, floors, yaw);
      continue;
    }
    buildBuilding(sink, {
      name: `backdrop_${x}_${z}`,
      centerX: x,
      centerZ: z,
      width,
      depth,
      floors,
      wall: sink.rng.bool(0.76) ? STUCCO : BRICK,
      tint: sink.rng.pick([0xded4bf, 0xe8dcc4, 0xd4cab4]),
      roofWalkable: false,
      parapet: 0.7,
      partitions: false,
      exteriorDetails: false,
      // Nobody gets inside these, so nothing is spent furnishing them.
      dress: false,
      roofDetails: true,
      // Glazed even though they are scenery. An unfurnished shell has nothing
      // behind its openings to catch light, so bare holes read as a grid of pure
      // black squares — the cheapest-looking thing on the skyline. A pane picks
      // up the sky instead, which is what a window does from thirty metres.
      facades: [
        { bays: Math.round(width / 3.4), glass: true },
        { bays: Math.round(depth / 3.4), glass: true },
        { bays: Math.round(width / 3.4), glass: true },
        { bays: Math.round(depth / 3.4), glass: true },
      ],
    });
  }
}

/**
 * A rotated backdrop block: four walls, a rotated roof, a parapet and a
 * silhouette.
 *
 * Deliberately not `buildBuilding`. That builder pours slabs, threads a stair,
 * registers walkable rectangles and an interior volume, all of which assume an
 * axis-aligned footprint — and none of which a shell beyond the boundary wall
 * needs. What is left is cheap: the walls carry their own collision and cover on
 * whatever line they are given, so the whole thing is four `buildWall` calls, a
 * box for the roof and the water tanks that go on top of it.
 *
 * Pushed outward far enough that the rotation cannot swing a corner through the
 * boundary wall, since the rotated footprint is wider than the one it replaces.
 */
function buildSkewShell(
  sink: Sink,
  field: TerrainField,
  x: number,
  z: number,
  width: number,
  depth: number,
  floors: number,
  yaw: number,
): void {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const hw = width / 2;
  const hd = depth / 2;

  // Rotated half-extents, and the shove outward that keeps the inner face clear
  // of the boundary line the ring stands behind.
  const ex = Math.abs(hw * cos) + Math.abs(hd * sin);
  const ez = Math.abs(hw * sin) + Math.abs(hd * cos);
  const clearance = PLAY_HALF + 1.6;
  let cx = x;
  let cz = z;
  if (Math.abs(x) > Math.abs(z)) {
    const inner = Math.abs(x) - ex;
    if (inner < clearance) cx = Math.sign(x) * (clearance + ex);
  } else {
    const inner = Math.abs(z) - ez;
    if (inner < clearance) cz = Math.sign(z) * (clearance + ez);
  }

  const at = (lx: number, lz: number): [number, number] => [
    cx + lx * cos + lz * sin,
    cz - lx * sin + lz * cos,
  ];
  const corners: Array<[number, number]> = [at(-hw, -hd), at(hw, -hd), at(hw, hd), at(-hw, hd)];

  const fh = 3.4;
  const base = field.height(cx, cz) - 0.3;
  const height = floors * fh;
  const material = sink.rng.bool(0.76) ? STUCCO : BRICK;
  const tint = sink.rng.pick([0xded4bf, 0xe8dcc4, 0xd4cab4]);

  for (let edge = 0; edge < 4; edge++) {
    const [x0, z0] = corners[edge];
    const [x1, z1] = corners[(edge + 1) % 4];
    const length = Math.hypot(x1 - x0, z1 - z0);
    const bays = Math.max(1, Math.round(length / 3.4));
    const openings = [];
    for (let f = 0; f < floors; f++) {
      for (let b = 0; b < bays; b++) {
        if (sink.rng.bool(0.14)) continue;
        openings.push({
          at: ((b + 0.5) / bays) * length,
          width: 1.35,
          sill: f * fh + 0.95,
          height: 1.35,
          kind: 'window' as const,
          glass: true,
          trim: true,
        });
      }
    }
    buildWall(sink, {
      x0,
      z0,
      x1,
      z1,
      base,
      height,
      thickness: 0.36,
      material,
      openings,
      parapet: 0.7,
      tint,
      mottle: 0.4,
      plinth: true,
    });
  }

  const roofY = base + height;
  sink.addStatic(
    placed(boxGeometry(width, 0.3, depth, 0.05, 3.2), transform(cx, roofY - 0.15, cz, yaw)),
    { material: 'concrete_floor', tier: 'structure', tile: 3.2, tint: 0xd4ccb8, mottle: 0.3 },
  );
  sink.addCollider(
    new THREE.Vector3(cx, roofY - 0.15, cz),
    new THREE.Vector3(hw, 0.15, hd),
    yaw,
    { surface: 'concrete', noCover: true, noNav: true },
  );

  // The silhouette, laid out on the shell's own axis so it skews with it.
  for (let i = 0; i < Math.max(1, Math.round((width * depth) / 60)); i++) {
    const [px, pz] = at(sink.rng.range(-hw + 1.2, hw - 1.2), sink.rng.range(-hd + 1.2, hd - 1.2));
    waterTank(sink, px, roofY, pz, yaw + sink.rng.range(-0.4, 0.4));
  }
  for (let i = 0; i < Math.max(2, Math.round((width * depth) / 40)); i++) {
    const [px, pz] = at(sink.rng.range(-hw + 0.9, hw - 0.9), sink.rng.range(-hd + 0.9, hd - 0.9));
    const roll = sink.rng.next();
    if (roll < 0.4) satelliteDish(sink, px, roofY, pz, yaw + sink.rng.range(-1, 1));
    else if (roll < 0.7) roofAc(sink, px, roofY, pz, yaw + sink.rng.range(-0.3, 0.3));
    else tvAerial(sink, px, roofY, pz, yaw);
  }
  if (sink.rng.bool(0.5)) {
    const [ax, az] = at(-hw + 0.8, -hd + 1.4);
    const [bx, bz] = at(hw - 0.8, hd - 1.4);
    laundryLine(
      sink,
      new THREE.Vector3(ax, roofY + sink.rng.range(1.0, 1.6), az),
      new THREE.Vector3(bx, roofY + sink.rng.range(0.9, 1.5), bz),
    );
  }
}

// ---------------------------------------------------------------------------
// West district: industry, containers, the long road
// ---------------------------------------------------------------------------

function buildWestDistrict(
  sink: Sink,
  field: TerrainField,
  need: (name: string) => BuildingResult,
): void {
  const workshop = need('workshop');
  const warehouse = need('warehouse');
  const apartment = need('apartment_w');
  const guard = need('guard_post');

  // Workshop yard, then the stair that owns the west road's rooftop duel.
  buildApron(sink, field, -54, -24, -43.5, 2, 'gravel');
  buildExteriorStair(
    sink,
    workshop.footprint.maxX + 1.5,
    workshop.footprint.minZ + 2.6,
    'z',
    1,
    workshop.base,
    workshop.roofY,
    1.5,
  );
  // Landing bridge from the stair head onto the roof.
  addWalkway(
    sink,
    workshop.footprint.maxX + 0.4,
    workshop.footprint.minZ + 7.6,
    workshop.footprint.maxX + 2.6,
    workshop.footprint.minZ + 7.6,
    workshop.roofY,
    1.5,
  );
  sink.addLandmark('workshop', workshop.footprint.maxX, workshop.roofY, -12);
  sink.addLandmark('rooftop_west', workshop.footprint.minX + 4, workshop.roofY, -12);

  // Workshop yard clutter: this is where the map's rusty metal lives.
  cableSpool(sink, -46, -25.5, 0.4);
  cableSpool(sink, -44.6, -23.2, 1.1);
  tyreStack(sink, -52, -25, 0.2, 5);
  for (let i = 0; i < 4; i++) {
    oilBarrel(sink, -53 + i * 0.85, -22.5 + (i % 2) * 0.8, sink.rng.range(0, TAU), {
      tint: sink.rng.pick([0x7a6a4a, 0x5a6a5a, 0x8a5a4a]),
    });
  }
  jerseyBarrier(sink, -45, -3.5, 0);
  jerseyBarrier(sink, -48.2, -3.5, 0);
  derelictVehicle(sink, 'truck', -47, 1.5, Math.PI * 0.52, { paint: 'green', stripped: true });
  groundStain(sink, -47, 1.5, 1.7, 0x4b453c);
  sandbagWall(sink, -43.6, -30, 0, 5.4, 4);
  sandbagWall(sink, -33.4, -33.5, Math.PI / 2, 4.6, 3);

  // Container yard: stacks with a crate chain up to the first roof.
  const yard: Rect = { minX: -54, minZ: 6, maxX: -43.5, maxZ: 26 };
  buildApron(sink, field, yard.minX, yard.minZ, yard.maxX, yard.maxZ, 'gravel');
  shippingContainer(sink, -49.5, 9.5, 0, { tint: 0x8f6a4a, walkable: true, long: false });
  shippingContainer(sink, -49.5, 9.5, 0, { tint: 0x6a7f8a, walkable: true, level: 1 });
  shippingContainer(sink, -49.5, 15.5, 0.04, { tint: 0x7a8a6a, walkable: true });
  shippingContainer(sink, -46.5, 21.5, Math.PI / 2, { tint: 0x8a7a5a, walkable: true, doorsOpen: true });
  shippingContainer(sink, -51.5, 24.5, Math.PI / 2 + 0.05, { tint: 0x6a6a72, walkable: true });
  blockStack(sink, -46.4, 12.4, 0.2, 6);
  woodCrate(sink, -46.6, sink.ground(-46.6, 10.6), 10.6, 0.3, 0.92);
  woodCrate(sink, -46.4, sink.ground(-46.4, 10.6) + 0.92, 10.9, 0.7, 0.82);
  pallet(sink, -44.6, 17.5, 0.4);
  pallet(sink, -44.4, 18.6, 1.2);
  for (let i = 0; i < 5; i++) {
    oilBarrel(sink, -44.5 + sink.rng.range(-0.6, 0.6), 6.8 + i * 0.9, sink.rng.range(0, TAU), {
      tint: 0x5a6a5a,
    });
  }
  sink.addLandmark('container_yard', -48.5, sink.ground(-48.5, 16) + 3, 16);
  chainLinkFence(sink, -54, 5.4, -43.5, 5.4, 2.3);
  chainLinkFence(sink, -43.5, 5.4, -43.5, 12, 2.3);

  // Apartment block: the west lane's high ground, with a ladder route as backup.
  addRoofLadder(sink, apartment.footprint.maxX + 0.35, apartment.footprint.minZ + 2.2, Math.PI / 2, apartment.roofY);
  blockStack(sink, apartment.footprint.maxX + 0.9, apartment.footprint.minZ + 2.2, 0, 5);
  sink.addLandmark('apartment', apartment.footprint.minX + 5, apartment.roofY, 15);
  rooftopPosition(sink, apartment, 2);

  // Warehouse interior: the reason to go inside is the loot pile, so make one.
  const wi = warehouse.interior;
  for (let i = 0; i < 3; i++) {
    woodCrate(sink, wi.minX + 1.6 + i * 1.05, warehouse.base, wi.minZ + 2.2, sink.rng.range(-0.3, 0.3), 0.92);
  }
  woodCrate(sink, wi.minX + 2.1, warehouse.base + 0.92, wi.minZ + 2.4, 0.4, 0.8);
  pallet(sink, wi.minX + 4.4, wi.minZ + 4.4, 0.2);
  pallet(sink, wi.minX + 4.2, wi.minZ + 5.6, 0.9);
  ammoCrate(sink, wi.maxX - 2.2, wi.maxZ - 3.2, Math.PI / 2);
  ammoCrate(sink, wi.maxX - 2.2, wi.maxZ - 4.3, Math.PI / 2 + 0.1);
  for (let i = 0; i < 4; i++) {
    oilBarrel(sink, wi.maxX - 1.5, wi.minZ + 2 + i * 0.9, sink.rng.range(0, TAU), { tint: 0x7a5a44 });
  }
  scaffolding(sink, wi.minX + 2.4, wi.maxZ - 2.6, 0, 3.2, 1.6, 2);
  hangingTarp(sink, wi.minX + 5.5, warehouse.base + 4.4, wi.maxZ - 4, 0.2, 3.4, 2.2, 'camo_net');
  dumpster(sink, warehouse.footprint.maxX + 1.3, warehouse.footprint.minZ + 3, Math.PI / 2);
  sink.addLandmark('warehouse', -27, warehouse.base + 3, -12);

  // Guard post, north-west corner.
  hescoBarrier(sink, -44, -40, 0, 4.8, 1.2);
  hescoBarrier(sink, -44, -34.6, 0, 4.8, 1.2);
  blockStack(sink, guard.footprint.maxX + 0.8, guard.footprint.maxZ - 1.4, 0, 6);
  sandbagNest(sink, -52, -30.5, Math.PI, 1.9);
  derelictVehicle(sink, 'pickup', -41.5, -43.5, 0.12, { paint: 'tan', burnt: true });
  groundStain(sink, -41.5, -43.5, 2.1, 0x3c3833);
}

// ---------------------------------------------------------------------------
// Centre: the market street
// ---------------------------------------------------------------------------

function buildCentreDistrict(
  sink: Sink,
  field: TerrainField,
  need: (name: string) => BuildingResult,
): void {
  const hall = need('market_hall');
  const annex = need('market_annex');
  const shopN = need('shop_row_n');
  const shopS = need('shop_row_s');
  const tea = need('tea_house');

  sink.addLandmark('market', 2, hall.base + 2, 6);
  sink.addLandmark('market_street', 2, hall.base + 2, -6);
  sink.addLandmark('crossroads', 2, hall.base, 2);

  // Stalls line the street on both sides, staggered so the lane never runs straight.
  const stallZ = [-24, -20, -16.5, -12.5, 8.5, 12, 16, 20, 24];
  for (let i = 0; i < stallZ.length; i++) {
    const east = i % 2 === 0;
    const x = east ? 5.9 : -1.9;
    marketStall(sink, x, stallZ[i], east ? -Math.PI / 2 : Math.PI / 2, {
      width: sink.rng.range(2.4, 3.1),
      depth: 1.9,
    });
    if (sink.rng.bool(0.6)) {
      woodCrate(sink, x + (east ? 1.1 : -1.1), sink.ground(x, stallZ[i] + 1.6), stallZ[i] + 1.6, sink.rng.range(0, TAU), 0.7);
    }
    // Stock hung off the front rail. A stall with nothing hanging on it reads as
    // a table with a roof; the cloth is what makes it a trader's pitch.
    const railY = sink.ground(x, stallZ[i]) + 2.2;
    const front = east ? -1 : 1;
    for (let k = 0; k < sink.rng.int(1, 3); k++) {
      hangingRag(
        sink,
        x + front * 0.95,
        railY,
        stallZ[i] + sink.rng.range(-0.9, 0.9),
        east ? -Math.PI / 2 : Math.PI / 2,
        sink.rng.range(0.35, 0.6),
        sink.rng.range(0.45, 0.85),
      );
    }
    if (sink.rng.bool(0.45)) {
      basin(sink, x + front * 1.3, stallZ[i] + sink.rng.range(-1.2, 1.2), sink.rng.range(0, TAU));
    }
    buttPatch(sink, x + front * 1.5, stallZ[i] + sink.rng.range(-1.4, 1.4));
  }
  buntingLine(
    sink,
    new THREE.Vector3(-1.6, sink.ground(-1.6, -18) + 4.4, -18),
    new THREE.Vector3(5.6, sink.ground(5.6, -18) + 4.6, -18),
  );
  buntingLine(
    sink,
    new THREE.Vector3(-1.6, sink.ground(-1.6, 18) + 4.6, 18),
    new THREE.Vector3(5.6, sink.ground(5.6, 18) + 4.4, 18),
  );
  seamWeeds(sink, -0.9, -26, -0.9, 26, 14);
  seamWeeds(sink, 4.9, -26, 4.9, 26, 14);

  // Awnings over the arcades, so the street reads as shaded. Tints are picked
  // for what dyed canvas looks like with the light behind it, which is how the
  // street sees these: a colour that reads right as a swatch comes out as a
  // black plate hung on the shopfront.
  awning(sink, hall.footprint.maxX + 0.1, 11, -Math.PI / 2, hall.base + 3.1, 4.2, 1.7, 0xdc9464);
  awning(sink, hall.footprint.maxX + 0.1, 19, -Math.PI / 2, hall.base + 3.1, 4.2, 1.7, 0x7ea8c4);
  awning(sink, shopS.footprint.minX - 0.1, 12, Math.PI / 2, shopS.base + 3.1, 4.4, 1.8, 0xdcc884);
  awning(sink, shopN.footprint.minX - 0.1, -14, Math.PI / 2, shopN.base + 3.1, 4.4, 1.8, 0xd49aa4);

  // The plank walkway over the market street: the map's signature route.
  const bridgeZ = 14;
  const deck = Math.max(hall.roofY, shopS.roofY) + hall.parapet + 0.16;
  addWalkway(sink, hall.footprint.maxX - 0.6, bridgeZ, shopS.footprint.minX + 0.6, bridgeZ, deck, 1.7);
  buildExteriorStair(sink, hall.footprint.maxX - 2.4, bridgeZ, 'x', 1, hall.roofY, deck, 1.6);
  buildExteriorStair(sink, shopS.footprint.minX + 2.4, bridgeZ, 'x', -1, shopS.roofY, deck, 1.6);
  for (const bx of [hall.footprint.maxX + 1.6, shopS.footprint.minX - 1.6]) {
    const groundY = sink.ground(bx, bridgeZ);
    sink.addStatic(
      placed(boxGeometry(0.24, deck - groundY, 0.24, 0.03, 1.8), transform(bx, (groundY + deck) / 2, bridgeZ)),
      { material: 'wood_plank', tier: 'structure', tint: 0xa89272 },
    );
    sink.addCollider(
      new THREE.Vector3(bx, (groundY + deck) / 2, bridgeZ),
      new THREE.Vector3(0.14, (deck - groundY) / 2, 0.14),
      0,
      { surface: 'wood', noCover: true },
    );
  }
  sink.addLandmark('walkway', 2, deck, bridgeZ);
  rooftopPosition(sink, hall, 1);
  rooftopPosition(sink, shopS, 1);
  rooftopPosition(sink, shopN, 2);
  rooftopPosition(sink, annex, 2);

  // Alley behind the market: the flank that keeps the street from being a funnel.
  const alley: Rect = { minX: -17, minZ: -22, maxX: -21.5, maxZ: 24 };
  dumpster(sink, -20, -18.5, 0.1);
  dumpster(sink, -19.6, 6.5, Math.PI + 0.1);
  woodCrate(sink, -20.2, sink.ground(-20.2, -8), -8, 0.4, 0.88);
  woodCrate(sink, -20, sink.ground(-20, -8) + 0.88, -7.8, 0.9, 0.7);
  pallet(sink, -18.4, 12.5, 1.3);
  oilBarrel(sink, -20.4, 19.5, 0.2, { tipped: true });
  jerryCan(sink, -19.2, 20.4, 0.9);
  litterField(sink, alley.maxX, alley.minZ, alley.minX, alley.maxZ, 22);

  // Walled courtyard south of the annex: the mid-map holdout.
  buildCompound(sink, { minX: -16.6, minZ: -24.5, maxX: -2.2, maxZ: -21.4 }, 2.5, STUCCO, [
    { edge: 0, at: 0.35, width: 2.6 },
  ]);
  sandbagNest(sink, -12, 22.5, 0, 2.0);
  sink.addLandmark('courtyard', -9, hall.base, -23);

  // Tea house terrace at the south end.
  buildConcretePad(sink, field, -9, 34.5, 12, 3.4, 'tile_ceramic');
  for (let i = 0; i < 3; i++) bench(sink, -13 + i * 4, 34.8, Math.PI);
  planter(sink, -15.5, 34.6, 0, 1.1);
  planter(sink, -2.5, 34.6, 0, 1.1);
  awning(sink, tea.footprint.minX + 6, tea.footprint.maxZ + 0.1, Math.PI, tea.base + 3.0, 6.5, 2.4, 0xdcc884);
  blockStack(sink, tea.footprint.maxX + 0.9, tea.footprint.maxZ - 1.6, 0, 5);
  addRoofLadder(sink, tea.footprint.maxX + 0.35, tea.footprint.maxZ - 1.6, Math.PI / 2, tea.roofY);
  rooftopPosition(sink, tea, 1);

  // Municipal building forecourt at the north end of the centre lane.
  const municipal = need('municipal');
  buildConcretePad(sink, field, 10, -31.8, 16, 3.2, 'concrete_floor');
  jerseyBarrier(sink, 4.5, -31.5, 0);
  jerseyBarrier(sink, 8, -31.5, 0);
  jerseyBarrier(sink, 11.5, -31.5, 0);
  sandbagWall(sink, 15.5, -31.4, 0, 4.2, 4);
  derelictVehicle(sink, 'sedan', 1.5, -31.4, Math.PI * 0.98, { paint: 'white', burnt: true });
  sink.addLandmark('municipal', 10, municipal.roofY, -37);
  rooftopPosition(sink, municipal, 2);
}

// ---------------------------------------------------------------------------
// East: mosque, fuel station, the unfinished tower
// ---------------------------------------------------------------------------

function buildEastDistrict(
  sink: Sink,
  field: TerrainField,
  need: (name: string) => BuildingResult,
): void {
  const mosque = need('mosque');
  const bombed = need('bombed_house');

  // Prayer hall: dome on the roof, minaret beside it, walled forecourt.
  buildDome(sink, 31, 15, mosque.roofY, 4.1);
  buildMinaret(sink, 36, 24.2, sink.ground(36, 24.2), 18.5);
  buildConcretePad(sink, field, 25.6, 15, 6, 16, 'tile_ceramic');
  buildCompound(sink, { minX: 24.4, minZ: 6.4, maxX: 38, maxZ: 23.6 }, 2.4, PLASTER, [
    { edge: 3, at: 0.5, width: 3.0 },
    { edge: 0, at: 0.72, width: 2.4 },
  ]);
  buildExteriorStair(sink, mosque.footprint.minX - 1.5, mosque.footprint.maxZ - 2.2, 'z', -1, mosque.base, mosque.roofY, 1.5);
  addWalkway(
    sink,
    mosque.footprint.minX - 2.6,
    mosque.footprint.maxZ - 8.6,
    mosque.footprint.minX + 0.4,
    mosque.footprint.maxZ - 8.6,
    mosque.roofY,
    1.5,
  );
  rooftopPosition(sink, mosque, 2);
  planter(sink, 26.5, 9, 0, 1.2);
  planter(sink, 26.5, 21, 0, 1.2);
  sink.addLandmark('mosque', 31, mosque.base + 2, 15);

  // Construction shell.
  const shell = buildConstructionShell(sink, {
    name: 'construction',
    centerX: 31,
    centerZ: -12,
    width: 14,
    depth: 18,
    floors: 3,
    floorHeight: 3.2,
  });
  scaffolding(sink, shell.footprint.maxX + 1.1, shell.footprint.minZ + 4, 0, 2.4, 3.6, 3);
  scaffolding(sink, shell.footprint.maxX + 1.1, shell.footprint.minZ + 11, 0, 2.4, 3.6, 3);
  for (let i = 0; i < 5; i++) {
    rubblePile(sink, shell.footprint.maxX + 2.6 + sink.rng.range(-0.6, 1.4), shell.footprint.minZ + 2 + i * 3.6, sink.rng.range(0, TAU), 1.1);
  }
  cableSpool(sink, shell.footprint.minX - 1.8, shell.footprint.maxZ - 2.4, 0.6);
  for (let i = 0; i < 3; i++) {
    woodCrate(sink, shell.footprint.minX + 2 + i * 1.1, shell.base, shell.footprint.maxZ - 2.2, sink.rng.range(0, TAU), 0.9);
  }
  blockStack(sink, shell.footprint.minX + 1.2, shell.footprint.maxZ - 4.6, 0, 6);
  oilBarrel(sink, shell.footprint.minX + 1.4, shell.footprint.minZ + 2.4, 0.4, { tint: 0x6a5a44 });
  hangingTarp(sink, shell.footprint.minX + 4, shell.base + shell.floorHeight * 2 - 0.2, shell.footprint.minZ + 0.4, 0, 4.5, 2.6, 'camo_net');
  sink.addLandmark('construction', 31, shell.base + shell.floorHeight, -12);
  sink.addLandmark('rooftop_east', 31, shell.roofY, -12);
  jerseyBarrier(sink, 24.8, -23.5, Math.PI / 2);
  jerseyBarrier(sink, 24.8, -20, Math.PI / 2);

  // Fuel station: canopy, pumps, and the burnt car that explains why it closed.
  buildFuelStation(sink, field, 31, 39);

  // Bombed house and the shell crater beside it.
  for (let i = 0; i < 4; i++) {
    rubblePile(sink, bombed.footprint.minX - 2 + sink.rng.range(-1, 1), bombed.footprint.minZ + 1.5 + i * 2.4, sink.rng.range(0, TAU), 1.25);
  }
  debrisField(sink, bombed.footprint.minX - 4, bombed.footprint.minZ - 1, bombed.footprint.maxX + 3, bombed.footprint.maxZ + 3, 40);
  sink.addLandmark('bombed_house', 31, bombed.base + 3, -37);
  derelictVehicle(sink, 'bus', 41, -30.5, Math.PI * 0.02, { paint: 'blue', stripped: true });
  sink.addLandmark('bus', 41, sink.ground(41, -30.5) + 2, -30.5);

  // East road furniture.
  for (const z of [-46, -18, 12, 40]) {
    streetLamp(sink, 38.4, z, -Math.PI / 2);
  }
  for (const z of [-34, 6, 34]) {
    powerPole(sink, 50.5, z, 0, 7.8);
  }
  powerLine(sink, new THREE.Vector3(50.5, sink.ground(50.5, -34) + 7.2, -34), new THREE.Vector3(50.5, sink.ground(50.5, 6) + 7.2, 6));
  powerLine(sink, new THREE.Vector3(50.5, sink.ground(50.5, 6) + 7.2, 6), new THREE.Vector3(50.5, sink.ground(50.5, 34) + 7.2, 34));
  roadSign(sink, 38.2, -2.5, -Math.PI / 2 + 0.1, 'square');
  roadSign(sink, 49.6, 30.5, Math.PI / 2, 'round');
}

function buildFuelStation(sink: Sink, field: TerrainField, x: number, z: number): void {
  const base = field.height(x, z);
  buildConcretePad(sink, field, x, z, 16, 11, 'concrete_floor');
  const height = 4.6;
  const width = 12;
  const depth = 8.4;

  // Canopy deck: reachable, so it becomes a firing position over the crossroads.
  const deckTop = base + height;
  sink.addStatic(
    placed(boxGeometry(width, 0.34, depth, 0.05, 2.6), transform(x, deckTop - 0.17, z)),
    { material: 'metal_panel', tier: 'structure', tint: 0xdcd6c6, mottle: 0.25 },
  );
  sink.addCollider(
    new THREE.Vector3(x, deckTop - 0.17, z),
    new THREE.Vector3(width / 2, 0.17, depth / 2),
    0,
    { surface: 'metal', noCover: true, noNav: true },
  );
  sink.addWalkable({ minX: x - width / 2 + 0.3, minZ: z - depth / 2 + 0.3, maxX: x + width / 2 - 0.3, maxZ: z + depth / 2 - 0.3, height: deckTop, costMul: 1.2 });
  for (const edge of [0, 1, 2, 3]) {
    const r: Rect = { minX: x - width / 2, minZ: z - depth / 2, maxX: x + width / 2, maxZ: z + depth / 2 };
    const line: Array<[number, number, number, number]> = [
      [r.minX, r.minZ, r.maxX, r.minZ],
      [r.maxX, r.minZ, r.maxX, r.maxZ],
      [r.maxX, r.maxZ, r.minX, r.maxZ],
      [r.minX, r.maxZ, r.minX, r.minZ],
    ];
    const [x0, z0, x1, z1] = line[edge];
    buildLowWall(sink, x0, z0, x1, z1, deckTop, 0.95, 'metal_panel', 0.16);
  }
  for (const [dx, dz] of [
    [-width / 2 + 0.9, -depth / 2 + 0.9],
    [width / 2 - 0.9, -depth / 2 + 0.9],
    [-width / 2 + 0.9, depth / 2 - 0.9],
    [width / 2 - 0.9, depth / 2 - 0.9],
  ] as const) {
    sink.addStatic(
      placed(boxGeometry(0.44, height, 0.44, 0.04, 2.0), transform(x + dx, base + height / 2, z + dz)),
      { material: 'concrete_wall', tier: 'structure', tint: 0xe0d8c6 },
    );
    sink.addCollider(
      new THREE.Vector3(x + dx, base + height / 2, z + dz),
      new THREE.Vector3(0.22, height / 2, 0.22),
      0,
      { surface: 'concrete' },
    );
  }

  // Pumps.
  for (const dz of [-2.2, 2.2]) {
    sink.addStatic(
      placed(boxGeometry(1.5, 0.35, 0.9, 0.05, 1.6), transform(x, base + 0.17, z + dz)),
      { material: 'concrete_wall', tier: 'structure', tint: 0xd6cdba },
    );
    for (const dx of [-0.45, 0.45]) {
      sink.addStatic(
        placed(boxGeometry(0.5, 1.35, 0.62, 0.05, 1.4), transform(x + dx, base + 1.0, z + dz)),
        { material: 'metal_panel', tier: 'structure', tint: 0xc4bca8 },
      );
      sink.addCollider(
        new THREE.Vector3(x + dx, base + 1.0, z + dz),
        new THREE.Vector3(0.25, 0.68, 0.31),
        0,
        { surface: 'metal' },
      );
    }
  }
  buildExteriorStair(sink, x + width / 2 + 1.2, z - depth / 2 + 1.2, 'z', 1, base, deckTop, 1.5);
  addWalkway(sink, x + width / 2 - 0.4, z - depth / 2 + 6.6, x + width / 2 + 2.2, z - depth / 2 + 6.6, deckTop, 1.5);
  derelictVehicle(sink, 'sedan', x - 4.4, z + 2.6, 0.06, { burnt: true });
  groundStain(sink, x - 4.4, z + 2.6, 2.4, 0x3a352f);
  for (let i = 0; i < 3; i++) {
    oilBarrel(sink, x + 5.6, z - 3.2 + i * 0.95, sink.rng.range(0, TAU), { tint: 0x8a5a44 });
  }
  jerryCan(sink, x + 4.6, z + 3.4, 0.5);
  jerryCan(sink, x + 4.9, z + 3.9, 1.4);
  sink.addLandmark('fuel_station', x, deckTop, z);
}

// ---------------------------------------------------------------------------
// Cross streets
// ---------------------------------------------------------------------------

function buildConnectors(sink: Sink, field: TerrainField): void {
  // Cross north: a checkpoint that funnels without sealing.
  hescoBarrier(sink, -12.5, -24.5, 0, 5, 1.25);
  hescoBarrier(sink, -6, -24.5, 0, 5, 1.25);
  jerseyBarrier(sink, -1, -31.6, Math.PI / 2);
  jerseyBarrier(sink, -1, -28, Math.PI / 2);
  derelictVehicle(sink, 'pickup', -20, -26.5, Math.PI * 0.5, { paint: 'tan' });
  derelictVehicle(sink, 'sedan', 20.5, -30.2, Math.PI * 1.02, { paint: 'red' });
  sandbagWall(sink, 27, -24.6, 0, 5.2, 4);
  streetLamp(sink, -16.8, -24.2, 0);
  streetLamp(sink, 18.5, -32.2, Math.PI);
  roadSign(sink, -0.6, -24.4, 0.4, 'round');

  // Cross centre: the crossroads. Wrecks give cover in the open middle.
  derelictVehicle(sink, 'truck', -14, 1.2, Math.PI * 0.03, { paint: 'green', burnt: true });
  groundStain(sink, -14, 1.2, 2.6, 0x38342e);
  derelictVehicle(sink, 'sedan', 8.5, 4.4, Math.PI * 0.52, { paint: 'blue' });
  derelictVehicle(sink, 'pickup', 26, -1.6, Math.PI * 1.48, { paint: 'white', stripped: true });
  jerseyBarrier(sink, -6.5, 5.4, 0);
  jerseyBarrier(sink, -3, 5.4, 0);
  jerseyBarrier(sink, 17, -1.4, 0);
  jerseyBarrier(sink, 20.5, -1.4, 0);
  sandbagNest(sink, 2, -6.5, Math.PI, 2.1);
  sandbagWall(sink, -22.4, 5.5, Math.PI / 2, 4.4, 4);
  streetLamp(sink, -33.6, 5.6, Math.PI / 2);
  streetLamp(sink, 6.2, -1.8, -Math.PI / 2);
  tyreStack(sink, -17.5, 6.4, 0.3, 4);

  // Cross south: market end, planters and a bus stop.
  buildBusStop(sink, field, -6, 26.2, Math.PI);
  planter(sink, 8.5, 26.4, 0, 1.2);
  planter(sink, 11.5, 26.4, 0, 1.2);
  bench(sink, 15, 26.6, Math.PI);
  derelictVehicle(sink, 'pickup', -34, 33.6, Math.PI * 0.98, { paint: 'green' });
  derelictVehicle(sink, 'sedan', 21.5, 33.8, Math.PI * 0.02, { paint: 'tan', burnt: true });
  sandbagWall(sink, -12.6, 26.4, 0, 5, 3);
  jerseyBarrier(sink, 25.6, 34.4, 0);
  jerseyBarrier(sink, 29.1, 34.4, 0);
  streetLamp(sink, 18.6, 34.4, Math.PI);
  streetLamp(sink, -20, 26, 0);
  roadSign(sink, -16.6, 34.6, Math.PI - 0.3, 'square');

  // Power line down the west road with poles on the shoulder.
  for (const z of [-40, -16, 8, 32]) powerPole(sink, -32.2, z, 0, 7.6);
  for (let i = 0; i < 3; i++) {
    const z0 = -40 + i * 24;
    powerLine(
      sink,
      new THREE.Vector3(-32.2, sink.ground(-32.2, z0) + 7.1, z0),
      new THREE.Vector3(-32.2, sink.ground(-32.2, z0 + 24) + 7.1, z0 + 24),
    );
  }
  for (const z of [-44, -20, 4, 28, 46]) streetLamp(sink, -43.6, z, Math.PI / 2);
}

function buildBusStop(sink: Sink, field: TerrainField, x: number, z: number, yaw: number): void {
  const base = field.height(x, z);
  const width = 4.2;
  const depth = 1.6;
  const height = 2.5;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const local = (lx: number, lz: number): [number, number] => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];

  for (const lx of [-width / 2 + 0.1, width / 2 - 0.1]) {
    const [px, pz] = local(lx, depth / 2 - 0.1);
    sink.addStatic(
      placed(boxGeometry(0.12, height, 0.12, 0.02, 1.4), transform(px, base + height / 2, pz, yaw)),
      { material: 'steel_brushed', tier: 'structure', tint: 0x9aa09b },
    );
  }
  const [rx, rz] = local(0, 0);
  sink.addStatic(
    placed(boxGeometry(width, 0.12, depth, 0.02, 1.8), transform(rx, base + height, rz, yaw)),
    { material: 'metal_corrugated', tier: 'structure', tint: 0xb4aa98 },
  );
  const [bx, bz] = local(0, -depth / 2 + 0.1);
  sink.addStatic(
    placed(boxGeometry(width, height - 0.4, 0.14, 0.03, 1.8), transform(bx, base + (height - 0.4) / 2, bz, yaw)),
    { material: 'metal_panel', tier: 'structure', tint: 0xb8b2a2 },
  );
  sink.addCollider(
    new THREE.Vector3(bx, base + (height - 0.4) / 2, bz),
    new THREE.Vector3(width / 2, (height - 0.4) / 2, 0.07),
    yaw,
    { surface: 'metal' },
  );
  bench(sink, rx, rz, yaw);
  sink.addLandmark('bus_stop', x, base + height, z);
}

// ---------------------------------------------------------------------------
// Spawns
// ---------------------------------------------------------------------------

function buildSpawns(
  sink: Sink,
  field: TerrainField,
  need: (name: string) => BuildingResult,
): void {
  const north = need('north_hut');
  const south = need('south_depot');

  // North (enemy) — a military checkpoint. Facing +Z, which is yaw = PI.
  buildApron(sink, field, -34, -52, 34, -42, 'dirt_ground');
  hescoBarrier(sink, -22, -42.5, 0, 5.4, 1.35);
  hescoBarrier(sink, -16, -42.5, 0, 5.4, 1.35);
  hescoBarrier(sink, 14, -42.5, 0, 5.4, 1.35);
  hescoBarrier(sink, 20, -42.5, 0, 5.4, 1.35);
  sandbagWall(sink, -4, -42.6, 0, 6, 4);
  sandbagWall(sink, 6, -42.6, 0, 6, 4);
  sandbagNest(sink, -28, -48, Math.PI, 2.1);
  sandbagNest(sink, 28, -48, Math.PI, 2.1);
  derelictVehicle(sink, 'truck', -8, -49.5, Math.PI * 0.99, { paint: 'green' });
  derelictVehicle(sink, 'pickup', 12, -49.5, Math.PI * 1.01, { paint: 'tan' });
  for (let i = 0; i < 4; i++) {
    ammoCrate(sink, 2 + i * 1.0, -51.5, Math.PI / 2 + sink.rng.range(-0.2, 0.2));
  }
  for (let i = 0; i < 3; i++) oilBarrel(sink, -18 + i * 0.9, -50.5, sink.rng.range(0, TAU), { tint: 0x5a6a5a });
  blockStack(sink, north.footprint.maxX + 0.9, north.footprint.maxZ - 1.4, 0, 5);
  addRoofLadder(sink, north.footprint.maxX + 0.35, north.footprint.maxZ - 1.4, Math.PI / 2, north.roofY);
  rooftopPosition(sink, north, 1);
  sink.addLandmark('north_spawn', 0, field.height(0, -48), -48);

  const northSpawns: Array<[number, number]> = [
    [-30, -50],
    [-22, -47],
    [-14, -50.5],
    [-6, -46.5],
    [2, -49],
    [10, -46.5],
    [18, -50],
    [26, -47],
    [-34, -45],
    [32, -45],
  ];
  for (const [x, z] of northSpawns) {
    sink.addSpawn(x, z, Math.PI + sink.rng.range(-0.14, 0.14), 'enemy', 1);
  }

  // South (player) — a civilian depot yard. Facing -Z, which is yaw = 0.
  buildApron(sink, field, -34, 42, 34, 54, 'dirt_ground');
  jerseyBarrier(sink, -20, 44.5, 0);
  jerseyBarrier(sink, -16.5, 44.5, 0);
  jerseyBarrier(sink, 16.5, 44.5, 0);
  jerseyBarrier(sink, 20, 44.5, 0);
  sandbagWall(sink, -6, 44.6, 0, 6, 4);
  sandbagWall(sink, 8, 44.6, 0, 6, 4);
  sandbagNest(sink, -26, 50, 0, 2.1);
  sandbagNest(sink, 26, 50, 0, 2.1);
  derelictVehicle(sink, 'bus', -14, 51.5, Math.PI * 0.01, { paint: 'white' });
  derelictVehicle(sink, 'pickup', 20, 51, Math.PI * 0.02, { paint: 'blue' });
  shippingContainer(sink, -30, 54.5, 0.02, { tint: 0x8a6a4a, walkable: true });
  shippingContainer(sink, 30, 54.5, -0.02, { tint: 0x6a7f8a, walkable: true });
  for (let i = 0; i < 4; i++) {
    woodCrate(sink, -2 + i * 1.0, sink.ground(-2 + i, 52.5), 52.5, sink.rng.range(0, TAU), 0.9);
  }
  pallet(sink, 12, 53, 0.4);
  blockStack(sink, south.footprint.minX - 0.9, south.footprint.minZ + 1.4, 0, 5);
  addRoofLadder(sink, south.footprint.minX - 0.35, south.footprint.minZ + 1.4, -Math.PI / 2, south.roofY);
  rooftopPosition(sink, south, 1);
  sink.addLandmark('south_spawn', 0, field.height(0, 48), 48);

  const southSpawns: Array<[number, number]> = [
    [-30, 50],
    [-22, 47],
    [-14, 50.5],
    [-6, 46.5],
    [2, 49],
    [10, 46.5],
    [18, 50],
    [26, 47],
    [-34, 45],
    [32, 45],
  ];
  for (const [x, z] of southSpawns) {
    sink.addSpawn(x, z, sink.rng.range(-0.14, 0.14), 'player', 1);
  }
}

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------

/**
 * The edge of the map, made of reasons rather than an invisible wall: collapsed
 * terraces, a rubble spill across each road, compound walls and wire.
 */
function buildBoundary(sink: Sink, field: TerrainField): void {
  const half = PLAY_HALF;

  // North and south: rubble spills across the lanes with wire between them.
  for (const z of [-half - 1, half + 1]) {
    const inward = z < 0 ? 1 : -1;
    rubbleBerm(sink, -half, z, -22, z, 2.6);
    rubbleBerm(sink, -14, z, 14, z, 2.6);
    rubbleBerm(sink, 22, z, half, z, 2.6);
    chainLinkFence(sink, -20, z + inward * 0.6, -16, z + inward * 0.6, 2.4);
    chainLinkFence(sink, 16, z + inward * 0.6, 20, z + inward * 0.6, 2.4);
    for (let i = 0; i < 6; i++) {
      const x = sink.rng.range(-half, half);
      rubblePile(sink, x, z + inward * sink.rng.range(1.2, 2.6), sink.rng.range(0, TAU), sink.rng.range(0.9, 1.5));
    }
  }

  // East and west: compound walls with breaches packed by rubble.
  for (const x of [-half - 1, half + 1]) {
    const inward = x < 0 ? 1 : -1;
    for (const [z0, z1] of [
      [-half, -30],
      [-24, 10],
      [16, half],
    ] as const) {
      buildWall(sink, {
        x0: x,
        z0,
        x1: x,
        z1,
        base: field.height(x, (z0 + z1) / 2) - 0.4,
        height: 3.4,
        thickness: 0.42,
        material: BRICK,
        tint: 0xcdc2ae,
        mottle: 0.45,
        plinth: true,
      });
    }
    rubbleBerm(sink, x, -30, x, -24, 2.4);
    rubbleBerm(sink, x, 10, x, 16, 2.4);
    chainLinkFence(sink, x + inward * 0.5, -29, x + inward * 0.5, -25, 2.4);
    for (let i = 0; i < 6; i++) {
      const z = sink.rng.range(-half, half);
      rubblePile(sink, x + inward * sink.rng.range(1.0, 2.4), z, sink.rng.range(0, TAU), sink.rng.range(0.9, 1.4));
    }
  }

  // Collapsed terrace fragments, so the boundary reads as buildings that fell in.
  const fragments: Array<[number, number, number, number]> = [
    [-half + 3, -44, 7, 5],
    [-half + 4, 34, 6, 6],
    [-30, -half + 3, 6, 5],
    [16, -half + 4, 7, 5],
    [half - 4, -14, 6, 7],
    [half - 3, 30, 5, 6],
    [-14, half - 3, 7, 5],
    [24, half - 4, 6, 5],
  ];
  for (const [x, z, width, depth] of fragments) {
    const base = field.height(x, z);
    const height = sink.rng.range(2.4, 4.2);
    buildLowWall(sink, x - width / 2, z - depth / 2, x + width / 2, z - depth / 2, base, height, PEELING, 0.36);
    buildLowWall(sink, x - width / 2, z + depth / 2, x - width / 2, z - depth / 2, base, height * 0.7, PEELING, 0.36);
    rubbleBerm(sink, x - width / 2, z + depth / 2 - 0.4, x + width / 2, z + depth / 2 - 0.4, 2.2);
    debrisField(sink, x - width / 2, z - depth / 2, x + width / 2, z + depth / 2, 14);
  }
}

// ---------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------

function buildScatter(sink: Sink, field: TerrainField): void {
  const offRoad = (x: number, z: number): boolean => field.onRoad(x, z, -1.6);

  // Planting concentrates in the corners and along the boundary, where it breaks
  // up the silhouette without eating cover in the fighting space.
  scatterVegetation(sink, { minX: -54, minZ: -54, maxX: -34, maxZ: -32 }, { palms: 3, bushes: 7, tufts: 16, reject: offRoad });
  scatterVegetation(sink, { minX: -54, minZ: 30, maxX: -34, maxZ: 52 }, { palms: 3, bushes: 8, tufts: 18, reject: offRoad });
  scatterVegetation(sink, { minX: 34, minZ: -54, maxX: 54, maxZ: -32 }, { palms: 3, bushes: 7, tufts: 16, reject: offRoad });
  scatterVegetation(sink, { minX: 34, minZ: 34, maxX: 54, maxZ: 52 }, { palms: 2, bushes: 6, tufts: 14, reject: offRoad });
  scatterVegetation(sink, { minX: -16, minZ: 32, maxX: 18, maxZ: 44 }, { palms: 3, bushes: 5, tufts: 14, reject: offRoad });
  scatterVegetation(sink, { minX: -16, minZ: -44, maxX: 18, maxZ: -32 }, { palms: 2, bushes: 4, tufts: 12, reject: offRoad });
  scatterVegetation(sink, { minX: 24, minZ: 4, maxX: 38, maxZ: 26 }, { palms: 2, bushes: 3, tufts: 8, reject: offRoad });

  // Litter and rubble along the streets.
  debrisField(sink, -54, -54, -34, -30, 40);
  debrisField(sink, -34, -26, -18, 26, 46);
  debrisField(sink, -18, -30, 20, 30, 54);
  debrisField(sink, 20, -30, 40, 30, 46);
  debrisField(sink, 24, 30, 54, 54, 34);
  litterField(sink, -6, -30, 10, 34, 60);
  litterField(sink, -44, -30, -34, 30, 34);
  litterField(sink, 36, -40, 50, 40, 34);

  // Weeds in the kerb seams of every road.
  for (const road of field.roads) {
    if (!road.kerb) continue;
    for (const side of [-1, 1]) {
      const offset = side * (road.halfWidth + 0.35);
      if (road.axis === 'x') {
        seamWeeds(sink, road.from + 4, road.center + offset, road.to - 4, road.center + offset, 22);
      } else {
        seamWeeds(sink, road.center + offset, road.from + 4, road.center + offset, road.to - 4, 22);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ground clutter
// ---------------------------------------------------------------------------

/**
 * The layer that decides whether the town is inhabited or merely dressed.
 *
 * Runs last, so `sink.groundClaimed` can reject anything that would land inside
 * a wall, a wreck or a barrier without every set piece having to publish a
 * footprint. Nothing here collides except a handful of waist-high stacks placed
 * at hand-picked positions well clear of the doorways and lanes, so the
 * navigation graph the AI already solved is untouched.
 *
 * The placement rules, in the order they matter:
 *
 * 1. Loose matter banks against every wall on the map and heaps at the corners.
 *    A hard line where masonry meets terrain is the strongest tell there is.
 * 2. Wear follows the lines people and vehicles actually travel — down the
 *    lanes, across the crossroads, in and out of every doorway.
 * 3. What accumulates follows what the building is for: timber and pipe at the
 *    workshop, produce and chairs at the shops, brass behind the emplacements.
 * 4. Nothing is square to anything and nothing sits exactly on the ground.
 */
function buildGroundClutter(
  sink: Sink,
  field: TerrainField,
  need: (name: string) => BuildingResult,
): void {
  dressWallFeet(sink, field, need);
  dressRoads(sink, field);
  dressMarketStreet(sink, need);
  dressYards(sink, need);
  dressSpans(sink, need);
  dressEmplacements(sink);
  dressOpenGround(sink, field);
}

/**
 * The ground that is neither a road channel nor a wall foot.
 *
 * Those two get dressed thoroughly and between them lies most of the map's open
 * terrain, carrying nothing — which is what the bare sand in the middle distance
 * of a shot actually is. This lays a thin scatter over it on a coarse grid where
 * only a third of the cells draw anything, so it drifts in patches the way blown
 * rubbish does rather than covering the ground evenly, which would read as noise
 * printed on the material. Grit-heavy, because away from where people stand it
 * is mostly stones.
 *
 * Free in draw calls: every piece is flagged as clutter, and clutter pools into
 * the map-wide instance groups the rest of the litter already fills.
 */
function dressOpenGround(sink: Sink, field: TerrainField): void {
  const step = 6;
  const reach = 44;
  const mix: LitterMix = { paper: 1, card: 1, can: 1, rag: 1, crumb: 4 };
  for (let gx = -reach; gx <= reach; gx += step) {
    for (let gz = -reach; gz <= reach; gz += step) {
      if (!sink.rng.bool(0.34)) continue;
      const cx = gx + sink.rng.range(-step / 2, step / 2);
      const cz = gz + sink.rng.range(-step / 2, step / 2);
      if (sink.groundClaimed(cx, cz, 0.6)) continue;
      // The carriageway and its channels are already dressed to their own
      // density; a second pass over them only doubles the cost where it is
      // already right.
      if (field.onRoad(cx, cz, 0.5)) continue;
      const spread = sink.rng.range(1.2, 2.6);
      litterArea(
        sink,
        { minX: cx - spread, minZ: cz - spread, maxX: cx + spread, maxZ: cz + spread },
        sink.rng.int(2, 5),
        { mix, reject: (x, z) => sink.groundClaimed(x, z, 0) },
      );
      if (sink.rng.bool(0.45)) rubbleCrumbs(sink, cx, cz, spread * 0.8, sink.rng.int(3, 7));
    }
  }
}

/**
 * Cables and washing strung between facades across the narrow gaps.
 *
 * The single most characteristic thing about a street like this from eye level
 * is that the sky above it is crossed by wires. It is also nearly free: a
 * catenary is a dozen segments of tube in the district's existing detail batch,
 * and it converts an empty band of sky into depth cues at three different
 * distances. Spans are picked between facades that genuinely face each other
 * across an alley, so the geometry never floats with nothing to anchor to.
 */
function dressSpans(sink: Sink, need: (name: string) => BuildingResult): void {
  const link = (
    a: string,
    aEdge: 'minX' | 'maxX',
    az: number,
    b: string,
    bEdge: 'minX' | 'maxX',
    bz: number,
    drop: number,
    washing: boolean,
  ): void => {
    const ra = need(a);
    const rb = need(b);
    const from = new THREE.Vector3(ra.footprint[aEdge], ra.roofY - drop, az);
    const to = new THREE.Vector3(rb.footprint[bEdge], rb.roofY - drop, bz);
    if (washing) laundryLine(sink, from, to);
    else cableSpan(sink, from, to, sink.rng.bool(0.3) ? 2 : 1);
  };

  // West alley, between the apartment block and the market hall.
  link('apartment_w', 'maxX', 11.5, 'market_hall', 'minX', 11.2, 0.9, true);
  link('apartment_w', 'maxX', 19.0, 'market_hall', 'minX', 19.4, 1.6, false);
  link('warehouse', 'maxX', -16.5, 'market_annex', 'minX', -16.2, 1.1, true);
  link('warehouse', 'maxX', -7.5, 'market_annex', 'minX', -7.8, 0.8, false);

  // South end, across the gap between the row house and the tea house.
  link('row_house_w', 'maxX', 38.5, 'tea_house', 'minX', 38.2, 0.7, true);

  // East alley, between the south shop row and the mosque compound.
  link('shop_row_s', 'maxX', 12.0, 'mosque', 'minX', 12.4, 1.2, false);
  link('shop_row_n', 'maxX', -14.0, 'bombed_house', 'minX', -14.4, 1.4, false);
  link('municipal', 'maxX', -36.0, 'bombed_house', 'minX', -35.6, 0.9, true);

  // Down the west road, from the pole line into the facades it feeds.
  for (const [z, name] of [
    [-16, 'warehouse'],
    [8, 'apartment_w'],
    [32, 'row_house_w'],
  ] as const) {
    const r = need(name);
    cableSpan(
      sink,
      new THREE.Vector3(-32.2, sink.ground(-32.2, z) + 6.9, z),
      new THREE.Vector3(r.footprint.minX, r.roofY - 0.8, z + sink.rng.range(-1, 1)),
      1,
    );
  }
}

/** Litter mix and foot dressing appropriate to what each building is for. */
function dressWallFeet(
  sink: Sink,
  field: TerrainField,
  need: (name: string) => BuildingResult,
): void {
  for (const spec of BUILDINGS) {
    const result = need(spec.name);
    const foot = inflate(result.footprint, 0.12);
    wallFoot(sink, foot, {
      kind: spec.use === 'workshop' || spec.use === 'store' ? 'yard' : 'street',
      grit: spec.shelled ? 1.4 : 1,
    });

    // Something leaned or stacked against one street-facing wall, chosen by
    // trade. A workshop keeps its offcuts outside; a shop keeps its stock.
    const spots = streetFacingSpots(sink, field, result.footprint);
    if (spots.length === 0) continue;
    const use = spec.use ?? (spec.shelled ? 'derelict' : 'home');
    for (const spot of spots) {
      dressWallSpot(sink, use, spot);
    }
  }
}

interface WallSpot {
  x: number;
  z: number;
  /** Yaw with local +Z pointing away from the wall. */
  yaw: number;
}

/**
 * Up to two points on the faces of a footprint that a road runs past.
 *
 * Dressing every wall equally wastes the budget on the backs of buildings
 * nobody walks behind. Asking the road grid which faces are public puts the junk
 * where it will be seen and read.
 */
function streetFacingSpots(sink: Sink, field: TerrainField, r: Rect): WallSpot[] {
  const faces: Array<{ x: number; z: number; outX: number; outZ: number; yaw: number; span: number }> = [
    { x: (r.minX + r.maxX) / 2, z: r.minZ, outX: 0, outZ: -1, yaw: Math.PI, span: r.maxX - r.minX },
    { x: r.maxX, z: (r.minZ + r.maxZ) / 2, outX: 1, outZ: 0, yaw: -Math.PI / 2, span: r.maxZ - r.minZ },
    { x: (r.minX + r.maxX) / 2, z: r.maxZ, outX: 0, outZ: 1, yaw: 0, span: r.maxX - r.minX },
    { x: r.minX, z: (r.minZ + r.maxZ) / 2, outX: -1, outZ: 0, yaw: Math.PI / 2, span: r.maxZ - r.minZ },
  ];
  const spots: WallSpot[] = [];
  for (const face of faces) {
    if (!field.onRoad(face.x + face.outX * 4.5, face.z + face.outZ * 4.5, 1.5)) continue;
    // One drop per nine metres of frontage: a thirty-metre wall with a single
    // stack against it is still a bare thirty-metre wall.
    const drops = Math.max(1, Math.min(4, Math.round(face.span / 9)));
    for (let i = 0; i < drops; i++) {
      // Spread along the face and jittered inside its slot, never on its centre
      // line, which is where the doorway is.
      const t = (i + 0.5) / drops + sink.rng.range(-0.16, 0.16);
      if (Math.abs(t - 0.5) < 0.11) continue;
      const along = (t - 0.5) * face.span;
      const x = face.x + (face.outZ !== 0 ? along : 0) + face.outX * 0.55;
      const z = face.z + (face.outX !== 0 ? along : 0) + face.outZ * 0.55;
      if (sink.groundClaimed(x, z, 0.4)) continue;
      spots.push({ x, z, yaw: face.yaw });
    }
    if (spots.length >= 6) break;
  }
  return spots;
}

function dressWallSpot(sink: Sink, use: string, spot: WallSpot): void {
  const { x, z, yaw } = spot;
  // Along the wall, so a group spreads sideways rather than out into the road.
  const ax = Math.cos(yaw);
  const az = -Math.sin(yaw);
  const beside = (d: number): [number, number] => [x + ax * d, z + az * d];

  switch (use) {
    case 'workshop':
      if (sink.rng.bool(0.5)) woodPile(sink, x, z, yaw, sink.rng.int(4, 7));
      else pipeBundle(sink, x, z, yaw, sink.rng.int(3, 6));
      if (sink.rng.bool(0.6)) bucket(sink, ...beside(0.85), sink.rng.range(0, TAU));
      if (sink.rng.bool(0.45)) tyreSprawl(sink, ...beside(-1.15), yaw, sink.rng.int(2, 4));
      if (sink.rng.bool(0.35)) basin(sink, ...beside(1.35), sink.rng.range(0, TAU));
      break;
    case 'store':
      if (sink.rng.bool(0.55)) crateStack(sink, x, z, yaw, sink.rng.int(2, 3));
      else tyreSprawl(sink, x, z, yaw, sink.rng.int(3, 5));
      if (sink.rng.bool(0.5)) sackPile(sink, ...beside(1.2), yaw, sink.rng.int(3, 4));
      if (sink.rng.bool(0.4)) pipeBundle(sink, ...beside(-1.3), yaw, sink.rng.int(3, 5));
      break;
    case 'shop':
      if (sink.rng.bool(0.6)) {
        produceCrate(sink, x, z, yaw + sink.rng.range(-0.4, 0.4));
        produceCrate(sink, ...beside(0.62), yaw + sink.rng.range(-0.4, 0.4));
      } else {
        sackPile(sink, x, z, yaw, sink.rng.int(3, 5));
      }
      if (sink.rng.bool(0.5)) plasticChair(sink, ...beside(-0.95), sink.rng.range(0, TAU));
      if (sink.rng.bool(0.4)) crateStack(sink, ...beside(1.4), yaw, 2);
      if (sink.rng.bool(0.3)) bucket(sink, ...beside(-1.5), sink.rng.range(0, TAU));
      break;
    case 'hall':
      if (sink.rng.bool(0.6)) plasticStool(sink, x, z, sink.rng.range(0, TAU));
      if (sink.rng.bool(0.5)) basin(sink, ...beside(0.75), sink.rng.range(0, TAU));
      if (sink.rng.bool(0.45)) produceCrate(sink, ...beside(-0.9), yaw + sink.rng.range(-0.4, 0.4));
      if (sink.rng.bool(0.3)) plasticChair(sink, ...beside(1.5), sink.rng.range(0, TAU));
      break;
    case 'derelict':
      rubbleCrumbs(sink, x, z, 1.5, 14);
      if (sink.rng.bool(0.5)) leaningLadder(sink, x, z, yaw, 2.6);
      if (sink.rng.bool(0.45)) tyreSprawl(sink, ...beside(1.2), yaw, sink.rng.int(2, 3));
      if (sink.rng.bool(0.4)) bucket(sink, ...beside(-1.1), sink.rng.range(0, TAU));
      break;
    default:
      if (sink.rng.bool(0.5)) bucket(sink, x, z, sink.rng.range(0, TAU));
      if (sink.rng.bool(0.45)) basin(sink, ...beside(0.6), sink.rng.range(0, TAU));
      if (sink.rng.bool(0.3)) bicycle(sink, ...beside(-0.75), yaw + Math.PI / 2);
      if (sink.rng.bool(0.35)) plasticStool(sink, ...beside(1.25), sink.rng.range(0, TAU));
      break;
  }
  buttPatch(sink, x + sink.rng.range(-1.6, 1.6), z + sink.rng.range(-0.5, 0.5));
}

/**
 * Road wear. Patches and tracks go on the carriageway, drains and broken kerbs
 * on the channel, and the whole point is that the surface stops being one flat
 * unbroken tone under the player's feet.
 */
function dressRoads(sink: Sink, field: TerrainField): void {
  for (const road of field.roads) {
    const along = road.to - road.from;
    if (along < 8) continue;
    const paved = road.surface === 'asphalt';
    const at = (t: number, across: number): [number, number] =>
      road.axis === 'z'
        ? [road.center + across, road.from + along * t]
        : [road.from + along * t, road.center + across];

    // Two wheel paths down the middle of every carriageway.
    const [tx0, tz0] = at(0.04, 0);
    const [tx1, tz1] = at(0.96, 0);
    tyreTracks(sink, tx0, tz0, tx1, tz1, Math.min(2.1, road.halfWidth * 1.25));

    if (paved) {
      const patches = Math.round(along / 13);
      for (let i = 0; i < patches; i++) {
        const [px, pz] = at((i + sink.rng.range(0.2, 0.8)) / patches, sink.rng.range(-1, 1) * road.halfWidth * 0.6);
        if (sink.groundClaimed(px, pz, 0.2)) continue;
        roadPatch(sink, px, pz, sink.rng.range(1.1, 2.3));
      }
      // Sand lies in the channel and at the crown's edge, never in the wheel path.
      const drifts = Math.round(along / 18);
      for (let i = 0; i < drifts; i++) {
        const side = sink.rng.sign();
        const [sx, sz] = at((i + sink.rng.range(0.15, 0.85)) / drifts, side * road.halfWidth * sink.rng.range(0.6, 0.95));
        if (sink.groundClaimed(sx, sz, 0.2)) continue;
        sandDrift(sink, sx, sz, sink.rng.range(0.8, 1.5));
      }
      // Gullies sit in the channel at the kerb, which is where water goes.
      const drains = Math.max(1, Math.round(along / 26));
      for (let i = 0; i < drains; i++) {
        const side = sink.rng.sign();
        const [dx, dz] = at((i + 0.5) / drains, side * (road.halfWidth - 0.55));
        if (sink.groundClaimed(dx, dz, 0.3)) continue;
        drainCover(sink, dx, dz, road.axis === 'z' ? 0 : Math.PI / 2);
      }
    }

    if (road.kerb) {
      const knocks = Math.max(1, Math.round(along / 22));
      for (let i = 0; i < knocks; i++) {
        const side = sink.rng.sign();
        const [kx, kz] = at(sink.rng.range(0.08, 0.92), side * (road.halfWidth + 0.18));
        if (sink.groundClaimed(kx, kz, 0.25)) continue;
        kerbDamage(sink, kx, kz, road.axis === 'z' ? Math.PI / 2 : 0);
      }
      // Litter collects in the channel, not on the crown of the road.
      for (const side of [-1, 1]) {
        const across = side * (road.halfWidth - 0.3);
        const [ax, az] = at(0.03, across);
        const [bx, bz] = at(0.97, across);
        litterBand(sink, ax, az, bx, bz, road.axis === 'z' ? side : 0, road.axis === 'z' ? 0 : side, Math.round(along * 0.42), { reach: 0.9 });
      }
    }
  }

  // Desire paths across the open ground, where the lanes meet and everybody cuts
  // the corner rather than walking round it.
  wearPath(sink, 2, 30, 2, 8, 2.2);
  wearPath(sink, 2, 8, 2, -26, 2.0);
  wearPath(sink, -19, -24, -19, 22, 1.7);
  wearPath(sink, 22, -24, 22, 30, 1.8);
  wearPath(sink, -34, 2, 18, 2, 1.9);
  wearPath(sink, -12, 26, 14, 26, 1.7);
  wearPath(sink, 24.5, 15, 38, 15, 1.6);
}

/**
 * The market street, which is the view the map is judged on.
 *
 * The stall line already zig-zags down it, so the dressing goes in the dead
 * space the stalls leave: against the shopfronts, in the gaps between stalls, and
 * spilling out of the arcade. The middle three metres stay clear because that is
 * the lane the whole level fights down.
 */
function dressMarketStreet(sink: Sink, need: (name: string) => BuildingResult): void {
  const hall = need('market_hall');
  const shopS = need('shop_row_s');
  const shopN = need('shop_row_n');
  const annex = need('market_annex');

  // Goods spilling out of both shop rows, packed against the wall.
  const westFace = hall.footprint.maxX + 0.5;
  const eastFace = shopS.footprint.minX - 0.5;
  const rows: Array<[number, number, number]> = [
    [westFace, 9.5, -Math.PI / 2],
    [westFace, 13.6, -Math.PI / 2],
    [westFace, 18.2, -Math.PI / 2],
    [westFace, 22.0, -Math.PI / 2],
    // Between the east stalls, which stand at 8.5, 12, 16, 20 and 24.
    [eastFace, 10.2, Math.PI / 2],
    [eastFace, 14.0, Math.PI / 2],
    [eastFace, 18.1, Math.PI / 2],
    [eastFace, 22.2, Math.PI / 2],
  ];
  for (const [x, z, yaw] of rows) {
    if (sink.groundClaimed(x, z, 0.3)) continue;
    const roll = sink.rng.next();
    if (roll < 0.3) {
      produceCrate(sink, x, z, yaw + sink.rng.range(-0.35, 0.35));
      produceCrate(sink, x, z + 0.62, yaw + sink.rng.range(-0.35, 0.35));
      if (sink.rng.bool(0.5)) produceCrate(sink, x + sink.rng.range(-0.1, 0.1), z + 0.3, yaw, sink.ground(x, z) + 0.2);
    } else if (roll < 0.5) {
      sackPile(sink, x, z, yaw, sink.rng.int(3, 5));
    } else if (roll < 0.66) {
      crateStack(sink, x, z, yaw, sink.rng.int(2, 3));
    } else if (roll < 0.78) {
      plasticStool(sink, x, z, sink.rng.range(0, TAU));
      plasticChair(sink, x + sink.rng.range(-0.3, 0.3), z + 0.8, sink.rng.range(0, TAU));
    } else if (roll < 0.88) {
      tyreSprawl(sink, x, z, yaw, sink.rng.int(3, 5));
    } else {
      bucket(sink, x, z, sink.rng.range(0, TAU));
      basin(sink, x + sink.rng.range(-0.3, 0.3), z + 0.55, sink.rng.range(0, TAU));
    }
  }

  // Sweepings against the shopfronts themselves. The lane already carries a
  // litter band down each gutter line, but that band stops about a metre out
  // from the stalls, and the strip between the stall line and the masonry is
  // both where a market's rubbish actually ends up and the ground a player sees
  // closest, with the wall a metre from their eye.
  const faces: Array<readonly [number, number, number, number]> = [
    [hall.footprint.maxX + 0.1, hall.footprint.minZ + 0.8, hall.footprint.maxZ - 0.8, 1],
    [annex.footprint.maxX + 0.1, annex.footprint.minZ + 0.8, annex.footprint.maxZ - 0.8, 1],
    [shopS.footprint.minX - 0.1, shopS.footprint.minZ + 0.8, shopS.footprint.maxZ - 0.8, -1],
    [shopN.footprint.minX - 0.1, shopN.footprint.minZ + 0.8, shopN.footprint.maxZ - 0.8, -1],
  ];
  for (const [x, z0, z1, out] of faces) {
    const run = z1 - z0;
    if (run < 3) continue;
    grtBank(sink, x, z0, x, z1, out, 0, Math.round(run * 0.8));
    litterBand(sink, x, z0, x, z1, out, 0, Math.round(run * 1.2), { reach: 1.6 });
  }

  // A handcart and a bicycle: the two silhouettes that say people move things
  // through here by hand.
  handcart(sink, hall.footprint.maxX + 1.1, 15.8, -Math.PI / 2 + sink.rng.range(-0.3, 0.3));
  bicycle(sink, shopS.footprint.minX - 0.55, 14.6, Math.PI / 2);
  bicycle(sink, annex.footprint.maxX + 0.6, -8.5, -Math.PI / 2);
  wheelbarrow(sink, shopN.footprint.minX - 0.9, -17.5, Math.PI / 2 + 0.3);

  // Awning-height cloth over the two widest gaps, which shades the lane and
  // breaks the long straight run of roof edge.
  shadeCloth(sink, 2.2, hall.base + 3.5, 6.4, 0.06, 5.6, 3.0);
  shadeCloth(sink, 2.0, hall.base + 3.6, 24.6, -0.05, 5.2, 2.8);

  // Rags over the balcony rails and stall frames.
  for (const [x, y, z, yaw] of [
    [hall.footprint.maxX + 0.05, hall.base + 3.9, 11.4, -Math.PI / 2],
    [shopS.footprint.minX - 0.05, shopS.base + 3.9, 17.2, Math.PI / 2],
    [shopN.footprint.minX - 0.05, shopN.base + 3.9, -13.0, Math.PI / 2],
  ] as const) {
    hangingRag(sink, x, y, z, yaw, sink.rng.range(0.45, 0.7), sink.rng.range(0.6, 0.95));
  }

  // Cables strung across the street between the two rows, which is what makes a
  // market street read as roofed even where it is open.
  cableSpan(
    sink,
    new THREE.Vector3(hall.footprint.maxX, hall.roofY - 0.6, 8.2),
    new THREE.Vector3(shopS.footprint.minX, shopS.roofY - 0.5, 8.6),
    2,
  );
  cableSpan(
    sink,
    new THREE.Vector3(hall.footprint.maxX, hall.roofY - 0.5, 20.4),
    new THREE.Vector3(shopS.footprint.minX, shopS.roofY - 0.7, 20.0),
    2,
  );
  cableSpan(
    sink,
    new THREE.Vector3(annex.footprint.maxX, annex.roofY - 0.6, -10.5),
    new THREE.Vector3(shopN.footprint.minX, shopN.roofY - 0.5, -10.2),
    2,
  );

  // Litter along both gutter lines of the lane, heaviest where the stalls are.
  litterBand(sink, -1.0, -26, -1.0, 26, -1, 0, 70, { reach: 1.1 });
  litterBand(sink, 5.0, -26, 5.0, 26, 1, 0, 70, { reach: 1.1 });
  litterArea(sink, { minX: -0.6, minZ: 6, maxX: 4.8, maxZ: 26 }, 40, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });

  dressSouthApproach(sink);
}

/**
 * The mouth of the market street where it crosses the south lane.
 *
 * This is the first thing the player sees on spawning and the widest expanse of
 * open ground on the map, which makes it the one place bare surface is
 * unmissable. Everything goes outside the 2.8 m half-width of the lane so the
 * approach itself stays clean to walk and shoot down.
 */
function dressSouthApproach(sink: Sink): void {
  // Junction wear: this corner is driven over and cut across by everyone.
  //
  // This is also the widest paving on the map and the ground the player spawns
  // staring at, six metres from the eye and filling the bottom third of the
  // frame, so the lane surface carries as much history as the shoulders do.
  // Three vehicle lines rather than one — nobody takes the same arc twice — plus
  // the patches, the drips where they stand and the grit that collects in the
  // ruts between.
  spillStain(sink, 3.4, 30.6, 1.3, 0x5c554a);
  tyreTracks(sink, -3, 33.2, 8, 27.4, 1.8);
  tyreTracks(sink, 0.4, 37.4, 4.2, 24.8, 1.6);
  tyreTracks(sink, 9.2, 33.8, -1.6, 25.6, 1.5);
  wearPath(sink, 2.2, 37.2, 1.6, 24.2, 2.1);
  roadPatch(sink, 6.2, 28.8, 2.1);
  roadPatch(sink, -2.6, 31.9, 1.7);
  roadPatch(sink, 1.4, 31.2, 1.5);
  roadPatch(sink, 4.6, 34.6, 1.2);
  drainCover(sink, -1.4, 26.4, Math.PI / 2);
  drainCover(sink, 6.6, 33.8, 0);
  drainCover(sink, 1.1, 29.4, 0.06);
  // Where a vehicle stands at the junction rather than where it drives: small,
  // paired, off the centre of the ruts.
  for (const [dx, dz] of [
    [2.9, 32.4],
    [3.2, 33.1],
    [0.6, 27.8],
    [5.1, 30.2],
  ] as const) {
    spillStain(sink, dx, dz, sink.rng.range(0.3, 0.55), sink.rng.pick([0x4e473d, 0x585045]));
  }
  for (const [rx, rz, radius, count] of [
    [1.8, 30.2, 1.5, 7],
    [4.4, 32.8, 1.3, 6],
    [-0.2, 33.8, 1.2, 5],
  ] as const) {
    rubbleCrumbs(sink, rx, rz, radius, count);
  }
  // The kerb lines either side, carried on through the apron: the seams are what
  // make paving read as laid rather than poured, and they stop dead at z 26
  // everywhere else on the street.
  seamWeeds(sink, -0.9, 25, -0.9, 37, 9);
  seamWeeds(sink, 4.9, 25, 4.9, 37, 9);
  for (const [kx, kz, kyaw] of [
    [-1.1, 28.2, Math.PI / 2],
    [-1.1, 34.6, Math.PI / 2],
    [5.1, 26.8, -Math.PI / 2],
    [5.1, 32.2, -Math.PI / 2],
  ] as const) {
    kerbDamage(sink, kx, kz, kyaw);
  }

  // Market overspill on the west shoulder, well clear of the lane.
  const westX = -1.9;
  produceCrate(sink, westX - 0.4, 28.6, Math.PI / 2 + 0.2);
  produceCrate(sink, westX - 0.45, 29.2, Math.PI / 2 - 0.3);
  crateStack(sink, westX - 0.5, 31.4, 0.5, 3, { collide: true });
  tiedTarp(sink, westX - 0.5, sink.ground(westX - 0.5, 31.4) + 1.74, 31.4, 0.5, 1.6, 1.6);
  sackPile(sink, westX - 0.3, 33.0, Math.PI / 2, 4);
  plasticStool(sink, westX - 1.2, 30.2, 1.1);
  bucket(sink, westX - 1.0, 32.2, 0.7);

  // East shoulder: the yard side, so tyres, pipe and a barrow.
  const eastX = 5.9;
  tyreSprawl(sink, eastX + 0.7, 29.4, 0.3, 5);
  pipeBundle(sink, eastX + 0.5, 32.4, 0.1, 5);
  wheelbarrow(sink, eastX + 1.1, 27.2, 2.2);
  woodPile(sink, eastX + 0.6, 34.2, -Math.PI / 2, 5);
  bicycle(sink, eastX + 0.9, 25.4, -Math.PI / 2 + 0.2);

  // Cloth overhead, which is what stops the sky reading as a bald gap between
  // the two shop rows at the very point the player looks through it.
  shadeCloth(sink, 2.0, sink.ground(2, 28) + 3.9, 28.4, 0.04, 5.4, 3.2);

  // Blown sand across the widest paving on the map. Drifts rather than objects,
  // because this is the lane the player spawns shooting down: the ground has to
  // stop reading as a fresh slab without anything standing up in it.
  for (const [dx, dz, radius] of [
    [-4.6, 29.0, 1.6],
    [8.4, 31.4, 1.8],
    [-3.2, 35.2, 1.4],
    [7.6, 24.6, 1.2],
    [2.4, 36.4, 1.3],
    [-0.4, 32.6, 0.9],
    [5.6, 34.8, 1.1],
  ] as const) {
    sandDrift(sink, dx, dz, radius);
  }

  // Litter concentrated in the two channels and thinning into the open.
  litterBand(sink, -1.2, 24, -1.2, 36, -1, 0, 34, { reach: 1.3 });
  litterBand(sink, 5.2, 24, 5.2, 36, 1, 0, 34, { reach: 1.3 });
  litterArea(sink, { minX: -6, minZ: 24, maxX: 11, maxZ: 37 }, 46, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.15),
  });
  buttPatch(sink, -1.6, 27.4);
  buttPatch(sink, 6.4, 31.2);
  rubbleCrumbs(sink, -2.4, 34.6, 1.3, 10);
  rubbleCrumbs(sink, 7.1, 26.2, 1.2, 9);
}

/**
 * The yards and forecourts: the places the map already uses as arenas, which are
 * also the places a bare ground plane shows up worst.
 */
function dressYards(sink: Sink, need: (name: string) => BuildingResult): void {
  const workshop = need('workshop');
  const warehouse = need('warehouse');
  const tea = need('tea_house');
  const bombed = need('bombed_house');

  // Workshop yard: metalwork, so tubes, tyres and a soaked patch of ground.
  pipeBundle(sink, -45.4, -21.0, 0.3, 6);
  woodPile(sink, workshop.footprint.minX + 1.2, -20.6, Math.PI, 6);
  tyreSprawl(sink, -50.6, -20.4, 0.7, 5);
  spillStain(sink, -52.5, -22.4, 1.1, 0x5c554a);
  leaningLadder(sink, workshop.footprint.maxX + 0.35, -6.5, -Math.PI / 2, 3.6);
  wheelbarrow(sink, -45.2, -16.5, 1.1);
  bucket(sink, -46.3, -18.2, 0.4);
  bucket(sink, -46.0, -17.6, 2.1);
  litterArea(sink, { minX: -54, minZ: -26, maxX: -43.5, maxZ: -4 }, 46, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });

  // Container yard: shipping junk, and grit banked against the container flanks.
  litterArea(sink, { minX: -54, minZ: 6, maxX: -43.5, maxZ: 26 }, 40, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });
  tyreSprawl(sink, -52.4, 12.4, 0.2, 4);
  crateStack(sink, -45.2, 23.6, 0.4, 3, { collide: true });
  crateStack(sink, -44.8, 22.4, 1.2, 2);
  tiedTarp(sink, -45.0, sink.ground(-45, 23.6) + 1.72, 23.6, 0.4, 1.5, 1.5);
  pipeBundle(sink, -52.8, 18.6, 0.1, 4);

  // Warehouse loading side.
  crateStack(sink, warehouse.footprint.maxX + 1.0, warehouse.footprint.maxZ - 2.4, 0.6, 3, {
    collide: true,
  });
  leaningLadder(sink, warehouse.footprint.maxX + 0.35, warehouse.footprint.maxZ - 5.5, -Math.PI / 2, 3.2);
  sackPile(sink, warehouse.footprint.maxX + 1.1, warehouse.footprint.minZ + 6.4, -Math.PI / 2, 5);

  // Tea house terrace: chairs and stools round the benches, and the ash of
  // everyone who has sat there.
  for (let i = 0; i < 7; i++) {
    const x = -15.5 + i * 2.2 + sink.rng.range(-0.4, 0.4);
    const z = 33.2 + sink.rng.range(-0.5, 0.9);
    if (sink.groundClaimed(x, z, 0.25)) continue;
    if (sink.rng.bool(0.5)) plasticChair(sink, x, z, sink.rng.range(0, TAU));
    else plasticStool(sink, x, z, sink.rng.range(0, TAU));
  }
  buttPatch(sink, tea.footprint.minX + 5.6, tea.footprint.maxZ + 1.1);
  buttPatch(sink, tea.footprint.minX + 3.2, tea.footprint.maxZ + 0.9);
  litterArea(sink, { minX: -16, minZ: 32, maxX: -2, maxZ: 37 }, 34);

  // Construction shell: the one place stacked material is the whole point, so it
  // gets the full builder's yard — staging, tube, rebar and sheeted scaffold.
  const shellX = 31;
  const shellBase = sink.ground(shellX, -12);
  scaffolding(sink, shellX - 8.1, -8.5, 0, 2.4, 3.6, 3);
  scaffolding(sink, shellX + 0.5, -21.6, Math.PI / 2, 2.4, 3.2, 2);
  for (const [rx, rz] of [
    [shellX - 8.4, -13.2],
    [shellX - 7.6, -11.4],
    [shellX + 8.2, -17.8],
  ] as const) {
    rebarCluster(sink, rx, sink.ground(rx, rz), rz, sink.rng.int(5, 9), sink.rng.range(0.8, 1.4));
  }
  // Sheeting lashed to the outside of the scaffold, which is what a shell in this
  // condition is always wrapped in and what breaks up its bare frame. It hangs off
  // the top lift of a specific tower — 2.4 cm tube is invisible at fifty metres, so
  // sheeting placed anywhere but on a rail reads as a panel floating in the sky.
  hangingTarp(sink, shellX - 1.1, shellBase + 3.9, -21.6, Math.PI / 2, 2.2, 2.2, 'camo_net');
  hangingTarp(sink, shellX - 9.3, shellBase + 5.9, -8.5, Math.PI / 2, 3.4, 2.6, 'camo_net');
  for (let i = 0; i < 3; i++) {
    ammoCrate(sink, shellX + 6.8, -8.2 + i * 1.05, Math.PI / 2 + sink.rng.range(-0.25, 0.25));
  }
  pipeBundle(sink, shellX - 8.4, -19.4, 0.15, 7);
  pipeBundle(sink, shellX - 8.2, -18.1, 0.05, 5);
  woodPile(sink, shellX - 8.6, -16.0, Math.PI / 2, 7);
  crateStack(sink, shellX - 8.2, -4.6, 0.5, 3, { collide: true });
  tiedTarp(sink, shellX - 8.2, sink.ground(shellX - 8.2, -4.6) + 1.72, -4.6, 0.5, 1.6, 1.6);
  wheelbarrow(sink, shellX - 6.4, -6.2, 2.4);
  bucket(sink, shellX - 7.6, -7.4, 0.9);
  rubbleCrumbs(sink, shellX + 8.4, -12, 4.5, 40);
  litterArea(sink, { minX: 22, minZ: -22, maxX: 40, maxZ: -2 }, 48, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });

  // Bombed house: masonry crumbs everywhere, thickest at the collapse.
  rubbleCrumbs(sink, bombed.footprint.minX - 1.5, -37, 5.5, 55);
  rubbleCrumbs(sink, bombed.footprint.maxX + 1.0, -34, 3.5, 26);
  litterArea(sink, { minX: 22, minZ: -44, maxX: 40, maxZ: -30 }, 40, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });

  // Mosque forecourt: swept, so only the edges collect. Restraint reads too.
  litterBand(sink, 24.6, 7.0, 24.6, 23.0, -1, 0, 22, { reach: 0.7 });
  basin(sink, 25.4, 11.6, 0.8);
  basin(sink, 25.3, 12.4, 2.3);

  // Fuel station forecourt: a poured slab, which is the hardest surface on the
  // map to make look used, and the one a player crosses at eye level under a
  // canopy that shades out every long shadow. Everything here follows the two
  // lines a vehicle takes — in off the road, past a pump, out again — because a
  // forecourt is worn in exactly those two arcs and swept everywhere else.
  spillStain(sink, 31, 36.6, 1.5, 0x585045);
  spillStain(sink, 28.4, 41.2, 1.1, 0x524b41);
  tyreSprawl(sink, 37.4, 42.4, 0.4, 5);
  crateStack(sink, 24.6, 42.6, 0.7, 2);
  for (const [x0, z0, x1, z1] of [
    [23.4, 45.6, 33.2, 38.0],
    [33.2, 38.0, 38.6, 33.4],
    [24.2, 33.6, 30.4, 41.8],
  ] as const) {
    tyreTracks(sink, x0, z0, x1, z1, 1.9);
  }
  wearPath(sink, 30.6, 44.2, 30.8, 34.6, 1.7);
  // Drip line where the nozzles hang and where a tank is filled: four small
  // patches per island rather than one puddle, which is what a decade of spills
  // between the same two wheel positions actually looks like.
  for (const dz of [36.8, 41.2]) {
    for (const dx of [29.4, 32.6]) {
      spillStain(sink, dx + sink.rng.range(-0.25, 0.25), dz + sink.rng.range(-0.3, 0.3), 0.5, 0x4d463c);
      spillStain(sink, dx + sink.rng.range(-0.6, 0.6), dz + sink.rng.range(-1.1, 1.1), 0.32, 0x5a5347);
    }
  }
  roadPatch(sink, 27.2, 43.4, 2.0);
  roadPatch(sink, 34.8, 35.6, 1.6);
  drainCover(sink, 31.0, 44.1, 0);
  // Grit banked against the canopy legs, which is the only vertical thing on the
  // slab and so the only place wind has to drop what it is carrying.
  for (const [cx, cz] of [
    [25.9, 34.9],
    [36.1, 34.9],
    [25.9, 43.1],
    [36.1, 43.1],
  ] as const) {
    cornerSpoil(sink, cx + (cx < 31 ? 0.3 : -0.3), cz + (cz < 39 ? 0.3 : -0.3), cx < 31 ? 1 : -1, 0);
    litterPiece(sink, cx + sink.rng.range(-0.7, 0.7), cz + sink.rng.range(-0.7, 0.7));
  }
  pipeBundle(sink, 24.4, 36.4, 0.2, 4);
  bucket(sink, 25.1, 38.0, 1.3);
  buttPatch(sink, 24.9, 40.6);
  litterArea(sink, { minX: 23, minZ: 33, maxX: 39, maxZ: 45 }, 48, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });
  litterBand(sink, 23.2, 33.4, 23.2, 45.2, -1, 0, 22, { reach: 1.1 });

  // Alley behind the market: the classic place junk goes to die.
  litterArea(sink, { minX: -21.4, minZ: -22, maxX: -17.2, maxZ: 24 }, 70, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });
  for (const z of [-20.5, -14.2, -3.4, 4.2, 11.8, 17.4, 22.2]) {
    const x = -21.0 + sink.rng.range(0, 0.5);
    if (sink.groundClaimed(x, z, 0.3)) continue;
    const roll = sink.rng.next();
    if (roll < 0.28) crateStack(sink, x, z, sink.rng.range(0, TAU), 2);
    else if (roll < 0.5) tyreSprawl(sink, x, z, 0.4, 4);
    else if (roll < 0.68) sackPile(sink, x, z, -Math.PI / 2, 3);
    else if (roll < 0.84) woodPile(sink, x, z, -Math.PI / 2, 5);
    else bucket(sink, x, z, sink.rng.range(0, TAU));
  }
  for (const z of [-18, -6, 8, 20]) {
    hangingRag(sink, -17.4, sink.ground(-17.4, z) + 3.6, z, Math.PI / 2, 0.5, 0.8);
  }

  // East alley.
  litterArea(sink, { minX: 19.8, minZ: -24, maxX: 24.2, maxZ: 40 }, 62, {
    reject: (x, z) => sink.groundClaimed(x, z, 0.1),
  });
  for (const z of [-18.5, -8.2, 3.6, 14.8, 26.4, 35.2]) {
    const x = 20.2 + sink.rng.range(0, 0.5);
    if (sink.groundClaimed(x, z, 0.3)) continue;
    if (sink.rng.bool(0.4)) tyreSprawl(sink, x, z, 0.2, 4);
    else if (sink.rng.bool(0.5)) crateStack(sink, x, z, sink.rng.range(0, TAU), 2);
    else pipeBundle(sink, x, z, Math.PI / 2, 4);
  }
}

/** Spent brass and sandbag spill behind every position that has been fought from. */
function dressEmplacements(sink: Sink): void {
  const nests: Array<[number, number, number]> = [
    [-52, -30.5, Math.PI],
    [-12, 22.5, 0],
    [2, -6.5, Math.PI],
    [-28, -48, Math.PI],
    [28, -48, Math.PI],
    [-26, 50, 0],
    [26, 50, 0],
    [-4, -42.6, Math.PI],
    [6, -42.6, Math.PI],
    [-6, 44.6, 0],
    [8, 44.6, 0],
    [-43.6, -30, 0],
    [27, -24.6, 0],
    [15.5, -31.4, 0],
    [-12.6, 26.4, 0],
    [-22.4, 5.5, Math.PI / 2],
    [-33.4, -33.5, Math.PI / 2],
  ];
  for (const [x, z, yaw] of nests) {
    // Behind the bags, where the shooter stands, not in front of them.
    const bx = x - Math.sin(yaw) * 1.5;
    const bz = z - Math.cos(yaw) * 1.5;
    brassScatter(sink, bx, bz, yaw, sink.rng.int(2, 4));
    litterPiece(sink, bx + sink.rng.range(-1, 1), bz + sink.rng.range(-0.8, 0.8));
    if (sink.rng.bool(0.5)) {
      crateStack(sink, bx - Math.cos(yaw) * 1.8, bz + Math.sin(yaw) * 1.8, yaw, 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Off-axis infill
// ---------------------------------------------------------------------------

/**
 * The pass that takes the town off the grid.
 *
 * Everything structural here is axis-aligned by construction: a `Rect` footprint,
 * a slab registered as a walkable rectangle, a wall along X or Z. That is not a
 * style choice, it is what the navigation raster and the cover solver read, and
 * rotating a building people walk through would mean rotating all of it. So the
 * grid is broken by what can be rotated freely and still be correct: the walled
 * yards, sheds and canopies that grew into the gaps between the blocks, none of
 * which anybody enters and all of which take a yaw already.
 *
 * From the tactical top-down view that is most of what the eye reads — the
 * outlines are no longer parallel and the shadows no longer fall in two
 * directions. Every candidate is tested against the road field and the collider
 * index first and dropped if it would land on a lane or inside something that is
 * already there, so a yard can be proposed anywhere without risking the routes.
 */
function buildOffAxis(sink: Sink, field: TerrainField): void {
  for (const yard of OFF_AXIS_YARDS) buildSkewYard(sink, field, yard);

  // Sheds leaned against the blank flanks of the boundary terraces and the
  // yards, at their own angle to everything.
  const sheds: Array<[number, number, number, number, number]> = [
    [-51.5, 30.5, 0.42, 4.2, 2.6],
    [-45.5, -47.5, -0.5, 3.6, 2.4],
    [19.5, 41.5, 0.36, 4.6, 2.8],
    [-24.5, -47.5, 0.28, 4.0, 2.6],
    [52.5, 40.5, -0.44, 3.8, 2.6],
    [-52.5, -3.5, 0.3, 3.4, 2.4],
    [41.5, 47.5, 0.5, 4.2, 2.6],
    [33.5, -46.5, -0.3, 3.8, 2.5],
    // The four open corners, where the ground is empty enough that a lean-to is
    // the obvious thing to have grown there and it becomes cover on a flank.
    [-46.5, -33.5, -0.38, 3.8, 2.5],
    [-46.5, 34.5, 0.46, 3.6, 2.4],
    [46.5, -34.5, 0.34, 4.0, 2.6],
    [45.5, 33.5, -0.42, 3.6, 2.5],
    [-33.5, 45.5, 0.5, 3.8, 2.4],
    [24.5, -45.5, -0.46, 3.6, 2.5],
  ];
  for (const [x, z, yaw, width, depth] of sheds) {
    buildSkewShed(sink, field, x, z, yaw, width, depth);
  }

  // Wear that cuts the corners the roads do not. A grid of streets read from
  // above is a grid of parallel edges; the paths people actually walk across the
  // open ground between them are the diagonals, and they cost ground film only.
  const tracks: Array<[number, number, number, number, number]> = [
    [-33.5, -22.5, -17.5, -34.5, 1.6],
    [-17.5, 8.5, -2.5, -1.5, 1.4],
    [5.5, -2.5, 19.5, -22.5, 1.5],
    [19.5, 26.5, 37.5, 6.5, 1.4],
    [-43.5, 30.5, -33.5, 42.5, 1.7],
    [5.5, 35.5, 19.5, 44.5, 1.5],
    [-21.5, -35.5, -6.5, -45.5, 1.6],
    [24.5, -34.5, 37.5, -45.5, 1.5],
    [-49.5, -30.5, -43.5, -40.5, 1.4],
    [37.5, 30.5, 49.5, 40.5, 1.5],
  ];
  for (const [x0, z0, x1, z1, width] of tracks) {
    if (sink.groundClaimed(x0, z0, 0.6) || sink.groundClaimed(x1, z1, 0.6)) continue;
    wearPath(sink, x0, z0, x1, z1, width);
    if (sink.rng.bool(0.45)) tyreTracks(sink, x0, z0, x1, z1, sink.rng.range(1.5, 1.9));
    litterBand(sink, x0, z0, x1, z1, 0, 0, sink.rng.int(6, 12), {
      reject: (x, z) => sink.groundClaimed(x, z, 0),
    });
  }
}

interface SkewYard {
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Radians off axis. Kept well clear of a right angle so it reads as skewed. */
  yaw: number;
  /** Which of the four edges carries the gate. */
  gate: number;
}

/**
 * Candidate yards, in the open ground the three lanes and the cross streets do
 * not run through. Any that fouls a road or an existing structure is dropped.
 */
const OFF_AXIS_YARDS: readonly SkewYard[] = [
  { x: -49, z: 38, width: 10, depth: 7, yaw: 0.34, gate: 1 },
  { x: 12, z: 39.5, width: 10.5, depth: 6.5, yaw: -0.27, gate: 3 },
  { x: -9.5, z: -37.5, width: 9, depth: 6, yaw: 0.3, gate: 1 },
  { x: 52.5, z: 14, width: 6.5, depth: 11, yaw: -0.22, gate: 3 },
  { x: -49.5, z: -55, width: 9, depth: 6, yaw: 0.4, gate: 2 },
  { x: 27, z: -55, width: 9.5, depth: 6, yaw: -0.36, gate: 2 },
  { x: 52.5, z: -13, width: 6.5, depth: 10, yaw: 0.26, gate: 3 },
  { x: -52, z: 51, width: 7.5, depth: 6, yaw: -0.38, gate: 0 },
  { x: 46, z: 55, width: 9, depth: 6, yaw: 0.32, gate: 0 },
  { x: -34, z: 44, width: 8, depth: 6.5, yaw: 0.24, gate: 1 },
];

/** Skewed walled yard. Silently declines if its walls would foul anything. */
function buildSkewYard(sink: Sink, field: TerrainField, yard: SkewYard): void {
  const cos = Math.cos(yard.yaw);
  const sin = Math.sin(yard.yaw);
  const hw = yard.width / 2;
  const hd = yard.depth / 2;
  const at = (lx: number, lz: number): [number, number] => [
    yard.x + lx * cos + lz * sin,
    yard.z - lx * sin + lz * cos,
  ];
  const corners: Array<[number, number]> = [at(-hw, -hd), at(hw, -hd), at(hw, hd), at(-hw, hd)];

  for (let edge = 0; edge < 4; edge++) {
    const [x0, z0] = corners[edge];
    const [x1, z1] = corners[(edge + 1) % 4];
    // Eight samples per wall: enough to catch a kerb or a container corner, and
    // the whole yard goes rather than one wall, because three walls of a yard
    // reads as a mistake.
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      if (field.onRoad(px, pz, 1.4) || sink.groundClaimed(px, pz, 0.9)) return;
      if (Math.abs(px) > TERRAIN_HALF - 6 || Math.abs(pz) > TERRAIN_HALF - 6) return;
    }
  }

  const base = field.height(yard.x, yard.z) - 0.25;
  const height = sink.rng.range(2.1, 2.75);
  const material = sink.rng.bool(0.55) ? STUCCO : BRICK;
  const gateHalf = 1.5;

  for (let edge = 0; edge < 4; edge++) {
    const [x0, z0] = corners[edge];
    const [x1, z1] = corners[(edge + 1) % 4];
    const length = Math.hypot(x1 - x0, z1 - z0);
    const openings =
      edge === yard.gate && length > gateHalf * 2 + 1.6
        ? [
            {
              at: length * sink.rng.range(0.35, 0.65),
              width: gateHalf * 2,
              sill: 0,
              height: Math.min(height - 0.3, 2.4),
              kind: 'arch' as const,
            },
          ]
        : [];
    buildWall(sink, {
      x0,
      z0,
      x1,
      z1,
      base,
      height: height - (edge % 2 === 1 ? sink.rng.range(0, 0.35) : 0),
      thickness: 0.32,
      material,
      openings,
      tint: sink.rng.pick([0xded3bc, 0xd2c7b0, 0xe4dac2]),
      mottle: 0.45,
      band: height - 0.26,
    });
  }

  // What is kept in a yard like this, laid out along the yard's own axis so the
  // clutter is skewed with it rather than squared to the map.
  const inset = 1.3;
  const spots = sink.rng.int(3, 5);
  for (let i = 0; i < spots; i++) {
    const [px, pz] = at(
      sink.rng.range(-hw + inset, hw - inset),
      sink.rng.range(-hd + inset, hd - inset),
    );
    if (sink.groundClaimed(px, pz, 0.5)) continue;
    const yaw = yard.yaw + sink.rng.range(-0.4, 0.4);
    const roll = sink.rng.next();
    if (roll < 0.2) crateStack(sink, px, pz, yaw, sink.rng.int(2, 3), { collide: true });
    else if (roll < 0.36) sackPile(sink, px, pz, yaw, sink.rng.int(3, 6));
    else if (roll < 0.5) woodPile(sink, px, pz, yaw, sink.rng.int(5, 8));
    else if (roll < 0.62) tyreStack(sink, px, pz, yaw, sink.rng.int(3, 5));
    else if (roll < 0.74) oilBarrel(sink, px, pz, yaw, { tint: 0x6f6250 });
    else if (roll < 0.86) rubblePile(sink, px, pz, yaw, sink.rng.range(0.9, 1.3));
    else pallet(sink, px, pz, yaw);
  }

  // A shade over one end and washing across it: the two things that say somebody
  // uses the yard, and both read from above as diagonals.
  if (sink.rng.bool(0.7)) {
    const [sx, sz] = at(sink.rng.range(-hw * 0.4, hw * 0.4), hd * sink.rng.range(-0.5, 0.5));
    shadeCloth(sink, sx, base + height + 0.35, sz, yard.yaw, hw * 1.1, hd * 0.9);
  }
  if (sink.rng.bool(0.6)) {
    const [ax, az] = at(-hw + 0.5, -hd + 1.2);
    const [bx, bz] = at(hw - 0.5, hd - 1.2);
    laundryLine(
      sink,
      new THREE.Vector3(ax, base + height - 0.2, az),
      new THREE.Vector3(bx, base + height - 0.35, bz),
    );
  }
  litterArea(
    sink,
    { minX: yard.x - hw, minZ: yard.z - hd, maxX: yard.x + hw, maxZ: yard.z + hd },
    sink.rng.int(14, 26),
    { reject: (x, z) => sink.groundClaimed(x, z, 0) },
  );
  sandDrift(sink, corners[0][0], corners[0][1], sink.rng.range(1.2, 2.2));
}

/**
 * A skewed lean-to: three low walls and a single-pitch corrugated roof.
 *
 * Too small to enter and registered as one solid box, so it costs the navigation
 * grid a blocked cell and nothing else, but its roof is a rotated rectangle in
 * the top-down view and its ridge line throws a diagonal shadow at street level.
 */
function buildSkewShed(
  sink: Sink,
  field: TerrainField,
  x: number,
  z: number,
  yaw: number,
  width: number,
  depth: number,
): void {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const at = (lx: number, lz: number): [number, number] => [
    x + lx * cos + lz * sin,
    z - lx * sin + lz * cos,
  ];
  const hw = width / 2;
  const hd = depth / 2;
  for (let i = 0; i < 4; i++) {
    const [px, pz] = at(i % 2 === 0 ? -hw : hw, i < 2 ? -hd : hd);
    if (field.onRoad(px, pz, 1.4) || sink.groundClaimed(px, pz, 1.0)) return;
    if (Math.abs(px) > TERRAIN_HALF - 6 || Math.abs(pz) > TERRAIN_HALF - 6) return;
  }

  const base = field.height(x, z) - 0.1;
  const tall = sink.rng.range(2.5, 3.0);
  const low = tall - sink.rng.range(0.4, 0.75);
  const material = sink.rng.bool(0.5) ? BRICK : STUCCO;
  const tint = sink.rng.pick([0xd8ccb4, 0xcdc1a8, 0xe0d5be]);

  // Back wall at the tall side, two returns, front left open.
  const back: Array<[number, number]> = [at(-hw, -hd), at(hw, -hd)];
  buildWall(sink, {
    x0: back[0][0],
    z0: back[0][1],
    x1: back[1][0],
    z1: back[1][1],
    base,
    height: tall,
    thickness: 0.28,
    material,
    tint,
    mottle: 0.45,
  });
  for (const side of [-1, 1] as const) {
    const a = at(side * hw, -hd);
    const b = at(side * hw, hd);
    buildWall(sink, {
      x0: a[0],
      z0: a[1],
      x1: b[0],
      z1: b[1],
      base,
      height: low,
      thickness: 0.26,
      material,
      tint,
      mottle: 0.45,
    });
  }

  // Corrugated roof, pitched from the back wall down to the open front.
  const pitch = Math.atan2(tall - low, depth);
  const span = Math.hypot(depth, tall - low) + 0.5;
  sink.addStatic(
    placed(
      boxGeometry(width + 0.5, 0.09, span, 0.02, 2.2),
      transform(x, base + (tall + low) / 2 + 0.1, z, yaw, 0, 0).multiply(
        new THREE.Matrix4().makeRotationX(pitch),
      ),
    ),
    { material: 'metal_corrugated', tier: 'structure', tint: 0xa89c86, mottle: 0.4 },
  );
  sink.addCollider(
    new THREE.Vector3(x, base + (tall + low) / 2, z),
    new THREE.Vector3(width / 2 + 0.2, (tall + low) / 2, depth / 2 + 0.2),
    yaw,
    { surface: 'metal' },
  );

  // Under the roof, at the shed's angle.
  const [ix, iz] = at(sink.rng.range(-hw + 0.7, hw - 0.7), sink.rng.range(-hd + 0.6, hd - 0.6));
  if (!sink.groundClaimed(ix, iz, 0.4)) {
    if (sink.rng.bool(0.5)) woodPile(sink, ix, iz, yaw + sink.rng.range(-0.3, 0.3), 6);
    else sackPile(sink, ix, iz, yaw + sink.rng.range(-0.3, 0.3), sink.rng.int(4, 6));
  }
  const [lx, lz] = at(hw + 0.35, sink.rng.range(-hd, hd));
  if (!sink.groundClaimed(lx, lz, 0.3)) {
    leaningLadder(sink, lx, lz, yaw - Math.PI / 2, low - 0.3);
  }
  litterArea(sink, { minX: x - hw, minZ: z - hd, maxX: x + hw, maxZ: z + hd }, sink.rng.int(6, 14), {
    reject: (px, pz) => sink.groundClaimed(px, pz, 0),
  });
}

// ---------------------------------------------------------------------------
// Shared set-piece helpers
// ---------------------------------------------------------------------------

interface CompoundGate {
  /** 0 = north, 1 = east, 2 = south, 3 = west. */
  edge: number;
  /** Fraction along the edge. */
  at: number;
  width: number;
}

/** Walled yard with gates: the region's default way of enclosing anything. */
function buildCompound(
  sink: Sink,
  r: Rect,
  height: number,
  material: MaterialId,
  gates: CompoundGate[],
): void {
  const edges: Array<[number, number, number, number]> = [
    [r.minX, r.minZ, r.maxX, r.minZ],
    [r.maxX, r.minZ, r.maxX, r.maxZ],
    [r.maxX, r.maxZ, r.minX, r.maxZ],
    [r.minX, r.maxZ, r.minX, r.minZ],
  ];
  for (let edge = 0; edge < 4; edge++) {
    const [x0, z0, x1, z1] = edges[edge];
    const length = Math.hypot(x1 - x0, z1 - z0);
    const openings = gates
      .filter((gate) => gate.edge === edge)
      .map((gate) => ({
        at: length * gate.at,
        width: gate.width,
        sill: 0,
        height: Math.min(height - 0.35, 2.6),
        kind: 'arch' as const,
      }));
    buildWall(sink, {
      x0,
      z0,
      x1,
      z1,
      base: sink.ground((x0 + x1) / 2, (z0 + z1) / 2) - 0.25,
      height,
      thickness: 0.32,
      material,
      openings,
      mottle: 0.42,
      band: height - 0.28,
    });
  }
}

/**
 * Plank deck between two points at one height: rooftop bridges and stair
 * landings. Carries a collider, a walkable surface and a handrail.
 */
function addWalkway(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  width: number,
): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const length = Math.hypot(dx, dz);
  if (length < 0.4) return;
  const yaw = Math.atan2(-dz, dx);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  const planks = Math.max(3, Math.round(length / 0.3));
  for (let i = 0; i < planks; i++) {
    const t = (i + 0.5) / planks - 0.5;
    sink.addProp(
      boxGeometry(0.28, 0.06, width, 0.012, 1.6),
      transform(cx + dx * t, y - 0.03, cz + dz * t, yaw),
      { material: 'wood_plank', tier: 'structure', tint: sink.rng.bool() ? 0xb6a284 : 0xa8977a },
    );
  }
  // Bearers under the deck.
  for (const side of [-1, 1]) {
    const ox = (-dz / length) * side * (width / 2 - 0.1);
    const oz = (dx / length) * side * (width / 2 - 0.1);
    sink.addStatic(
      placed(boxGeometry(length, 0.12, 0.14, 0.02, 1.8), transform(cx + ox, y - 0.11, cz + oz, yaw)),
      { material: 'wood_plank', tier: 'structure', tint: 0x9b8a6e },
    );
    // Handrail on one side only, so the walkway still reads as improvised.
    if (side > 0) {
      for (let i = 0; i <= 2; i++) {
        const t = i / 2 - 0.5;
        sink.addStatic(
          placed(
            boxGeometry(0.07, 0.95, 0.07, 0.012, 1.2),
            transform(cx + dx * t + ox, y + 0.48, cz + dz * t + oz, yaw),
          ),
          { material: 'metal_rusted', tier: 'detail', tint: 0x8e8478 },
        );
      }
      sink.addStatic(
        placed(boxGeometry(length, 0.06, 0.06, 0.012, 1.4), transform(cx + ox, y + 0.95, cz + oz, yaw)),
        { material: 'metal_rusted', tier: 'detail', tint: 0x8e8478 },
      );
    }
  }

  sink.addCollider(
    new THREE.Vector3(cx, y - 0.06, cz),
    new THREE.Vector3(length / 2, 0.07, width / 2),
    yaw,
    { surface: 'wood', noCover: true, noNav: true },
  );
  const halfX = Math.abs(Math.cos(yaw)) * (length / 2) + Math.abs(Math.sin(yaw)) * (width / 2);
  const halfZ = Math.abs(Math.sin(yaw)) * (length / 2) + Math.abs(Math.cos(yaw)) * (width / 2);
  sink.addWalkable({
    minX: cx - halfX + 0.1,
    minZ: cz - halfZ + 0.1,
    maxX: cx + halfX - 0.1,
    maxZ: cz + halfZ - 0.1,
    height: y,
    costMul: 1.3,
  });
}

/**
 * Dresses a roof as a fighting position: sandbags at the parapet, a few crates
 * and something for the eye to land on. Without this a walkable roof reads as an
 * unfinished grey box.
 */
function rooftopPosition(sink: Sink, building: BuildingResult, count: number): void {
  const r = building.interior;
  const y = building.roofY;
  const spots: Array<[number, number, number]> = [
    [(r.minX + r.maxX) / 2, r.minZ + 0.9, Math.PI],
    [r.maxX - 0.9, (r.minZ + r.maxZ) / 2, -Math.PI / 2],
    [(r.minX + r.maxX) / 2, r.maxZ - 0.9, 0],
    [r.minX + 0.9, (r.minZ + r.maxZ) / 2, Math.PI / 2],
  ];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const [x, z, yaw] = spots[(i * 2 + 1) % spots.length];
    sandbagWall(sink, x, z, yaw, 3.0, 3, { y });
    if (sink.rng.bool(0.5)) {
      ammoCrate(sink, x + Math.cos(yaw) * 1.4, z - Math.sin(yaw) * 1.4, yaw, y);
    }
  }
  if (sink.rng.bool(0.6)) {
    woodCrate(sink, r.minX + 1.4, y, r.maxZ - 1.4, sink.rng.range(0, TAU), 0.86);
  }
}
