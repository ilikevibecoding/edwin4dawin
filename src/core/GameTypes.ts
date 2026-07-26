import type * as THREE from 'three';

export type Team = 'player' | 'enemy' | 'neutral';

export type BodyPart = 'head' | 'neck' | 'chest' | 'stomach' | 'arm' | 'leg' | 'foot';

/** Surface classification drives impact FX, decals, footsteps and audio. */
export type SurfaceType =
  | 'concrete'
  | 'metal'
  | 'wood'
  | 'dirt'
  | 'sand'
  | 'gravel'
  | 'grass'
  | 'water'
  | 'glass'
  | 'flesh'
  | 'plaster'
  | 'brick'
  | 'tile'
  | 'fabric'
  | 'rubber'
  | 'foliage';

export const SURFACE_PROPERTIES: Record<
  SurfaceType,
  {
    /** 0 = bullets stop dead, 1 = passes straight through. */
    penetration: number;
    /** Sparks on metal, dust on concrete, etc. */
    sparks: boolean;
    dustColor: number;
    decalColor: number;
    /** Footstep loudness multiplier used by AI hearing. */
    stepVolume: number;
    /** Bullet ricochet probability at grazing angles. */
    ricochet: number;
    hardness: number;
  }
> = {
  concrete: { penetration: 0.32, sparks: false, dustColor: 0x9a938a, decalColor: 0x2a2724, stepVolume: 1.0, ricochet: 0.22, hardness: 0.8 },
  metal: { penetration: 0.2, sparks: true, dustColor: 0xbfc4c9, decalColor: 0x14161a, stepVolume: 1.25, ricochet: 0.45, hardness: 1.0 },
  wood: { penetration: 0.72, sparks: false, dustColor: 0xb08b58, decalColor: 0x2b1d10, stepVolume: 0.85, ricochet: 0.05, hardness: 0.4 },
  dirt: { penetration: 0.45, sparks: false, dustColor: 0x7d6650, decalColor: 0x2e241b, stepVolume: 0.6, ricochet: 0.02, hardness: 0.25 },
  sand: { penetration: 0.5, sparks: false, dustColor: 0xc9b087, decalColor: 0x6b5a3f, stepVolume: 0.45, ricochet: 0.01, hardness: 0.15 },
  gravel: { penetration: 0.4, sparks: false, dustColor: 0x8e857a, decalColor: 0x39332c, stepVolume: 1.1, ricochet: 0.08, hardness: 0.5 },
  grass: { penetration: 0.55, sparks: false, dustColor: 0x6f7a48, decalColor: 0x2b301a, stepVolume: 0.5, ricochet: 0.01, hardness: 0.2 },
  water: { penetration: 0.85, sparks: false, dustColor: 0xa8c4cc, decalColor: 0x000000, stepVolume: 1.4, ricochet: 0.3, hardness: 0.05 },
  glass: { penetration: 0.95, sparks: false, dustColor: 0xd8e6ea, decalColor: 0xffffff, stepVolume: 1.3, ricochet: 0.0, hardness: 0.6 },
  flesh: { penetration: 0.8, sparks: false, dustColor: 0x8a1f1f, decalColor: 0x3d0808, stepVolume: 0.3, ricochet: 0.0, hardness: 0.1 },
  plaster: { penetration: 0.88, sparks: false, dustColor: 0xd9d4cb, decalColor: 0x3a3733, stepVolume: 0.9, ricochet: 0.03, hardness: 0.3 },
  brick: { penetration: 0.28, sparks: false, dustColor: 0xa8654a, decalColor: 0x2c1a13, stepVolume: 1.0, ricochet: 0.18, hardness: 0.85 },
  tile: { penetration: 0.6, sparks: false, dustColor: 0xcfd3d6, decalColor: 0x2f3234, stepVolume: 1.2, ricochet: 0.12, hardness: 0.55 },
  fabric: { penetration: 0.92, sparks: false, dustColor: 0x9c8f80, decalColor: 0x241f1a, stepVolume: 0.25, ricochet: 0.0, hardness: 0.05 },
  rubber: { penetration: 0.65, sparks: false, dustColor: 0x33373a, decalColor: 0x0d0e10, stepVolume: 0.4, ricochet: 0.0, hardness: 0.2 },
  foliage: { penetration: 0.97, sparks: false, dustColor: 0x5c6b3a, decalColor: 0x1e2412, stepVolume: 0.55, ricochet: 0.0, hardness: 0.05 },
};

/** Anything that can take damage registers itself with the damage system. */
export interface Damageable {
  readonly id: number;
  readonly team: Team;
  health: number;
  readonly maxHealth: number;
  readonly isAlive: boolean;
  /** World-space position used for radius damage and audio. */
  getPosition(out: THREE.Vector3): THREE.Vector3;
  applyDamage(info: DamageInfo): void;
}

export interface DamageInfo {
  amount: number;
  /** Who caused it; null for world damage such as falls. */
  source: Damageable | null;
  /** World-space impact point. */
  point: THREE.Vector3;
  /** Normalised direction of travel of the damaging force. */
  direction: THREE.Vector3;
  bodyPart: BodyPart;
  type: DamageType;
  /** Impulse magnitude applied to ragdolls, in newton-seconds. */
  impulse: number;
  weaponId?: string;
  /** Distance from the shooter, for feedback and stats. */
  distance?: number;
  isHeadshot?: boolean;
  isPenetrating?: boolean;
}

export type DamageType =
  | 'bullet'
  | 'explosive'
  | 'melee'
  | 'fall'
  | 'fire'
  | 'shrapnel'
  | 'collision';

export interface HitResult {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  surface: SurfaceType;
  /** Non-null when a Damageable was struck. */
  target: Damageable | null;
  bodyPart: BodyPart | null;
  object: THREE.Object3D | null;
}

// ---------------------------------------------------------------------------
// Cross-system events. Payload shapes are part of the contract between modules.
// ---------------------------------------------------------------------------
export interface GameEvents {
  'player:spawn': { position: THREE.Vector3 };
  'player:death': { killer: Damageable | null; cause: DamageType };
  'player:damaged': { amount: number; direction: THREE.Vector3; health: number };
  'player:heal': { health: number };
  'player:landed': { impactSpeed: number; surface: SurfaceType };
  'player:footstep': { position: THREE.Vector3; surface: SurfaceType; loud: boolean };
  'player:sprintStart': undefined;
  'player:sprintEnd': undefined;
  'player:slideStart': undefined;
  'player:mantleStart': { height: number };

  'weapon:fire': {
    weaponId: string;
    muzzlePosition: THREE.Vector3;
    direction: THREE.Vector3;
    ammoLeft: number;
    suppressed: boolean;
  };
  'weapon:reloadStart': { weaponId: string; tactical: boolean; duration: number };
  'weapon:reloadEnd': { weaponId: string; ammo: number };
  'weapon:switch': { from: string | null; to: string };
  'weapon:empty': { weaponId: string };
  'weapon:adsChanged': { aiming: boolean };
  'weapon:shellEject': { position: THREE.Vector3; velocity: THREE.Vector3; caliber: string };

  'combat:hit': {
    result: HitResult;
    damage: number;
    isHeadshot: boolean;
    attacker: Damageable | null;
  };
  'combat:kill': {
    victim: Damageable;
    killer: Damageable | null;
    weaponId: string;
    isHeadshot: boolean;
    distance: number;
  };
  'combat:impact': { point: THREE.Vector3; normal: THREE.Vector3; surface: SurfaceType; energy: number };
  'combat:explosion': {
    position: THREE.Vector3;
    radius: number;
    damage: number;
    source: Damageable | null;
    kind: 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel';
  };

  'ai:alerted': { enemyId: number; position: THREE.Vector3 };
  'ai:spawn': { enemyId: number; position: THREE.Vector3 };

  'killstreak:earned': { id: string; name: string };
  'killstreak:used': { id: string };
  'killstreak:airstrikeCalled': { origin: THREE.Vector3; heading: number };
  'killstreak:airstrikeImpact': { position: THREE.Vector3 };

  'score:changed': { score: number; kills: number; deaths: number; streak: number };
  'ui:notify': { text: string; sub?: string; kind?: 'info' | 'warn' | 'reward' };

  'engine:paused': boolean;
  'engine:quality': unknown;
  'engine:resize': { width: number; height: number; dpr: number };
}

export type GameEventName = keyof GameEvents;

/** Layer masks used for raycasting and render-layer separation. */
export const LAYER = {
  DEFAULT: 0,
  WORLD: 1,
  CHARACTER: 2,
  VIEWMODEL: 3,
  TRANSPARENT_FX: 4,
  NO_SHADOW: 5,
  MINIMAP_ONLY: 6,
  OUTLINE: 7,
} as const;

/** Rapier collision groups — 16-bit membership, 16-bit filter. */
export const COLLISION_GROUP = {
  STATIC: 0x0001,
  DYNAMIC: 0x0002,
  PLAYER: 0x0004,
  ENEMY: 0x0008,
  PROJECTILE: 0x0010,
  RAGDOLL: 0x0020,
  DEBRIS: 0x0040,
  TRIGGER: 0x0080,
} as const;

let nextEntityId = 1;
export const allocEntityId = (): number => nextEntityId++;
