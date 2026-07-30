import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import type { SurfaceType } from '../../core/GameTypes';
import {
  METRICS,
  type Sink,
  boxGeometry,
  placed,
  planeGeometry,
  surfaceOf,
  transform,
} from './Kit';

/**
 * Wall segments with openings.
 *
 * Two rules drive everything here. Walls are solid volumes, never planes: a
 * paper-thin wall seen edge-on through a doorway destroys the illusion
 * instantly. And every piece is a bevelled box, so window reveals, lintels and
 * plinths each catch their own sliver of highlight instead of dissolving into one
 * flat slab.
 */

export type OpeningKind = 'door' | 'window' | 'arch' | 'breach';

export interface Opening {
  /** Centre of the opening, measured along the wall from its start. */
  at: number;
  width: number;
  /** Height of the opening's underside above the wall base. */
  sill: number;
  height: number;
  kind: OpeningKind;
  /** Fit a glass pane (registered as a destructible). */
  glass?: boolean;
  /** Protruding sill slab and lintel band. */
  trim?: boolean;
  /** Hang a wooden shutter to one side. */
  shutter?: boolean;
  /** Fit a metal grille (barred window). */
  bars?: boolean;
}

export interface WallSpec {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  base: number;
  height: number;
  thickness?: number;
  material: MaterialId;
  /** Interior finish applied as a thin liner on one face. */
  liner?: MaterialId;
  /** Overrides the default limewash tint on the liner. */
  linerTint?: number;
  /** Paint for the dado up the interior face; without one, no dado is built. */
  dadoPaint?: number;
  /** +1 for the left side of the direction of travel, -1 for the right. */
  linerSide?: 1 | -1;
  /**
   * Emissive bounce baked into the liner only.
   *
   * The liner is the one part of a wall that is purely interior, so it is the one
   * part that can carry the fill without lighting up the street outside.
   */
  linerFill?: number;
  openings?: Opening[];
  /** Low wall continuing above `height`. */
  parapet?: number;
  parapetMaterial?: MaterialId;
  /** Wider bevelled base course. */
  plinth?: boolean;
  /** Decorative string course at this height above the base. */
  band?: number;
  tint?: number;
  mottle?: number;
  /** Metres per texture tile; tighten it when a material's pattern reads too big. */
  tile?: number;
  surface?: SurfaceType;
  /** Skip collision entirely (decorative screens). */
  noCollide?: boolean;
}

interface Panel {
  /** Along the wall. */
  u0: number;
  u1: number;
  /** Above the base. */
  v0: number;
  v1: number;
}

const ARCH_COLUMNS = 7;

export function buildWall(sink: Sink, spec: WallSpec): void {
  const dx = spec.x1 - spec.x0;
  const dz = spec.z1 - spec.z0;
  const length = Math.hypot(dx, dz);
  if (length < 1e-3) return;

  const dirX = dx / length;
  const dirZ = dz / length;
  const yaw = Math.atan2(-dz, dx);
  const thickness = spec.thickness ?? METRICS.wallThickness;
  const openings = (spec.openings ?? []).slice().sort((a, b) => a.at - b.at);

  const panels: Panel[] = [];
  let cursor = 0;
  for (const opening of openings) {
    const left = Math.max(0, opening.at - opening.width / 2);
    const right = Math.min(length, opening.at + opening.width / 2);
    if (left > cursor + 1e-3) panels.push({ u0: cursor, u1: left, v0: 0, v1: spec.height });
    if (opening.sill > 1e-3) panels.push({ u0: left, u1: right, v0: 0, v1: opening.sill });

    const head = opening.sill + opening.height;
    if (opening.kind === 'arch') {
      addArchHead(panels, left, right, head, spec.height);
    } else if (head < spec.height - 1e-3) {
      panels.push({ u0: left, u1: right, v0: head, v1: spec.height });
    }
    cursor = Math.max(cursor, right);
  }
  if (cursor < length - 1e-3) panels.push({ u0: cursor, u1: length, v0: 0, v1: spec.height });

  const localToWorldX = (u: number, w: number): number => spec.x0 + dirX * u - dirZ * w;
  const localToWorldZ = (u: number, w: number): number => spec.z0 + dirZ * u + dirX * w;

  for (const panel of panels) {
    const du = panel.u1 - panel.u0;
    const dv = panel.v1 - panel.v0;
    if (du < 0.02 || dv < 0.02) continue;
    const u = (panel.u0 + panel.u1) * 0.5;
    const v = (panel.v0 + panel.v1) * 0.5;
    const x = localToWorldX(u, 0);
    const z = localToWorldZ(u, 0);
    const y = spec.base + v;
    const bevel = Math.min(0.035, dv * 0.2, du * 0.2);

    sink.addStatic(placed(boxGeometry(du, dv, thickness, bevel, 1), transform(x, y, z, yaw)), {
      material: spec.material,
      tier: 'structure',
      reproject: true,
      uvJitter: true,
      tile: spec.tile,
      tint: spec.tint,
      mottle: spec.mottle ?? 0.26,
    });

    if (!spec.noCollide) {
      const reachesGround = panel.v0 < 0.25;
      sink.addCollider(
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(du / 2, dv / 2, thickness / 2),
        yaw,
        {
          surface: spec.surface ?? surfaceOf(spec.material),
          noCover: !reachesGround || du < 0.45,
        },
      );
    }

    if (spec.liner) {
      const side = spec.linerSide ?? 1;
      const linerThickness = 0.05;
      const w = side * (thickness / 2 - linerThickness / 2 + 0.002);
      const fill = spec.linerFill ?? 0;
      if (fill > 0) sink.interiorFill(fill);
      sink.addStatic(
        placed(
          boxGeometry(du - 0.01, dv - 0.01, linerThickness, 0.012, 1),
          transform(localToWorldX(u, w), y, localToWorldZ(u, w), yaw),
        ),
        {
          material: spec.liner,
          tier: 'structure',
          reproject: true,
          uvJitter: true,
          mottle: 0.3,
          tint: spec.linerTint ?? INTERIOR_TINT,
        },
      );
      if (fill > 0) sink.interiorFill(0);
    }

    // An enclosing wall names the side its interior is on; a partition has no
    // outside, so it takes a dado on both faces. Getting this from `linerSide`
    // rather than from `liner` matters: most buildings have no separate liner, and
    // painting both faces of their outside wall puts a dado on the street.
    if (spec.dadoPaint !== undefined && panel.v0 <= 0.05 && dv >= 1.5 && du >= 0.7) {
      const faces = spec.linerSide === undefined ? [1, -1] : [spec.linerSide];
      const fill = spec.linerFill ?? 0;
      if (fill > 0) sink.interiorFill(fill);
      for (const face of faces) {
        const off = face * (thickness / 2 + 0.03);
        addDado(sink, spec, du, localToWorldX(u, off), localToWorldZ(u, off), yaw);
      }
      if (fill > 0) sink.interiorFill(0);
    }
  }

  for (const opening of openings) {
    addOpeningDressing(sink, spec, opening, length, dirX, dirZ, yaw, thickness);
  }

  if (spec.plinth) {
    const height = 0.34;
    const u = length / 2;
    sink.addStatic(
      placed(
        boxGeometry(length, height, thickness + 0.13, 0.045, 1),
        transform(localToWorldX(u, 0), spec.base + height / 2, localToWorldZ(u, 0), yaw),
      ),
      { material: 'concrete_wall', tier: 'structure', reproject: true, mottle: 0.4 },
    );
  }

  if (spec.band !== undefined) {
    const u = length / 2;
    sink.addStatic(
      placed(
        boxGeometry(length, 0.2, thickness + 0.1, 0.035, 1),
        transform(localToWorldX(u, 0), spec.base + spec.band, localToWorldZ(u, 0), yaw),
      ),
      // Always cast stone, whatever the wall is: a string course in the facade
      // material protrudes into the room behind it and reads as a brick cornice
      // in somebody's front room.
      { material: 'concrete_wall', tier: 'structure', reproject: true },
    );
  }

  if (spec.parapet && spec.parapet > 0.05) {
    const u = length / 2;
    const y = spec.base + spec.height + spec.parapet / 2;
    const parapetThickness = thickness * 0.72;
    sink.addStatic(
      placed(
        boxGeometry(length, spec.parapet, parapetThickness, 0.03, 1),
        transform(localToWorldX(u, 0), y, localToWorldZ(u, 0), yaw),
      ),
      {
        material: spec.parapetMaterial ?? spec.material,
        tier: 'structure',
        reproject: true,
        uvJitter: true,
        tile: spec.tile,
        tint: spec.tint,
        mottle: 0.35,
      },
    );
    // A coping stone reads as a built edge and gives the parapet a highlight.
    sink.addStatic(
      placed(
        boxGeometry(length, 0.09, parapetThickness + 0.09, 0.02, 1),
        transform(
          localToWorldX(u, 0),
          spec.base + spec.height + spec.parapet + 0.045,
          localToWorldZ(u, 0),
          yaw,
        ),
      ),
      { material: 'concrete_wall', tier: 'structure', reproject: true, mottle: 0.3 },
    );
    if (!spec.noCollide) {
      sink.addCollider(
        new THREE.Vector3(localToWorldX(u, 0), y, localToWorldZ(u, 0)),
        new THREE.Vector3(length / 2, spec.parapet / 2, parapetThickness / 2),
        yaw,
        { surface: 'concrete' },
      );
    }
  }
}

/** Stepped voussoir head for arched openings. */
function addArchHead(
  panels: Panel[],
  left: number,
  right: number,
  crown: number,
  wallTop: number,
): void {
  const width = right - left;
  const radius = width / 2;
  const springing = crown - radius;
  const centre = (left + right) / 2;

  for (let i = 0; i < ARCH_COLUMNS; i++) {
    const u0 = left + (width * i) / ARCH_COLUMNS;
    const u1 = left + (width * (i + 1)) / ARCH_COLUMNS;
    const mid = Math.max(Math.abs(u0 - centre), Math.abs(u1 - centre));
    const rise = Math.sqrt(Math.max(0, radius * radius - mid * mid));
    const v0 = springing + rise;
    if (v0 < wallTop - 1e-3) panels.push({ u0, u1, v0, v1: wallTop });
  }
}

function addOpeningDressing(
  sink: Sink,
  spec: WallSpec,
  opening: Opening,
  length: number,
  dirX: number,
  dirZ: number,
  yaw: number,
  thickness: number,
): void {
  const u = opening.at;
  const x = spec.x0 + dirX * u;
  const z = spec.z0 + dirZ * u;
  const perpX = -dirZ;
  const perpZ = dirX;

  if (opening.trim !== false && opening.kind !== 'breach') {
    if (opening.sill > 0.2) {
      const sillWidth = opening.width + 0.24;
      sink.addStatic(
        placed(
          boxGeometry(sillWidth, 0.09, thickness + 0.16, 0.02, 1),
          transform(x, spec.base + opening.sill - 0.02, z, yaw),
        ),
        { material: 'concrete_wall', tier: 'structure', reproject: true, mottle: 0.3 },
      );
    }
    if (opening.kind !== 'arch') {
      sink.addStatic(
        placed(
          boxGeometry(opening.width + 0.3, 0.14, thickness + 0.1, 0.025, 1),
          transform(x, spec.base + opening.sill + opening.height + 0.07, z, yaw),
        ),
        { material: 'concrete_wall', tier: 'structure', reproject: true, mottle: 0.35 },
      );
    }
  }

  if (opening.glass) {
    const paneWidth = opening.width - 0.12;
    const paneHeight = opening.height - 0.12;
    const pane = planeGeometry(paneWidth, paneHeight, 1.5);
    const y = spec.base + opening.sill + opening.height / 2;
    const ref = sink.addInstancedProp(pane, transform(x, y, z, yaw), {
      material: 'glass_dirty',
      tier: 'structure',
      castShadow: false,
      tile: 1.5,
    });
    sink.addDestructible({
      kind: 'glass',
      position: new THREE.Vector3(x, y, z),
      radius: Math.max(paneWidth, paneHeight) * 0.6,
      health: 12,
      surface: 'glass',
      instance: ref,
      size: new THREE.Vector2(paneWidth, paneHeight),
    });

    // Head rail, cill rail and a central mullion, so the hole reads as a window.
    const frame = 0.055;
    const rails: Array<[number, number, number]> = [
      [paneWidth + frame, frame, paneHeight / 2],
      [paneWidth + frame, frame, -paneHeight / 2],
      [frame, paneHeight, 0],
    ];
    for (const [w, h, oy] of rails) {
      sink.addStatic(
        placed(boxGeometry(w, h, 0.075, 0.012, 1), transform(x, y + oy, z, yaw)),
        {
          material: 'wood_painted',
          tier: 'detail',
          reproject: true,
          tint: 0xb7c0bd,
        },
      );
    }
  }

  if (opening.bars) {
    const bars = 5;
    for (let i = 0; i < bars; i++) {
      const offset = (-0.5 + (i + 0.5) / bars) * (opening.width - 0.16);
      sink.addStatic(
        placed(
          boxGeometry(0.035, opening.height - 0.08, 0.035, 0.008, 1),
          transform(
            x + dirX * offset,
            spec.base + opening.sill + opening.height / 2,
            z + dirZ * offset,
            yaw,
          ),
        ),
        { material: 'metal_rusted', tier: 'detail', reproject: true, tint: 0x8e7d6a },
      );
    }
  }

  if (opening.shutter) {
    const side = sink.rng.sign();
    const shutterWidth = opening.width * 0.52;
    const offset = side * (opening.width / 2 - shutterWidth / 2 + 0.05);
    const swing = sink.rng.range(0.35, 1.15) * side;
    const hingeX = x + dirX * offset + perpX * (thickness / 2);
    const hingeZ = z + dirZ * offset + perpZ * (thickness / 2);
    const y = spec.base + opening.sill + opening.height / 2;
    sink.addProp(
      boxGeometry(shutterWidth, opening.height - 0.1, 0.045, 0.012, 1.8),
      transform(hingeX, y, hingeZ, yaw + swing),
      { material: 'wood_painted', tier: 'detail', tint: sink.rng.bool() ? 0x7d8f8a : 0x9a8c6e },
    );
  }
}

/**
 * Low wall used for compound boundaries and rooftop edges: it is waist high, so
 * it is the map's most common piece of hard cover.
 */
export function buildLowWall(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  base: number,
  height: number,
  material: MaterialId,
  thickness = 0.3,
): void {
  buildWall(sink, {
    x0,
    z0,
    x1,
    z1,
    base,
    height,
    thickness,
    material,
    mottle: 0.4,
  });
  const dx = x1 - x0;
  const dz = z1 - z0;
  const length = Math.hypot(dx, dz);
  if (length < 0.2) return;
  const yaw = Math.atan2(-dz, dx);
  sink.addStatic(
    placed(
      boxGeometry(length, 0.07, thickness + 0.08, 0.018, 1),
      transform((x0 + x1) / 2, base + height + 0.035, (z0 + z1) / 2, yaw),
    ),
    { material: 'concrete_wall', tier: 'structure', reproject: true, mottle: 0.3 },
  );
}

export interface WallRingOptions {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  base: number;
  height: number;
  material: MaterialId;
  thickness?: number;
  /** Per-edge openings, indexed north, east, south, west. */
  openings?: Array<Opening[] | undefined>;
  /** Omit an edge entirely (party walls between adjoining buildings). */
  skip?: readonly boolean[];
  liner?: MaterialId;
  tint?: number;
  parapet?: number;
  plinth?: boolean;
  band?: number;
}

/**
 * Painted dado up the bottom of a lined wall, with a rail along the top of it.
 *
 * A liner is one material over one flat rectangle, so however much small dressing
 * goes on it the wall still reads as a panel — which is what the review caught in
 * the interior frame. A dado is what the reference has instead: the bottom metre
 * painted a different colour from the top, and a moulding where the two meet. It
 * cuts the rectangle in three horizontally and the rail catches a highlight along
 * its whole length.
 *
 * Built here rather than per room because the wall already knows where its
 * openings are — the liner is split around them — so a dado laid on a liner piece
 * can never cross a doorway. Rooms do not know about their partitions, and a
 * partition wall is most of what the player is standing next to indoors.
 */
function addDado(sink: Sink, spec: WallSpec, du: number, x: number, z: number, yaw: number): void {
  sink.addStatic(
    placed(
      boxGeometry(du - 0.02, DADO_HEIGHT, 0.055, 0, 1),
      transform(x, spec.base + DADO_HEIGHT / 2, z, yaw),
    ),
    {
      material: spec.liner ?? spec.material,
      tier: 'structure',
      reproject: true,
      mottle: 0.22,
      tint: spec.dadoPaint,
    },
  );
  sink.addStatic(
    placed(boxGeometry(du - 0.02, 0.05, 0.085, 0, 1), transform(x, spec.base + DADO_HEIGHT, z, yaw)),
    { material: 'wood_painted', tier: 'detail', reproject: true, tint: DADO_RAIL },
  );
}

/**
 * The building's dado colour, from its name rather than the shared rng.
 *
 * A building's enclosing walls and its partitions are built by different passes,
 * and both have to arrive at the same colour or the dado changes shade halfway
 * across a room. Hashing the name gets them there without either pass having to
 * be told, and without spending a draw from the rng stream, which would reshuffle
 * every decision made after it.
 */
export function dadoPaintFor(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return DADO_PAINTS[(hash >>> 0) % DADO_PAINTS.length];
}

/**
 * One height for every dado in the map, and one colour per building.
 *
 * Varying either per wall looks like more variety and is not: two walls of a room
 * meet at a corner, and a dado that changes colour or steps in height at the
 * corner reads as a bug rather than as a room.
 */
const DADO_HEIGHT = 0.98;

const DADO_RAIL = 0x6a5c44;

/** Distemper colours: what a room in this town is actually painted. */
const DADO_PAINTS: readonly number[] = [
  0x9a8a6a, 0x8a7c5e, 0x7c8478, 0x6e7a80, 0xa08c68, 0x8e7458,
];

/**
 * Warm limewash on every interior face that does not ask for something else.
 *
 * The liner materials are chosen for what a building is made of, so untinted they
 * come out as neutral pale grey — and a room's walls are the largest flat thing
 * in any interior frame, so neutral grey is what the whole room reads as. Which
 * is what the review saw. A room in this town is painted, and now that the
 * renderer separates up-facing from down-facing ambient, warmth on a vertical
 * surface is the difference between a wall and a panel.
 */
export const INTERIOR_TINT = 0xc0ad8e;

/**
 * Four walls around a rectangle, wound so that the liner always lands inside.
 * Edge order is north (-Z), east (+X), south (+Z), west (-X).
 */
export function buildWallRing(sink: Sink, opts: WallRingOptions): void {
  const hw = opts.width / 2;
  const hd = opts.depth / 2;
  const { centerX: cx, centerZ: cz } = opts;
  const corners: Array<[number, number, number, number]> = [
    [cx - hw, cz - hd, cx + hw, cz - hd],
    [cx + hw, cz - hd, cx + hw, cz + hd],
    [cx + hw, cz + hd, cx - hw, cz + hd],
    [cx - hw, cz + hd, cx - hw, cz - hd],
  ];

  for (let edge = 0; edge < 4; edge++) {
    if (opts.skip?.[edge]) continue;
    const [x0, z0, x1, z1] = corners[edge];
    buildWall(sink, {
      x0,
      z0,
      x1,
      z1,
      base: opts.base,
      height: opts.height,
      thickness: opts.thickness,
      material: opts.material,
      liner: opts.liner,
      linerSide: 1,
      openings: opts.openings?.[edge],
      parapet: opts.parapet,
      plinth: opts.plinth,
      band: opts.band,
      tint: opts.tint,
    });
  }
}
