/**
 * Blockout.ts — the level-design source of truth for "Al-Rashid District".
 *
 * This file holds NO geometry. It defines the shared types every builder
 * consumes, and `buildPlan(rng)` which lays out the whole map the way a level
 * designer would: a north–south main street, flanking building rows with a
 * couple of enterable interiors, a market plaza, a courtyard, alleys, and a
 * southern checkpoint. Coordinates are metres; +Z is south, −Z is north, the
 * player advances northward. Everything is deterministic from `rng`.
 */

import * as THREE from 'three';
import type { Rng } from '../core/MathX';
import type { MaterialLibrary } from '../render/textures/MaterialLibrary';
import type { SurfaceKind } from '../render/textures/TextureForge';

// ---------------------------------------------------------------------------
// Shared build plumbing (accumulators + material helper) used by all builders
// ---------------------------------------------------------------------------

/** An axis-aligned solid used for the nav grid and cheap line-of-sight. */
export interface Solid {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface CoverSeed {
  pos: THREE.Vector3;
  /** Outward direction the cover faces (the side it protects from). */
  normal: THREE.Vector3;
  low: boolean;
}

export interface MatOpts {
  tint?: THREE.ColorRepresentation;
  rough?: number;
  metal?: number;
  /** Override the material's normal map strength (tames "melted" surfaces). */
  normalScale?: number;
  /** Override AO map intensity. */
  ao?: number;
  /** Cache key suffix so different tints of the same kind don't collide. */
  key?: string;
}

/** Everything a builder needs: rng, materials, and the accumulators to fill. */
export interface Build {
  rng: Rng;
  materials: MaterialLibrary;
  root: THREE.Group;
  colliders: THREE.Object3D[];
  solids: Solid[];
  interiors: THREE.Box3[];
  covers: CoverSeed[];
  /** Tinted, cached material clone. Tracked for disposal. */
  mat(kind: SurfaceKind | string, opts?: MatOpts): THREE.Material;
  /** Metres per texture tile for a surface kind. */
  uv(kind: SurfaceKind | string): number;
  /** Cheap reflective near-black window for the many background/distant panes. */
  windowDark(): THREE.Material;
  /** Transmissive hero glass for the few windows on the player's sightline. */
  glassHero(): THREE.Material;
  /** Shared procedural decal material (bullet holes, scorch fans). */
  decal(kind: 'scorch' | 'bullet_hole' | 'bullet_hole_metal'): THREE.Material;
  /** Register a geometry/material this system owns so it is freed on dispose. */
  own(geo?: THREE.BufferGeometry | null, mat?: THREE.Material | null): void;
}

// ---------------------------------------------------------------------------
// Design types
// ---------------------------------------------------------------------------

export type WallKind = 'brick' | 'plaster' | 'concrete';

export interface DamageSpec {
  /** Which facade the shelling came from. */
  side: 'N' | 'S' | 'E' | 'W';
  /** 0..1 overall severity. */
  severity: number;
  /** Corner collapse exposing interior floors in cross-section. */
  collapseCorner?: boolean;
}

export interface BuildingSpec {
  id: string;
  /** Footprint centre. */
  cx: number;
  cz: number;
  /** Footprint size along X and Z. */
  w: number;
  d: number;
  floors: number;
  floorHeight: number;
  wall: WallKind;
  /** Albedo tint multiplier for facade zoning. */
  tint: THREE.ColorRepresentation;
  /** Trim / plinth accent colour. */
  trim: THREE.ColorRepresentation;
  enterable: boolean;
  /** Facing side toward the street (where the entrance goes). */
  facing: 'E' | 'W';
  parapetHeight: number;
  damage?: DamageSpec;
  /** Ground-floor shopfront (roller shutter + awning) on the facing wall. */
  shopfront?: boolean;
  /** Balconies with railings on the upper facing-wall floors. */
  balconies?: boolean;
  /** Arched window heads instead of flat lintels. */
  arches?: boolean;
  /** Patches of exposed brick where the plaster has fallen away. */
  exposedBrick?: boolean;
  /** Partially collapsed roof (caved slab + rubble) for skyline variety. */
  roofCollapse?: boolean;
}

export interface StreetPlan {
  minZ: number;
  maxZ: number;
  halfWidth: number;
  sidewalkWidth: number;
}

export interface CraterPlan {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export interface ZoneRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LevelPlan {
  seed: number;
  bounds: THREE.Box3;
  street: StreetPlan;
  crater: CraterPlan;
  buildings: BuildingSpec[];
  market: ZoneRect;
  courtyard: ZoneRect;
  /** Tall minaret landmark that breaks the flat skyline. */
  minaret: { x: number; z: number; height: number; radius: number };
  /** Ground extent (the desert pad under and around the city). */
  ground: { size: number };
  playerSpawn: { x: number; z: number; yaw: number };
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

const FLOOR_H = 3.3;

export function buildPlan(rng: Rng): LevelPlan {
  const street: StreetPlan = { minZ: -80, maxZ: 82, halfWidth: 6, sidewalkWidth: 2.6 };
  const crater: CraterPlan = { x: -0.5, z: -9, radius: 5.2, depth: 1.5 };

  // Facade palette — sun-bleached ochre, dusty white, faded terracotta, pale blue.
  const b: BuildingSpec[] = [];

  // The whole SW quadrant is kept OPEN (courtyard) so the elevated overview /
  // golden cameras (which sit in the SW looking NE) have a clean sightline
  // across the district instead of staring into a wall.

  // --- WEST ROW (east faces look onto the street at x ≈ -8.5) ---------------
  b.push({
    id: 'W_M', // primary interior building (the "interior" shot lives here)
    cx: -19,
    cz: 1,
    w: 21,
    d: 28,
    floors: 3,
    floorHeight: FLOOR_H,
    wall: 'plaster',
    tint: 0xcdb98c, // sun-bleached ochre
    trim: 0x9aa7b2,
    enterable: true,
    facing: 'E',
    parapetHeight: 0.95,
    damage: { side: 'E', severity: 0.85, collapseCorner: true },
    shopfront: true,
    balconies: true,
    exposedBrick: true,
  });
  b.push({
    id: 'W_L', // west flank, north-mid — shelled brick block, plaster gone
    cx: -21,
    cz: -22,
    w: 20,
    d: 16,
    floors: 3,
    floorHeight: FLOOR_H,
    wall: 'brick',
    tint: 0x8c7458, // dusty, sun-darkened brick (not fresh red)
    trim: 0x6f523a,
    enterable: false,
    facing: 'E',
    parapetHeight: 0.9,
    damage: { side: 'E', severity: 0.65 },
    shopfront: true,
  });
  b.push({
    id: 'W_N', // tall landmark, north-west
    cx: -23,
    cz: -46,
    w: 21,
    d: 30,
    floors: 5,
    floorHeight: FLOOR_H,
    wall: 'plaster',
    tint: 0xac6a4e, // faded terracotta, dustier
    trim: 0x6c3f2e,
    enterable: false,
    facing: 'E',
    parapetHeight: 1.1,
    damage: { side: 'S', severity: 0.5 },
    arches: true,
    roofCollapse: true,
  });

  // --- EAST ROW (west faces look onto the street at x ≈ +8.5) ---------------
  b.push({
    id: 'E_S', // enterable, right beside the player spawn
    cx: 20,
    cz: 30,
    w: 20,
    d: 20,
    floors: 2,
    floorHeight: FLOOR_H,
    wall: 'plaster',
    tint: 0xd7cfbe, // dusty white
    trim: 0x9c8452,
    enterable: true,
    facing: 'W',
    parapetHeight: 0.85,
    damage: { side: 'W', severity: 0.45 },
    shopfront: true,
    exposedBrick: true,
  });
  b.push({
    id: 'E_M', // secondary interior building (flank/covered lane near centre)
    cx: 19,
    cz: -6,
    w: 22,
    d: 30,
    floors: 3,
    floorHeight: FLOOR_H,
    wall: 'plaster',
    tint: 0xa9b3b6, // pale blue-grey
    trim: 0x63757c,
    enterable: true,
    facing: 'W',
    parapetHeight: 0.95,
    damage: { side: 'W', severity: 0.8, collapseCorner: true },
    balconies: true,
    exposedBrick: true,
  });
  b.push({
    id: 'E_N',
    cx: 22,
    cz: -48,
    w: 22,
    d: 30,
    floors: 4,
    floorHeight: FLOOR_H,
    wall: 'brick',
    tint: 0x93805c,
    trim: 0x6b5638,
    enterable: false,
    facing: 'W',
    parapetHeight: 1.0,
    damage: { side: 'W', severity: 0.55 },
    arches: true,
  });

  // Small deterministic jitter so the row rhythm isn't mechanical.
  for (const s of b) {
    s.cx += rng.range(-0.6, 0.6);
    s.cz += rng.range(-0.8, 0.8);
    s.floorHeight += rng.range(-0.05, 0.08);
  }

  const market: ZoneRect = { minX: 9, maxX: 31, minZ: 46, maxZ: 72 };
  const courtyard: ZoneRect = { minX: -33, maxX: -9, minZ: 16, maxZ: 50 };

  const bounds = new THREE.Box3(
    new THREE.Vector3(-82, -3, -84),
    new THREE.Vector3(82, 40, 86)
  );

  return {
    seed: 0,
    bounds,
    street,
    crater,
    buildings: b,
    market,
    courtyard,
    // Minaret at the north end, just west of the street axis, so it stands as a
    // tall silhouette at the head of the "street"/"gameplay" sightline and a
    // landmark in the reframed "overview".
    minaret: { x: -11.5, z: -58, height: 27, radius: 1.5 },
    ground: { size: 220 },
    playerSpawn: { x: 1.5, z: 34, yaw: 0 },
  };
}
