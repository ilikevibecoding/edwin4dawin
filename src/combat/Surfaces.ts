/**
 * Ballistic material model.
 *
 * `SURFACE_PROPERTIES` authors the design intent — how permeable a material is,
 * how hard it is, how readily it deflects a grazing round — and this file turns
 * that into the two numbers a thickness-based penetration solver actually needs:
 *
 *   depth     metres of *material* a nominal `penetrationPower = 1` round can
 *             defeat. Derived from `penetration`, penalised by `hardness`, so a
 *             plaster partition is half a metre of budget and a brick wall is
 *             eight centimetres.
 *   solidity  fraction of a collider's *measured* thickness that is real
 *             material. The collision hull is a simplification of the art: a
 *             chain-link fence is one 14 cm box, a derelict car is one 1.8 m
 *             box, a crate is solid rather than a shell of planks. Without this
 *             correction a thickness solver either lets bullets through walls or
 *             stops them dead in a wire fence.
 *
 * Cost to cross a slab is therefore `entryCost + thickness * solidity / (depth *
 * penetrationPower)`, expressed as a fraction of the round's energy. `entryCost`
 * is the shock of striking the face at all, which is what stops a pistol round
 * from shrugging off a thin steel plate.
 */
import { SURFACE_PROPERTIES, type SurfaceType } from '../core/GameTypes';
import { saturate } from '../core/MathUtils';

/** Material a fully-permeable surface would allow at power 1, in metres. */
const DEPTH_BASE = 0.5;
/** Permeability is strongly non-linear: the hard half of the table barely gives. */
const DEPTH_EXP = 1.35;
/** Energy lost crossing the face, scaled by how impermeable and hard it is. */
const ENTRY_BASE = 0.16;

/**
 * Incidence below which a deflection is even considered, as |dot(dir, normal)|.
 * 0.32 is about 71 degrees off the surface normal.
 */
const GRAZE_COS = 0.32;
/** Global rarity dial. A ricochet should be a story, not a texture. */
const RICOCHET_RARITY = 0.75;

const SOLIDITY: Record<SurfaceType, number> = {
  concrete: 1.0,
  brick: 1.0,
  // Sheet panels, hollow poles and vehicle skins, all authored as solid boxes.
  metal: 0.25,
  // Crates and plank walls are shells; the collider is the whole volume.
  wood: 0.45,
  // Stud walls have a cavity behind the board.
  plaster: 0.6,
  // A pane is millimetres inside a collider tens of centimetres deep.
  glass: 0.12,
  tile: 0.85,
  flesh: 1.0,
  dirt: 1.0,
  sand: 1.0,
  gravel: 1.0,
  grass: 1.0,
  water: 1.0,
  fabric: 0.3,
  rubber: 0.7,
  foliage: 0.15,
};

export interface SurfaceBallistics {
  readonly penetration: number;
  readonly hardness: number;
  readonly ricochet: number;
  readonly sparks: boolean;
  /** Metres of material defeated at `penetrationPower = 1`. */
  readonly depth: number;
  /** Fraction of a collider's thickness that is real material. */
  readonly solidity: number;
  /** Energy fraction spent crossing the face. */
  readonly entryCost: number;
  /** Bleeds and gibs rather than chipping. */
  readonly organic: boolean;
  /** Pre-built sound id, so the hot path never concatenates a string. */
  readonly impactSound: string;
  /** Decal footprint in metres for a single round. */
  readonly decalSize: number;
}

function derive(surface: SurfaceType): SurfaceBallistics {
  const props = SURFACE_PROPERTIES[surface];
  const hardnessTerm = 0.4 + 0.6 * props.hardness;
  return {
    penetration: props.penetration,
    hardness: props.hardness,
    ricochet: props.ricochet,
    sparks: props.sparks,
    depth: (DEPTH_BASE * Math.pow(props.penetration, DEPTH_EXP)) / hardnessTerm,
    solidity: SOLIDITY[surface],
    entryCost: ENTRY_BASE * (1 - props.penetration) * hardnessTerm,
    organic: surface === 'flesh',
    impactSound: `impact_${surface}`,
    decalSize: surface === 'glass' ? 0.12 : 0.055 + 0.05 * (1 - props.penetration),
  };
}

export const SURFACE_BALLISTICS: Record<SurfaceType, SurfaceBallistics> = {
  concrete: derive('concrete'),
  metal: derive('metal'),
  wood: derive('wood'),
  dirt: derive('dirt'),
  sand: derive('sand'),
  gravel: derive('gravel'),
  grass: derive('grass'),
  water: derive('water'),
  glass: derive('glass'),
  flesh: derive('flesh'),
  plaster: derive('plaster'),
  brick: derive('brick'),
  tile: derive('tile'),
  fabric: derive('fabric'),
  rubber: derive('rubber'),
  foliage: derive('foliage'),
};

/**
 * Energy fraction consumed by crossing `thickness` metres of `surface`.
 * A result at or above the round's remaining energy means it stops inside.
 */
export function penetrationCost(
  surface: SurfaceType,
  thickness: number,
  penetrationPower: number,
): number {
  const mat = SURFACE_BALLISTICS[surface];
  if (penetrationPower <= 0) return Infinity;
  const budget = mat.depth * penetrationPower;
  return mat.entryCost + (thickness * mat.solidity) / budget;
}

/**
 * Thickest slab of `surface` a round with `energy` left could still cross.
 * Used to size the back-face probe: measuring further than this is wasted work
 * because the round stops either way.
 */
export function maxCrossableThickness(
  surface: SurfaceType,
  penetrationPower: number,
  energy: number,
): number {
  const mat = SURFACE_BALLISTICS[surface];
  if (penetrationPower <= 0) return 0;
  const usable = energy - mat.entryCost;
  if (usable <= 0) return 0;
  return (usable * mat.depth * penetrationPower) / mat.solidity;
}

/**
 * Probability that a round deflects instead of digging in.
 * `cosIncidence` is |dot(direction, normal)|: 1 is square on, 0 is a pure graze.
 */
export function ricochetChance(
  surface: SurfaceType,
  cosIncidence: number,
  energy: number,
): number {
  const mat = SURFACE_BALLISTICS[surface];
  if (mat.ricochet <= 0) return 0;
  const graze = 1 - saturate(cosIncidence / GRAZE_COS);
  if (graze <= 0) return 0;
  return mat.ricochet * graze * graze * saturate(energy) * RICOCHET_RARITY;
}

/** Energy retained by a deflection. Shallower graze, cleaner bounce. */
export function ricochetEnergyScale(cosIncidence: number): number {
  return 0.32 + 0.3 * (1 - saturate(cosIncidence / GRAZE_COS));
}
