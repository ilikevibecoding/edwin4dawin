import type * as THREE from 'three';
import type { EngineContext } from './Engine';

/**
 * Cross-subsystem interfaces.
 *
 * Every system depends on these types rather than on each other's concrete
 * classes, so systems can be built, replaced, or stubbed independently.
 * Instances are looked up by the string keys in `Services`.
 */

export const Services = {
  lighting: 'lighting',
  render: 'render',
  level: 'level',
  physics: 'physics',
  player: 'player',
  weapons: 'weapons',
  vfx: 'vfx',
  ai: 'ai',
  killstreaks: 'killstreaks',
  hud: 'hud',
  audio: 'audio',
  materials: 'materials',
} as const;

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export type SurfaceType =
  | 'concrete'
  | 'metal'
  | 'wood'
  | 'dirt'
  | 'sand'
  | 'gravel'
  | 'glass'
  | 'water'
  | 'flesh'
  | 'sandbag'
  | 'fabric'
  | 'tile';

/** Attach to any mesh so impacts pick the right decal, particle and sound. */
export interface SurfaceUserData {
  surface?: SurfaceType;
  /** Marks geometry the player and bullets collide with. */
  collider?: boolean;
  /** Marks geometry that can be destroyed. */
  destructible?: boolean;
  /** Bullets pass through, losing this fraction of damage (0 = solid). */
  penetration?: number;
}

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

export interface SpawnPoint {
  position: THREE.Vector3;
  yaw: number;
  tag?: string;
}

export interface CoverPoint {
  position: THREE.Vector3;
  /** Outward normal of the cover surface — the direction it protects from. */
  normal: THREE.Vector3;
  /** True if the agent must crouch to use it. */
  low: boolean;
}

export interface ILevel {
  readonly root: THREE.Group;
  /** Meshes bullets and the focus raycaster test against. */
  readonly collidables: THREE.Object3D[];
  readonly playerSpawn: SpawnPoint;
  readonly enemySpawns: SpawnPoint[];
  readonly coverPoints: CoverPoint[];
  /** World-space AABB of playable space. */
  readonly bounds: THREE.Box3;
  /** Ground height under a point, or null if outside the level. */
  sampleGround(x: number, z: number): number | null;
  /** True if a straight line between two points is unobstructed. */
  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean;
  /** Nearest cover point to `from` that protects against `threat`. */
  findCover(from: THREE.Vector3, threat: THREE.Vector3, maxDist?: number): CoverPoint | null;
  /** Coarse walkable-grid path. Returns waypoints including the endpoint. */
  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null;
  /** Is this world position inside a building (used for reverb + fog). */
  isIndoors(position: THREE.Vector3): boolean;
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

export interface RaycastHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  object: THREE.Object3D | null;
  surface: SurfaceType;
  /** Set when the ray hit a damageable actor. */
  actorId?: number;
  /** Which body part, for damage multipliers. */
  bodyPart?: 'head' | 'torso' | 'limb';
}

export interface IPhysics {
  /** Cast a ray through both the static world and dynamic actors. */
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    opts?: { ignoreActorId?: number; actorsOnly?: boolean; staticOnly?: boolean }
  ): RaycastHit | null;
  /** Spawn a dynamic rigid body for debris/props. */
  addDebris(
    mesh: THREE.Mesh,
    opts?: { mass?: number; restitution?: number; friction?: number; ttl?: number }
  ): number;
  /** Apply a radial impulse — explosions. */
  applyRadialImpulse(center: THREE.Vector3, radius: number, force: number): void;
  /** True if the segment is unobstructed by static world geometry. */
  isClear(from: THREE.Vector3, to: THREE.Vector3): boolean;
}

// ---------------------------------------------------------------------------
// Damageable actors (player + AI share this)
// ---------------------------------------------------------------------------

export interface DamageInfo {
  amount: number;
  /** Where the damage came from, for directional indicators. */
  origin: THREE.Vector3;
  /** Impact point, for blood/decals. */
  point?: THREE.Vector3;
  direction?: THREE.Vector3;
  headshot?: boolean;
  weapon: string;
  /** Actor id of the attacker; -1 for the player, -2 for world/explosions. */
  attackerId: number;
  kind: 'bullet' | 'explosion' | 'melee' | 'fall';
}

export interface IActor {
  readonly id: number;
  readonly position: THREE.Vector3;
  readonly team: 'friendly' | 'hostile';
  health: number;
  readonly maxHealth: number;
  readonly alive: boolean;
  applyDamage(info: DamageInfo): void;
}

export interface IAiDirector {
  readonly actors: readonly IActor[];
  actorById(id: number): IActor | null;
  /** Everything alive and hostile, for target selection and the minimap. */
  hostiles(): IActor[];
  /** Broadcast a noise event that draws AI attention. */
  reportNoise(position: THREE.Vector3, radius: number, from: THREE.Vector3): void;
  /** Kill everything in a radius — used by explosions and airstrikes. */
  damageArea(center: THREE.Vector3, radius: number, damage: number, info: Partial<DamageInfo>): void;
  spawnWave(count: number): void;
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export type Stance = 'stand' | 'crouch' | 'prone';

export interface IPlayer extends IActor {
  readonly camera: THREE.PerspectiveCamera;
  /** Eye position in world space. */
  readonly eye: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly stance: Stance;
  readonly sprinting: boolean;
  readonly grounded: boolean;
  /** 0..1 aim-down-sights blend. */
  readonly adsAmount: number;
  readonly yaw: number;
  readonly pitch: number;
  /** Additive recoil/shake applied on top of player aim. */
  addViewPunch(pitch: number, yaw: number, roll?: number): void;
  addShake(amplitude: number, duration: number, frequency?: number): void;
  /** Temporarily disable input (killcam, airstrike targeting). */
  setInputEnabled(enabled: boolean): void;
  teleport(position: THREE.Vector3, yaw?: number): void;
}

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

export type WeaponId =
  | 'ar_wolverine'
  | 'smg_viper'
  | 'sniper_longbow'
  | 'shotgun_breacher'
  | 'pistol_sidearm'
  | 'lmg_bulwark';

export type FireMode = 'auto' | 'semi' | 'burst' | 'pump' | 'bolt';

export interface WeaponSpec {
  id: WeaponId;
  displayName: string;
  className: string;
  fireMode: FireMode;
  /** Rounds per minute. */
  rpm: number;
  burstCount?: number;
  magSize: number;
  reserveAmmo: number;
  /** Damage at point blank; falls off with range. */
  damage: number;
  /** Distance (m) where falloff starts and ends. */
  damageRangeStart: number;
  damageRangeEnd: number;
  /** Fraction of base damage at/after damageRangeEnd. */
  damageFalloff: number;
  headshotMultiplier: number;
  /** Muzzle velocity, m/s. Drives bullet travel time and drop. */
  muzzleVelocity: number;
  pelletsPerShot: number;
  /** Cone half-angle in degrees, hip and ADS. */
  spreadHip: number;
  spreadAds: number;
  spreadMoving: number;
  /** Vertical + horizontal recoil per shot in degrees. */
  recoilVertical: number;
  recoilHorizontal: number;
  recoilRecovery: number;
  /** Seconds. */
  adsTime: number;
  reloadTime: number;
  reloadEmptyTime: number;
  drawTime: number;
  /** ADS FOV multiplier; scoped weapons go much lower. */
  adsFovScale: number;
  /** True for weapons with a scope overlay. */
  scoped: boolean;
  scopeMagnification?: number;
  /** Sound bank ids. */
  fireSound: string;
  /** Material penetration power, 0..1. */
  penetration: number;
  /** Ejected casing scale hint. */
  caliber: 'pistol' | 'rifle' | 'magnum' | 'shell';
}

export interface IWeapons {
  readonly current: WeaponSpec;
  readonly magAmmo: number;
  readonly reserveAmmo: number;
  readonly reloading: boolean;
  readonly adsAmount: number;
  /** Muzzle position/direction in world space, for VFX. */
  getMuzzleWorld(outPos: THREE.Vector3, outDir: THREE.Vector3): void;
  switchTo(id: WeaponId): void;
  giveAmmo(rounds: number): void;
  /** Suppress firing while an airstrike tablet or menu is up. */
  setEnabled(enabled: boolean): void;
}

// ---------------------------------------------------------------------------
// VFX
// ---------------------------------------------------------------------------

export interface IVfx {
  /** Impact spark/dust burst plus a decal, chosen by surface. */
  surfaceImpact(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    surface: SurfaceType,
    incoming: THREE.Vector3
  ): void;
  bloodImpact(point: THREE.Vector3, normal: THREE.Vector3, incoming: THREE.Vector3): void;
  tracer(from: THREE.Vector3, to: THREE.Vector3, speed: number, thickness?: number): void;
  muzzleFlash(position: THREE.Vector3, direction: THREE.Vector3, scale: number): void;
  ejectCasing(position: THREE.Vector3, velocity: THREE.Vector3, caliber: string): void;
  explosion(position: THREE.Vector3, radius: number, kind: string): void;
  smokePlume(position: THREE.Vector3, radius: number, duration: number): void;
  dustKickup(position: THREE.Vector3, strength: number): void;
  /** Persistent burning/smouldering marker after an explosion. */
  addFire(position: THREE.Vector3, radius: number, duration: number): void;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export interface IHud {
  setVisible(v: boolean): void;
  showHitmarker(headshot: boolean, lethal: boolean): void;
  setObjective(text: string): void;
  notify(text: string, sub?: string, tone?: 'good' | 'bad' | 'info'): void;
  /** Directional damage arrow. */
  showDamageFrom(worldPosition: THREE.Vector3): void;
  setKillstreakProgress(kills: number, next: { name: string; at: number } | null): void;
}

// ---------------------------------------------------------------------------
// Killstreaks
// ---------------------------------------------------------------------------

export interface IKillstreaks {
  readonly available: string[];
  /** True while the player is choosing a target on the tablet. */
  readonly targeting: boolean;
  arm(id: string): boolean;
  cancel(): void;
  addKill(): void;
}

/** Convenience for subsystems that need a service that may not exist yet. */
export function tryGet<T>(ctx: EngineContext, name: string): T | null {
  return ctx.has(name) ? ctx.get<T>(name) : null;
}
