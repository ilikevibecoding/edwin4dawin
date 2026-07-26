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
    tint: 0xd7cdb0,
    trim: 0x9fb0c0,
    enterable: true,
    facing: 'E',
    parapetHeight: 0.95,
    damage: { side: 'N', severity: 0.7, collapseCorner: true },
  });
  b.push({
    id: 'W_L', // west flank, north-mid — shelled brick block
    cx: -21,
    cz: -22,
    w: 20,
    d: 16,
    floors: 3,
    floorHeight: FLOOR_H,
    wall: 'brick',
    tint: 0xc29968,
    trim: 0x836244,
    enterable: false,
    facing: 'E',
    parapetHeight: 0.9,
    damage: { side: 'E', severity: 0.5 },
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
    tint: 0xc07a55,
    trim: 0x7a4a34,
    enterable: false,
    facing: 'E',
    parapetHeight: 1.1,
    damage: { side: 'S', severity: 0.4 },
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
    tint: 0xd9c9a2,
    trim: 0xa0844f,
    enterable: true,
    facing: 'W',
    parapetHeight: 0.85,
    damage: { side: 'W', severity: 0.3 },
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
    tint: 0xb9c4c6,
    trim: 0x6f8790,
    enterable: true,
    facing: 'W',
    parapetHeight: 0.95,
    damage: { side: 'S', severity: 0.55, collapseCorner: true },
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
    tint: 0xc2a06a,
    trim: 0x866a46,
    enterable: false,
    facing: 'W',
    parapetHeight: 1.0,
    damage: { side: 'W', severity: 0.5 },
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
    ground: { size: 220 },
    playerSpawn: { x: 1.5, z: 34, yaw: 0 },
  };
}
