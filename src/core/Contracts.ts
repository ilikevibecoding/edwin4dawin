/**
 * Public interfaces for every gameplay/render subsystem.
 *
 * Modules import types from here rather than from each other's implementation
 * files. That keeps the dependency graph a DAG, lets each module be developed
 * and type-checked independently, and makes it obvious when a change is a
 * breaking one.
 */
import type * as THREE from 'three';
import type { System } from './System';
import type {
  BodyPart,
  Damageable,
  DamageInfo,
  HitResult,
  SurfaceType,
  Team,
} from './GameTypes';

// ===========================================================================
// procgen — procedural PBR texture & material library
// ===========================================================================

export type MaterialId =
  // architecture
  | 'concrete_wall'
  | 'concrete_floor'
  | 'concrete_damaged'
  | 'brick_red'
  | 'brick_painted'
  | 'plaster_white'
  | 'plaster_peeling'
  | 'stucco_sand'
  | 'metal_panel'
  | 'metal_rusted'
  | 'metal_corrugated'
  | 'metal_grate'
  | 'steel_brushed'
  | 'wood_plank'
  | 'wood_crate'
  | 'wood_painted'
  | 'tile_ceramic'
  | 'asphalt'
  | 'asphalt_worn'
  | 'gravel'
  | 'sand_ground'
  | 'dirt_ground'
  | 'grass_ground'
  | 'glass_clear'
  | 'glass_dirty'
  | 'fabric_canvas'
  | 'rubber_tire'
  | 'paint_yellow'
  | 'paint_red'
  | 'sandbag'
  | 'camo_net'
  // props / vehicles
  | 'vehicle_paint_tan'
  | 'vehicle_paint_green'
  | 'vehicle_glass'
  | 'crate_military'
  | 'barrel_rusty'
  // characters & gear
  | 'gun_metal'
  | 'gun_polymer'
  | 'gun_wood'
  | 'gear_nylon'
  | 'skin'
  | 'uniform_desert'
  | 'uniform_woodland'
  | 'kevlar'
  // fx
  | 'muzzle_flash'
  | 'tracer'
  | 'blood_decal';

export interface MaterialLibrary {
  /** Returns a shared material instance. Never mutate the result; use `clone()`. */
  get(id: MaterialId): THREE.MeshStandardMaterial;
  /** A private clone safe to tweak (colour variation, emissive pulses, ...). */
  clone(id: MaterialId): THREE.MeshStandardMaterial;
  /** Set UV repeat for a material instance without disturbing the shared copy. */
  tiled(id: MaterialId, repeatX: number, repeatY: number): THREE.MeshStandardMaterial;
  has(id: MaterialId): boolean;
  /** Surface classification for impact FX and footsteps. */
  surfaceOf(id: MaterialId): SurfaceType;
  /** All generated textures, for debug inspection. */
  debugList(): Array<{ id: string; maps: string[] }>;
  dispose(): void;
}

export interface TextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

export interface ProcgenSystem extends System {
  readonly name: 'procgen';
  readonly materials: MaterialLibrary;
  /** Equirect/PMREM environment map used for IBL. */
  readonly environmentMap: THREE.Texture | null;
  /** Blue-noise texture for dithering, TAA jitter and SSAO. */
  readonly blueNoise: THREE.DataTexture;
}

// ===========================================================================
// physics — Rapier-backed dynamics, character control and queries
// ===========================================================================

export interface RaycastOptions {
  maxDistance?: number;
  /** Bitmask of COLLISION_GROUP values to test against. */
  groups?: number;
  /** Objects to ignore (e.g. the shooter's own colliders). */
  exclude?: readonly unknown[];
  /** Include sensors/triggers in the result. */
  includeSensors?: boolean;
}

export interface PhysicsRaycastHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  /** Userdata attached at collider creation; usually the owning entity. */
  userData: PhysicsUserData | null;
  surface: SurfaceType;
}

export interface PhysicsUserData {
  kind: 'static' | 'dynamic' | 'character' | 'ragdoll' | 'debris' | 'trigger' | 'destructible';
  entity?: Damageable;
  bodyPart?: BodyPart;
  surface?: SurfaceType;
  object3D?: THREE.Object3D;
  [key: string]: unknown;
}

export interface CharacterControllerHandle {
  /** Move by `displacement`, resolving collisions. Returns the applied motion. */
  move(displacement: THREE.Vector3, dt: number): THREE.Vector3;
  readonly grounded: boolean;
  readonly groundNormal: THREE.Vector3;
  readonly groundSurface: SurfaceType;
  readonly position: THREE.Vector3;
  setPosition(p: THREE.Vector3): void;
  /** Adjust capsule height for crouch/prone. Returns false if blocked. */
  setHeight(height: number): boolean;
  /** True when standing up at `height` would clip geometry. */
  isBlockedAbove(height: number): boolean;
  destroy(): void;
}

export interface RigidBodyHandle {
  readonly object3D: THREE.Object3D;
  applyImpulse(impulse: THREE.Vector3, atPoint?: THREE.Vector3): void;
  applyTorqueImpulse(t: THREE.Vector3): void;
  setVelocity(v: THREE.Vector3): void;
  getVelocity(out: THREE.Vector3): THREE.Vector3;
  setPosition(p: THREE.Vector3, q?: THREE.Quaternion): void;
  sleep(): void;
  wake(): void;
  destroy(): void;
}

export interface RagdollHandle {
  readonly root: THREE.Object3D;
  applyImpulse(bone: string, impulse: THREE.Vector3, at?: THREE.Vector3): void;
  /** Copy simulated transforms onto the skinned mesh's bones. */
  sync(): void;
  readonly settled: boolean;
  destroy(): void;
}

export interface PhysicsSystem extends System {
  readonly name: 'physics';
  readonly ready: boolean;

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null;

  /** Sphere-cast, used for grenades, mantle probes and AI clearance checks. */
  spherecast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null;

  /** Fast boolean line-of-sight test. */
  lineOfSight(from: THREE.Vector3, to: THREE.Vector3, groups?: number): boolean;

  /** Register world geometry as a static trimesh collider. */
  addStaticMesh(mesh: THREE.Mesh, userData?: PhysicsUserData): void;
  addStaticBox(
    center: THREE.Vector3,
    halfExtents: THREE.Vector3,
    quaternion?: THREE.Quaternion,
    userData?: PhysicsUserData,
  ): void;

  createCharacter(
    position: THREE.Vector3,
    height: number,
    radius: number,
    userData?: PhysicsUserData,
  ): CharacterControllerHandle;

  createRigidBody(
    object3D: THREE.Object3D,
    shape: { kind: 'box'; halfExtents: THREE.Vector3 } | { kind: 'sphere'; radius: number } | { kind: 'capsule'; halfHeight: number; radius: number } | { kind: 'convex'; points: Float32Array },
    opts?: { mass?: number; restitution?: number; friction?: number; ccd?: boolean; group?: number; userData?: PhysicsUserData },
  ): RigidBodyHandle;

  createRagdoll(
    skeleton: THREE.Skeleton | null,
    root: THREE.Object3D,
    opts?: { impulse?: THREE.Vector3; impulsePoint?: THREE.Vector3 },
  ): RagdollHandle | null;

  /** Radial impulse used by explosions. */
  applyRadialImpulse(center: THREE.Vector3, radius: number, strength: number): void;

  readonly debugRenderEnabled: boolean;
  setDebugRender(on: boolean): void;
}

// ===========================================================================
// world — level geometry, streaming, navigation data
// ===========================================================================

export interface SpawnPoint {
  position: THREE.Vector3;
  yaw: number;
  team: Team;
  /** Higher = preferred when safe. */
  priority: number;
}

export interface CoverPoint {
  position: THREE.Vector3;
  /** Direction the cover protects from. */
  normal: THREE.Vector3;
  /** True when the AI must crouch to use it. */
  low: boolean;
  /** Adjacent peek positions. */
  peekLeft: THREE.Vector3 | null;
  peekRight: THREE.Vector3 | null;
}

export interface NavGrid {
  readonly originX: number;
  readonly originZ: number;
  readonly cellSize: number;
  readonly width: number;
  readonly depth: number;
  /** 0 = blocked, otherwise traversal cost. */
  readonly cost: Float32Array;
  /** Floor height per cell. */
  readonly height: Float32Array;
  worldToCell(x: number, z: number, out: { x: number; z: number }): { x: number; z: number };
  cellToWorld(cx: number, cz: number, out: THREE.Vector3): THREE.Vector3;
  isWalkable(cx: number, cz: number): boolean;
}

export interface WorldSystem extends System {
  readonly name: 'world';
  readonly root: THREE.Group;
  readonly bounds: THREE.Box3;
  getSpawnPoints(team: Team): readonly SpawnPoint[];
  getCoverPoints(): readonly CoverPoint[];
  getNavGrid(): NavGrid;
  /** Sample the ground height at a world XZ, or null if off-mesh. */
  sampleGround(x: number, z: number): number | null;
  /** Called by combat when a destructible is hit. */
  damageAt(point: THREE.Vector3, radius: number, amount: number): void;
  /** Sky/sun direction used by lighting and the airstrike approach vector. */
  readonly sunDirection: THREE.Vector3;
  /** Named locations for killstreak targeting and objective markers. */
  getLandmarks(): ReadonlyMap<string, THREE.Vector3>;
}

// ===========================================================================
// render — post-processing, lighting, sky
// ===========================================================================

export interface RenderSystem extends System {
  readonly name: 'render';
  /** Trigger a camera-space screen shake (used by explosions and heavy weapons). */
  addScreenShake(intensity: number, duration: number, frequency?: number): void;
  /** Full-screen flash, e.g. flashbangs and nearby airstrikes. */
  addScreenFlash(intensity: number, duration: number, color?: number): void;
  /** Temporarily blur/desaturate for concussion effects. */
  setConcussion(amount: number, duration: number): void;
  /** Directional light used for shadows; exposed so FX can match its direction. */
  readonly sunLight: THREE.DirectionalLight;
  /** Register a transient point light within the dynamic light budget. */
  requestDynamicLight(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    distance: number,
    duration: number,
  ): void;
  setExposure(v: number): void;
  /** Depth-of-field focus override for scoped weapons. */
  setFocusDistance(meters: number | null): void;
  readonly stats: { drawCalls: number; triangles: number; programs: number };
}

// ===========================================================================
// player
// ===========================================================================

export type Stance = 'stand' | 'crouch' | 'prone' | 'slide' | 'mantle';

export interface PlayerSystem extends System {
  readonly name: 'player';
  readonly entity: Damageable;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly stance: Stance;
  readonly grounded: boolean;
  readonly speed: number;
  /** 0..1 — how far into the sprint state, drives FOV and viewmodel pose. */
  readonly sprintAmount: number;
  readonly isSprinting: boolean;
  readonly isTacticalSprinting: boolean;
  readonly yaw: number;
  readonly pitch: number;
  /** Eye position used for raycasts and audio listener placement. */
  getEyePosition(out: THREE.Vector3): THREE.Vector3;
  getLookDirection(out: THREE.Vector3): THREE.Vector3;
  /** Additive camera recoil applied by the weapon system, in radians. */
  addCameraRecoil(pitch: number, yaw: number): void;
  /** Additive view punch that decays quickly (explosions, taking fire). */
  addViewPunch(pitch: number, yaw: number, roll: number): void;
  teleport(position: THREE.Vector3, yaw?: number): void;
  respawn(): void;
  readonly currentSurface: SurfaceType;
}

// ===========================================================================
// weapons
// ===========================================================================

export type FireMode = 'auto' | 'semi' | 'burst' | 'bolt' | 'pump';
export type WeaponClass = 'ar' | 'smg' | 'lmg' | 'sniper' | 'shotgun' | 'pistol' | 'launcher' | 'melee';

export interface WeaponDefinition {
  id: string;
  displayName: string;
  class: WeaponClass;
  fireMode: FireMode;
  /** Rounds per minute. */
  rpm: number;
  burstCount?: number;
  magSize: number;
  reserveAmmo: number;
  /** Damage at point blank. */
  damage: number;
  /** Metres at which damage begins to fall off, and where it bottoms out. */
  falloffStart: number;
  falloffEnd: number;
  minDamageScale: number;
  /** Pellets per shot for shotguns. */
  pellets?: number;
  /** Muzzle velocity for projectile weapons; hitscan when undefined. */
  muzzleVelocity?: number;
  /** Base cone of fire, in degrees, hip and ADS. */
  spreadHip: number;
  spreadAds: number;
  spreadMoving: number;
  spreadMax: number;
  spreadPerShot: number;
  spreadRecovery: number;
  /** Recoil, in degrees. */
  recoilPitch: number;
  recoilYaw: number;
  recoilRandom: number;
  recoilRecovery: number;
  /** Visual kick of the weapon model itself, in metres. */
  kickback: number;
  adsTime: number;
  /** Field of view multiplier while aiming. */
  adsZoom: number;
  /** Scope overlay id for high-magnification optics. */
  scope?: 'none' | 'holo' | 'acog' | 'sniper' | 'thermal';
  reloadTime: number;
  reloadEmptyTime: number;
  drawTime: number;
  holsterTime: number;
  suppressed: boolean;
  penetrationPower: number;
  /** Weight affects sprint speed and ADS. */
  weight: number;
  caliber: string;
  /** Tracer colour and frequency. */
  tracerColor: number;
  tracerEvery: number;
}

export interface WeaponSystem extends System {
  readonly name: 'weapons';
  readonly current: WeaponDefinition | null;
  readonly ammoInMag: number;
  readonly reserveAmmo: number;
  readonly isAiming: boolean;
  /** 0..1 ADS interpolation. */
  readonly adsAmount: number;
  readonly isReloading: boolean;
  readonly isFiring: boolean;
  /** Current cone of fire in radians, including movement and spread buildup. */
  readonly currentSpread: number;
  /** World-space muzzle position of the viewmodel. */
  getMuzzlePosition(out: THREE.Vector3): THREE.Vector3;
  equip(weaponId: string): void;
  giveAmmo(amount: number): void;
  forceReload(): void;
  /** Suppress input handling (used during killstreak sequences and menus). */
  setInputEnabled(enabled: boolean): void;
  readonly loadout: readonly string[];
}

// ===========================================================================
// combat
// ===========================================================================

export interface CombatSystem extends System {
  readonly name: 'combat';
  register(entity: Damageable): void;
  unregister(entity: Damageable): void;
  /** All live entities on a team. */
  entitiesOf(team: Team): readonly Damageable[];
  /** Trace a bullet, handling penetration, damage and impact FX. */
  fireBullet(opts: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    damage: number;
    falloffStart: number;
    falloffEnd: number;
    minDamageScale: number;
    penetrationPower: number;
    attacker: Damageable | null;
    weaponId: string;
    tracer: boolean;
    tracerColor: number;
    impulse: number;
  }): HitResult | null;
  /** Radial damage plus physics impulse plus FX. */
  explode(opts: {
    position: THREE.Vector3;
    radius: number;
    damage: number;
    falloff: 'linear' | 'quadratic';
    source: Damageable | null;
    kind: 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel';
    impulse: number;
    screenShake?: number;
    /**
     * `'full'` (default) fires the whole blast presentation: fireball, smoke,
     * debris, dust, audio, shake, flash and dynamic light. `'none'` applies only
     * damage and physics, for charges whose look is not a fireball — a
     * flashbang concusses and blinds but must not spawn an explosion.
     */
    presentation?: 'full' | 'none';
  }): void;
  applyDamage(target: Damageable, info: DamageInfo): void;
  /** Query used by AI and by the hitmarker system. */
  raycastEntities(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    ignore?: Damageable | null,
  ): HitResult | null;
}

// ===========================================================================
// ai
// ===========================================================================

export type AIState = 'idle' | 'patrol' | 'alert' | 'search' | 'combat' | 'cover' | 'flank' | 'reload' | 'suppressed' | 'dead';

export interface AISystem extends System {
  readonly name: 'ai';
  readonly aliveCount: number;
  spawnEnemy(position: THREE.Vector3, yaw?: number, archetype?: string): Damageable | null;
  /** Global alert: every AI investigates a position (gunshots, airstrikes). */
  alertAll(position: THREE.Vector3, radius: number, intensity: number): void;
  /** Suppress AI within a radius, e.g. from an airstrike shockwave. */
  suppress(position: THREE.Vector3, radius: number, duration: number): void;
  setDifficulty(d: 'recruit' | 'regular' | 'hardened' | 'veteran'): void;
  /** Positions of live enemies, for the minimap and killstreak targeting. */
  getEnemyPositions(out: THREE.Vector3[]): THREE.Vector3[];
  setSpawningEnabled(enabled: boolean): void;
}

// ===========================================================================
// fx
// ===========================================================================

export interface FXSystem extends System {
  readonly name: 'fx';
  impact(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType, energy: number): void;
  bloodSpray(point: THREE.Vector3, direction: THREE.Vector3, amount: number): void;
  muzzleFlash(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    scale: number,
    suppressed: boolean,
    inViewmodelScene: boolean,
  ): void;
  tracer(from: THREE.Vector3, to: THREE.Vector3, color: number, speed: number, width?: number): void;
  explosion(position: THREE.Vector3, radius: number, kind: 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel'): void;
  smoke(position: THREE.Vector3, radius: number, duration: number, color?: number): void;
  dust(position: THREE.Vector3, radius: number, strength: number): void;
  shellEject(position: THREE.Vector3, velocity: THREE.Vector3, caliber: string, inViewmodelScene: boolean): void;
  decal(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType, size: number): void;
  /** Persistent burning fire at a location. */
  fire(position: THREE.Vector3, radius: number, duration: number): void;
  /** Contrail for aircraft and rockets. */
  contrail(object: THREE.Object3D, duration: number): void;
  debrisBurst(position: THREE.Vector3, normal: THREE.Vector3, count: number, surface: SurfaceType): void;
  clearAll(): void;
}

// ===========================================================================
// audio
// ===========================================================================

export type SoundId = string;

export type AudioBus = 'sfx' | 'weapons' | 'ui' | 'music' | 'ambience';

export interface AudioSystem extends System {
  readonly name: 'audio';
  readonly unlocked: boolean;
  unlock(): Promise<void>;
  /** Fire-and-forget positional sound. */
  play(
    id: SoundId,
    position?: THREE.Vector3,
    opts?: { volume?: number; pitch?: number; refDistance?: number; maxDistance?: number },
  ): void;
  /** Non-positional UI/2D sound. */
  play2D(id: SoundId, opts?: { volume?: number; pitch?: number }): void;
  /** Weapon report with distance-dependent tail and indoor reflection. */
  gunshot(id: SoundId, position: THREE.Vector3, suppressed: boolean, isLocal: boolean): void;
  setListener(position: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3, velocity: THREE.Vector3): void;
  /** Muffle everything (flashbang, concussion, near-miss explosion). */
  setDeafen(amount: number, duration: number): void;
  setMasterVolume(v: number): void;
  /** Per-bus level so the settings menu can offer separate SFX/music sliders. */
  setBusVolume(bus: AudioBus, v: number): void;
  busVolume(bus: AudioBus): number;
  setMusicIntensity(v: number): void;
  /** Ambient bed selection based on where the player is standing. */
  setAmbience(id: 'exterior' | 'interior' | 'tunnel'): void;
}

// ===========================================================================
// ui
// ===========================================================================

export interface UISystem extends System {
  readonly name: 'ui';
  showHitmarker(kind: 'normal' | 'headshot' | 'kill' | 'armor'): void;
  showDamageDirection(worldDirection: THREE.Vector3): void;
  pushKillfeed(killer: string, victim: string, weapon: string, headshot: boolean, isLocalPlayer: boolean): void;
  notify(text: string, sub?: string, kind?: 'info' | 'warn' | 'reward'): void;
  /** Large centre-screen callout, e.g. "AIRSTRIKE INBOUND". */
  announce(text: string, sub?: string, duration?: number): void;
  setObjectiveMarker(id: string, worldPosition: THREE.Vector3 | null, label?: string): void;
  setCrosshairSpread(radians: number): void;
  setScopeOverlay(kind: 'none' | 'holo' | 'acog' | 'sniper' | 'thermal', amount: number): void;
  setKillstreakSelectionOpen(open: boolean): void;
  /**
   * Hide the HUD chrome while another module owns the screen (killstreak
   * tablet, door gunner). Those overlays composite below #ui-root, so without
   * this the HUD draws on top of them.
   */
  setStandDown(on: boolean): void;
  readonly isMenuOpen: boolean;
  openMenu(id: 'pause' | 'settings' | 'loadout' | 'none'): void;
}

// ===========================================================================
// killstreaks — including the requested air strike
// ===========================================================================

export type KillstreakId = 'uav' | 'airstrike' | 'cluster_strike' | 'chopper_gunner' | 'care_package';

export interface KillstreakDefinition {
  id: KillstreakId;
  name: string;
  /** Kills required to earn. */
  cost: number;
  description: string;
  /** Whether the player must paint a target location on the map. */
  requiresTargeting: boolean;
  icon: string;
  duration: number;
}

export interface KillstreakSystem extends System {
  readonly name: 'killstreaks';
  readonly available: readonly KillstreakId[];
  readonly streak: number;
  /** The full ladder, so the HUD does not have to keep a duplicate copy. */
  readonly definitions: readonly KillstreakDefinition[];
  getDefinition(id: string): KillstreakDefinition | undefined;
  /** Enter targeting mode (tablet/map view) or fire immediately. */
  activate(id: KillstreakId): boolean;
  cancelTargeting(): void;
  readonly isTargeting: boolean;
  /** Confirm the painted location while targeting. */
  confirmTarget(): void;
  /**
   * Call an air strike directly. `heading` is the compass direction the jets
   * approach from, in radians.
   */
  callAirStrike(target: THREE.Vector3, heading: number, kind?: 'precision' | 'cluster' | 'carpet'): void;
  addKill(): void;
  resetStreak(): void;
}
