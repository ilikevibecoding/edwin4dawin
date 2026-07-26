import type * as THREE from 'three';
import type { SurfaceKind, DamageEvent } from './Events';

/**
 * Cross-system contracts.
 *
 * Anything that can be expressed as a fire-and-forget notification goes through
 * the EventBus. These interfaces cover the remainder: synchronous queries and
 * commands where a caller needs a return value. Consumers resolve them with
 * `ctx.get<IPhysics>('physics')` so implementations stay swappable.
 */

/* --------------------------- materials -------------------------------- */

export type MaterialName =
  | 'concrete'
  | 'concrete_painted'
  | 'concrete_damaged'
  | 'plaster'
  | 'brick'
  | 'stucco_sand'
  | 'stucco_ochre'
  | 'asphalt'
  | 'sand'
  | 'gravel'
  | 'dirt'
  | 'rubble'
  | 'metal_painted'
  | 'metal_rusted'
  | 'metal_corrugated'
  | 'metal_brushed'
  | 'steel_plate'
  | 'wood_planks'
  | 'wood_crate'
  | 'wood_door'
  | 'fabric_canvas'
  | 'fabric_carpet'
  | 'sandbag'
  | 'glass'
  | 'glass_broken'
  | 'rubber'
  | 'plastic'
  | 'ceramic_tile'
  | 'foliage'
  | 'bark'
  | 'gun_metal'
  | 'gun_polymer'
  | 'water';

export interface TextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  /** Packed ARM texture: R = ambient occlusion, G = roughness, B = metalness. */
  armMap: THREE.Texture;
  /** Height / displacement, used for parallax occlusion mapping. */
  heightMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

export interface IMaterialLibrary {
  /** Returns a shared, cached material. Do not mutate the result. */
  get(name: MaterialName): THREE.Material;
  /** Returns a unique clone the caller may safely mutate. */
  clone(name: MaterialName): THREE.Material;
  /** Raw texture maps, for callers building custom shaders. */
  textures(name: MaterialName): TextureSet;
  /** Physical surface class, used to pick impact FX and footstep audio. */
  surfaceOf(name: MaterialName): SurfaceKind;
  /** Tiles a material's maps; returns a clone with adjusted repeat. */
  tiled(name: MaterialName, repeatX: number, repeatY?: number): THREE.Material;
  /** A 1x1 white texture, handy as a fallback. */
  readonly white: THREE.Texture;
  /** Flat normal (128,128,255), for disabling normal detail. */
  readonly flatNormal: THREE.Texture;
}

/* ---------------------------- physics --------------------------------- */

export interface RaycastHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  object: THREE.Object3D;
  surface: SurfaceKind;
  /** Entity id when the collider belongs to a character. */
  entityId?: number;
  /** Damage multiplier for this collider (head, limb, torso). */
  damageScale?: number;
  /** Material thickness in metres, for penetration maths. */
  penetration?: number;
}

export interface BodyDesc {
  mesh: THREE.Object3D;
  mass: number;
  /** Half-extents for a box, or radius for a sphere. */
  shape: 'box' | 'sphere' | 'capsule' | 'convex';
  size: THREE.Vector3;
  restitution?: number;
  friction?: number;
  linearVelocity?: THREE.Vector3;
  angularVelocity?: THREE.Vector3;
  /** Seconds before the body is auto-removed. 0 = never. */
  lifetime?: number;
  group?: number;
}

export type BodyHandle = number;

export interface CharacterMoveResult {
  /** Position after collision resolution. */
  position: THREE.Vector3;
  /** Velocity after collision resolution (slides along surfaces). */
  velocity: THREE.Vector3;
  grounded: boolean;
  /** Normal of the surface below, when grounded. */
  groundNormal: THREE.Vector3;
  groundSurface: SurfaceKind;
  /** True when the move was blocked by a wall this frame. */
  hitWall: boolean;
  /** Angle of the ground in radians; used to block steep slopes. */
  slope: number;
  /** True when the character struck a ceiling. */
  hitCeiling: boolean;
}

export interface IPhysics {
  /** Nearest hit along a ray. `mask` filters by the Groups bitfield. */
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    mask?: number,
    ignore?: THREE.Object3D[],
  ): RaycastHit | null;

  /** All hits along a ray, sorted near to far. Used for bullet penetration. */
  raycastAll(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    mask?: number,
    ignore?: THREE.Object3D[],
  ): RaycastHit[];

  /** Swept sphere, used for grenade collision and camera pull-in. */
  sphereCast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    maxDistance: number,
    mask?: number,
  ): RaycastHit | null;

  /** True when nothing opaque blocks the segment; the AI line-of-sight test. */
  lineOfSight(from: THREE.Vector3, to: THREE.Vector3, ignore?: THREE.Object3D[]): boolean;

  /** Registers static level geometry as a collider. */
  addStatic(object: THREE.Object3D): void;
  removeStatic(object: THREE.Object3D): void;

  /** Adds a dynamic rigid body (debris, casings, ragdoll parts). */
  addBody(desc: BodyDesc): BodyHandle;
  removeBody(handle: BodyHandle): void;
  applyImpulse(handle: BodyHandle, impulse: THREE.Vector3, at?: THREE.Vector3): void;
  /** Radial impulse applied to every dynamic body inside the radius. */
  applyExplosionForce(center: THREE.Vector3, radius: number, force: number): void;

  /** Kinematic capsule move with slide, step-up and slope handling. */
  moveCharacter(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    height: number,
    dt: number,
    stepHeight?: number,
    ignore?: THREE.Object3D[],
  ): CharacterMoveResult;

  /** Ground height directly below a point, or null when nothing is beneath. */
  groundHeight(x: number, z: number, fromY?: number): number | null;

  /** Objects whose bounds intersect a sphere. */
  overlapSphere(center: THREE.Vector3, radius: number, mask?: number): THREE.Object3D[];

  readonly bodyCount: number;
}

/* ----------------------------- world ---------------------------------- */

export interface SpawnPoint {
  position: THREE.Vector3;
  /** Facing in radians. */
  heading: number;
  team: 'player' | 'enemy' | 'any';
  /** Higher is preferred when several are valid. */
  weight?: number;
}

export interface CoverPoint {
  position: THREE.Vector3;
  /** Direction the cover protects against. */
  normal: THREE.Vector3;
  /** True for waist-high cover the AI can crouch behind and peek over. */
  low: boolean;
  /** Set while an agent has claimed this point. */
  occupiedBy?: number;
}

export interface IWorld {
  readonly bounds: THREE.Box3;
  readonly spawnPoints: SpawnPoint[];
  readonly coverPoints: CoverPoint[];
  /** Named locations shown on the HUD compass and used by the objective system. */
  readonly landmarks: Array<{ name: string; position: THREE.Vector3 }>;
  /** Terrain height, ignoring props and buildings. */
  terrainHeight(x: number, z: number): number;
  /** True when the position is inside the playable area. */
  inBounds(p: THREE.Vector3): boolean;
  /** Nearest walkable position, for spawn and navigation fixups. */
  nearestNavPoint(p: THREE.Vector3, out?: THREE.Vector3): THREE.Vector3;
  /** Coarse walkability query used by the navigation grid. */
  isWalkable(x: number, z: number): boolean;
  /** Root object holding all static level geometry. */
  readonly root: THREE.Object3D;
  /** Sky-visibility at a point, 0..1, used to place airstrike markers. */
  skyVisibility(p: THREE.Vector3): number;
}

/* ----------------------------- player --------------------------------- */

export type Stance = 'stand' | 'crouch' | 'prone' | 'slide';

export interface IPlayer {
  enabled: boolean;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly eyePosition: THREE.Vector3;
  /** Normalised view direction. */
  readonly forward: THREE.Vector3;
  readonly health: number;
  readonly maxHealth: number;
  readonly alive: boolean;
  readonly stance: Stance;
  readonly sprinting: boolean;
  readonly grounded: boolean;
  /** 0 = hip fire, 1 = fully aimed. */
  readonly adsFactor: number;
  /** Current speed as a fraction of max run speed, for weapon sway. */
  readonly speedFactor: number;
  damage(evt: DamageEvent): void;
  heal(amount: number): void;
  teleport(position: THREE.Vector3, heading?: number): void;
  /** Applies recoil to the view; both values are radians. */
  addViewKick(pitch: number, yaw: number): void;
  /** Suppresses input and freezes the controller, for cutscenes and captures. */
  setFrozen(frozen: boolean): void;
}

/* ---------------------------- weapons --------------------------------- */

export interface WeaponStats {
  id: string;
  name: string;
  /** Rounds per minute. */
  rpm: number;
  magSize: number;
  reserveAmmo: number;
  damage: number;
  headshotMultiplier: number;
  /** Metres at which damage begins to drop off. */
  falloffStart: number;
  falloffEnd: number;
  /** Minimum damage fraction at maximum range. */
  falloffMin: number;
  muzzleVelocity: number;
  fireMode: 'auto' | 'semi' | 'burst' | 'bolt' | 'pump';
  burstCount?: number;
  adsTime: number;
  reloadTime: number;
  reloadEmptyTime: number;
  /** Base hip-fire spread in radians. */
  hipSpread: number;
  adsSpread: number;
  recoilVertical: number;
  recoilHorizontal: number;
  /** How quickly the view recovers, in units of 1/second. */
  recoilRecovery: number;
  /** Field-of-view while aiming. */
  adsFov: number;
  scope?: 'none' | 'reflex' | 'holo' | 'acog' | 'sniper';
  suppressed?: boolean;
  caliber: number;
  /** Metres of concrete the round can punch through. */
  penetration: number;
}

export interface IWeapons {
  readonly current: WeaponStats | null;
  readonly mag: number;
  readonly reserve: number;
  readonly reloading: boolean;
  readonly aiming: boolean;
  /** Current effective spread in radians, for the dynamic crosshair. */
  readonly spread: number;
  /** 0..1 aim progress, mirrors IPlayer.adsFactor. */
  readonly adsFactor: number;
  readonly grenades: { frag: number; flash: number; smoke: number };
  setVisible(visible: boolean): void;
  switchTo(id: string): void;
  /** Adds ammunition, e.g. from a resupply crate. */
  addAmmo(rounds: number): void;
  readonly loadout: WeaponStats[];
}

/* ------------------------------- AI ----------------------------------- */

export interface EnemyState {
  id: number;
  position: THREE.Vector3;
  health: number;
  alive: boolean;
  /** True when the enemy currently sees the player. */
  aware: boolean;
  name: string;
}

export interface IAI {
  readonly enemies: readonly EnemyState[];
  readonly aliveCount: number;
  spawn(position: THREE.Vector3, heading?: number): number;
  /** Applies damage from the player; returns true when the hit was lethal. */
  damage(id: number, evt: DamageEvent): boolean;
  /** Radial damage used by explosions and airstrikes. */
  damageRadius(center: THREE.Vector3, radius: number, maxDamage: number, source: string): number;
  killAll(): void;
  setEnabled(enabled: boolean): void;
  /** Enemies within a radius, for HUD radar and killstreak targeting. */
  query(center: THREE.Vector3, radius: number): EnemyState[];
}

/* ------------------------------- FX ----------------------------------- */

export interface IFX {
  /** Immediate spawn helpers, for callers that need the returned handle. */
  spawnSmoke(position: THREE.Vector3, radius: number, duration: number): void;
  spawnTracer(from: THREE.Vector3, to: THREE.Vector3, speed: number, caliber: number): void;
  /** Number of live particles, exposed for the performance overlay. */
  readonly particleCount: number;
  /** Removes every transient effect, used when restarting a match. */
  clear(): void;
}

export interface IDecals {
  add(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    size: number,
    kind: 'bullet' | 'scorch' | 'blood' | 'crater',
    surface: SurfaceKind,
  ): void;
  clear(): void;
  readonly count: number;
}

/* ----------------------------- audio ---------------------------------- */

export interface IAudio {
  /** Plays a registered sound. Returns false when the id is unknown. */
  play(id: string, opts?: { position?: THREE.Vector3; volume?: number; rate?: number }): boolean;
  /** Unlocks the WebAudio context; must be called from a user gesture. */
  resume(): Promise<void>;
  setMasterVolume(v: number): void;
  readonly ready: boolean;
  /** Distance-based reverb/occlusion profile for the current room. */
  setReverbZone(zone: 'outdoor' | 'street' | 'interior' | 'tunnel'): void;
}

/* -------------------------- killstreaks -------------------------------- */

export interface KillstreakDef {
  id: string;
  name: string;
  killsRequired: number;
  /** Seconds before it can be used again. 0 = single use. */
  cooldown: number;
  icon: string;
  description: string;
}

export interface IKillstreaks {
  readonly available: KillstreakDef[];
  /** Streaks the player has earned and not yet spent. */
  readonly earned: string[];
  readonly killstreak: number;
  /** True while a killstreak sequence is playing. */
  readonly active: boolean;
  /** Enters the targeting mode for a streak; returns false when unavailable. */
  activate(id: string): boolean;
  cancel(): void;
  /** True while the player is choosing a target on the map. */
  readonly targeting: boolean;
  /** Directly triggers an airstrike, bypassing the streak requirement. */
  callAirstrike(target: THREE.Vector3, heading?: number): void;
}

/* ---------------------------- director --------------------------------- */

export interface IDirector {
  readonly score: number;
  readonly kills: number;
  readonly deaths: number;
  readonly wave: number;
  readonly state: 'menu' | 'briefing' | 'playing' | 'paused' | 'dead' | 'over';
  start(): void;
  restart(): void;
  pause(paused: boolean): void;
}
