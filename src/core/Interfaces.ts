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
  /**
   * Metres of world that one tile of this material's maps is authored to cover.
   * Every material is art-directed at a specific physical scale — brick at its
   * real course height, tread plate at its real pitch — so tiling by anything
   * other than a multiple of this puts the detail at the wrong size.
   */
  tileSize(name: MaterialName): number;
  /**
   * `tiled` for callers that know the surface's real size rather than a repeat
   * count: gives the correct texel density for a quad this many metres across.
   */
  forSize(name: MaterialName, widthMeters: number, heightMeters?: number): THREE.Material;
  /** Every material name the library can produce. */
  readonly names: readonly MaterialName[];
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
  /**
   * Instance to drive when `mesh` is a `THREE.InstancedMesh`. Omit to have the
   * physics system allocate the next free slot itself.
   */
  instanceIndex?: number;
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
  /**
   * Metres the controller lifted the character to clear a step this frame.
   * Smooth the camera by this amount so stairs do not pop.
   */
  stepUp?: number;
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

  /**
   * Allocation-free `raycast`. Writes into `out` and returns whether it hit,
   * for callers that trace thousands of rays a frame.
   */
  raycastInto(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    out: RaycastHit,
    mask?: number,
    ignore?: THREE.Object3D[],
  ): boolean;

  /**
   * Registers a collider that moves: character hitboxes, doors, vehicles.
   * Its transform is re-read every frame, unlike `addStatic`.
   */
  addDynamic(object: THREE.Object3D): void;
  removeDynamic(object: THREE.Object3D): void;

  /** Swept capsule against the level, for mantling and cover validation. */
  capsuleCast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    height: number,
    maxDistance: number,
    mask?: number,
    ignore?: THREE.Object3D[],
  ): RaycastHit | null;

  /**
   * Allocation-free `moveCharacter`, for controllers that run every frame.
   * Writes into `out`; `position` and `velocity` are left untouched.
   */
  moveCharacterInto(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    height: number,
    dt: number,
    out: CharacterMoveResult,
    stepHeight?: number,
    ignore?: THREE.Object3D[],
  ): void;

  /** Triangles in the static collision tree, for the performance overlay. */
  readonly staticTriangles: number;
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

  /* --- additive: movement state and camera control the other systems want --- */

  /** Double-tap sprint. Faster than a sprint and slower to fire out of. */
  readonly tacticalSprint?: boolean;
  readonly sliding?: boolean;
  readonly mantling?: boolean;
  /** Seconds the player has been off the ground; 0 while grounded. */
  readonly airborneTime?: number;
  /**
   * Seconds left of the sprint-out delay. The weapon must not fire or finish
   * raising until this reaches zero — CoD's "sprint out time".
   */
  readonly sprintOutRemaining?: number;
  /** Convenience for the weapon: alive, not mantling, sprint-out elapsed. */
  readonly canFire?: boolean;
  /** Current eye height above the feet, which changes with stance. */
  readonly eyeHeightMeters?: number;
  readonly capsuleHeightMeters?: number;
  readonly capsuleRadius?: number;
  /** Raw aim angles in radians, before any camera effect. */
  readonly viewYaw?: number;
  readonly viewPitch?: number;
  /** 0..1 exertion from sprinting; scales weapon sway. */
  readonly winded?: number;
  /** -1..1 peek lean, after the wall check. */
  readonly leanAmount?: number;
  readonly breathHeld?: boolean;
  /** 0..1 breath left to hold. */
  readonly breathReserve?: number;
  /** Field of view actually in use this frame, in degrees. */
  readonly fov?: number;

  /**
   * Asks the camera for a field of view, blended over `duration` seconds. This
   * is how a weapon drives its ADS zoom; passing the base FOV releases it. The
   * `camera:fov` event does the same thing for callers without a reference.
   */
  requestFov?(fov: number, duration?: number): void;
  /** Changes the resting field of view, e.g. from a settings menu. */
  setBaseFov?(fov: number): void;
  /** Per-weapon aim time, so a sniper raises slower than an SMG. */
  setAdsTime?(seconds: number): void;
  /** Steadies the view for a scoped shot. False when there is no breath left. */
  holdBreath?(hold: boolean): boolean;
  /** Health, stance and camera reset at a spawn point. */
  respawn?(position?: THREE.Vector3, heading?: number): void;
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

  /* --- additive: what a shotgun and a selective-fire rifle need --- */

  /** Projectiles per trigger pull. Absent or 1 for everything but buckshot. */
  pellets?: number;
  /** Half-angle of the buckshot cone in radians, independent of aim spread. */
  pelletSpread?: number;
  /** Selector positions, in cycle order. `fireMode` is the one it starts on. */
  fireModes?: Array<WeaponStats['fireMode']>;
  /** Cyclic rate inside a burst, when it differs from the sustained rate. */
  burstRpm?: number;
  /** Seconds between the last shot of a burst and the next trigger pull. */
  burstDelay?: number;
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

  /* --- additive: what the HUD and the game director want to read and drive --- */

  /** Selector position in use, which may differ from `current.fireMode`. */
  readonly fireMode?: WeaponStats['fireMode'];
  /** Advances the selector; returns the position it landed on. */
  cycleFireMode?(): WeaponStats['fireMode'];
  /** 0..1 progress through the current reload, for a HUD ring. */
  readonly reloadProgress?: number;
  /** True while the weapon is being raised, lowered or swapped. */
  readonly switching?: boolean;
  /** Starts a reload if one is possible and not already running. */
  reload?(): void;
  /** Quick melee. Returns false when another action owns the weapon. */
  melee?(): boolean;
  /** Begins cooking a grenade of the given kind; release with `throwGrenade`. */
  cookGrenade?(kind: 'frag' | 'flash' | 'smoke'): boolean;
  throwGrenade?(): boolean;
  /** Plays the inspect flourish. */
  inspect?(): boolean;
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
  /**
   * Enemies within a radius, for HUD radar and killstreak targeting.
   *
   * A fresh array each call, and the entries are the live snapshots rather than
   * copies. Anything that must outlive the call has to be copied out; anything
   * that must survive a *second* call is safe, which is what the killstreak
   * director needs when it holds a targeting footprint and then asks a wider
   * question.
   */
  query(center: THREE.Vector3, radius: number): EnemyState[];

  /* --- additive: difficulty-aware spawning --- */

  /**
   * Spawns with an explicit difficulty profile and squad rather than the house
   * roll, for a director that wants a deliberate mix per wave — a recruit
   * screen with a veteran behind it reads as intent where a random draw reads
   * as noise. `difficulty` is one of the profile names ('recruit', 'regular',
   * 'veteran', 'elite'); an unknown name falls back to regular rather than
   * failing, so a caller can pass a string it got from level data. Agents given
   * the same `squadId` share contact reports and flanking assignments; pass -1
   * to leave the man wherever the automatic assignment puts him.
   *
   * Optional, so an AI implementation that has one difficulty is still an
   * `IAI`. Callers should fall back to `spawn`.
   */
  spawnDetailed?(
    position: THREE.Vector3,
    heading: number,
    difficulty: string,
    squadId: number,
  ): number;
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

  /* --- additive: budget reporting and deterministic stepping --- */

  /**
   * Total particle ring capacity currently allocated across every batch. Read
   * with `particleCount` this is the headroom the overlay actually wants: a
   * count of 4000 means nothing without knowing whether the budget is 6000 or
   * 40000.
   */
  readonly particleCapacity?: number;

  /**
   * Fast-forwards every live effect by `seconds` without stepping frames.
   *
   * Particle motion is a closed-form function of age, so this is exact rather
   * than an approximation: the state after the call is the state the system
   * would have reached had it been stepped. Used by the screenshot harness to
   * photograph one explosion at several points in its life, and by a level
   * loader that wants a smoke screen already established when play starts.
   */
  advance?(seconds: number): void;

  /**
   * Holds the effects clock where it stands while the rest of the engine keeps
   * running, so a caller that has fast-forwarded to an exact instant with
   * `advance` can let the frame settle around a still effect. The screenshot
   * harness steps frames after posing a camera; without the hold those frames
   * would carry a 50 ms fireball past the moment being photographed.
   */
  setFrozen?(frozen: boolean): void;
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

  /* --- additive: what the HUD, the director and the test harness want --- */

  /** Id of the streak currently playing, or null when nothing is running. */
  readonly activeStreak?: string | null;
  /** The next streak on the ladder the player has not yet earned. */
  readonly next?: KillstreakDef | null;
  /** Kills still needed for `next`; 0 when the ladder is exhausted. */
  readonly killsToNext?: number;
  /** Highest streak reached this life, for the end-of-match card. */
  readonly bestStreak?: number;
  /**
   * Aborts whatever cinematic is playing and returns control immediately. Safe
   * at any point in the sequence; ordnance already in the air still lands.
   */
  skip?(): void;
  /** Grants a streak without having earned it, for testing and for scripting. */
  grant?(id: string): boolean;
  /** Every kind of airstrike, called directly with a chosen run-in heading. */
  callAirstrikeKind?(
    kind: 'precision' | 'carpet' | 'cluster' | 'napalm',
    target: THREE.Vector3,
    heading?: number,
  ): boolean;
  /** True while enemy positions are being revealed by aerial reconnaissance. */
  readonly uavActive?: boolean;
}

/* --------------------------- atmosphere -------------------------------- */

export interface WeatherState {
  /** 0 = clear, 1 = overcast. */
  cloudCover: number;
  /** Atmospheric haze / turbidity multiplier. */
  haze: number;
  /** Metres per second, drives cloud drift, vegetation and smoke. */
  windSpeed: number;
  /** Wind heading in radians. */
  windDirection: number;
  /** Airborne dust density, for the sandstorm look. */
  dust: number;
}

/**
 * Aerial perspective, precomputed by the sky into a 3D lookup so any pass can
 * tint distant geometry toward the sky without repeating the scattering
 * integral. Multiply `inscatter` by `irradiance` to get engine-unit radiance,
 * and multiply the shaded surface by `transmittance`.
 *
 * The volume is parameterised in world terms rather than camera froxels, so it
 * survives a camera rotation without a rebake. Given a world-space direction
 * `d` from the camera and a distance `t` in metres:
 *
 *   u = sqrt(min(t, maxDistance) / maxDistance)
 *   v = 0.5 + 0.5 * sign(d.y) * sqrt(abs(d.y))
 *   w = sqrt(0.5 - 0.5 * cos(azimuth(d) - sunAzimuth))
 */
export interface AerialPerspective {
  /** RGB in-scattered radiance per unit top-of-atmosphere irradiance. */
  inscatter: THREE.Texture | null;
  /** RGB transmittance from the camera to the sample distance. */
  transmittance: THREE.Texture | null;
  /** Metres spanned by the volume's distance axis. */
  maxDistance: number;
  /** Compass azimuth of the sun in radians, for the `w` axis. */
  sunAzimuth: number;
  /** Scale from `inscatter` units to engine radiance. */
  irradiance: THREE.Color;
}

/**
 * The sky owns atmospheric state and is therefore the authority on where the
 * sun is. The lighting rig consumes this to drive the directional light and the
 * image-based lighting, which is why `sky` initialises before `lighting`.
 *
 * Everything radiometric is **linear HDR in engine units, where 1 unit is one
 * kilonit (or one kilolux for an irradiance)**. A white Lambertian surface in
 * full noon sun sits near 30 units; the solar disk is tens of thousands.
 */
export interface ISky {
  /** Unit vector pointing from the world toward the sun. */
  readonly sunDirection: THREE.Vector3;
  /**
   * Irradiance of direct sunlight on a surface facing the sun, in engine
   * units, including extinction along the sun's path — which is what turns it
   * orange at sunset. Around (95, 92, 87) at noon and (2.2, 0.9, 0.35) at
   * sunset, so the magnitude carries the intensity as well as the hue.
   */
  readonly sunColor: THREE.Color;
  /** Cosine-weighted hemisphere average sky radiance, for the ambient term. */
  readonly skyColor: THREE.Color;
  /** Hours, 0..24. */
  readonly timeOfDay: number;
  setTimeOfDay(hours: number): void;
  readonly weather: WeatherState;
  setWeather(weather: Partial<WeatherState>): void;
  /**
   * Renders the current sky into an equirect or cube texture suitable for
   * `scene.environment`. Called by the lighting rig when the sky changes.
   */
  renderEnvironment(resolution: number): THREE.Texture | null;
  /** Incremented whenever the sky changes enough to require an IBL rebake. */
  readonly revision: number;

  /* --- additive: atmospheric state the lighting rig and post chain want --- */

  /** Sun elevation above the horizon in radians; negative after sunset. */
  readonly sunElevation?: number;
  /** Compass azimuth of the sun in radians, measured from -Z (north) toward +X. */
  readonly sunAzimuth?: number;
  /** `sunColor` normalised so its largest component is 1. */
  readonly sunTint?: THREE.Color;

  /** Unit vector pointing from the world toward the moon. */
  readonly moonDirection?: THREE.Vector3;
  /** Moonlight irradiance in engine units, with the usual scotopic blue shift. */
  readonly moonColor?: THREE.Color;
  /** Synodic phase: 0 new, 0.25 first quarter, 0.5 full. */
  readonly moonPhase?: number;

  /**
   * Whichever of sun and moon currently dominates, so a rig can drive one
   * directional light through the whole cycle without special-casing night.
   */
  readonly keyDirection?: THREE.Vector3;
  readonly keyColor?: THREE.Color;

  /** 0..1 fraction of the key light blocked by cloud at the camera. */
  readonly sunOcclusion?: number;
  /** Top-down cloud transmittance map; sample `.r` as a shadow factor. */
  readonly cloudShadowMap?: THREE.Texture | null;
  /** World position (xyz1) to `cloudShadowMap` UV, in `xy` of the result. */
  readonly cloudShadowMatrix?: THREE.Matrix4;

  readonly aerialPerspective?: AerialPerspective;

  /** Exposure that shows the current sky as intended, for a fixed-exposure post chain. */
  readonly exposureHint?: number;
  /** Named looks: dawn, morning, noon, golden, dusk, night, overcast, sandstorm. */
  readonly presetNames?: readonly string[];
  /** Applies a named preset. Returns false when the name is unknown. */
  applyPreset?(name: string): boolean;
  /** The current probe without forcing a rebake; null before the first bake. */
  readonly environmentTexture?: THREE.Texture | null;
}

export interface ILighting {
  readonly sun: THREE.DirectionalLight;
  /** Pre-filtered environment map currently assigned to the scene. */
  readonly environment: THREE.Texture | null;
  /** Forces an IBL rebake from the current sky. */
  refreshEnvironment(): void;
  /**
   * Registers a local light so it can be distance-culled and budgeted.
   * `radius` is the influence radius in metres.
   */
  addLocalLight(light: THREE.Light, radius: number): void;
  removeLocalLight(light: THREE.Light): void;
  /**
   * A short-lived light, used for muzzle flashes and explosions. Returns
   * immediately; the rig recycles from a fixed pool.
   */
  flashLight(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    intensity: number,
    radius: number,
    duration: number,
  ): void;
  /** Number of local lights currently active, for the perf overlay. */
  readonly activeLightCount: number;
}

/* ------------------------- render pipeline ------------------------------ */

export interface IRenderPipeline {
  /** Sets depth-of-field focus. `distance` in metres, `aperture` in f-stops. */
  setFocus(distance: number, aperture: number): void;
  /** Full-screen colour flash, for flashbangs and damage. */
  flash(color: THREE.ColorRepresentation, intensity: number, duration: number): void;
  /** 0..1 radial blur, used for sprint and explosion concussion. */
  setRadialBlur(amount: number): void;
  /** 0..1 desaturation plus red vignette as health drops. */
  setDamageVignette(amount: number): void;
  /** 0..1 heat shimmer, used near fire and over hot ground. */
  setHeatHaze(amount: number): void;
  /** Overrides exposure; pass null to return to automatic. */
  setExposure(exposure: number | null): void;
  /** Screen-space velocity, exposed so other passes can reuse it. */
  readonly velocityTexture: THREE.Texture | null;
  readonly depthTexture: THREE.Texture | null;
  /** Renders one frame into a target of a given size, for the minimap. */
  renderToTarget(target: THREE.WebGLRenderTarget, camera: THREE.Camera): void;
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

  /* --- additive: what the HUD needs to draw a match in progress --- */

  /** Lives left. 0 means the next death ends the match. */
  readonly lives?: number;
  /** Lives the mode starts with; 0 when lives are not in play. */
  readonly maxLives?: number;
  /** Seconds until redeploy while `state === 'dead'`. */
  readonly respawnIn?: number;
  /** Length of the full respawn countdown, so a HUD can size an arc. */
  readonly respawnTotal?: number;
  /** Hostiles still alive in the current wave. */
  readonly enemiesLeft?: number;
  /** Hostiles the current wave contains in total; 0 between waves. */
  readonly waveSize?: number;
  /** Experience accumulated this match, which tracks score but is not it. */
  readonly xp?: number;
  /** Longest streak reached this match, for the death and end cards. */
  readonly bestStreak?: number;
  /** The objective currently in force, as shown on the HUD. */
  readonly objective?: string;
  /** Where the mode is inside a wave, for HUD banners and audio stings. */
  readonly phase?: 'idle' | 'briefing' | 'incoming' | 'active' | 'cleared' | 'over';
  /** True while the match is running and not paused, dead or finished. */
  readonly running?: boolean;
  /** Abandons the match and returns to the menu state. */
  toMenu?(): void;
}
