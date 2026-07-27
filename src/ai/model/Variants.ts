/**
 * Visual variants.
 *
 * Four kits, differing in uniform material, headgear, load-bearing layout and
 * colour. A squad of four therefore never reads as one soldier copy-pasted, and
 * because the differences are baked into per-variant geometry and vertex colours,
 * the whole set still runs on four shared materials.
 */
import type { MaterialId } from '../../core/Contracts';
import { tint, type Tint } from './GeoUtil';

export type Headgear = 'helmet_nvg' | 'helmet_cover' | 'cap' | 'helmet_bare';

export interface VariantSpec {
  id: number;
  name: string;
  /** Material the cloth slot uses. */
  uniform: MaterialId;
  uniformTint: Tint;
  uniformShadeTint: Tint;
  skinTint: Tint;
  skinShadeTint: Tint;
  /** Eye sockets. Near-black: at range these read as the eyes. */
  eyeTint: Tint;
  /** Hair, most of which is under the headgear. */
  hairTint: Tint;
  gloveTint: Tint;
  gloveShadeTint: Tint;
  bootTint: Tint;
  bootSoleTint: Tint;
  gearTint: Tint;
  gearShadeTint: Tint;
  armourTint: Tint;
  lensTint: Tint;
  headgear: Headgear;
  /** Front mag pouches on the carrier. */
  pouches: number;
  /** Radio on the back of the carrier. */
  radio: boolean;
  kneepads: boolean;
  /** Fabric wrap around the neck and lower face. */
  shemagh: boolean;
  /** Balaclava over the lower face. */
  maskLower: boolean;
  /** Belt-mounted holster on the right thigh. */
  holster: boolean;
  /** Bandolier across the chest. */
  bandolier: boolean;
}

export const VARIANTS: readonly VariantSpec[] = [
  {
    id: 0,
    name: 'desert_assault',
    uniform: 'uniform_desert',
    uniformTint: tint(0xd8cbaa),
    uniformShadeTint: tint(0xb3a684),
    skinTint: tint(0xb98a63),
    skinShadeTint: tint(0x9a6f4e),
    eyeTint: tint(0x1b1a18),
    hairTint: tint(0x3a2c20),
    gloveTint: tint(0x3a3630),
    gloveShadeTint: tint(0x28251f),
    bootTint: tint(0x4a3a2a),
    bootSoleTint: tint(0x1c1a18),
    gearTint: tint(0x4d4532),
    gearShadeTint: tint(0x353023),
    armourTint: tint(0x2c2b25),
    lensTint: tint(0x2a3b34),
    headgear: 'helmet_nvg',
    pouches: 3,
    radio: false,
    kneepads: true,
    shemagh: false,
    maskLower: true,
    holster: true,
    bandolier: false,
  },
  {
    id: 1,
    name: 'woodland_heavy',
    uniform: 'uniform_woodland',
    uniformTint: tint(0x8f9a78),
    uniformShadeTint: tint(0x6b7458),
    skinTint: tint(0xa87a55),
    skinShadeTint: tint(0x8a5f42),
    eyeTint: tint(0x16181a),
    hairTint: tint(0x241d16),
    gloveTint: tint(0x2f2c26),
    gloveShadeTint: tint(0x201e19),
    bootTint: tint(0x30291f),
    bootSoleTint: tint(0x181614),
    gearTint: tint(0x393d2c),
    gearShadeTint: tint(0x27291f),
    armourTint: tint(0x252820),
    lensTint: tint(0x30281c),
    headgear: 'helmet_cover',
    pouches: 4,
    radio: true,
    kneepads: true,
    shemagh: false,
    maskLower: false,
    holster: false,
    bandolier: true,
  },
  {
    id: 2,
    name: 'desert_light',
    uniform: 'uniform_desert',
    uniformTint: tint(0xc0b394),
    uniformShadeTint: tint(0x9a8f72),
    skinTint: tint(0x9d7350),
    skinShadeTint: tint(0x80583b),
    eyeTint: tint(0x191817),
    hairTint: tint(0x1d1712),
    gloveTint: tint(0x4a4136),
    gloveShadeTint: tint(0x332d25),
    bootTint: tint(0x5a462f),
    bootSoleTint: tint(0x201d19),
    gearTint: tint(0x584d36),
    gearShadeTint: tint(0x3d3525),
    armourTint: tint(0x363330),
    lensTint: tint(0x1c2a30),
    headgear: 'cap',
    pouches: 2,
    radio: false,
    kneepads: false,
    shemagh: true,
    maskLower: false,
    holster: true,
    bandolier: false,
  },
  {
    id: 3,
    name: 'woodland_gunner',
    uniform: 'uniform_woodland',
    uniformTint: tint(0x79866a),
    uniformShadeTint: tint(0x59634c),
    skinTint: tint(0xc09272),
    skinShadeTint: tint(0x9d7250),
    eyeTint: tint(0x1a1b1c),
    hairTint: tint(0x4a3524),
    gloveTint: tint(0x35322b),
    gloveShadeTint: tint(0x24211c),
    bootTint: tint(0x3a3025),
    bootSoleTint: tint(0x1a1816),
    gearTint: tint(0x41452f),
    gearShadeTint: tint(0x2d2f20),
    armourTint: tint(0x2b2d25),
    lensTint: tint(0x2a3b34),
    headgear: 'helmet_bare',
    pouches: 3,
    radio: true,
    kneepads: false,
    shemagh: false,
    maskLower: true,
    holster: false,
    bandolier: true,
  },
];

export const variantAt = (index: number): VariantSpec =>
  VARIANTS[((index % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];
