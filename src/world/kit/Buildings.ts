import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import { dressFacade } from './Clutter';
import { laundryLine, roofAc, satelliteDish, waterTank, plasterPatch, dustDrift, antennaMast } from './Details';
import { type InteriorUse, dressRoom } from './Interiors';
import { ladder, rebarCluster } from './Props';
import { type Opening, buildLowWall, buildWall, buildWallRing } from './Walls';
import {
  METRICS,
  type Rect,
  type Sink,
  boxGeometry,
  cachedGeometry,
  cylinderGeometry,
  latheGeometry,
  mergeParts,
  placed,
  slab,
  transform,
} from './Kit';

/**
 * The building builder.
 *
 * Everything in the town comes out of this one function so that the map reads as
 * one place built by one set of trades. A building is a footprint, a floor count
 * and a facade schedule; the builder derives the bays, punches the openings,
 * pours the slabs, threads a stairwell through them, dresses the roof and
 * registers the interior volume, the walkable surfaces and the collision.
 *
 * Footprints are axis-aligned on purpose. It costs a little variety and buys
 * exact, box-only collision, clean rectangular navigation surfaces and cover
 * normals that point along the lanes a player actually shoots down.
 */

export type RoofStyle = 'flat' | 'pitched';

export interface FacadeSpec {
  /** Omit this wall entirely (party wall shared with a neighbour). */
  omit?: boolean;
  /** Bay indices that get a doorway on the ground floor. */
  doors?: readonly number[];
  /** Ground floor is an arcade of arches (shopfronts, mosque porch). */
  arcade?: boolean;
  /** Security bars on the ground-floor windows. */
  bars?: boolean;
  /** Fit glass panes. Interior-facing courtyard walls usually should not. */
  glass?: boolean;
  shutters?: boolean;
  /** Bays left as blank masonry. */
  blank?: readonly number[];
  /** Bays blown open on the top floor. */
  breach?: readonly number[];
  /** Upper-floor bays that get a balcony. */
  balcony?: readonly number[];
  /** Number of bays; derived from the wall length when omitted. */
  bays?: number;
}

export interface BuildingSpec {
  name: string;
  centerX: number;
  centerZ: number;
  /** Extent along X. */
  width: number;
  /** Extent along Z. */
  depth: number;
  floors: number;
  base?: number;
  floorHeight?: number;
  wall: MaterialId;
  /**
   * Metres per texture tile on the facade.
   *
   * Worth tightening for the busier materials: a peel patch two metres across
   * reads as camouflage on a fifteen-metre wall, the same patch at hand size
   * reads as a wall somebody painted badly twenty years ago.
   */
  wallTile?: number;
  /** Interior finish. */
  liner?: MaterialId;
  floorMaterial?: MaterialId;
  tint?: number;
  roof?: RoofStyle;
  parapet?: number;
  /** North (-Z), east (+X), south (+Z), west (-X). */
  facades?: readonly FacadeSpec[];
  partitions?: boolean;
  /** Interior switchback stair. Needs roughly 4.2 x 2.7 m of interior. */
  stairs?: StairCorner | null;
  /** Carry the stair up through the roof slab. */
  roofAccess?: boolean;
  roofDetails?: boolean;
  /** Parapet plus registered walkable surface: a fighting position. */
  roofWalkable?: boolean;
  /** Pipes, conduit, patches and drifts on the outside. */
  exteriorDetails?: boolean;
  /** Rubble inside and a torn top floor. */
  shelled?: boolean;
  /** What the rooms are furnished as. Defaults to homes, or wreckage if shelled. */
  use?: InteriorUse;
  /** Leave the interior bare (backdrop shells nobody can enter). */
  dress?: boolean;
}

export type StairCorner = 'nw' | 'ne' | 'sw' | 'se';

export interface BuildingResult {
  name: string;
  base: number;
  floorHeight: number;
  /** Walking surface of the roof. */
  roofY: number;
  /** Walking surface of each floor, ground first. */
  floorYs: number[];
  footprint: Rect;
  /** Inside faces of the enclosing walls. */
  interior: Rect;
  /** Height of the parapet above the roof surface, 0 when there is none. */
  parapet: number;
}

const BAY_SPACING = 3.4;

/**
 * How far a finished floor stands proud of the ground padded flat beneath it.
 *
 * The layout flattens the terrain under every building to exactly the height the
 * ground slab is poured at, which leaves the slab's top face and the sand shell
 * coplanar. The depth test then picks a winner per batch rather than per pixel,
 * and half of somebody's front room comes out as rippled desert. Four
 * centimetres settles it, and a doorway threshold is a step up anyway.
 */
const FLOOR_PROUD = 0.04;

export function buildBuilding(sink: Sink, spec: BuildingSpec): BuildingResult {
  const fh = spec.floorHeight ?? METRICS.floorHeight;
  const base = spec.base ?? sink.ground(spec.centerX, spec.centerZ);
  const thickness = METRICS.wallThickness;
  const hw = spec.width / 2;
  const hd = spec.depth / 2;
  const roofStyle = spec.roof ?? 'flat';
  const parapet =
    roofStyle === 'flat' ? (spec.parapet ?? (spec.roofWalkable ? METRICS.parapet : 0.42)) : 0;

  const footprint: Rect = {
    minX: spec.centerX - hw,
    minZ: spec.centerZ - hd,
    maxX: spec.centerX + hw,
    maxZ: spec.centerZ + hd,
  };
  const interior: Rect = {
    minX: footprint.minX + thickness,
    minZ: footprint.minZ + thickness,
    maxX: footprint.maxX - thickness,
    maxZ: footprint.maxZ - thickness,
  };

  const facades = normaliseFacades(spec.facades);
  const floorYs: number[] = [];
  for (let f = 0; f < spec.floors; f++) floorYs.push(base + f * fh);
  const roofY = base + spec.floors * fh;

  const well = spec.stairs ? stairWell(interior, spec.stairs) : null;

  // Ground slab. The terrain under a building is padded flat by the layout, so
  // one box tracks it exactly.
  addSlab(sink, footprint, base + FLOOR_PROUD, 0.28 + FLOOR_PROUD, spec.floorMaterial ?? 'concrete_floor', {
    walkable: true,
    costMul: 1,
  });

  for (let f = 0; f < spec.floors; f++) {
    const y = floorYs[f];
    const top = f === spec.floors - 1;
    const wallHeight = top && spec.shelled ? fh * 0.72 : fh;
    const doorZones: Rect[] = [];
    const windowZones: Rect[] = [];

    for (let edge = 0; edge < 4; edge++) {
      const facade = facades[edge];
      if (facade.omit) continue;
      const [x0, z0, x1, z1] = edgeLine(footprint, edge);
      const length = Math.hypot(x1 - x0, z1 - z0);
      const openings = facadeOpenings(sink, spec, facade, f, length);
      for (const opening of openings) {
        const zone = openingZone(footprint, edge, opening, thickness);
        if (opening.kind === 'window') windowZones.push(zone);
        else doorZones.push(zone);
      }
      buildWall(sink, {
        x0,
        z0,
        x1,
        z1,
        base: y,
        height: wallHeight,
        thickness,
        material: spec.wall,
        liner: spec.liner,
        linerSide: 1,
        openings,
        parapet: top && roofStyle === 'flat' ? parapet : undefined,
        parapetMaterial: spec.wall,
        plinth: f === 0,
        band: spec.floors > 1 && !top ? wallHeight - 0.14 : undefined,
        tint: spec.tint,
        tile: spec.wallTile,
        mottle: 0.26,
      });
    }

    // Upper floor slabs double as the ceiling below, so they are poured with the
    // floor above rather than with the one they cap.
    if (f > 0) {
      addPiercedSlab(
        sink,
        interior,
        y,
        0.26,
        spec.floorMaterial ?? 'concrete_floor',
        well ? well.rect : null,
        spec.stairs ? 1.25 : 1,
      );
    }

    sink.addInterior(`${spec.name}_f${f}`, interiorBox(interior, y, y + fh - 0.1));

    // The openings themselves, kept apart from the stair wells and partition gaps
    // that get appended to the same clear-list, so dressing that belongs in a
    // doorway can find one.
    const doorways = doorZones.slice();

    let rooms: Rect[] = [interior];
    if (spec.partitions && f === 0) {
      const split = addPartitions(sink, spec, interior, y, fh, well);
      if (split) {
        rooms = split.rooms;
        doorZones.push(...split.blockers);
      }
    }
    if (well) doorZones.push(pad(well.rect, 0.55));

    if (spec.dress !== false) {
      const use = roomUse(spec, f, top);
      for (const room of rooms) {
        dressRoom(sink, {
          rect: room,
          y,
          headroom: fh - 0.26,
          use,
          floor: f,
          blockers: doorZones,
          doors: doorways.filter((d) => insideRoom(room, d)),
          lowOnly: windowZones,
          liner: spec.liner,
        });
      }
    }
  }

  if (roofStyle === 'flat') {
    addPiercedSlab(
      sink,
      interior,
      roofY,
      0.3,
      'concrete_floor',
      spec.roofAccess && well ? well.rect : null,
      1.1,
      spec.roofWalkable !== false,
    );
    if (spec.shelled) addCollapsedRoof(sink, spec, interior, roofY, fh);
  } else {
    addPitchedRoof(sink, spec, footprint, roofY, spec.wall);
  }

  if (well && spec.stairs) {
    const levels = spec.roofAccess ? spec.floors : spec.floors - 1;
    for (let f = 0; f < levels; f++) {
      addSwitchbackStair(sink, well, floorYs[f], fh, f === spec.floors - 1);
    }
    if (spec.roofAccess) addStairHead(sink, well, roofY);
  }

  if (spec.roofDetails !== false && roofStyle === 'flat') {
    addRoofDetails(sink, spec, interior, roofY, parapet);
  }
  if (spec.exteriorDetails !== false) {
    // A shelled building's top storey is built to a fraction of its height, so
    // dressing hung relative to `roofY` would float where the wall was blown off.
    const wallTop = spec.shelled ? roofY - fh * 0.28 : roofY;
    addExteriorDetails(sink, spec, footprint, base, wallTop, facades);
  }

  return {
    name: spec.name,
    base,
    floorHeight: fh,
    roofY,
    floorYs,
    footprint,
    interior,
    parapet,
  };
}

// ---------------------------------------------------------------------------
// Facades
// ---------------------------------------------------------------------------

function normaliseFacades(facades: readonly FacadeSpec[] | undefined): FacadeSpec[] {
  const out: FacadeSpec[] = [];
  for (let i = 0; i < 4; i++) out.push(facades?.[i] ?? {});
  return out;
}

/** Edge order: north (-Z), east (+X), south (+Z), west (-X), wound so +w is inside. */
function edgeLine(r: Rect, edge: number): [number, number, number, number] {
  switch (edge) {
    case 0:
      return [r.minX, r.minZ, r.maxX, r.minZ];
    case 1:
      return [r.maxX, r.minZ, r.maxX, r.maxZ];
    case 2:
      return [r.maxX, r.maxZ, r.minX, r.maxZ];
    default:
      return [r.minX, r.maxZ, r.minX, r.minZ];
  }
}

function facadeOpenings(
  sink: Sink,
  spec: BuildingSpec,
  facade: FacadeSpec,
  floor: number,
  length: number,
): Opening[] {
  const bays = facade.bays ?? Math.max(1, Math.min(8, Math.round(length / BAY_SPACING)));
  const bayWidth = length / bays;
  const openings: Opening[] = [];
  const top = floor === spec.floors - 1;

  for (let i = 0; i < bays; i++) {
    if (facade.blank?.includes(i)) continue;
    const at = (i + 0.5) * bayWidth;
    // Keep at least 0.6 m of masonry either side so the wall still reads as a wall.
    const limit = bayWidth - 1.2;
    if (limit < 0.7) continue;

    if (floor === 0) {
      if (facade.doors?.includes(i)) {
        openings.push({
          at,
          width: Math.min(METRICS.doorWidth, bayWidth - 0.8),
          sill: 0,
          height: METRICS.doorHeight,
          kind: 'door',
        });
        continue;
      }
      if (facade.arcade) {
        openings.push({
          at,
          width: Math.min(2.5, limit),
          sill: 0,
          height: Math.min(3.0, (spec.floorHeight ?? METRICS.floorHeight) - 0.5),
          kind: 'arch',
        });
        continue;
      }
      openings.push({
        at,
        width: Math.min(METRICS.windowWidth, limit),
        sill: METRICS.windowSill,
        height: METRICS.windowHeight,
        kind: 'window',
        glass: facade.glass,
        bars: facade.bars,
        shutter: facade.shutters && sink.rng.bool(0.4),
      });
      continue;
    }

    if (top && facade.breach?.includes(i)) {
      openings.push({
        at,
        width: Math.min(2.1, limit + 0.4),
        sill: 0.45,
        height: 2.3,
        kind: 'breach',
      });
      continue;
    }
    openings.push({
      at,
      width: Math.min(METRICS.windowWidth, limit),
      sill: METRICS.windowSill,
      height: METRICS.windowHeight,
      kind: 'window',
      glass: facade.glass && sink.rng.bool(0.72),
      shutter: facade.shutters && sink.rng.bool(0.45),
    });
  }
  return openings;
}

/**
 * Floor area the interior side of an opening needs kept clear.
 *
 * Doors and arches must stay walkable, and windows must stay shootable through,
 * so the dressing treats the first metre and a half inside each one as reserved.
 */
function openingZone(footprint: Rect, edge: number, opening: Opening, thickness: number): Rect {
  const [x0, z0, x1, z1] = edgeLine(footprint, edge);
  const length = Math.hypot(x1 - x0, z1 - z0);
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const inward = thickness / 2 + 0.9;
  const cx = x0 + dirX * opening.at - dirZ * inward;
  const cz = z0 + dirZ * opening.at + dirX * inward;
  const along = opening.width / 2 + 0.35;
  const across = 0.9;
  const halfX = Math.abs(dirX) * along + Math.abs(dirZ) * across;
  const halfZ = Math.abs(dirZ) * along + Math.abs(dirX) * across;
  return { minX: cx - halfX, minZ: cz - halfZ, maxX: cx + halfX, maxZ: cz + halfZ };
}

function pad(r: Rect, by: number): Rect {
  return { minX: r.minX - by, minZ: r.minZ - by, maxX: r.maxX + by, maxZ: r.maxZ + by };
}

/** Whether an opening's approach zone lands in this room rather than its neighbour. */
function insideRoom(room: Rect, zone: Rect): boolean {
  const cx = (zone.minX + zone.maxX) / 2;
  const cz = (zone.minZ + zone.maxZ) / 2;
  return cx > room.minX - 0.1 && cx < room.maxX + 0.1 && cz > room.minZ - 0.1 && cz < room.maxZ + 0.1;
}

function roomUse(spec: BuildingSpec, floor: number, top: boolean): InteriorUse {
  if (spec.shelled && top) return 'derelict';
  return spec.use ?? (spec.shelled ? 'derelict' : floor === 0 ? 'shop' : 'home');
}

// ---------------------------------------------------------------------------
// Slabs
// ---------------------------------------------------------------------------

interface SlabOptions {
  walkable?: boolean;
  costMul?: number;
  /** Skip the collider (used for slab fragments that already have one). */
  noCollide?: boolean;
}

/** Slab whose top face sits at `top`. */
function addSlab(
  sink: Sink,
  r: Rect,
  top: number,
  thickness: number,
  material: MaterialId,
  opts: SlabOptions = {},
): void {
  const width = r.maxX - r.minX;
  const depth = r.maxZ - r.minZ;
  if (width < 0.05 || depth < 0.05) return;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const cy = top - thickness / 2;

  sink.addStatic(slab(cx, cy, cz, width, thickness, depth, 0.04, 2.6), {
    material,
    tier: 'structure',
    mottle: 0.3,
  });
  if (!opts.noCollide) {
    sink.addCollider(
      new THREE.Vector3(cx, cy, cz),
      new THREE.Vector3(width / 2, thickness / 2, depth / 2),
      0,
      { surface: 'concrete', noCover: true, noNav: true },
    );
  }
  if (opts.walkable !== false) {
    sink.addWalkable({
      minX: r.minX,
      minZ: r.minZ,
      maxX: r.maxX,
      maxZ: r.maxZ,
      height: top,
      costMul: opts.costMul,
    });
  }
}

/**
 * Slab with a rectangular void, poured as up to four bands around the hole.
 *
 * The void is what makes a stairwell work: without it the stair runs into the
 * ceiling, and the AI happily walks over the top of its own staircase.
 */
function addPiercedSlab(
  sink: Sink,
  r: Rect,
  top: number,
  thickness: number,
  material: MaterialId,
  hole: Rect | null,
  costMul = 1,
  walkable = true,
): void {
  if (!hole) {
    addSlab(sink, r, top, thickness, material, { walkable, costMul });
    return;
  }
  const bands: Rect[] = [];
  if (hole.minZ > r.minZ + 0.05) {
    bands.push({ minX: r.minX, minZ: r.minZ, maxX: r.maxX, maxZ: hole.minZ });
  }
  if (hole.maxZ < r.maxZ - 0.05) {
    bands.push({ minX: r.minX, minZ: hole.maxZ, maxX: r.maxX, maxZ: r.maxZ });
  }
  if (hole.minX > r.minX + 0.05) {
    bands.push({ minX: r.minX, minZ: hole.minZ, maxX: hole.minX, maxZ: hole.maxZ });
  }
  if (hole.maxX < r.maxX - 0.05) {
    bands.push({ minX: hole.maxX, minZ: hole.minZ, maxX: r.maxX, maxZ: hole.maxZ });
  }
  for (const band of bands) addSlab(sink, band, top, thickness, material, { walkable, costMul });
}

// ---------------------------------------------------------------------------
// Stairs
// ---------------------------------------------------------------------------

interface StairWell {
  /** Full well footprint, including both flights and the landing. */
  rect: Rect;
  /** Flights run along X; +1 means the first flight climbs toward +X. */
  dir: 1 | -1;
  width: number;
  runLength: number;
  landing: number;
  /** Z centre of the up flight and of the return flight. */
  laneA: number;
  laneB: number;
}

const STAIR_WIDTH = 1.25;
const STAIR_LANDING = 1.35;

function stairWell(interior: Rect, corner: StairCorner): StairWell {
  const width = STAIR_WIDTH;
  const runLength = 2.62;
  const total = runLength + STAIR_LANDING;
  const west = corner === 'nw' || corner === 'sw';
  const north = corner === 'nw' || corner === 'ne';

  const minX = west ? interior.minX : interior.maxX - total;
  const maxX = minX + total;
  const minZ = north ? interior.minZ : interior.maxZ - width * 2;
  const maxZ = minZ + width * 2;

  return {
    rect: { minX, minZ, maxX, maxZ },
    dir: west ? 1 : -1,
    width,
    runLength,
    landing: STAIR_LANDING,
    laneA: north ? minZ + width / 2 : maxZ - width / 2,
    laneB: north ? maxZ - width / 2 : minZ + width / 2,
  };
}

/**
 * Switchback stair from `baseY` up one floor.
 *
 * Two short flights beat one long one at this scale: the run fits inside a
 * normal room, and the landing gives the AI and the player a place to break
 * line of sight halfway up.
 */
function addSwitchbackStair(
  sink: Sink,
  well: StairWell,
  baseY: number,
  floorHeight: number,
  topFlight: boolean,
): void {
  const halfRise = floorHeight / 2;
  const steps = Math.max(6, Math.round(halfRise / 0.19));
  const rise = halfRise / steps;
  const run = well.runLength / steps;

  const startA = well.dir > 0 ? well.rect.minX : well.rect.maxX;
  const landingCentreX =
    well.dir > 0
      ? well.rect.maxX - well.landing / 2
      : well.rect.minX + well.landing / 2;

  addFlight(sink, startA, well.laneA, well.dir, well.width, baseY, steps, rise, run);
  addFlight(
    sink,
    well.dir > 0 ? well.rect.maxX - well.landing : well.rect.minX + well.landing,
    well.laneB,
    -well.dir as 1 | -1,
    well.width,
    baseY + halfRise,
    steps,
    rise,
    run,
  );

  // Landing spans both lanes.
  const landingRect: Rect = {
    minX: landingCentreX - well.landing / 2,
    maxX: landingCentreX + well.landing / 2,
    minZ: well.rect.minZ,
    maxZ: well.rect.maxZ,
  };
  addSlab(sink, landingRect, baseY + halfRise, 0.24, 'concrete_floor', { costMul: 1.4 });

  // A waist-high stringer wall between the flights: the classic stair-fight cover.
  const spineZ = (well.laneA + well.laneB) / 2;
  buildLowWall(
    sink,
    well.rect.minX + 0.1,
    spineZ,
    well.rect.maxX - well.landing - 0.05,
    spineZ,
    baseY + 0.2,
    0.95,
    'plaster_white',
    0.16,
  );

  if (topFlight) {
    // Guard rail around the head of the last flight so the AI has an edge to hug.
    buildLowWall(
      sink,
      well.rect.minX,
      well.laneB + (well.laneB > well.laneA ? well.width / 2 : -well.width / 2),
      well.rect.maxX,
      well.laneB + (well.laneB > well.laneA ? well.width / 2 : -well.width / 2),
      baseY + floorHeight,
      0.95,
      'plaster_white',
      0.14,
    );
  }
}

/** One straight flight: stepped boxes, a sloped soffit, colliders every two steps. */
function addFlight(
  sink: Sink,
  startX: number,
  centreZ: number,
  dir: 1 | -1,
  width: number,
  baseY: number,
  steps: number,
  rise: number,
  run: number,
): void {
  const stepGeometry = boxGeometry(run, rise, width, 0.012, 1.2);
  for (let i = 0; i < steps; i++) {
    const x = startX + dir * (i + 0.5) * run;
    const y = baseY + (i + 0.5) * rise;
    sink.addProp(stepGeometry, transform(x, y, centreZ), {
      material: 'concrete_floor',
      tier: 'structure',
      tint: 0xd9d2c4,
    });
  }

  const totalRun = steps * run;
  const totalRise = steps * rise;
  const length = Math.hypot(totalRun, totalRise);
  const angle = Math.atan2(totalRise, totalRun);
  sink.addStatic(
    placed(
      boxGeometry(length, 0.2, width, 0.02, 2.2),
      transform(
        startX + dir * totalRun * 0.5,
        baseY + totalRise * 0.5 - 0.09,
        centreZ,
        dir > 0 ? 0 : Math.PI,
        0,
        angle,
      ),
    ),
    { material: 'concrete_wall', tier: 'structure', mottle: 0.3 },
  );

  const group = 2;
  for (let i = 0; i < steps; i += group) {
    const count = Math.min(group, steps - i);
    const height = count * rise;
    const x = startX + dir * (i + count / 2) * run;
    sink.addCollider(
      new THREE.Vector3(x, baseY + (i + count) * rise - height / 2, centreZ),
      new THREE.Vector3((count * run) / 2, height / 2, width / 2),
      0,
      { surface: 'concrete', noCover: true, noNav: true },
    );
  }

  const minX = dir > 0 ? startX : startX - totalRun;
  sink.addWalkable({
    minX,
    maxX: minX + totalRun,
    minZ: centreZ - width / 2,
    maxZ: centreZ + width / 2,
    height: dir > 0 ? baseY : baseY + totalRise,
    ramp: { axis: 'x', rise: dir > 0 ? totalRise : -totalRise },
    costMul: 1.5,
  });
}

/** Low kerb around a roof hatch, so nobody walks into the hole by accident. */
function addStairHead(sink: Sink, well: StairWell, roofY: number): void {
  const r = well.rect;
  const edges: Array<[number, number, number, number]> = [
    [r.minX, r.minZ, r.maxX, r.minZ],
    [r.maxX, r.minZ, r.maxX, r.maxZ],
    [r.maxX, r.maxZ, r.minX, r.maxZ],
    [r.minX, r.maxZ, r.minX, r.minZ],
  ];
  // Leave the edge the stair arrives at open.
  const open = well.dir > 0 ? 3 : 1;
  for (let i = 0; i < 4; i++) {
    if (i === open) continue;
    const [x0, z0, x1, z1] = edges[i];
    buildLowWall(sink, x0, z0, x1, z1, roofY, 0.95, 'plaster_white', 0.18);
  }
}

/**
 * Exterior concrete stair with a parapet on both sides.
 *
 * Outside stairs are gameplay-first: they are visible from the street, so a
 * player can read the route to a roof without exploring, and they are contested
 * because the climb is exposed.
 */
export function buildExteriorStair(
  sink: Sink,
  x: number,
  z: number,
  axis: 'x' | 'z',
  dir: 1 | -1,
  baseY: number,
  topY: number,
  width = 1.5,
): void {
  const totalRise = topY - baseY;
  if (totalRise < 0.4) return;
  const steps = Math.max(4, Math.round(totalRise / 0.185));
  const rise = totalRise / steps;
  const run = 0.3;
  const totalRun = steps * run;

  const stepGeometry = boxGeometry(axis === 'x' ? run : width, rise, axis === 'x' ? width : run, 0.014, 1.4);
  for (let i = 0; i < steps; i++) {
    const along = (i + 0.5) * run * dir;
    const px = axis === 'x' ? x + along : x;
    const pz = axis === 'z' ? z + along : z;
    sink.addProp(stepGeometry, transform(px, baseY + (i + 0.5) * rise, pz), {
      material: 'concrete_floor',
      tier: 'structure',
      tint: 0xcfc7b8,
    });
  }

  const group = 2;
  for (let i = 0; i < steps; i += group) {
    const count = Math.min(group, steps - i);
    const height = count * rise;
    const along = (i + count / 2) * run * dir;
    const px = axis === 'x' ? x + along : x;
    const pz = axis === 'z' ? z + along : z;
    sink.addCollider(
      new THREE.Vector3(px, baseY + (i + count) * rise - height / 2, pz),
      new THREE.Vector3(
        axis === 'x' ? (count * run) / 2 : width / 2,
        height / 2,
        axis === 'z' ? (count * run) / 2 : width / 2,
      ),
      0,
      { surface: 'concrete', noCover: true, noNav: true },
    );
  }

  // Solid mass under the flight, so it reads as poured concrete not a floating ramp.
  const length = Math.hypot(totalRun, totalRise);
  const angle = Math.atan2(totalRise, totalRun);
  const midAlong = (totalRun / 2) * dir;
  sink.addStatic(
    placed(
      boxGeometry(length, 0.7, width, 0.03, 2.4),
      transform(
        axis === 'x' ? x + midAlong : x,
        baseY + totalRise / 2 - 0.36,
        axis === 'z' ? z + midAlong : z,
        axis === 'x' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? -Math.PI / 2 : Math.PI / 2,
        0,
        angle,
      ),
    ),
    { material: 'concrete_wall', tier: 'structure', mottle: 0.36 },
  );

  const minAlong = dir > 0 ? 0 : -totalRun;
  sink.addWalkable({
    minX: axis === 'x' ? x + minAlong : x - width / 2,
    maxX: axis === 'x' ? x + minAlong + totalRun : x + width / 2,
    minZ: axis === 'z' ? z + minAlong : z - width / 2,
    maxZ: axis === 'z' ? z + minAlong + totalRun : z + width / 2,
    height: dir > 0 ? baseY : topY,
    ramp: { axis, rise: dir > 0 ? totalRise : -totalRise },
    costMul: 1.45,
  });
}

// ---------------------------------------------------------------------------
// Interior partitions
// ---------------------------------------------------------------------------

/**
 * Splits a storey in two with a doorway between the halves.
 *
 * Returns the rooms it produced (and the doorway to keep clear of furniture), or
 * null when the storey is too small to divide, in which case the caller treats
 * the whole interior as one room.
 */
function addPartitions(
  sink: Sink,
  spec: BuildingSpec,
  interior: Rect,
  y: number,
  floorHeight: number,
  well: StairWell | null,
): { rooms: Rect[]; blockers: Rect[] } | null {
  const width = interior.maxX - interior.minX;
  const depth = interior.maxZ - interior.minZ;
  const material = spec.liner ?? 'plaster_white';
  const alongX = width > depth;
  const span = alongX ? depth : width;
  if (span < 4) return null;

  // One partition, offset off centre so the two rooms are different sizes and
  // the interior does not read as a symmetrical box.
  const t = sink.rng.range(0.42, 0.6);
  const doorAt = span * sink.rng.range(0.3, 0.7);
  const openings: Opening[] = [
    { at: doorAt, width: METRICS.doorWidth, sill: 0, height: METRICS.doorHeight, kind: 'door' },
  ];
  if (span > 8) {
    openings.push({
      at: span * 0.85,
      width: 1.2,
      sill: 1.1,
      height: 1.2,
      kind: 'window',
    });
  }

  if (alongX) {
    const x = interior.minX + width * t;
    if (well && x > well.rect.minX - 0.4 && x < well.rect.maxX + 0.4) return null;
    buildWall(sink, {
      x0: x,
      z0: interior.minZ,
      x1: x,
      z1: interior.maxZ,
      base: y,
      height: floorHeight - 0.26,
      thickness: METRICS.partitionThickness,
      material,
      openings,
      mottle: 0.3,
    });
    const z = interior.minZ + doorAt;
    return {
      rooms: [
        { ...interior, maxX: x - METRICS.partitionThickness / 2 },
        { ...interior, minX: x + METRICS.partitionThickness / 2 },
      ],
      blockers: [{ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.2, maxZ: z + 1.2 }],
    };
  }

  const z = interior.minZ + depth * t;
  if (well && z > well.rect.minZ - 0.4 && z < well.rect.maxZ + 0.4) return null;
  buildWall(sink, {
    x0: interior.minX,
    z0: z,
    x1: interior.maxX,
    z1: z,
    base: y,
    height: floorHeight - 0.26,
    thickness: METRICS.partitionThickness,
    material,
    openings,
    mottle: 0.3,
  });
  const x = interior.minX + doorAt;
  return {
    rooms: [
      { ...interior, maxZ: z - METRICS.partitionThickness / 2 },
      { ...interior, minZ: z + METRICS.partitionThickness / 2 },
    ],
    blockers: [{ minX: x - 1.2, maxX: x + 1.2, minZ: z - 1.5, maxZ: z + 1.5 }],
  };
}

// ---------------------------------------------------------------------------
// Roofs
// ---------------------------------------------------------------------------

function addPitchedRoof(
  sink: Sink,
  spec: BuildingSpec,
  footprint: Rect,
  eaveY: number,
  wallMaterial: MaterialId,
): void {
  const width = footprint.maxX - footprint.minX;
  const depth = footprint.maxZ - footprint.minZ;
  const cx = (footprint.minX + footprint.maxX) / 2;
  const cz = (footprint.minZ + footprint.maxZ) / 2;
  const alongX = width >= depth;
  const span = alongX ? depth : width;
  const ridge = span * 0.22;
  const slopeLength = Math.hypot(span / 2 + 0.35, ridge);
  const angle = Math.atan2(ridge, span / 2 + 0.35);
  const sheetLength = (alongX ? width : depth) + 0.7;

  for (const side of [-1, 1] as const) {
    const offset = (span / 4 + 0.18) * side;
    const geometry = boxGeometry(slopeLength, 0.11, sheetLength, 0.02, 1.05);
    sink.addStatic(
      placed(
        geometry,
        transform(
          alongX ? cx : cx + offset,
          eaveY + ridge / 2,
          alongX ? cz + offset : cz,
          alongX ? Math.PI / 2 : 0,
          0,
          side > 0 ? -angle : angle,
        ),
      ),
      { material: 'metal_corrugated', tier: 'structure', tint: 0xb9b0a0, mottle: 0.4 },
    );
    // Approximate the slope with one flat collider at mid height; a pitched roof
    // is not meant to be walked on, it only needs to stop bullets and grenades.
    sink.addCollider(
      new THREE.Vector3(alongX ? cx : cx + offset, eaveY + ridge / 2, alongX ? cz + offset : cz),
      new THREE.Vector3(
        alongX ? width / 2 + 0.35 : slopeLength / 2,
        0.1,
        alongX ? slopeLength / 2 : depth / 2 + 0.35,
      ),
      0,
      { surface: 'metal', noCover: true, noNav: true },
    );
  }

  // Ridge cap and gable infill.
  sink.addStatic(
    placed(
      boxGeometry(alongX ? sheetLength : 0.4, 0.12, alongX ? 0.4 : sheetLength, 0.02, 1.2),
      transform(cx, eaveY + ridge + 0.03, cz),
    ),
    { material: 'metal_corrugated', tier: 'structure', tint: 0xa9a091 },
  );
  for (const side of [-1, 1] as const) {
    const gx = alongX ? cx + (width / 2) * side : cx;
    const gz = alongX ? cz : cz + (depth / 2) * side;
    sink.addStatic(
      placed(
        boxGeometry(alongX ? 0.3 : span, ridge, alongX ? span : 0.3, 0.03, 1.6),
        transform(gx, eaveY + ridge / 2, gz),
      ),
      { material: wallMaterial, tier: 'structure', tint: spec.tint, mottle: 0.4 },
    );
  }
}

/** Torn slab, sagging rebar and a heap of what used to be the top floor. */
function addCollapsedRoof(
  sink: Sink,
  spec: BuildingSpec,
  interior: Rect,
  roofY: number,
  floorHeight: number,
): void {
  const cx = (interior.minX + interior.maxX) / 2;
  const cz = (interior.minZ + interior.maxZ) / 2;
  for (let i = 0; i < 4; i++) {
    const x = sink.rng.range(interior.minX + 0.6, interior.maxX - 0.6);
    const z = sink.rng.range(interior.minZ + 0.6, interior.maxZ - 0.6);
    const size = sink.rng.range(1.1, 2.4);
    sink.addProp(
      boxGeometry(size, 0.24, size * sink.rng.range(0.5, 1), 0.05, 2.2),
      transform(
        x,
        roofY - floorHeight + 0.6 + i * 0.14,
        z,
        sink.rng.range(0, Math.PI),
        sink.rng.range(-0.35, 0.35),
        sink.rng.range(-0.35, 0.35),
      ),
      { material: 'concrete_damaged', tier: 'structure', tint: 0xbdb5a6 },
    );
    rebarCluster(sink, x, roofY - floorHeight + 0.75 + i * 0.14, z, 5, 0.8);
  }
  sink.addLandmark(`${spec.name}_collapse`, cx, roofY - floorHeight, cz);
}

function addRoofDetails(
  sink: Sink,
  spec: BuildingSpec,
  interior: Rect,
  roofY: number,
  parapet: number,
): void {
  const width = interior.maxX - interior.minX;
  const depth = interior.maxZ - interior.minZ;
  if (width < 3 || depth < 3) return;
  const cx = (interior.minX + interior.maxX) / 2;
  const cz = (interior.minZ + interior.maxZ) / 2;
  const inset = 1.0;

  const spot = (): THREE.Vector2 =>
    new THREE.Vector2(
      sink.rng.range(interior.minX + inset, interior.maxX - inset),
      sink.rng.range(interior.minZ + inset, interior.maxZ - inset),
    );

  if (width > 4.5 && depth > 4.5) {
    const p = spot();
    waterTank(sink, p.x, roofY, p.y, sink.rng.range(0, Math.PI));
  }
  const acCount = Math.min(3, Math.max(1, Math.floor((width * depth) / 42)));
  for (let i = 0; i < acCount; i++) {
    const p = spot();
    roofAc(sink, p.x, roofY, p.y, sink.rng.range(0, Math.PI * 2));
  }
  if (sink.rng.bool(0.75)) {
    const p = spot();
    satelliteDish(sink, p.x, roofY, p.y, sink.rng.range(0, Math.PI * 2));
  }
  if (sink.rng.bool(0.5)) {
    const p = spot();
    antennaMast(sink, p.x, roofY, p.y, sink.rng.range(3.4, 5.6));
  }
  if (width > 5 && sink.rng.bool(0.7)) {
    const y = roofY + parapet + 0.75;
    laundryLine(
      sink,
      new THREE.Vector3(interior.minX + 0.4, y, cz - depth * 0.2),
      new THREE.Vector3(interior.maxX - 0.4, y, cz + depth * 0.2),
    );
  }

  // Scupper and a short parapet drain, so rain has somewhere to go.
  if (parapet > 0.2) {
    sink.addStatic(
      placed(
        cylinderGeometry(0.05, 0.05, 0.5, 6, 0.8),
        transform(interior.maxX - 0.1, roofY + 0.12, cz, 0, 0, Math.PI / 2),
      ),
      { material: 'metal_rusted', tier: 'detail', tint: 0x8d8172 },
    );
  }
  sink.addLandmark(`${spec.name}_roof`, cx, roofY, cz);
}

// ---------------------------------------------------------------------------
// Exterior dressing
// ---------------------------------------------------------------------------

function addExteriorDetails(
  sink: Sink,
  spec: BuildingSpec,
  footprint: Rect,
  base: number,
  roofY: number,
  facades: FacadeSpec[],
): void {
  const height = roofY - base;
  const floorHeight = spec.floorHeight ?? METRICS.floorHeight;
  const use = spec.use ?? (spec.shelled ? 'derelict' : 'home');

  for (let edge = 0; edge < 4; edge++) {
    const facade = facades[edge];
    if (facade.omit) continue;
    const [x0, z0, x1, z1] = edgeLine(footprint, edge);
    const length = Math.hypot(x1 - x0, z1 - z0);
    const dirX = (x1 - x0) / length;
    const dirZ = (z1 - z0) / length;
    // Outward normal is the right side of travel for this winding.
    const outX = dirZ;
    const outZ = -dirX;
    const yaw = Math.atan2(-dirZ, dirX) + Math.PI;

    // Bay centres, derived exactly as the facade builder derives them, so every
    // sill, infill and doorway lamp lands on the opening it belongs to.
    const bayCount = facade.bays ?? Math.max(1, Math.min(8, Math.round(length / BAY_SPACING)));
    const bayWidth = length / bayCount;
    const bays: number[] = [];
    for (let i = 0; i < bayCount; i++) bays.push((i + 0.5) * bayWidth);

    dressFacade(sink, {
      x0,
      z0,
      x1,
      z1,
      yaw,
      base,
      roofY,
      floors: spec.floors,
      floorHeight,
      use,
      bays,
      bayWidth,
      doors: facade.doors ?? [],
      blank: facade.blank ?? [],
      breach: facade.breach ?? [],
      arcade: facade.arcade === true,
      wallMaterial: spec.wall,
      wallTint: spec.tint,
    });

    if (sink.rng.bool(0.6)) {
      const at = sink.rng.range(1.0, Math.max(1.1, length - 1.0));
      plasterPatch(
        sink,
        x0 + dirX * at + outX * 0.185,
        base + sink.rng.range(0.6, Math.max(0.7, height - 1.2)),
        z0 + dirZ * at + outZ * 0.185,
        yaw,
        sink.rng.range(0.8, 1.9),
        sink.rng.range(0.6, 1.5),
      );
    }

    if (length > 5) {
      dustDrift(
        sink,
        x0 + dirX * 0.4 + outX * 0.19,
        z0 + dirZ * 0.4 + outZ * 0.19,
        x1 - dirX * 0.4 + outX * 0.19,
        z1 - dirZ * 0.4 + outZ * 0.19,
        edgeSide(edge),
        sink.rng.range(0.4, 0.75),
        sink.rng.range(0.1, 0.2),
      );
    }
  }
}

/** Which side of the edge direction the outside of the building is on. */
function edgeSide(edge: number): number {
  return edge === 0 || edge === 1 ? -1 : -1;
}

function interiorBox(interior: Rect, y0: number, y1: number): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(interior.minX, y0, interior.minZ),
    new THREE.Vector3(interior.maxX, y1, interior.maxZ),
  );
}

// ---------------------------------------------------------------------------
// Special structures
// ---------------------------------------------------------------------------

/**
 * Minaret: a square base, an octagonal shaft, a balcony gallery and a cap.
 * The tallest thing on the map, so it doubles as the orientation landmark.
 */
export function buildMinaret(
  sink: Sink,
  x: number,
  z: number,
  base: number,
  height: number,
  material: MaterialId = 'plaster_white',
): void {
  const baseSize = 2.4;
  const baseHeight = height * 0.16;
  sink.addStatic(
    slab(x, base + baseHeight / 2, z, baseSize, baseHeight, baseSize, 0.06, 2.4),
    { material, tier: 'structure', mottle: 0.3, tint: 0xf2ebdb },
  );
  sink.addCollider(
    new THREE.Vector3(x, base + baseHeight / 2, z),
    new THREE.Vector3(baseSize / 2, baseHeight / 2, baseSize / 2),
    0,
    { surface: 'plaster' },
  );

  const shaftHeight = height * 0.62;
  const shaftY = base + baseHeight;
  sink.addStatic(
    placed(
      cylinderGeometry(0.78, 0.95, shaftHeight, 8, 2.2),
      transform(x, shaftY + shaftHeight / 2, z),
    ),
    { material, tier: 'structure', mottle: 0.32, tint: 0xf0e8d6 },
  );
  sink.addCollider(
    new THREE.Vector3(x, shaftY + shaftHeight / 2, z),
    new THREE.Vector3(0.82, shaftHeight / 2, 0.82),
    0,
    { surface: 'plaster' },
  );

  // Gallery.
  const galleryY = shaftY + shaftHeight;
  sink.addStatic(
    placed(cylinderGeometry(1.55, 1.35, 0.22, 12, 2.0), transform(x, galleryY, z)),
    { material: 'concrete_wall', tier: 'structure', mottle: 0.3 },
  );
  const balusters = 12;
  for (let i = 0; i < balusters; i++) {
    const a = (i / balusters) * Math.PI * 2;
    sink.addStatic(
      placed(
        boxGeometry(0.12, 0.85, 0.12, 0.02, 1.0),
        transform(x + Math.cos(a) * 1.4, galleryY + 0.53, z + Math.sin(a) * 1.4, a),
      ),
      { material, tier: 'structure', tint: 0xf4eddd },
    );
  }
  sink.addStatic(
    placed(cylinderGeometry(1.5, 1.5, 0.1, 12, 1.6), transform(x, galleryY + 1.0, z)),
    { material: 'concrete_wall', tier: 'structure' },
  );

  // Upper shaft, hood and finial.
  const upperHeight = height * 0.2;
  sink.addStatic(
    placed(
      cylinderGeometry(0.62, 0.7, upperHeight, 8, 2.0),
      transform(x, galleryY + 1.05 + upperHeight / 2, z),
    ),
    { material, tier: 'structure', tint: 0xefe7d4, mottle: 0.3 },
  );
  const capY = galleryY + 1.05 + upperHeight;
  sink.addStatic(
    placed(
      latheGeometry(
        'minaretcap',
        [
          [0, 0],
          [0.92, 0.05],
          [0.86, 0.35],
          [0.62, 0.9],
          [0.3, 1.35],
          [0.1, 1.55],
          [0, 1.6],
        ],
        12,
        1.8,
      ),
      transform(x, capY, z),
    ),
    { material: 'metal_panel', tier: 'structure', tint: 0x9fa89b },
  );
  sink.addStatic(
    placed(cylinderGeometry(0.035, 0.035, 0.9, 6, 0.8), transform(x, capY + 2.0, z)),
    { material: 'metal_panel', tier: 'structure', tint: 0xc9bb92 },
  );
  sink.addCollider(
    new THREE.Vector3(x, capY - upperHeight / 2, z),
    new THREE.Vector3(0.7, upperHeight / 2 + 1.0, 0.7),
    0,
    { surface: 'plaster', noCover: true },
  );
  sink.addLandmark('minaret', x, capY, z);
}

/** Ribbed dome on a drum, for the prayer hall. */
export function buildDome(
  sink: Sink,
  x: number,
  z: number,
  base: number,
  radius: number,
  material: MaterialId = 'plaster_white',
): void {
  const drumHeight = radius * 0.42;
  sink.addStatic(
    placed(
      cylinderGeometry(radius, radius + 0.05, drumHeight, 16, 2.4),
      transform(x, base + drumHeight / 2, z),
    ),
    { material, tier: 'structure', tint: 0xf2ebda, mottle: 0.3 },
  );
  sink.addCollider(
    new THREE.Vector3(x, base + drumHeight / 2, z),
    new THREE.Vector3(radius, drumHeight / 2, radius),
    0,
    { surface: 'plaster', noCover: true, noNav: true },
  );

  const profile: Array<[number, number]> = [];
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2);
    profile.push([Math.cos(a) * radius, Math.sin(a) * radius * 0.86]);
  }
  sink.addStatic(
    placed(latheGeometry(`dome|${radius.toFixed(2)}`, profile, 18, 2.6), transform(x, base + drumHeight, z)),
    { material: 'metal_panel', tier: 'structure', tint: 0x8fa8a0, mottle: 0.25 },
  );
  sink.addCollider(
    new THREE.Vector3(x, base + drumHeight + radius * 0.4, z),
    new THREE.Vector3(radius * 0.82, radius * 0.42, radius * 0.82),
    0,
    { surface: 'metal', noCover: true, noNav: true },
  );

  // Finial.
  sink.addStatic(
    placed(
      cylinderGeometry(0.05, 0.09, 0.9, 8, 0.9),
      transform(x, base + drumHeight + radius * 0.86 + 0.45, z),
    ),
    { material: 'metal_panel', tier: 'structure', tint: 0xc8bb92 },
  );
}

export interface ShellSpec {
  name: string;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  floors: number;
  base?: number;
  floorHeight?: number;
}

/**
 * Under-construction concrete frame: columns, slabs, a stub core and no walls.
 *
 * A shell is the best piece of level geometry there is — total sightlines on
 * every floor, cover only where the columns are, and a legible way up.
 */
export function buildConstructionShell(sink: Sink, spec: ShellSpec): BuildingResult {
  const fh = spec.floorHeight ?? 3.2;
  const base = spec.base ?? sink.ground(spec.centerX, spec.centerZ);
  const hw = spec.width / 2;
  const hd = spec.depth / 2;
  const footprint: Rect = {
    minX: spec.centerX - hw,
    minZ: spec.centerZ - hd,
    maxX: spec.centerX + hw,
    maxZ: spec.centerZ + hd,
  };

  const colsX = Math.max(2, Math.round(spec.width / 4.2));
  const colsZ = Math.max(2, Math.round(spec.depth / 4.2));
  const floorYs: number[] = [];
  for (let f = 0; f < spec.floors; f++) floorYs.push(base + f * fh);
  const roofY = base + spec.floors * fh;

  addSlab(sink, footprint, base + FLOOR_PROUD, 0.3 + FLOOR_PROUD, 'concrete_floor', { costMul: 1 });

  for (let f = 0; f < spec.floors; f++) {
    const y = floorYs[f];
    // Columns.
    for (let i = 0; i <= colsX; i++) {
      for (let j = 0; j <= colsZ; j++) {
        const x = footprint.minX + 0.3 + ((spec.width - 0.6) * i) / colsX;
        const z = footprint.minZ + 0.3 + ((spec.depth - 0.6) * j) / colsZ;
        sink.addProp(boxGeometry(0.42, fh, 0.42, 0.03, 2.0), transform(x, y + fh / 2, z), {
          material: 'concrete_wall',
          tier: 'structure',
          tint: 0xcfc8b8,
        });
        sink.addCollider(
          new THREE.Vector3(x, y + fh / 2, z),
          new THREE.Vector3(0.21, fh / 2, 0.21),
          0,
          { surface: 'concrete' },
        );
        if (f === spec.floors - 1) rebarCluster(sink, x, roofY + 0.1, z, 4, 0.55);
      }
    }
    // Edge beams double as waist-high cover on the open floor plates.
    if (f > 0) {
      for (let edge = 0; edge < 4; edge++) {
        const [x0, z0, x1, z1] = edgeLine(footprint, edge);
        buildLowWall(sink, x0, z0, x1, z1, y, 0.98, 'concrete_wall', 0.28);
      }
    }
  }

  for (let f = 1; f <= spec.floors; f++) {
    const y = base + f * fh;
    // Top plate is partly poured; leave a hole so the level reads as unfinished.
    if (f === spec.floors) {
      const hole: Rect = {
        minX: footprint.minX + spec.width * 0.55,
        maxX: footprint.maxX - 0.6,
        minZ: footprint.minZ + spec.depth * 0.5,
        maxZ: footprint.maxZ - 0.6,
      };
      addPiercedSlab(sink, footprint, y, 0.28, 'concrete_floor', hole, 1);
    } else {
      addPiercedSlab(sink, footprint, y, 0.28, 'concrete_floor', stairHole(footprint), 1);
    }
    sink.addInterior(`${spec.name}_f${f - 1}`, interiorBox(footprint, base + (f - 1) * fh, y - 0.1));
  }

  // Stair core: a single straight flight per level along the west edge.
  for (let f = 0; f < spec.floors; f++) {
    buildExteriorStair(
      sink,
      footprint.minX + 1.1,
      footprint.minZ + 1.4,
      'z',
      1,
      base + f * fh,
      base + (f + 1) * fh,
      1.4,
    );
  }

  return {
    name: spec.name,
    base,
    floorHeight: fh,
    roofY,
    floorYs,
    footprint,
    interior: footprint,
    parapet: 0.98,
  };
}

function stairHole(footprint: Rect): Rect {
  return {
    minX: footprint.minX + 0.3,
    maxX: footprint.minX + 2.0,
    minZ: footprint.minZ + 0.6,
    maxZ: footprint.minZ + 4.6,
  };
}

/**
 * Roof access from the outside.
 *
 * The ladder reads the route from the street; the crate under it is what the
 * player actually uses, because two 0.8 m mantles are always available whereas
 * ladder climbing is not.
 */
export function addRoofLadder(sink: Sink, x: number, z: number, yaw: number, top: number): void {
  const base = sink.ground(x, z);
  ladder(sink, x, z, yaw, Math.max(1.2, top - base + 0.3));
}
